import { useEffect, useState } from 'react';
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

// Client-side cache with 30-second expiry
let cachedLimits: UsageLimits | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 seconds

const fetchUsageLimits = async (): Promise<UsageLimits> => {
  // Return cached data if still fresh
  const now = Date.now();
  if (cachedLimits && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedLimits;
  }

  // First verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('User not authenticated');
  }
  
  // Get current session with token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session?.access_token) {
    throw new Error('No valid session');
  }
  
  // Call edge function with explicit authorization
  const { data, error } = await supabase.functions.invoke('check-usage-limits', {
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });
  
  if (error) {
    throw error;
  }
  
  // Récupérer les infos du profil pour le trial
  const { data: profileData } = await supabase
    .from('profiles')
    .select('current_plan_id, subscription_status, trial_ends_at')
    .eq('id', user.id)
    .single();
  
  const result = {
    ...data,
    trialEndsAt: profileData?.trial_ends_at || null,
    currentPlanId: profileData?.current_plan_id || null,
    subscriptionStatus: profileData?.subscription_status || null,
  };

  // Update cache
  cachedLimits = result;
  cacheTimestamp = Date.now();
  
  return result;
};

export const useUsageLimits = () => {
  const [limits, setLimits] = useState<UsageLimits | null>(cachedLimits);
  const [loading, setLoading] = useState(!cachedLimits);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await fetchUsageLimits();
      setLimits(data);
      setError(null);
    } catch (err) {
      console.error('[useUsageLimits] Error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      
      // Keep cached data on error
      if (cachedLimits) {
        setLimits(cachedLimits);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
    limits: limits || null,
    loading,
    error,
    canDoAction,
    refresh: fetchData,
  };
};
