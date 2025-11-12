import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRealtimeCollectionsProps {
  storeId?: string;
  onCollectionChanged?: () => void;
}

/**
 * Hook pour écouter les changements en temps réel sur les collections Shopify
 * via les webhooks Shopify et Supabase Realtime
 */
export const useRealtimeCollections = ({ storeId, onCollectionChanged }: UseRealtimeCollectionsProps) => {
  useEffect(() => {
    if (!storeId) return;

    console.log('🔴 [Realtime] Subscribing to collection changes for store:', storeId);

    const channel = supabase
      .channel('collection-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopify_collections',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          console.log('🔄 [Realtime] Collection change detected:', payload);
          onCollectionChanged?.();
        }
      )
      .subscribe((status) => {
        console.log('🔴 [Realtime] Subscription status:', status);
      });

    return () => {
      console.log('⏹️ [Realtime] Unsubscribing from collection changes');
      supabase.removeChannel(channel);
    };
  }, [storeId, onCollectionChanged]);
};
