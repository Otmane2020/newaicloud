import React from 'react';
import { useAutoSyncProgress } from '@/contexts/AutoSyncContext';
import { useLocation } from 'react-router-dom';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/language';

export function AutoSyncProgressDialog() {
  const { isSyncing, isCompleted, storeName, itemsSynced, endSync } = useAutoSyncProgress();
  const location = useLocation();
  const { t } = useTranslation();
  const [visible, setVisible] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Show popup and start progress when sync starts
  React.useEffect(() => {
    if (isSyncing && !isCompleted) {
      setVisible(true);
      setProgress(0);

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

  // Hide popup when sync completes OR when isSyncing becomes false
  React.useEffect(() => {
    if (isCompleted || (!isSyncing && visible)) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setProgress(100);
      
      // Brief delay then hide
      const hideTimeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
        if (isCompleted) {
          endSync();
        }
      }, 400);

      return () => clearTimeout(hideTimeout);
    }
  }, [isCompleted, isSyncing, visible, endSync]);

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
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 w-[280px]">
        {/* Header with icon */}
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
            isComplete 
              ? 'bg-green-500/20' 
              : 'bg-primary/10'
          }`}>
            {isComplete ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground text-sm truncate">
              {t.dialogs?.autoSync?.title || 'Synchronisation'}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {storeName || 'Votre boutique'}
            </p>
          </div>
          <span className={`text-xs font-medium tabular-nums ${isComplete ? 'text-green-500' : 'text-muted-foreground'}`}>
            {Math.round(progress)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
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
