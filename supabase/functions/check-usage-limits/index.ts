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

// Retry utility for database queries with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[LIMITS] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
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

    // Get user profile with retry logic
    let profile;
    let profileError;
    
    try {
      const result = await retryWithBackoff(async () => {
        console.log('[LIMITS] Fetching user profile...');
        const queryResult = await supabaseClient
          .from('profiles')
          .select('subscription_status, current_plan_id, trial_ends_at')
          .eq('id', user.id)
          .single();
        
        if (queryResult.error) {
          console.error('[LIMITS] Profile fetch error:', queryResult.error);
          throw new Error(`Profile query failed: ${queryResult.error.message}`);
        }
        
        if (!queryResult.data) {
          throw new Error('No profile data returned');
        }
        
        return queryResult.data;
      });
      
      profile = result;
    } catch (error) {
      profileError = error;
    }

    if (profileError) {
      console.error('[LIMITS] Profile error after retries:', profileError);
      throw new Error(`Failed to fetch user profile: ${profileError.message || 'Unknown error'}`);
    }

    if (!profile) {
      console.error('[LIMITS] No profile found for user:', user.id);
      throw new Error('User profile not found');
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
    
    // Get plan limits with retry logic
    let plan;
    if (!isTrialing && profile.current_plan_id) {
      // User is NOT in trial and has paid plan - fetch it
      try {
        const paidPlan = await retryWithBackoff(async () => {
          console.log('[LIMITS] Fetching paid plan...');
          const result = await supabaseClient
            .from('subscription_plans')
            .select('*')
            .eq('id', profile.current_plan_id)
            .single();
          
          if (result.error) {
            throw new Error(`Plan query failed: ${result.error.message}`);
          }
          
          return result.data;
        });
        
        plan = paidPlan;
      } catch (planError) {
        console.error('[LIMITS] Error fetching paid plan after retries:', planError);
        // Fallback to starter plan if paid plan not found
        try {
          const starterPlan = await retryWithBackoff(async () => {
            const result = await supabaseClient
              .from('subscription_plans')
              .select('*')
              .eq('id', 'starter')
              .single();
            
            if (result.error) throw new Error(`Starter plan query failed: ${result.error.message}`);
            return result.data;
          });
          plan = starterPlan;
        } catch (err) {
          console.error('[LIMITS] Failed to fetch fallback starter plan:', err);
          throw new Error(TRANSLATIONS[lang].couldNotFetchPlan);
        }
      }
    } else {
      // User is in trial - use trial plan limits
      try {
        const trialPlan = await retryWithBackoff(async () => {
          console.log('[LIMITS] Fetching trial plan...');
          const result = await supabaseClient
            .from('subscription_plans')
            .select('*')
            .eq('id', 'trial')
            .single();
          
          if (result.error) {
            throw new Error(`Trial plan query failed: ${result.error.message}`);
          }
          
          return result.data;
        });
        
        plan = trialPlan;
      } catch (planError) {
        console.error('[LIMITS] Error fetching trial plan after retries:', planError);
        throw new Error(TRANSLATIONS[lang].couldNotFetchPlan);
      }
    }
    
    if (!plan) throw new Error(TRANSLATIONS[lang].noPlanConfiguration);
    
    console.log(`[LIMITS] Using plan: ${plan.id} - isTrialing: ${isTrialing}, isPaid: ${isPaid}`);

    // Get current month usage with retry logic
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    const monthKey = currentMonth.toISOString().split('T')[0];

    let currentUsage;
    try {
      const usage = await retryWithBackoff(async () => {
        console.log('[LIMITS] Fetching usage tracking...');
        const result = await supabaseClient
          .from('usage_tracking')
          .select('*')
          .eq('seller_id', user.id)
          .eq('month', monthKey)
          .maybeSingle();
        
        // maybeSingle doesn't throw error if no rows, so just return data
        return result.data;
      });
      
      currentUsage = usage;
    } catch (err) {
      console.error('[LIMITS] Error fetching usage after retries:', err);
      // Continue with null usage, will create new entry below
      currentUsage = null;
    }

    // Si pas d'entrée pour ce mois, en créer une
    if (!currentUsage) {
      console.log('[LIMITS] Creating usage_tracking entry for current month');
      try {
        const newUsage = await retryWithBackoff(async () => {
          const result = await supabaseClient
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
          
          if (result.error) {
            throw new Error(`Usage insert failed: ${result.error.message}`);
          }
          
          return result.data;
        });
        
        currentUsage = newUsage;
      } catch (createError) {
        console.error('[LIMITS] Error creating usage entry after retries:', createError);
        // Use default values if creation fails
        currentUsage = {
          seller_id: user.id,
          month: monthKey,
          optimizations_count: 0,
          articles_count: 0,
          chat_responses_count: 0,
          shopify_requests_count: 0,
          products_count: 0,
          shopify_stores_count: 0,
          campaigns_count: 0,
        };
      }
    }
    
    console.log(`[LIMITS] Current usage from tracking:`, currentUsage);

    // Vérifier le compte réel de produits dans la base de données
    const { count: realProductCount, error: countError } = await supabaseClient
      .from('shopify_products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id);

    if (countError) {
      console.error('[LIMITS] Error counting real products:', {
        message: countError.message || 'Unknown error',
        details: countError.details || 'No details',
        hint: countError.hint || 'No hint',
        code: countError.code || 'No code'
      });
      // Continue without correcting products count if there's an error
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
    const lang = detectLanguage(req);
    console.error(`${TRANSLATIONS[lang].errorCheckingLimits}:`, {
      error,
      message: error instanceof Error ? error.message : 'No message',
      stack: error instanceof Error ? error.stack : 'No stack',
      type: typeof error,
      stringified: JSON.stringify(error, null, 2)
    });
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : (typeof error === 'object' && error !== null && 'message' in error)
        ? String((error as any).message)
        : TRANSLATIONS[lang].unknownError;
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage || TRANSLATIONS[lang].unknownError,
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});