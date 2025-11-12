import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRealtimeProductsProps {
  storeId?: string;
  onProductChanged?: () => void;
}

/**
 * Hook pour écouter les changements en temps réel sur les produits Shopify
 * via les webhooks Shopify et Supabase Realtime
 */
export const useRealtimeProducts = ({ storeId, onProductChanged }: UseRealtimeProductsProps) => {
  useEffect(() => {
    if (!storeId) return;

    console.log('🔴 [Realtime] Subscribing to product changes for store:', storeId);

    const channel = supabase
      .channel('product-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopify_products',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          console.log('🔄 [Realtime] Product change detected:', payload);
          onProductChanged?.();
        }
      )
      .subscribe((status) => {
        console.log('🔴 [Realtime] Subscription status:', status);
      });

    return () => {
      console.log('⏹️ [Realtime] Unsubscribing from product changes');
      supabase.removeChannel(channel);
    };
  }, [storeId, onProductChanged]);
};
