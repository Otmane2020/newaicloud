import React from 'react';
import { useAutoSyncProgress } from '@/contexts/AutoSyncContext';
import { useLocation } from 'react-router-dom';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/language';
import { toast } from 'sonner';

export function AutoSyncProgressDialog() {
  const { isSyncing, isCompleted, storeName, itemsSynced, endSync } = useAutoSyncProgress();
  const location = useLocation();
  const { t, tf } = useTranslation();
  const [visible, setVisible] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const hasShownSuccessToast = React.useRef(false);
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Show popup and start progress when sync starts
  React.useEffect(() => {
    if (isSyncing && !isCompleted) {
      setVisible(true);
      setProgress(0);
      hasShownSuccessToast.current = false;

      // Animate progress from 0 to 95%
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
            }
            return 95;
          }
          const increment = Math.random() * 4 + 2;
          return Math.min(prev + increment, 95);
        });
      }, 200);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isSyncing, isCompleted]);

  // Complete progress and hide popup when sync finishes
  React.useEffect(() => {
    if (isCompleted && !hasShownSuccessToast.current) {
      hasShownSuccessToast.current = true;
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      // Jump to 100%
      setProgress(100);

      // Wait briefly at 100%, then hide and show toast
      setTimeout(() => {
        setVisible(false);
        
        toast.success(t.dialogs?.autoSync?.syncComplete || 'Import réussi', {
          description: tf('dialogs.autoSync.itemsImported', { count: itemsSynced }) || `${itemsSynced} éléments importés`,
          duration: 4000,
        });
        
        setTimeout(() => {
          endSync();
          setProgress(0);
        }, 300);
      }, 600);
    }
  }, [isCompleted, itemsSynced, endSync, t, tf]);

  const isOnboardingWithoutShopify = location.pathname.startsWith('/onboarding') && 
                                      !location.search.includes('shopify_pending');
  const isAuthPage = location.pathname === '/auth' || 
                     location.pathname === '/reset-password' ||
                     location.pathname.startsWith('/shopify/');
  const comingFromShopifyOpenApp = location.search.includes('host=') && 
                                    !location.search.includes('pending_token');
  
  const shouldShow = visible && !isOnboardingWithoutShopify && !isAuthPage && !comingFromShopifyOpenApp;

  if (!shouldShow) return null;

  const isComplete = progress >= 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-[340px] animate-in zoom-in-95 duration-300">
        {/* Header with icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
            isComplete 
              ? 'bg-green-500/20' 
              : 'bg-primary/10'
          }`}>
            {isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">
              {isComplete 
                ? (t.dialogs?.autoSync?.syncComplete || 'Import terminé')
                : (t.dialogs?.autoSync?.title || 'Synchronisation en cours')
              }
            </h3>
            <p className="text-xs text-muted-foreground">
              {storeName || 'Votre boutique'}
            </p>
          </div>
        </div>

        {/* Progress section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {isComplete 
                ? `${itemsSynced} éléments importés`
                : (t.dialogs?.autoSync?.pleaseWait || 'Import des données...')
              }
            </span>
            <span className={`font-medium tabular-nums ${isComplete ? 'text-green-500' : 'text-foreground'}`}>
              {Math.round(progress)}%
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ease-out rounded-full ${
                isComplete ? 'bg-green-500' : 'bg-primary'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
