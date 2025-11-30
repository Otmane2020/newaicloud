import React from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, CheckCircle2, Package, Image, FileText, Newspaper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncData {
  id: string;
  status: string;
  sync_type: string | null;
  items_synced: number | null;
  store_name?: string;
}

const syncTypeConfig: Record<string, { icon: React.ElementType; label: string; progress: number }> = {
  products: { icon: Package, label: 'Produits', progress: 25 },
  collections: { icon: FileText, label: 'Collections', progress: 50 },
  pages: { icon: FileText, label: 'Pages', progress: 65 },
  articles: { icon: Newspaper, label: 'Articles', progress: 80 },
  images: { icon: Image, label: 'Images', progress: 95 },
  full: { icon: Package, label: 'Import complet', progress: 50 },
};

export function AutoSyncProgressDialog() {
  const location = useLocation();
  const [syncData, setSyncData] = React.useState<SyncData | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const [targetProgress, setTargetProgress] = React.useState(0);
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const hasShownToastRef = React.useRef<string | null>(null);

  // Smooth progress animation towards target
  React.useEffect(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= targetProgress) return targetProgress;
        const diff = targetProgress - prev;
        const increment = Math.max(0.3, diff * 0.08);
        return Math.min(prev + increment, targetProgress);
      });
    }, 50);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [targetProgress]);

  // Poll sync_history for running syncs
  const checkForRunningSync = React.useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const tenMinutesAgo = new Date(Date.now() - 600000).toISOString();
      const { data, error } = await supabase
        .from('sync_history')
        .select(`id, status, sync_type, items_synced, store_id`)
        .eq('user_id', user.id)
        .gte('started_at', tenMinutesAgo)
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
    } catch {
      return null;
    }
  }, []);

  // Initial check and polling
  React.useEffect(() => {
    const initCheck = async () => {
      const data = await checkForRunningSync();
      
      if (data && data.status === 'running') {
        setSyncData(data);
        setVisible(true);
        const config = syncTypeConfig[data.sync_type || 'full'] || syncTypeConfig.full;
        setTargetProgress(config.progress);
      }
    };

    initCheck();

    pollIntervalRef.current = setInterval(async () => {
      const data = await checkForRunningSync();
      
      if (!data) {
        if (visible) {
          setVisible(false);
          setSyncData(null);
          setProgress(0);
          setTargetProgress(0);
        }
        return;
      }

      setSyncData(data);

      if (data.status === 'running') {
        if (!visible) {
          setVisible(true);
          setProgress(0);
        }
        const config = syncTypeConfig[data.sync_type || 'full'] || syncTypeConfig.full;
        setTargetProgress(config.progress);
      } else if (data.status === 'success' || data.status === 'failed') {
        if (hasShownToastRef.current !== data.id) {
          hasShownToastRef.current = data.id;
          setTargetProgress(100);
          
          setTimeout(() => {
            setVisible(false);
            
            if (data.status === 'success') {
              toast.success('Synchronisation réussie', {
                description: `${data.items_synced || 0} éléments importés`,
                duration: 4000,
              });
            }
            
            setTimeout(() => {
              setSyncData(null);
              setProgress(0);
              setTargetProgress(0);
            }, 300);
          }, 1500);
        }
      }
    }, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [checkForRunningSync, visible]);

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

  const isComplete = progress >= 99;
  const currentConfig = syncTypeConfig[syncData.sync_type || 'full'] || syncTypeConfig.full;
  const CurrentIcon = currentConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 w-[420px] relative overflow-hidden">
        {/* Gradient background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#95bf46]/5 via-transparent to-[#95bf46]/10 pointer-events-none" />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Shopify Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-[#95bf46]/10 flex items-center justify-center border border-[#95bf46]/20">
              <img 
                src="/shopify-logo.svg" 
                alt="Shopify" 
                className="w-12 h-12"
              />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-foreground mb-1">
              {isComplete ? 'Import terminé !' : 'Synchronisation en cours'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {syncData.store_name || 'Votre boutique Shopify'}
            </p>
          </div>

          {/* Current sync type indicator */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
              isComplete ? 'bg-green-500/20' : 'bg-[#95bf46]/10'
            }`}>
              {isComplete ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin text-[#95bf46]" />
              )}
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50">
              <CurrentIcon className="w-4 h-4 text-[#95bf46]" />
              <span className="text-sm font-medium text-foreground">
                {isComplete ? 'Import terminé' : currentConfig.label}
              </span>
              {syncData.items_synced ? (
                <span className="text-sm text-muted-foreground">
                  • {syncData.items_synced}
                </span>
              ) : null}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progression</span>
              <span className={`font-semibold tabular-nums ${isComplete ? 'text-green-500' : 'text-[#95bf46]'}`}>
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden border border-border/30">
              <div 
                className={`h-full transition-all duration-500 ease-out rounded-full relative ${
                  isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-[#95bf46] to-[#5f8e3e]'
                }`}
                style={{ width: `${progress}%` }}
              >
                {!isComplete && (
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                      animation: 'shimmer 1.5s infinite',
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Helper text */}
          <p className="text-center text-xs text-muted-foreground">
            {isComplete 
              ? 'Fermeture automatique...' 
              : 'Veuillez patienter pendant l\'import de vos données...'}
          </p>
        </div>
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
