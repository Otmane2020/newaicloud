import React from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, Package, Image, FileText, Newspaper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';

interface SyncData {
  id: string;
  status: string;
  sync_type: string | null;
  items_synced: number | null;
  store_name?: string;
  started_at?: string;
}

const syncTypeConfig: Record<string, { icon: React.ElementType; label: string; progress: number }> = {
  products: { icon: Package, label: 'Produits', progress: 40 },
  collections: { icon: FileText, label: 'Collections', progress: 55 },
  pages: { icon: FileText, label: 'Pages', progress: 70 },
  articles: { icon: Newspaper, label: 'Articles', progress: 85 },
  images: { icon: Image, label: 'Images', progress: 95 },
  full: { icon: Package, label: 'Import complet', progress: 50 },
  completed: { icon: CheckCircle2, label: 'Terminé', progress: 100 },
};

const POLL_INTERVAL_MS = 2000;
const RECENT_SYNC_WINDOW_MS = 15 * 60 * 1000;

export function AutoSyncProgressDialog() {
  const location = useLocation();
  const { t } = useTranslation();
  const [syncData, setSyncData] = React.useState<SyncData | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const [targetProgress, setTargetProgress] = React.useState(0);
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const activeSyncIdRef = React.useRef<string | null>(null);
  const hasShownToastRef = React.useRef<string | null>(null);
  const missingPollsRef = React.useRef(0);

  React.useEffect(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= targetProgress) return targetProgress;
        const diff = targetProgress - prev;
        const increment = Math.max(0.3, diff * 0.08);
        return Math.min(prev + increment, targetProgress);
      });
    }, 50);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [targetProgress]);

  const checkLatestSync = React.useCallback(async (): Promise<SyncData | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const recentSince = new Date(Date.now() - RECENT_SYNC_WINDOW_MS).toISOString();
      const { data, error } = await supabase
        .from('sync_history')
        .select('id, status, sync_type, items_synced, store_id, started_at')
        .eq('user_id', user.id)
        .gte('started_at', recentSince)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

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
    } catch (error) {
      console.error('[AutoSyncProgressDialog] Unable to read synchronization status:', error);
      return null;
    }
  }, []);

  const closeAndReset = React.useCallback((delay = 0) => {
    window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => {
        setSyncData(null);
        setProgress(0);
        setTargetProgress(0);
        activeSyncIdRef.current = null;
        missingPollsRef.current = 0;
      }, 250);
    }, delay);
  }, []);

  React.useEffect(() => {
    let mounted = true;

    const applySyncData = (data: SyncData, isInitial = false) => {
      if (!mounted) return;

      const isRunning = data.status === 'running' || data.status === 'pending';
      const isSuccess = data.status === 'success';
      const isFailure = data.status === 'failed' || data.status === 'error';

      if (isRunning) {
        activeSyncIdRef.current = data.id;
        missingPollsRef.current = 0;
        setSyncData(data);
        setVisible(true);
        const config = syncTypeConfig[data.sync_type || 'full'] || syncTypeConfig.full;
        setTargetProgress(Math.min(config.progress, 95));
        return;
      }

      // Do not replay a stale completed synchronization when the page first mounts.
      if (isInitial || activeSyncIdRef.current !== data.id) return;

      setSyncData(data);

      if (isSuccess) {
        setTargetProgress(100);
        if (hasShownToastRef.current !== data.id) {
          hasShownToastRef.current = data.id;
          toast.success(t.toasts.success.synchronized, {
            description: `${data.items_synced || 0} ${t.dialogs.autoOptimization.elements}`,
            duration: 4000,
          });
        }
        closeAndReset(1200);
      } else if (isFailure) {
        if (hasShownToastRef.current !== data.id) {
          hasShownToastRef.current = data.id;
          toast.error(t.toasts.error.sync || 'Synchronization error', {
            description: t.toasts.error.generic || 'The import could not be completed.',
            duration: 5000,
          });
        }
        closeAndReset(700);
      }
    };

    const init = async () => {
      const data = await checkLatestSync();
      if (data) applySyncData(data, true);
    };

    init();

    pollIntervalRef.current = setInterval(async () => {
      const data = await checkLatestSync();
      if (!mounted) return;

      if (!data) {
        if (activeSyncIdRef.current) {
          missingPollsRef.current += 1;
          // A transient Supabase/network miss should not instantly dismiss the popup.
          if (missingPollsRef.current >= 3) {
            toast.error(t.toasts.error.sync || 'Synchronization status unavailable', {
              description: t.toasts.error.generic || 'Please refresh the catalog status.',
            });
            closeAndReset();
          }
        }
        return;
      }

      missingPollsRef.current = 0;
      applySyncData(data);
    }, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [checkLatestSync, closeAndReset, t]);

  const isOnboardingWithoutShopify = location.pathname.startsWith('/onboarding') &&
    !location.search.includes('shopify_pending');
  const isAuthPage = location.pathname === '/auth' ||
    location.pathname === '/reset-password' ||
    location.pathname.startsWith('/shopify/');
  const comingFromShopifyOpenApp = location.search.includes('host=') &&
    !location.search.includes('pending_token');

  const shouldShow = visible && !isOnboardingWithoutShopify && !isAuthPage && !comingFromShopifyOpenApp;

  if (!shouldShow || !syncData) return null;

  const isComplete = syncData.status === 'success' || progress >= 99;
  const isFailure = syncData.status === 'failed' || syncData.status === 'error';
  const currentConfig = syncTypeConfig[syncData.sync_type || 'full'] || syncTypeConfig.full;
  const CurrentIcon = currentConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/70 bg-background/95 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent" />

        <div className="relative z-10">
          <div className="mb-5 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-muted/50 shadow-sm">
              <img src="/shopify-logo.svg" alt="Shopify" className="h-10 w-10" />
            </div>
          </div>

          <div className="mb-6 text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              {isFailure ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : isComplete ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
              <h3 className="text-xl font-semibold tracking-tight text-foreground">
                {isFailure ? 'Import interrompu' : isComplete ? 'Import terminé' : 'Synchronisation en cours'}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {syncData.store_name || 'Votre boutique Shopify'}
            </p>
          </div>

          <div className="mb-6 rounded-2xl border border-border/60 bg-muted/35 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm">
                <CurrentIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {isComplete ? 'Import terminé' : currentConfig.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {syncData.items_synced || 0} éléments synchronisés
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progression</span>
              <span className="font-semibold tabular-nums text-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${isFailure ? 'bg-destructive' : isComplete ? 'bg-emerald-500' : 'bg-primary'}`}
                style={{ width: `${Math.max(isFailure ? 8 : 0, progress)}%` }}
              />
            </div>
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            {isFailure
              ? 'La synchronisation n’a pas été marquée comme réussie. Vérifiez le détail de l’import.'
              : isComplete
                ? 'Les données ont été confirmées par le serveur.'
                : 'Cette fenêtre reste ouverte jusqu’à confirmation réelle du serveur.'}
          </p>
        </div>
      </div>
    </div>
  );
}
