import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopifySync } from './useShopifySync';
import { toast } from 'sonner';

/**
 * Hook qui écoute les nouvelles connexions Shopify et déclenche automatiquement
 * la synchronisation pour tous les flux (OAuth et API)
 */
export const useAutoSync = (userId: string | undefined) => {
  const { syncShopifyStore } = useShopifySync();

  useEffect(() => {
    if (!userId) return;

    console.log('🔄 [AutoSync] Monitoring new Shopify connections for user:', userId);

    // Écouter les nouvelles insertions dans shopify_connections
    const channel = supabase
      .channel('shopify-connection-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shopify_connections',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('🆕 [AutoSync] New Shopify connection detected:', payload.new);
          
          const newConnection = payload.new as any;
          
          // Attendre un peu que la connexion soit complètement établie
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          toast.info("Synchronisation automatique en cours...", { 
            duration: 5000 
          });

          try {
            await syncShopifyStore({
              id: newConnection.id,
              store_url: newConnection.store_url,
              store_name: newConnection.store_name || newConnection.store_url,
            });
            
            console.log('✅ [AutoSync] Automatic sync completed for:', newConnection.store_name);
          } catch (error) {
            console.error('❌ [AutoSync] Error during automatic sync:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔴 [AutoSync] Subscription status:', status);
      });

    return () => {
      console.log('⏹️ [AutoSync] Unsubscribing from connection changes');
      supabase.removeChannel(channel);
    };
  }, [userId, syncShopifyStore]);
};
