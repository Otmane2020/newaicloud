import React from 'react';
import { useAutoSyncProgress } from '@/contexts/AutoSyncContext';
import { useLocation } from 'react-router-dom';
import { Loader2, Package, CheckCircle2 } from 'lucide-react';
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
            return 95; // Pause at 95%
          }
          // Increment by random amount for natural feel
          const increment = Math.random() * 3 + 1;
          return Math.min(prev + increment, 95);
        });
      }, 150);
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
      
      // Clear interval if still running
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      // Jump to 100%
      setProgress(100);

      // Wait a moment at 100%, then hide and show toast
      setTimeout(() => {
        setVisible(false);
        
        // Show success toast
        toast.success(t.dialogs?.autoSync?.syncComplete || 'Import réussi', {
          description: tf('dialogs.autoSync.itemsImported', { count: itemsSynced }) || `${itemsSynced} éléments importés`,
          duration: 4000,
        });
        
        // End sync
        setTimeout(() => {
          endSync();
          setProgress(0);
        }, 500);
      }, 400);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 min-w-[320px] max-w-[400px] animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center gap-5">
          {/* Spinner or Checkmark */}
          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-300 ${
            progress >= 100 ? 'bg-green-100 dark:bg-green-950/50' : 'bg-primary/10'
          }`}>
            {progress >= 100 ? (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            ) : (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            )}
          </div>
          
          {/* Title */}
          <div className="text-center">
            <h3 className="font-semibold text-lg text-foreground">
              {t.dialogs?.autoSync?.title || 'Synchronisation automatique'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {storeName || t.dialogs?.autoSync?.storeName || 'Votre boutique'}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="w-4 h-4 text-primary" />
                <span>{t.dialogs?.autoSync?.pleaseWait || 'Veuillez patienter...'}</span>
              </div>
              <span className="font-medium text-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ease-out rounded-full ${
                  progress >= 100 ? 'bg-green-500' : 'bg-primary'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}