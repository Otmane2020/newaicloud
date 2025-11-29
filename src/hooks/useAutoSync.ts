import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAutoSyncProgress } from '@/contexts/AutoSyncContext';
import { useTranslation } from '@/lib/language';

// Failsafe timeout: 10 minutes for large imports
const FAILSAFE_MS = 10 * 60 * 1000;
// Stuck timeout: 2 minutes if no progress
const STUCK_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * Hook qui écoute les nouvelles connexions Shopify et déclenche automatiquement
 * la synchronisation pour TOUS les flux (OAuth et API)
 */
export const useAutoSync = (userId: string | undefined) => {
  const { startSync, completeSync, endSync, updateType } = useAutoSyncProgress();
  const location = useLocation();
  const { t, tf } = useTranslation();
  const syncCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Track the specific sync ID we're monitoring
  const currentSyncIdRef = useRef<string | null>(null);
  // Debounce sync triggers to prevent double-triggering
  const lastConnectionEventRef = useRef<number>(0);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    let stuckTimeoutId: NodeJS.Timeout | null = null;
    let failsafeTimeoutId: NodeJS.Timeout | null = null;

    console.log('🔄 [AutoSync] Monitoring new Shopify connections for user:', userId);
    
    // Helper to check sync status and handle completion
    const checkSyncStatus = async () => {
      console.log('🔍 [AutoSync] Checking sync status...');
      
      // Query syncs for this user - check both by ID and recent ones
      let latestSync = null;
      
      // If we have a specific sync ID, check it first
      if (currentSyncIdRef.current) {
        const { data, error } = await supabase
          .from('sync_history')
          .select('id, status, items_synced, started_at, sync_type, completed_at')
          .eq('id', currentSyncIdRef.current)
          .maybeSingle();
        
        if (!error && data) {
          latestSync = data;
          console.log('📊 [AutoSync] Found tracked sync:', latestSync.id, 'status:', latestSync.status);
        }
      }
      
      // Fallback: Check most recent sync (extend window to 10 minutes for large imports)
      if (!latestSync) {
        const tenMinutesAgo = new Date(Date.now() - 600000).toISOString();
        const { data, error } = await supabase
          .from('sync_history')
          .select('id, status, items_synced, started_at, sync_type, completed_at')
          .eq('user_id', userId)
          .gte('started_at', tenMinutesAgo)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (!error && data) {
          latestSync = data;
          // Track this sync ID for future checks
          if (!currentSyncIdRef.current) {
            currentSyncIdRef.current = data.id;
          }
          console.log('📊 [AutoSync] Found recent sync:', latestSync.id, 'status:', latestSync.status);
        }
      }
      
      if (!latestSync) {
        console.log('⚠️ [AutoSync] No sync record found');
        return false;
      }
      
      console.log('📊 [AutoSync] Sync status check:', {
        id: latestSync.id,
        status: latestSync.status,
        sync_type: latestSync.sync_type,
        items_synced: latestSync.items_synced,
        completed_at: latestSync.completed_at,
      });
      
      // Check completion: status is success/failed OR completed_at is set
      const isCompleted = 
        latestSync.status === 'success' || 
        latestSync.status === 'failed' ||
        !!latestSync.completed_at;
      
      if (isCompleted) {
        console.log('✅ [AutoSync] Import terminé! Status:', latestSync.status, 'Items:', latestSync.items_synced);
        
        // Clear the tracking ref
        currentSyncIdRef.current = null;
        
        if (syncCheckIntervalRef.current) {
          clearInterval(syncCheckIntervalRef.current);
          syncCheckIntervalRef.current = null;
        }
        
        if (stuckTimeoutId) {
          clearTimeout(stuckTimeoutId);
          stuckTimeoutId = null;
        }
        
        if (failsafeTimeoutId) {
          clearTimeout(failsafeTimeoutId);
          failsafeTimeoutId = null;
        }
        
        if (isMounted) {
          const isSuccess = latestSync.status === 'success';
          
          if (isSuccess) {
            completeSync(latestSync.items_synced || 0);
            toast.success(t.dialogs.autoSync.syncComplete, {
              description: tf('dialogs.autoSync.itemsImported', { count: latestSync.items_synced || 0 }),
            });
          } else {
            endSync();
            toast.error(t.toasts.error.sync || 'Synchronization error', {
              description: t.toasts.error.generic || 'An error occurred',
            });
          }
        }
        return true;
      }
      
      // Update type for progress display based on sync_type
      if (latestSync.sync_type && latestSync.status === 'running') {
        updateType(latestSync.sync_type);
      }
      
      return false;
    };
    
    // Détecte si l'utilisateur vient de Shopify "Open app" (host= sans pending_token)
    const comingFromShopifyOpenApp = location.search.includes('host=') && 
                                      !location.search.includes('pending_token');
    
    if (comingFromShopifyOpenApp) {
      console.log('⏭️ [AutoSync] Coming from Shopify Open app - skipping auto-sync');
      return;
    }
    
    // Check if there's a pending sync from onboarding page
    const pendingSync = sessionStorage.getItem('pending_sync');
    if (pendingSync && location.pathname === '/dashboard') {
      console.log('✅ [AutoSync] Found pending sync, showing dialog on dashboard:', pendingSync);
      sessionStorage.removeItem('pending_sync');
      startSync(pendingSync);
      
      // Try to find the sync ID for better tracking
      const findSyncId = async () => {
        const { data: syncRecords } = await supabase
          .from('sync_history')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'running')
          .order('started_at', { ascending: false })
          .limit(1);
        
        if (syncRecords?.[0]?.id) {
          currentSyncIdRef.current = syncRecords[0].id;
          console.log('🔗 [AutoSync] Tracking sync ID:', currentSyncIdRef.current);
        }
      };
      findSyncId();
      
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
      failsafeTimeoutId = setTimeout(() => {
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
          // ou un UPDATE qui vient juste d'être connecté (OAuth flow)
          // ou un UPDATE avec last_sync_at null (API keys first connection)
          const isNewConnection = payload.eventType === 'INSERT';
          const isJustConnected = payload.eventType === 'UPDATE' && 
                                 connection.connected_at && 
                                 new Date(connection.connected_at).getTime() > Date.now() - 5000;
          const isApiKeysFirstSync = payload.eventType === 'UPDATE' && 
                                    connection.connection_type === 'api_keys' &&
                                    !connection.last_sync_at;
          
          if (!isNewConnection && !isJustConnected && !isApiKeysFirstSync) {
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
          failsafeTimeoutId = setTimeout(() => {
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
