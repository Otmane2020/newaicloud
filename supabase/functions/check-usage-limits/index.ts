import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('[LIMITS] Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[LIMITS] No authorization header');
      throw new Error(TRANSLATIONS[lang].noAuthHeader);
    }
    
    // Create client with ANON key and authorization header to validate user token
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { 
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false } 
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('[LIMITS] Auth error details:', {
        error: userError,
        hasUser: !!user,
        authHeader: authHeader?.substring(0, 20) + '...',
      });
      
      // Return 401 instead of throwing to provide better error feedback
      return new Response(
        JSON.stringify({ 
          error: TRANSLATIONS[lang].unauthorized,
          details: 'Invalid or expired authentication token. Please sign in again.',
          code: 'AUTH_ERROR'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { persistSession: false } }
    );

    // ⚡ Fetch profile, usage, and product count with increased timeout
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    const monthKey = currentMonth.toISOString().split('T')[0];

    console.log('[LIMITS] Starting database queries...');

    // Fetch profile first (fastest query)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, current_plan_id, trial_ends_at')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[LIMITS] Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: TRANSLATIONS[lang].errorCheckingLimits }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[LIMITS] Profile fetched successfully');

    // Fetch usage data
    const { data: usageData, error: usageError } = await supabaseAdmin
      .from('usage_tracking')
      .select('*')
      .eq('seller_id', user.id)
      .eq('month', monthKey)
      .maybeSingle();

    console.log('[LIMITS] Usage data fetched:', usageError ? 'ERROR' : 'SUCCESS');

    // Get product count (no timeout needed, just count)
    const { count: productCount, error: countError } = await supabaseAdmin
      .from('shopify_products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id);

    console.log('[LIMITS] Product count fetched:', countError ? 'ERROR' : 'SUCCESS', productCount);

    // Determine trial/paid status
    const isTrialing = profile.subscription_status === 'trialing' || 
                       !profile.current_plan_id ||
                       profile.current_plan_id === 'trial' ||
                       profile.subscription_status === 'cancelled' ||
                       profile.subscription_status === 'inactive';
    
    const isPaid = profile.subscription_status === 'active' && 
                   profile.current_plan_id && 
                   profile.current_plan_id !== 'trial';
    
    console.log(`[LIMITS] User status - isTrialing: ${isTrialing}, isPaid: ${isPaid}, status: ${profile.subscription_status}, plan: ${profile.current_plan_id}`);
    
    // Handle usage tracking
    let currentUsage = {
      optimizations_count: 0,
      articles_count: 0,
      chat_responses_count: 0,
      shopify_requests_count: 0,
      products_count: 0,
      shopify_stores_count: 0,
      campaigns_count: 0,
    };
    
    if (usageData) {
      currentUsage = usageData;
    } else {
      console.log('[LIMITS] No usage data found, creating new entry');
      try {
        const { data: newUsage } = await supabaseAdmin
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
        
        if (newUsage) {
          currentUsage = newUsage;
        }
      } catch (insertErr) {
        console.error('[LIMITS] Error inserting usage data:', insertErr);
      }
    }
    
    console.log(`[LIMITS] Current usage:`, currentUsage);

    // Auto-correct product count if needed
    const realProductCount = productCount || 0;
    if (currentUsage.products_count !== realProductCount) {
      console.warn(`[LIMITS] ⚠️ Correcting products_count: ${currentUsage.products_count} → ${realProductCount}`);
      await supabaseAdmin
        .from('usage_tracking')
        .update({ products_count: realProductCount, updated_at: new Date().toISOString() })
        .eq('seller_id', user.id)
        .eq('month', monthKey);
      currentUsage.products_count = realProductCount;
    }
    
    // ⚡ Fetch plan (trial or paid)
    const planId = (!isTrialing && profile.current_plan_id) ? profile.current_plan_id : 'trial';
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    // CRITICAL FIX: Return proper response with currentUsage already initialized
    if (planError || !plan) {
      console.error('[LIMITS] Error fetching plan:', planError, 'planId:', planId);
      console.error('[LIMITS] Falling back to default trial limits');
      
      // Use conservative trial limits as fallback
      const defaultLimits = {
        max_optimizations: 50,
        max_articles: 1,
        max_chat_responses: 50,
        max_shopify_requests: 20,
        max_products: 10,
        max_shopify_stores: 1,
        max_campaigns: 0,
      };
      
      return new Response(
        JSON.stringify({
          canUseOptimizations: currentUsage.optimizations_count < defaultLimits.max_optimizations,
          canUseArticles: currentUsage.articles_count < defaultLimits.max_articles,
          canUseChat: currentUsage.chat_responses_count < defaultLimits.max_chat_responses,
          canUseShopifySearch: currentUsage.shopify_requests_count < defaultLimits.max_shopify_requests,
          canAddProducts: currentUsage.products_count < defaultLimits.max_products,
          canAddShopifyStore: currentUsage.shopify_stores_count < defaultLimits.max_shopify_stores,
          canUseCampaigns: currentUsage.campaigns_count < defaultLimits.max_campaigns,
          limitReached: {
            optimizations: currentUsage.optimizations_count >= defaultLimits.max_optimizations,
            articles: currentUsage.articles_count >= defaultLimits.max_articles,
            chat: currentUsage.chat_responses_count >= defaultLimits.max_chat_responses,
            shopifySearch: currentUsage.shopify_requests_count >= defaultLimits.max_shopify_requests,
            products: currentUsage.products_count >= defaultLimits.max_products,
            shopifyStores: currentUsage.shopify_stores_count >= defaultLimits.max_shopify_stores,
            campaigns: currentUsage.campaigns_count >= defaultLimits.max_campaigns,
          },
          usage: currentUsage,
          limits: defaultLimits,
          isTrialing: true,
          isPaid: false,
          planId: 'trial',
          shouldForcePayment: false,
          forcePaymentReason: '',
          warning: 'Plan not found, using default trial limits',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[LIMITS] Using plan: ${plan.id} - isTrialing: ${isTrialing}, isPaid: ${isPaid}`);

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
    // Ultra-defensive error handling
    console.error('[LIMITS] ❌ CRITICAL ERROR in check-usage-limits');
    
    // Log raw error first
    console.error('[LIMITS] Raw error:', error);
    
    // Try to extract error details
    let errorName = 'Unknown';
    let errorMessage = 'An unknown error occurred';
    let errorStack = 'No stack trace';
    
    try {
      errorName = error instanceof Error ? error.name : typeof error;
      errorMessage = error instanceof Error ? error.message : String(error);
      errorStack = error instanceof Error ? (error.stack || 'No stack') : 'Not an Error object';
      
      console.error('[LIMITS] Error name:', errorName);
      console.error('[LIMITS] Error message:', errorMessage);
      console.error('[LIMITS] Error stack:', errorStack);
    } catch (loggingError) {
      console.error('[LIMITS] Failed to log error details:', loggingError);
    }
    
    // Detect language with fallback
    let lang: 'fr' | 'en' = 'en';
    try {
      const acceptLanguage = req.headers.get('Accept-Language');
      if (acceptLanguage && acceptLanguage.toLowerCase().includes('fr')) {
        lang = 'fr';
      }
    } catch (langError) {
      console.error('[LIMITS] Language detection failed, using English');
    }
    
    // Build safe response
    const responseData = {
      error: lang === 'fr' ? 'Erreur lors de la vérification des limites' : 'Error checking usage limits',
      message: errorMessage,
      details: errorName,
      timestamp: new Date().toISOString()
    };
    
    console.error('[LIMITS] Returning error response:', responseData);
    
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 500, 
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          'Content-Type': 'application/json'
        } 
      }
    );
  }
});