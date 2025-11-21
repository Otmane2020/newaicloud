import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAutoSyncProgress } from '@/contexts/AutoSyncContext';

// Failsafe timeout: 10 minutes for large imports
const FAILSAFE_MS = 10 * 60 * 1000;

/**
 * Hook qui écoute les nouvelles connexions Shopify et déclenche automatiquement
 * la synchronisation pour TOUS les flux (OAuth et API)
 */
export const useAutoSync = (userId: string | undefined) => {
  const { startSync, endSync } = useAutoSyncProgress();
  const location = useLocation();
  const syncCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;

    console.log('🔄 [AutoSync] Monitoring new Shopify connections for user:', userId);

    // Check if there's a pending sync from onboarding page
    const pendingSync = sessionStorage.getItem('pending_sync');
    if (pendingSync && location.pathname === '/dashboard') {
      console.log('✅ [AutoSync] Found pending sync, showing dialog on dashboard:', pendingSync);
      sessionStorage.removeItem('pending_sync');
      startSync(pendingSync);
      
      // Poll sync_history to check when import is complete
      const checkSyncStatus = async () => {
        const { data: latestSync } = await supabase
          .from('sync_history')
          .select('status, items_synced')
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .limit(1)
          .single();
        
        if (latestSync && (latestSync.status === 'success' || latestSync.status === 'failed')) {
          console.log('✅ [AutoSync] Import completed:', latestSync);
          if (syncCheckIntervalRef.current) {
            clearInterval(syncCheckIntervalRef.current);
            syncCheckIntervalRef.current = null;
          }
          endSync();
          
          if (latestSync.status === 'success') {
            toast.success('Synchronisation terminée', {
              description: `${latestSync.items_synced || 0} éléments importés avec succès`,
            });
          }
        }
      };
      
      // Check immediately then every 3 seconds
      checkSyncStatus();
      syncCheckIntervalRef.current = setInterval(checkSyncStatus, 3000);
      
      // Failsafe: close dialog after 10 minutes for large imports
      setTimeout(() => {
        if (syncCheckIntervalRef.current) {
          clearInterval(syncCheckIntervalRef.current);
          syncCheckIntervalRef.current = null;
        }
        endSync();
      }, FAILSAFE_MS);
    }

    // Écouter les insertions ET updates dans shopify_connections
    const channel = supabase
      .channel('shopify-connection-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Écouter INSERT et UPDATE
          schema: 'public',
          table: 'shopify_connections',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('🆕 [AutoSync] Shopify connection event:', payload.eventType, payload.new);
          
          const connection = payload.new as any;
          
          // Ne déclencher que si c'est une vraie nouvelle connexion (INSERT) 
          // ou un UPDATE qui vient juste d'être connecté
          const isNewConnection = payload.eventType === 'INSERT';
          const isJustConnected = payload.eventType === 'UPDATE' && 
                                 connection.connected_at && 
                                 new Date(connection.connected_at).getTime() > Date.now() - 5000;
          
          if (!isNewConnection && !isJustConnected) {
            console.log('⏭️ [AutoSync] Skipping - not a new connection');
            return;
          }

          // ✅ Pour TOUTES les connexions (OAuth ET Admin API), 
          // montrer le dialog et surveiller sync_history
          console.log('✅ [AutoSync] New connection detected, showing sync dialog');
          
          const storeName = connection.store_name || connection.store_url;
          
          // Si on est sur /onboarding, stocker pour afficher après redirection
          if (location.pathname.startsWith('/onboarding')) {
            console.log('⏭️ [AutoSync] On onboarding page, storing sync for dashboard display');
            sessionStorage.setItem('pending_sync', storeName);
            return;
          }
          
          // Si on est déjà sur dashboard, afficher immédiatement et surveiller l'état
          console.log('✅ [AutoSync] Showing sync dialog and monitoring import');
          startSync(storeName);
          
          // Poll sync_history to check when import is complete
          const checkSyncStatus = async () => {
            const { data: latestSync } = await supabase
              .from('sync_history')
              .select('status, items_synced')
              .eq('user_id', userId)
              .order('started_at', { ascending: false })
              .limit(1)
              .single();
            
            if (latestSync && (latestSync.status === 'success' || latestSync.status === 'failed')) {
              console.log('✅ [AutoSync] Import completed:', latestSync);
              if (syncCheckIntervalRef.current) {
                clearInterval(syncCheckIntervalRef.current);
                syncCheckIntervalRef.current = null;
              }
              endSync();
              
              if (latestSync.status === 'success') {
                toast.success('Synchronisation terminée', {
                  description: `${latestSync.items_synced || 0} éléments importés avec succès`,
                });
              }
            }
          };
          
          // Check immediately then every 3 seconds
          checkSyncStatus();
          syncCheckIntervalRef.current = setInterval(checkSyncStatus, 3000);
          
          // Failsafe: close dialog after 10 minutes for large imports
          setTimeout(() => {
            if (syncCheckIntervalRef.current) {
              clearInterval(syncCheckIntervalRef.current);
              syncCheckIntervalRef.current = null;
            }
            endSync();
          }, FAILSAFE_MS);
        }
      )
      .subscribe((status) => {
        console.log('🔴 [AutoSync] Subscription status:', status);
      });

    return () => {
      console.log('⏹️ [AutoSync] Unsubscribing from connection changes');
      supabase.removeChannel(channel);
      if (syncCheckIntervalRef.current) {
        clearInterval(syncCheckIntervalRef.current);
        syncCheckIntervalRef.current = null;
      }
    };
  }, [userId, startSync, endSync, location.pathname]);
};
