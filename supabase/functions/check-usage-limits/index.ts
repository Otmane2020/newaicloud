import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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

    if (profileError) {
      console.error('[LIMITS] Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: TRANSLATIONS[lang].errorCheckingLimits }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      console.error('[LIMITS] No profile found for user');
      return new Response(
        JSON.stringify({ error: TRANSLATIONS[lang].errorCheckingLimits }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine if user is in trial or paid subscription
    // A user is in trial if:
    // 1. subscription_status === 'trialing', OR
    // 2. current_plan_id is NULL or 'trial', OR
    // 3. subscription_status is 'cancelled' or 'inactive'
    const isTrialing = profile.subscription_status === 'trialing' || 
                       !profile.current_plan_id ||
                       profile.current_plan_id === 'trial' ||
                       profile.subscription_status === 'cancelled' ||
                       profile.subscription_status === 'inactive';
    
    // A user is paid if:
    // - subscription_status === 'active' AND has a paid plan (not trial)
    const isPaid = profile.subscription_status === 'active' && 
                   profile.current_plan_id && 
                   profile.current_plan_id !== 'trial';
    
    console.log(`[LIMITS] User status - isTrialing: ${isTrialing}, isPaid: ${isPaid}, status: ${profile.subscription_status}, plan: ${profile.current_plan_id}`);
    
    // Get plan limits
    let plan;
    if (!isTrialing && profile.current_plan_id) {
      // User is NOT in trial and has paid plan - fetch it
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
      // User is in trial - use trial plan limits
      const { data: trialPlan, error: planError } = await supabaseClient
        .from('subscription_plans')
        .select('*')
        .eq('id', 'trial')
        .single();
      
      if (planError) {
        console.error('[LIMITS] Error fetching trial plan:', planError);
        throw new Error(TRANSLATIONS[lang].couldNotFetchPlan);
      }
      plan = trialPlan;
    }
    
    if (!plan) throw new Error(TRANSLATIONS[lang].noPlanConfiguration);
    
    console.log(`[LIMITS] Using plan: ${plan.id} - isTrialing: ${isTrialing}, isPaid: ${isPaid}`);

    // Get current month usage
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    const monthKey = currentMonth.toISOString().split('T')[0];

    const { data: usage, error: usageError } = await supabaseClient
      .from('usage_tracking')
      .select('*')
      .eq('seller_id', user.id)
      .eq('month', monthKey)
      .maybeSingle();

    if (usageError) {
      console.error('[LIMITS] Error fetching usage:', usageError);
      return new Response(
        JSON.stringify({ error: TRANSLATIONS[lang].errorCheckingLimits }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Si pas d'entrée pour ce mois, en créer une
    let currentUsage = usage;
    if (!currentUsage) {
      console.log('[LIMITS] Creating usage_tracking entry for current month');
      const { data: newUsage, error: createError } = await supabaseClient
        .from('usage_tracking')
        .insert({
          seller_id: user.id,
          month: monthKey,
          optimizations_count: 0,
          articles_count: 0,
          chat_responses_count: 0,
          shopify_requests_count: 0,
          products_count: 0,
          shopify_stores_count: 0,
          campaigns_count: 0,
        })
        .select()
        .single();
      
      if (createError) {
        console.error('[LIMITS] Error creating usage_tracking:', createError);
        // Fallback to default values if creation fails
        currentUsage = {
          optimizations_count: 0,
          articles_count: 0,
          chat_responses_count: 0,
          shopify_requests_count: 0,
          products_count: 0,
          shopify_stores_count: 0,
          campaigns_count: 0,
        };
      } else {
        currentUsage = newUsage;
      }
    }
    
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
        .eq('month', monthKey);
      
      if (updateError) {
        console.error('[LIMITS] Error updating products_count:', updateError);
      } else {
        console.log(`[LIMITS] ✅ Auto-corrected products_count from ${currentUsage.products_count} to ${realProductCount}`);
        currentUsage.products_count = realProductCount;
      }
    } else {
      console.log(`[LIMITS] ✅ Products count is consistent: ${realProductCount}`);
    }

    // Use plan limits directly (trial plan limits for trialing, paid plan limits for paid)
    const limits = {
      max_optimizations: plan.max_optimizations_monthly || 0,
      max_articles: plan.max_articles_monthly || 0,
      max_chat_responses: plan.max_chat_responses_monthly || 0,
      max_shopify_requests: plan.max_shopify_requests_monthly || 0,
      max_products: plan.max_products || 0,
      max_shopify_stores: plan.max_shopify_stores || 1,
      max_campaigns: plan.max_campaigns || 0,
    };
    
    console.log(`[LIMITS] ${isTrialing ? '🔴 TRIAL MODE' : '🟢 PAID MODE'} - Applied limits:`, limits);

    // Check if limits are reached
    // CRITICAL FIX: Trial users MUST respect the 50 optimization limit
    const canUseOptimizations = currentUsage.optimizations_count < limits.max_optimizations;
    const canUseArticles = currentUsage.articles_count < limits.max_articles;
    const canUseChat = currentUsage.chat_responses_count < limits.max_chat_responses;
    const canUseShopifySearch = currentUsage.shopify_requests_count < limits.max_shopify_requests;
    const canAddProducts = currentUsage.products_count < limits.max_products;
    const canAddShopifyStore = currentUsage.shopify_stores_count < limits.max_shopify_stores;
    const canAddCampaign = currentUsage.campaigns_count < limits.max_campaigns;
    
    console.log(`[LIMITS] Can use - optimizations: ${canUseOptimizations}, articles: ${canUseArticles}, chat: ${canUseChat}`);

    // SECURITY: Déterminer si le paiement est obligatoire (trial expiré)
    let shouldForcePayment = false;
    let forcePaymentReason = '';
    
    if (isTrialing && profile?.trial_ends_at) {
      const trialEnd = new Date(profile.trial_ends_at);
      const now = new Date();
      if (trialEnd < now) {
        shouldForcePayment = true;
        forcePaymentReason = 'trial_expired';
        // Bloquer TOUTES les actions après expiration du trial
        
        return new Response(
          JSON.stringify({
            canUseOptimizations: false,
            canUseArticles: false,
            canUseChat: false,
            canUseShopifySearch: false,
            canAddProducts: false,
            canAddShopifyStore: false,
            canUseCampaigns: false,
            limitReached: {
              optimizations: true,
              articles: true,
              chat: true,
              shopifySearch: true,
              products: true,
              shopifyStores: true,
              campaigns: true,
            },
            usage: currentUsage,
            limits,
            isTrialing,
            isPaid: false,
            planId: profile.current_plan_id,
            shouldForcePayment: true,
            forcePaymentReason: 'trial_expired',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        canUseOptimizations,
        canUseArticles,
        canUseChat,
        canUseShopifySearch,
        canAddProducts,
        canAddShopifyStore,
        canUseCampaigns: canAddCampaign,
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
        forcePaymentReason,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[LIMITS] Unexpected error in check-usage-limits:', error);
    
    // Try to detect language, fallback to 'en' if it fails
    let lang: 'fr' | 'en' = 'en';
    try {
      lang = detectLanguage(req);
    } catch (e) {
      console.error('[LIMITS] Could not detect language:', e);
    }
    
    const errorMessage = error instanceof Error ? error.message : TRANSLATIONS[lang].unknownError;
    console.error(`[LIMITS] ${TRANSLATIONS[lang].errorCheckingLimits}: ${errorMessage}`);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});