import React from 'react';
import { useAutoSyncProgress } from '@/contexts/AutoSyncContext';
import { useLocation } from 'react-router-dom';
import { Loader2, Package, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/language';
import { toast } from 'sonner';

export function AutoSyncProgressDialog() {
  const { isSyncing, isCompleted, currentType, storeName, itemsSynced, endSync } = useAutoSyncProgress();
  const location = useLocation();
  const { t, tf } = useTranslation();
  const [visible, setVisible] = React.useState(false);
  const hasShownSuccessToast = React.useRef(false);

  // Show popup when sync starts
  React.useEffect(() => {
    if (isSyncing && !isCompleted) {
      setVisible(true);
      hasShownSuccessToast.current = false;
    }
  }, [isSyncing, isCompleted]);

  // Hide popup and show success toast when completed
  React.useEffect(() => {
    if (isCompleted && !hasShownSuccessToast.current) {
      hasShownSuccessToast.current = true;
      setVisible(false);
      
      // Show success toast
      toast.success(t.dialogs?.autoSync?.syncComplete || 'Import réussi', {
        description: tf('dialogs.autoSync.itemsImported', { count: itemsSynced }) || `${itemsSynced} éléments importés`,
        duration: 4000,
      });
      
      // End sync after toast
      setTimeout(() => {
        endSync();
      }, 500);
    }
  }, [isCompleted, itemsSynced, endSync, t, tf]);

  const isOnboardingWithoutShopify = location.pathname.startsWith('/onboarding') && 
                                      !location.search.includes('shopify_pending');
  const isAuthPage = location.pathname === '/auth' || 
                     location.pathname === '/reset-password' ||
                     location.pathname.startsWith('/shopify/');
  const comingFromShopifyOpenApp = location.search.includes('host=') && 
                                    !location.search.includes('pending_token');
  
  const shouldShow = visible && isSyncing && !isCompleted && !isOnboardingWithoutShopify && !isAuthPage && !comingFromShopifyOpenApp;

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 min-w-[320px] max-w-[400px] animate-in zoom-in-95 duration-300">
        {/* Spinner */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

          {/* Progress info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="w-4 h-4 text-primary" />
            <span>{t.dialogs?.autoSync?.pleaseWait || 'Veuillez patienter...'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}