import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsageLimits {
  canUseOptimizations: boolean;
  canUseArticles: boolean;
  canUseChat: boolean;
  canUseShopifySearch: boolean;
  canAddProducts: boolean;
  canAddShopifyStore: boolean;
  canUseCampaigns: boolean;
  limitReached: {
    optimizations: boolean;
    articles: boolean;
    chat: boolean;
    shopifySearch: boolean;
    products: boolean;
    campaigns: boolean;
    shopifyStores: boolean;
  };
  usage: {
    optimizations_count: number;
    articles_count: number;
    chat_responses_count: number;
    shopify_requests_count: number;
    products_count: number;
    shopify_stores_count: number;
    campaigns_count: number;
  };
  limits: {
    max_optimizations: number;
    max_articles: number;
    max_chat_responses: number;
    max_shopify_requests: number;
    max_products: number;
    max_shopify_stores: number;
    max_campaigns: number;
  };
  isTrialing: boolean;
  isPaid: boolean;
  planId: string;
  trialEndsAt: string | null;
  currentPlanId: string | null;
  subscriptionStatus: string | null;
  shouldForcePayment: boolean;
}

export const useUsageLimits = () => {
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);

  const checkLimits = async (retryCount = 0, maxRetries = 3) => {
    try {
      setLoading(true);
      
      // CRITICAL: First verify user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.log('[useUsageLimits] User not authenticated, skipping limits check');
        setLoading(false);
        return;
      }
      
      // Get current session with token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.log('[useUsageLimits] No valid session or token, skipping limits check');
        setLoading(false);
        return;
      }
      
      // Call edge function with explicit authorization header and timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        const { data, error } = await supabase.functions.invoke('check-usage-limits', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        
        clearTimeout(timeoutId);
        
        if (error) {
          throw error;
        }
        
        // Récupérer les infos du profil pour le trial
        const { data: profileData } = await supabase
          .from('profiles')
          .select('current_plan_id, subscription_status, trial_ends_at')
          .eq('id', user.id)
          .single();
        
        const enrichedData = {
          ...data,
          trialEndsAt: profileData?.trial_ends_at || null,
          currentPlanId: profileData?.current_plan_id || null,
          subscriptionStatus: profileData?.subscription_status || null,
        };
        
        setLimits(enrichedData);
      } catch (invokeError) {
        clearTimeout(timeoutId);
        throw invokeError;
      }
    } catch (error) {
      console.error(`[useUsageLimits] Error checking usage limits (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
      
      // Retry with exponential backoff for network/timeout errors
      if (retryCount < maxRetries) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isNetworkError = errorMessage.includes('Network') || 
                              errorMessage.includes('timeout') || 
                              errorMessage.includes('connection lost') ||
                              errorMessage.includes('500');
        
        if (isNetworkError) {
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 8000); // Max 8 seconds
          console.log(`[useUsageLimits] Retrying in ${backoffDelay}ms...`);
          
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          return checkLimits(retryCount + 1, maxRetries);
        }
      }
      
      // If all retries failed or not a network error, log and give up
      console.error('[useUsageLimits] Failed after all retries or non-retryable error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkLimits();
  }, []);

  const canDoAction = (action: 'optimizations' | 'articles' | 'chat' | 'shopifySearch' | 'products' | 'shopifyStores' | 'campaigns') => {
    const actionMap = {
      optimizations: 'canUseOptimizations',
      articles: 'canUseArticles',
      chat: 'canUseChat',
      shopifySearch: 'canUseShopifySearch',
      products: 'canAddProducts',
      shopifyStores: 'canAddShopifyStore',
      campaigns: 'canUseCampaigns',
    };
    
    return limits?.[actionMap[action] as keyof UsageLimits] as boolean || false;
  };

  return {
    limits,
    loading,
    canDoAction,
    refresh: checkLimits,
  };
};
