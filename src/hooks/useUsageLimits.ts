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
}

export const useUsageLimits = () => {
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);

  const checkLimits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('check-usage-limits');
      
      if (error) throw error;
      
      setLimits(data);
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