import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAutoSyncProgress } from '@/contexts/AutoSyncContext';
import { useTranslation } from '@/lib/language';

const POLL_INTERVAL_MS = 2000;
const RECENT_SYNC_WINDOW_MS = 15 * 60 * 1000;
const FAILSAFE_MS = 15 * 60 * 1000;
const SHOPIFY_REAUTH_PATTERN = /SHOPIFY_REAUTH_REQUIRED|unauthori[sz]ed|authorization expired|reconnect|invalid.*access token|access token.*invalid|\b401\b/i;

function needsShopifyReconnect(message?: string | null) {
  return Boolean(message && SHOPIFY_REAUTH_PATTERN.test(message));
}

/**
 * Watches Shopify connections and keeps synchronization state in step with the
 * server. The UI must never invent a successful completion locally.
 */
export const useAutoSync = (userId: string | undefined) => {
  const { startSync, completeSync, endSync, updateProgress, isSyncing } = useAutoSyncProgress();
  const location = useLocation();
  const { t, tf } = useTranslation();
  const syncCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSyncIdRef = useRef<string | null>(null);
  const lastConnectionEventRef = useRef<number>(0);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    let failsafeTimeoutId: NodeJS.Timeout | null = null;
    let checkCount = 0;

    const clearMonitoring = () => {
      if (syncCheckIntervalRef.current) {
        clearInterval(syncCheckIntervalRef.current);
        syncCheckIntervalRef.current = null;
      }
      if (failsafeTimeoutId) {
        clearTimeout(failsafeTimeoutId);
        failsafeTimeoutId = null;
      }
    };

    const checkSyncStatus = async () => {
      checkCount += 1;
      let latestSync: {
        id: string;
        status: string;
        items_synced: number | null;
        started_at: string | null;
        sync_type: string | null;
        completed_at: string | null;
        error_message: string | null;
      } | null = null;

      if (currentSyncIdRef.current) {
        const { data, error } = await supabase
          .from('sync_history')
          .select('id, status, items_synced, started_at, sync_type, completed_at, error_message')
          .eq('id', currentSyncIdRef.current)
          .maybeSingle();

        if (!error && data) latestSync = data;
      }

      if (!latestSync) {
        const recentSince = new Date(Date.now() - RECENT_SYNC_WINDOW_MS).toISOString();
        const { data, error } = await supabase
          .from('sync_history')
          .select('id, status, items_synced, started_at, sync_type, completed_at, error_message')
          .eq('user_id', userId)
          .gte('started_at', recentSince)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          latestSync = data;
          currentSyncIdRef.current = data.id;
        }
      }

      if (!latestSync) {
        if (checkCount > 3) console.log('[AutoSync] No recent synchronization record yet');
        return false;
      }

      const normalizedStatus = latestSync.status?.toLowerCase();
      const isSuccess = normalizedStatus === 'success';
      const isFailure = normalizedStatus === 'failed' || normalizedStatus === 'error';

      // A completed_at timestamp alone is not enough to declare success/failure.
      // The backend status is the source of truth.
      if (isSuccess || isFailure) {
        currentSyncIdRef.current = null;
        clearMonitoring();

        if (isMounted) {
          if (isSuccess) {
            completeSync(latestSync.items_synced || 0);
            toast.success(t.dialogs.autoSync.syncComplete, {
              description: tf('dialogs.autoSync.itemsImported', { count: latestSync.items_synced || 0 }),
            });
          } else {
            endSync();
            const reconnectRequired = needsShopifyReconnect(latestSync.error_message);
            toast.error(
              reconnectRequired ? 'Shopify reconnection required' : (t.toasts.error.sync || 'Synchronization error'),
              {
                description: reconnectRequired
                  ? 'Shopify authorization has expired. Open Product Sources and reconnect the store.'
                  : latestSync.error_message || t.toasts.error.generic || 'An error occurred',
                duration: reconnectRequired ? 10000 : 6500,
                action: reconnectRequired
                  ? {
                      label: 'Reconnect',
                      onClick: () => { window.location.href = '/product-source'; },
                    }
                  : undefined,
              },
            );
          }
        }
        return true;
      }

      if (latestSync.sync_type && (normalizedStatus === 'running' || normalizedStatus === 'pending')) {
        updateProgress(latestSync.sync_type, latestSync.items_synced || 0);
      }

      return false;
    };

    const beginMonitoring = (storeName: string) => {
      clearMonitoring();
      checkCount = 0;
      startSync(storeName);
      void checkSyncStatus();
      syncCheckIntervalRef.current = setInterval(() => void checkSyncStatus(), POLL_INTERVAL_MS);

      // This is only a UI failsafe. It does not write or fake any server status.
      // Fifteen minutes leaves enough room for large catalog imports.
      failsafeTimeoutId = setTimeout(() => {
        clearMonitoring();
        if (isMounted) {
          endSync();
          toast.error(t.toasts.error.sync || 'Synchronization status timeout', {
            description: t.toasts.error.generic || 'Refresh to check the import status.',
          });
        }
      }, FAILSAFE_MS);
    };

    const comingFromShopifyOpenApp =
      location.search.includes('host=') && !location.search.includes('pending_token');

    if (comingFromShopifyOpenApp) return;

    const pendingSync = sessionStorage.getItem('pending_sync');
    if (pendingSync && location.pathname === '/dashboard') {
      sessionStorage.removeItem('pending_sync');
      beginMonitoring(pendingSync);

      void (async () => {
        const { data: syncRecords } = await supabase
          .from('sync_history')
          .select('id')
          .eq('user_id', userId)
          .in('status', ['running', 'pending'])
          .order('started_at', { ascending: false })
          .limit(1);

        if (syncRecords?.[0]?.id) currentSyncIdRef.current = syncRecords[0].id;
      })();
    }

    const channel = supabase
      .channel(`shopify-connection-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopify_connections',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          if (!isMounted || payload.eventType === 'DELETE') return;

          const connection = payload.new as any;
          if (!connection?.store_name || connection.is_active === false) return;

          await new Promise(resolve => setTimeout(resolve, 500));
          if (!isMounted) return;

          const { data: stillExists } = await supabase
            .from('shopify_connections')
            .select('id')
            .eq('id', connection.id)
            .maybeSingle();

          if (!stillExists) return;

          const now = Date.now();
          if (now - lastConnectionEventRef.current < 8000) return;

          const isNewConnection = payload.eventType === 'INSERT';
          const isJustConnected =
            payload.eventType === 'UPDATE' &&
            connection.connected_at &&
            new Date(connection.connected_at).getTime() > Date.now() - 5000;
          const isApiKeysFirstSync =
            payload.eventType === 'UPDATE' &&
            connection.connection_type === 'api_keys' &&
            !connection.last_sync_at;

          if (!isNewConnection && !isJustConnected && !isApiKeysFirstSync) return;

          lastConnectionEventRef.current = now;
          currentSyncIdRef.current = null;
          const storeName = connection.store_name || connection.store_url;

          const isExcludedPage =
            location.pathname.startsWith('/onboarding') ||
            location.pathname === '/auth' ||
            location.pathname === '/reset-password' ||
            location.pathname.startsWith('/shopify/');

          if (isExcludedPage) {
            sessionStorage.setItem('pending_sync', storeName);
            return;
          }

          beginMonitoring(storeName);
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearMonitoring();
      currentSyncIdRef.current = null;
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.warn('[AutoSync] Cleanup warning:', error);
      }
    };
  }, [
    userId,
    startSync,
    completeSync,
    endSync,
    updateProgress,
    location.pathname,
    location.search,
    t,
    tf,
  ]);

  useEffect(() => {
    const isExcludedPage =
      location.pathname === '/auth' ||
      location.pathname === '/reset-password' ||
      location.pathname.startsWith('/shopify/');

    if (isExcludedPage) endSync();
  }, [location.pathname, endSync]);

  useEffect(() => {
    if (!isSyncing && syncCheckIntervalRef.current) {
      clearInterval(syncCheckIntervalRef.current);
      syncCheckIntervalRef.current = null;
      currentSyncIdRef.current = null;
    }
  }, [isSyncing]);
};
