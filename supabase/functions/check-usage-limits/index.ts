import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Multilingual translations
const TRANSLATIONS = {
  fr: {
    noAuthHeader: 'Aucun en-tête d\'autorisation',
    unauthorized: 'Non autorisé',
    couldNotFetchPlan: 'Impossible de récupérer les limites du plan',
    noPlanConfiguration: 'Aucune configuration de plan trouvée',
    unknownError: 'Erreur inconnue',
    errorCheckingLimits: 'Erreur lors de la vérification des limites d\'utilisation',
  },
  en: {
    noAuthHeader: 'No authorization header',
    unauthorized: 'Unauthorized',
    couldNotFetchPlan: 'Could not fetch plan limits',
    noPlanConfiguration: 'No plan configuration found',
    unknownError: 'Unknown error',
    errorCheckingLimits: 'Error checking usage limits',
  },
};

function detectLanguage(req: Request): 'fr' | 'en' {
  const acceptLanguage = req.headers.get('Accept-Language') || '';
  return acceptLanguage.toLowerCase().includes('fr') ? 'fr' : 'en';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lang = detectLanguage(req);
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[LIMITS] No authorization header');
      throw new Error(TRANSLATIONS[lang].noAuthHeader);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('[LIMITS] Auth error:', userError);
      throw new Error(TRANSLATIONS[lang].unauthorized);
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('subscription_status, current_plan_id, trial_ends_at')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // Determine if user is in trial or paid subscription
    // Only consider subscription_status, ignore trial_ends_at if status is active
    const isTrialing = profile.subscription_status === 'trialing';
    const isPaid = profile.subscription_status === 'active';
    
    console.log(`[LIMITS] User status - isTrialing: ${isTrialing}, isPaid: ${isPaid}, status: ${profile.subscription_status}, trialEndsAt: ${profile.trial_ends_at}`);
    
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
      
      if (planError) throw new Error(TRANSLATIONS[lang].couldNotFetchPlan);
      plan = anyPlan;
    }
    
    if (!plan) throw new Error(TRANSLATIONS[lang].noPlanConfiguration);
    
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
    
    console.log(`[LIMITS] Current usage from tracking:`, currentUsage);

    // Vérifier le compte réel de produits dans la base de données
    const { count: realProductCount, error: countError } = await supabaseClient
      .from('shopify_products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id);

    if (countError) {
      console.error('[LIMITS] Error counting real products:', countError);
    } else if (realProductCount !== null && currentUsage.products_count !== realProductCount) {
      console.warn(`[LIMITS] ⚠️ Inconsistency detected: usage_tracking shows ${currentUsage.products_count} products but real count is ${realProductCount}`);
      
      // Corriger automatiquement usage_tracking
      const { error: updateError } = await supabaseClient
        .from('usage_tracking')
        .update({ 
          products_count: realProductCount,
          updated_at: new Date().toISOString()
        })
        .eq('seller_id', user.id)
        .eq('month', currentMonth.toISOString().split('T')[0]);
      
      if (updateError) {
        console.error('[LIMITS] Error updating products_count:', updateError);
      } else {
        console.log(`[LIMITS] ✅ Auto-corrected products_count from ${currentUsage.products_count} to ${realProductCount}`);
        currentUsage.products_count = realProductCount;
      }
    } else {
      console.log(`[LIMITS] ✅ Products count is consistent: ${realProductCount}`);
    }

    // Determine limits based on subscription status
    let limits;
    if (isTrialing) {
      limits = {
        max_optimizations: plan.trial_max_optimizations || 999999, // Unlimited, checked per-product
        max_articles: plan.trial_max_articles || 1,
        max_chat_responses: plan.trial_max_chat_responses || 50,
        max_shopify_requests: plan.trial_max_shopify_requests || 20,
        max_products: plan.trial_max_products || 10,
        max_shopify_stores: 1,
        max_campaigns: 0, // No campaigns in trial
      };
    } else {
      limits = {
        max_optimizations: plan.max_optimizations_monthly || 999999,
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
    // For trial users, optimizations are unlimited but checked per-product in each edge function
    const canUseOptimizations = isTrialing ? true : currentUsage.optimizations_count < limits.max_optimizations;
    const canUseArticles = currentUsage.articles_count < limits.max_articles;
    const canUseChat = currentUsage.chat_responses_count < limits.max_chat_responses;
    const canUseShopifySearch = currentUsage.shopify_requests_count < limits.max_shopify_requests;
    const canAddProducts = currentUsage.products_count < limits.max_products;
    const canAddShopifyStore = currentUsage.shopify_stores_count < limits.max_shopify_stores;
    const canAddCampaign = currentUsage.campaigns_count < limits.max_campaigns;
    
    console.log(`[LIMITS] Can use - optimizations: ${canUseOptimizations}, articles: ${canUseArticles}, chat: ${canUseChat}`);

    // Only force payment if ALL primary features are blocked (not just one)
    const shouldForcePayment = isTrialing && (!canUseOptimizations && !canUseArticles && !canUseChat);

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
    const lang = detectLanguage(req);
    console.error(`${TRANSLATIONS[lang].errorCheckingLimits}:`, error);
    const errorMessage = error instanceof Error ? error.message : TRANSLATIONS[lang].unknownError;
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});