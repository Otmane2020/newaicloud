import React from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/language';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncData {
  id: string;
  status: string;
  sync_type: string | null;
  items_synced: number | null;
  store_name?: string;
}

export function AutoSyncProgressDialog() {
  const location = useLocation();
  const { t, tf } = useTranslation();
  const [syncData, setSyncData] = React.useState<SyncData | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const hasShownToastRef = React.useRef<string | null>(null);

  // Poll sync_history for running syncs
  const checkForRunningSync = React.useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check for running sync in last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 600000).toISOString();
      const { data, error } = await supabase
        .from('sync_history')
        .select(`
          id,
          status,
          sync_type,
          items_synced,
          store_id
        `)
        .eq('user_id', user.id)
        .gte('started_at', tenMinutesAgo)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      // Get store name
      let storeName = '';
      if (data.store_id) {
        const { data: store } = await supabase
          .from('shopify_connections')
          .select('store_name')
          .eq('id', data.store_id)
          .maybeSingle();
        storeName = store?.store_name || '';
      }

      return { ...data, store_name: storeName } as SyncData;
    } catch {
      return null;
    }
  }, []);

  // Initial check and start polling
  React.useEffect(() => {
    const initCheck = async () => {
      const data = await checkForRunningSync();
      
      if (data && data.status === 'running') {
        setSyncData(data);
        setVisible(true);
        setProgress(Math.min(90, (data.items_synced || 0) / 100 * 10 + 10));
        
        // Start progress animation
        if (!progressIntervalRef.current) {
          progressIntervalRef.current = setInterval(() => {
            setProgress(prev => {
              if (prev >= 95) return 95;
              return Math.min(prev + Math.random() * 2 + 0.5, 95);
            });
          }, 300);
        }
      }
    };

    initCheck();

    // Poll every 2 seconds
    pollIntervalRef.current = setInterval(async () => {
      const data = await checkForRunningSync();
      
      if (!data) {
        // No sync found - hide if visible
        if (visible) {
          setVisible(false);
          setSyncData(null);
        }
        return;
      }

      setSyncData(data);

      if (data.status === 'running') {
        if (!visible) {
          setVisible(true);
          setProgress(10);
          
          // Start progress animation
          if (!progressIntervalRef.current) {
            progressIntervalRef.current = setInterval(() => {
              setProgress(prev => {
                if (prev >= 95) return 95;
                return Math.min(prev + Math.random() * 2 + 0.5, 95);
              });
            }, 300);
          }
        }
      } else if (data.status === 'success' || data.status === 'failed') {
        // Sync completed
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }

        // Show toast only once per sync
        if (hasShownToastRef.current !== data.id) {
          hasShownToastRef.current = data.id;
          
          setProgress(100);
          
          setTimeout(() => {
            setVisible(false);
            
            if (data.status === 'success') {
              toast.success(t.dialogs?.autoSync?.syncComplete || 'Synchronisation réussie', {
                description: tf('dialogs.autoSync.itemsImported', { count: data.items_synced || 0 }) || `${data.items_synced || 0} éléments importés`,
                duration: 4000,
              });
            }
            
            setSyncData(null);
          }, 500);
        }
      }
    }, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [checkForRunningSync, visible, t, tf]);

  // Excluded pages
  const isOnboardingWithoutShopify = location.pathname.startsWith('/onboarding') && 
                                      !location.search.includes('shopify_pending');
  const isAuthPage = location.pathname === '/auth' || 
                     location.pathname === '/reset-password' ||
                     location.pathname.startsWith('/shopify/');
  const comingFromShopifyOpenApp = location.search.includes('host=') && 
                                    !location.search.includes('pending_token');
  
  const shouldShow = visible && !isOnboardingWithoutShopify && !isAuthPage && !comingFromShopifyOpenApp;

  if (!shouldShow || !syncData) return null;

  const isComplete = progress >= 100;
  const syncTypeLabels: Record<string, string> = {
    products: 'Produits',
    collections: 'Collections',
    pages: 'Pages',
    articles: 'Articles',
    images: 'Images',
    full: 'Import complet',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 w-[300px]">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
            isComplete ? 'bg-green-500/20' : 'bg-primary/10'
          }`}>
            {isComplete ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground text-sm">
              {t.dialogs?.autoSync?.title || 'Synchronisation'}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {syncData.store_name || 'Votre boutique'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {syncTypeLabels[syncData.sync_type || ''] || 'Import'} 
            {syncData.items_synced ? ` • ${syncData.items_synced}` : ''}
          </span>
          <span className={`font-medium tabular-nums ${isComplete ? 'text-green-500' : 'text-foreground'}`}>
            {Math.round(progress)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ease-out rounded-full ${
              isComplete ? 'bg-green-500' : 'bg-primary'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
