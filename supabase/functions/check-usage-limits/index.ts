import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) throw new Error('Unauthorized');

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('subscription_status, current_plan_id, trial_ends_at')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // Determine if user is in trial or paid subscription
    const isTrialing = profile.subscription_status === 'trialing';
    const isPaid = profile.subscription_status === 'active';
    
    console.log(`[LIMITS] User status - isTrialing: ${isTrialing}, isPaid: ${isPaid}, status: ${profile.subscription_status}`);
    
    // Get plan limits
    let plan;
    if (isPaid && profile.current_plan_id) {
      // User has paid plan - fetch it
      const { data: paidPlan, error: planError } = await supabaseClient
        .from('subscription_plans')
        .select('*')
        .eq('id', profile.current_plan_id)
        .single();

      if (planError) {
        console.error('[LIMITS] Error fetching paid plan:', planError);
        // Fallback to starter plan if paid plan not found
        const { data: starterPlan } = await supabaseClient
          .from('subscription_plans')
          .select('*')
          .eq('id', 'starter')
          .single();
        plan = starterPlan;
      } else {
        plan = paidPlan;
      }
    } else {
      // User is in trial or no subscription - use any plan for trial limits
      const { data: anyPlan, error: planError } = await supabaseClient
        .from('subscription_plans')
        .select('*')
        .limit(1)
        .single();
      
      if (planError) throw new Error('Could not fetch plan limits');
      plan = anyPlan;
    }
    
    if (!plan) throw new Error('No plan configuration found');
    
    console.log(`[LIMITS] Using plan: ${plan.id}`);

    // Get current month usage
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const { data: usage, error: usageError } = await supabaseClient
      .from('usage_tracking')
      .select('*')
      .eq('seller_id', user.id)
      .gte('month', currentMonth.toISOString().split('T')[0])
      .single();

    const currentUsage = usage || {
      optimizations_count: 0,
      articles_count: 0,
      chat_responses_count: 0,
      shopify_requests_count: 0,
      products_count: 0,
      shopify_stores_count: 0,
      campaigns_count: 0,
    };
    
    console.log(`[LIMITS] Current usage:`, currentUsage);

    // Determine limits based on subscription status
    let limits;
    if (isTrialing) {
      limits = {
        max_optimizations: plan.trial_max_optimizations || 10,
        max_articles: plan.trial_max_articles || 1,
        max_chat_responses: plan.trial_max_chat_responses || 50,
        max_shopify_requests: plan.trial_max_shopify_requests || 20,
        max_products: plan.trial_max_products || 10,
        max_shopify_stores: 1,
        max_campaigns: 0, // No campaigns in trial
      };
    } else {
      limits = {
        max_optimizations: plan.max_optimizations_monthly || 1000,
        max_articles: plan.max_articles_monthly || 5,
        max_chat_responses: plan.max_chat_responses_monthly || 200,
        max_shopify_requests: plan.max_shopify_requests_monthly || 100,
        max_products: plan.max_products || 100,
        max_shopify_stores: plan.max_shopify_stores || 1,
        max_campaigns: plan.max_campaigns || 0,
      };
    }
    
    console.log(`[LIMITS] Applied limits:`, limits);

    // Check if limits are reached
    const canUseOptimizations = currentUsage.optimizations_count < limits.max_optimizations;
    const canUseArticles = currentUsage.articles_count < limits.max_articles;
    const canUseChat = currentUsage.chat_responses_count < limits.max_chat_responses;
    const canUseShopifySearch = currentUsage.shopify_requests_count < limits.max_shopify_requests;
    const canAddProducts = currentUsage.products_count < limits.max_products;
    const canAddShopifyStore = currentUsage.shopify_stores_count < limits.max_shopify_stores;
    const canAddCampaign = currentUsage.campaigns_count < limits.max_campaigns;
    
    console.log(`[LIMITS] Can use - optimizations: ${canUseOptimizations}, articles: ${canUseArticles}, chat: ${canUseChat}`);

    const shouldForcePayment = !canUseOptimizations || !canUseArticles || !canUseChat || 
                                !canUseShopifySearch || !canAddProducts || !canAddShopifyStore || !canAddCampaign;

    return new Response(
      JSON.stringify({
        canUseOptimizations,
        canUseArticles,
        canUseChat,
        canUseShopifySearch,
        canAddProducts,
        canAddShopifyStore,
        canAddCampaign,
        limitReached: {
          optimizations: !canUseOptimizations,
          articles: !canUseArticles,
          chat: !canUseChat,
          shopifySearch: !canUseShopifySearch,
          products: !canAddProducts,
          shopifyStores: !canAddShopifyStore,
          campaigns: !canAddCampaign,
        },
        usage: currentUsage,
        limits,
        isTrialing,
        isPaid,
        planId: profile.current_plan_id,
        shouldForcePayment,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking usage limits:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});