import { useQuery } from '@tanstack/react-query';
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

const fetchUsageLimits = async (): Promise<UsageLimits> => {
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
  
  return {
    ...data,
    trialEndsAt: profileData?.trial_ends_at || null,
    currentPlanId: profileData?.current_plan_id || null,
    subscriptionStatus: profileData?.subscription_status || null,
  };
};

export const useUsageLimits = () => {
  const { data: limits, isLoading: loading, refetch } = useQuery({
    queryKey: ['usageLimits'],
    queryFn: fetchUsageLimits,
    staleTime: 30000, // 30 seconds - don't refetch for 30s
    gcTime: 300000, // 5 minutes - keep in cache for 5 min
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 8000),
  });

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
    canDoAction,
    refresh: () => refetch(),
  };
};
