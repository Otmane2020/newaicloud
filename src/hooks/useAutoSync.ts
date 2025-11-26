import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAutoSyncProgress } from '@/contexts/AutoSyncContext';

// Failsafe timeout: 10 minutes for large imports
const FAILSAFE_MS = 10 * 60 * 1000;
// Stuck timeout: 2 minutes if no progress
const STUCK_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * Hook qui écoute les nouvelles connexions Shopify et déclenche automatiquement
 * la synchronisation pour TOUS les flux (OAuth et API)
 */
export const useAutoSync = (userId: string | undefined) => {
  const { startSync, endSync } = useAutoSyncProgress();
  const location = useLocation();
  const syncCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Track the specific sync ID we're monitoring
  const currentSyncIdRef = useRef<string | null>(null);
  // Debounce sync triggers to prevent double-triggering
  const lastConnectionEventRef = useRef<number>(0);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    let stuckTimeoutId: NodeJS.Timeout | null = null;

    console.log('🔄 [AutoSync] Monitoring new Shopify connections for user:', userId);
    
    // Check if there's a pending sync from onboarding page
    const pendingSync = sessionStorage.getItem('pending_sync');
    if (pendingSync && location.pathname === '/dashboard') {
      console.log('✅ [AutoSync] Found pending sync, showing dialog on dashboard:', pendingSync);
      sessionStorage.removeItem('pending_sync');
      startSync(pendingSync);
      
      // Poll sync_history to check when import is complete
      const checkSyncStatus = async () => {
        // Build query - if we have a specific sync ID, check only that one
        let query = supabase
          .from('sync_history')
          .select('id, status, items_synced, started_at')
          .eq('user_id', userId);
        
        // If we're tracking a specific sync, only check that one
        if (currentSyncIdRef.current) {
          query = query.eq('id', currentSyncIdRef.current);
        } else {
          // Otherwise, only check recent syncs (last 2 minutes) to avoid detecting old ones
          const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();
          query = query.gte('started_at', twoMinutesAgo);
        }
        
        const { data: latestSync } = await query
          .order('started_at', { ascending: false })
          .limit(1)
          .single();
        
        if (latestSync && (latestSync.status === 'success' || latestSync.status === 'failed')) {
          console.log('✅ [AutoSync] Import completed:', latestSync);
          
          // If this is the sync we were tracking, or if we're not tracking a specific one
          if (!currentSyncIdRef.current || currentSyncIdRef.current === latestSync.id) {
            currentSyncIdRef.current = null; // Reset tracking
            
            if (syncCheckIntervalRef.current) {
              clearInterval(syncCheckIntervalRef.current);
              syncCheckIntervalRef.current = null;
            }
            if (isMounted) {
              endSync();
              
              if (latestSync.status === 'success') {
                toast.success('Synchronisation terminée', {
                  description: `${latestSync.items_synced || 0} éléments importés avec succès`,
                });
              }
            }
          }
        }
      };
      
      // Check immediately then every 3 seconds
      checkSyncStatus();
      syncCheckIntervalRef.current = setInterval(checkSyncStatus, 3000);
      
      // Global stuck timeout: force close after 2 minutes if dialog is stuck
      stuckTimeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn('⚠️ [AutoSync] Dialog stuck for 2 minutes, forcing close');
          endSync();
          if (syncCheckIntervalRef.current) {
            clearInterval(syncCheckIntervalRef.current);
            syncCheckIntervalRef.current = null;
          }
        }
      }, STUCK_TIMEOUT_MS);
      
      // Failsafe: close dialog after 10 minutes for large imports
      setTimeout(() => {
        if (syncCheckIntervalRef.current) {
          clearInterval(syncCheckIntervalRef.current);
          syncCheckIntervalRef.current = null;
        }
        if (isMounted) {
          endSync();
        }
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
          if (!isMounted) return;
          
          console.log('🆕 [AutoSync] Shopify connection event:', payload.eventType, payload.new);
          
          const connection = payload.new as any;
          
          // Debounce: prevent multiple triggers within 8 seconds
          const now = Date.now();
          if (now - lastConnectionEventRef.current < 8000) {
            console.log('⏸️ [AutoSync] Debouncing connection event - too soon after last event');
            return;
          }
          
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

          // Mark this event as processed
          lastConnectionEventRef.current = now;

          // ✅ Pour TOUTES les connexions (OAuth ET Admin API), 
          // montrer le dialog et surveiller sync_history
          console.log('✅ [AutoSync] New connection detected, showing sync dialog');
          
          const storeName = connection.store_name || connection.store_url;
          
          const isExcludedPage =
            location.pathname.startsWith('/onboarding') ||
            location.pathname === '/auth' ||
            location.pathname === '/reset-password' ||
            location.pathname.startsWith('/shopify/');

          if (isExcludedPage) {
            console.log('⏭️ [AutoSync] On excluded page, storing sync for dashboard display');
            sessionStorage.setItem('pending_sync', storeName);
            return;
          }
          
          // Si on est déjà sur dashboard, afficher immédiatement et surveiller l'état
          console.log('✅ [AutoSync] Showing sync dialog and monitoring import');
          startSync(storeName);
          
          // Poll sync_history to check when import is complete
          const checkSyncStatus = async () => {
            // Build query - if we have a specific sync ID, check only that one
            let query = supabase
              .from('sync_history')
              .select('id, status, items_synced, started_at')
              .eq('user_id', userId);
            
            // If we're tracking a specific sync, only check that one
            if (currentSyncIdRef.current) {
              query = query.eq('id', currentSyncIdRef.current);
            } else {
              // Otherwise, only check recent syncs (last 2 minutes) to avoid detecting old ones
              const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();
              query = query.gte('started_at', twoMinutesAgo);
            }
            
            const { data: latestSync } = await query
              .order('started_at', { ascending: false })
              .limit(1)
              .single();
            
            if (latestSync && (latestSync.status === 'success' || latestSync.status === 'failed')) {
              console.log('✅ [AutoSync] Import completed:', latestSync);
              
              // If this is the sync we were tracking, or if we're not tracking a specific one
              if (!currentSyncIdRef.current || currentSyncIdRef.current === latestSync.id) {
                currentSyncIdRef.current = null; // Reset tracking
                
                if (syncCheckIntervalRef.current) {
                  clearInterval(syncCheckIntervalRef.current);
                  syncCheckIntervalRef.current = null;
                }
                if (isMounted) {
                  endSync();
                  
                  if (latestSync.status === 'success') {
                    toast.success('Synchronisation terminée', {
                      description: `${latestSync.items_synced || 0} éléments importés avec succès`,
                    });
                  }
                }
              }
            }
          };
          
          // Check immediately then every 3 seconds
          checkSyncStatus();
          syncCheckIntervalRef.current = setInterval(checkSyncStatus, 3000);
          
          // Global stuck timeout: force close after 2 minutes if dialog is stuck
          stuckTimeoutId = setTimeout(() => {
            if (isMounted) {
              console.warn('⚠️ [AutoSync] Dialog stuck for 2 minutes, forcing close');
              endSync();
              if (syncCheckIntervalRef.current) {
                clearInterval(syncCheckIntervalRef.current);
                syncCheckIntervalRef.current = null;
              }
            }
          }, STUCK_TIMEOUT_MS);
          
          // Failsafe: close dialog after 10 minutes for large imports
          setTimeout(() => {
            if (syncCheckIntervalRef.current) {
              clearInterval(syncCheckIntervalRef.current);
              syncCheckIntervalRef.current = null;
            }
            if (isMounted) {
              endSync();
            }
          }, FAILSAFE_MS);
        }
      )
      .subscribe((status) => {
        if (isMounted) {
          console.log('🔴 [AutoSync] Subscription status:', status);
        }
      });

    return () => {
      isMounted = false;
      console.log('⏹️ [AutoSync] Unsubscribing from connection changes');
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // Ignore cleanup errors during rapid navigation
        console.warn('[AutoSync] Cleanup warning:', e);
      }
      if (syncCheckIntervalRef.current) {
        clearInterval(syncCheckIntervalRef.current);
        syncCheckIntervalRef.current = null;
      }
      if (stuckTimeoutId) {
        clearTimeout(stuckTimeoutId);
      }
    };
  }, [userId, startSync, endSync, location.pathname]);

  // Reset sync state when navigating to auth / Shopify related pages
  useEffect(() => {
    const isExcludedPage =
      location.pathname === '/auth' ||
      location.pathname === '/reset-password' ||
      location.pathname.startsWith('/shopify/');

    if (isExcludedPage) {
      endSync();
    }
  }, [location.pathname, endSync]);
};
