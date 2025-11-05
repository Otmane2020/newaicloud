import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsageLimits {
  canUseOptimizations: boolean;
  canUseArticles: boolean;
  canUseChat: boolean;
  canUseShopifySearch: boolean;
  canAddProducts: boolean;
  canAddShopifyStore: boolean;
  limitReached: {
    optimizations: boolean;
    articles: boolean;
    chat: boolean;
    shopifySearch: boolean;
    products: boolean;
    shopifyStores: boolean;
  };
  usage: {
    optimizations_count: number;
    articles_count: number;
    chat_responses_count: number;
    shopify_requests_count: number;
    products_count: number;
    shopify_stores_count: number;
  };
  limits: {
    max_optimizations: number;
    max_articles: number;
    max_chat_responses: number;
    max_shopify_requests: number;
    max_products: number;
    max_shopify_stores: number;
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

  const checkLimits = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('check-usage-limits');
      
      if (error) throw error;
      
      // Récupérer les infos du profil pour le trial
      const { data: profileData } = await supabase
        .from('profiles')
        .select('current_plan_id, subscription_status, trial_ends_at')
        .eq('id', user.user?.id)
        .single();
      
      // Le compte réel est maintenant géré par check-usage-limits
      // qui corrige automatiquement usage_tracking en cas d'incohérence
      const enrichedData = {
        ...data,
        trialEndsAt: profileData?.trial_ends_at || null,
        currentPlanId: profileData?.current_plan_id || null,
        subscriptionStatus: profileData?.subscription_status || null,
      };
      
      setLimits(enrichedData);
    } catch (error) {
      console.error('Error checking usage limits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkLimits();
  }, []);

  const canDoAction = (action: 'optimizations' | 'articles' | 'chat' | 'shopifySearch' | 'products' | 'shopifyStores') => {
    const actionMap = {
      optimizations: 'canUseOptimizations',
      articles: 'canUseArticles',
      chat: 'canUseChat',
      shopifySearch: 'canUseShopifySearch',
      products: 'canAddProducts',
      shopifyStores: 'canAddShopifyStore',
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