import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { useAutoSyncProgress } from '@/contexts/AutoSyncContext';
import { useLocation } from 'react-router-dom';
import { Loader2, Package, FileText, Image, FolderOpen, Newspaper, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/language';

// Map sync types to progress percentages
const TYPE_PROGRESS: Record<string, number> = {
  'products': 20,
  'costs': 30,
  'collections': 50,
  'pages': 65,
  'articles': 80,
  'images': 95,
  'completed': 100,
};

export function AutoSyncProgressDialog() {
  const { isSyncing, isCompleted, currentType, storeName, itemsSynced, endSync } = useAutoSyncProgress();
  const location = useLocation();
  const { t, tf } = useTranslation();
  const [forceClosed, setForceClosed] = React.useState(false);
  const [showCloseButton, setShowCloseButton] = React.useState(false);

  // Reset states when a new sync starts
  React.useEffect(() => {
    if (isSyncing && !isCompleted) {
      setForceClosed(false);
      setShowCloseButton(false);
      
      // Show close button after 30 seconds if still syncing
      const closeButtonTimer = setTimeout(() => {
        setShowCloseButton(true);
      }, 30000);
      
      return () => clearTimeout(closeButtonTimer);
    }
  }, [isSyncing, isCompleted]);

  // Auto-close 2 seconds after completion
  React.useEffect(() => {
    if (isCompleted) {
      const autoCloseTimer = setTimeout(() => {
        setForceClosed(true);
        endSync();
      }, 2000);
      return () => clearTimeout(autoCloseTimer);
    }
  }, [isCompleted, endSync]);
  
  const isOnboardingWithoutShopify = location.pathname.startsWith('/onboarding') && 
                                      !location.search.includes('shopify_pending');
  const isAuthPage = location.pathname === '/auth' || 
                     location.pathname === '/reset-password' ||
                     location.pathname.startsWith('/shopify/');
  const comingFromShopifyOpenApp = location.search.includes('host=') && 
                                    !location.search.includes('pending_token');
  
  const shouldShow = !forceClosed && isSyncing && !isOnboardingWithoutShopify && !isAuthPage && !comingFromShopifyOpenApp;

  const handleClose = () => {
    setForceClosed(true);
    endSync();
  };

  // Progress based on sync_type (real-time from backend)
  const progress = isCompleted ? 100 : (TYPE_PROGRESS[currentType] || 10);

  const getIcon = (type: string) => {
    if (isCompleted) {
      return <CheckCircle2 className="w-6 h-6 text-primary-foreground" />;
    }
    switch (type) {
      case 'products':
      case 'costs':
        return <Package className="w-6 h-6" />;
      case 'collections':
        return <FolderOpen className="w-6 h-6" />;
      case 'pages':
        return <FileText className="w-6 h-6" />;
      case 'articles':
        return <Newspaper className="w-6 h-6" />;
      case 'images':
        return <Image className="w-6 h-6" />;
      default:
        return <Package className="w-6 h-6" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const types = t.dialogs.autoSync.types as Record<string, string>;
    if (!type || type === 'products' || type === 'costs') return types['products'] || 'Products';
    return types[type] || type;
  };

  return (
    <Dialog open={shouldShow} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => { if (!isCompleted) e.preventDefault(); }}>
        <VisuallyHidden>
          <DialogTitle>{t.dialogs.autoSync.title}</DialogTitle>
          <DialogDescription>{t.dialogs.autoSync.pleaseWait}</DialogDescription>
        </VisuallyHidden>
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          {/* Icon with animation */}
          <div className="relative">
            {!isCompleted && (
              <div className="absolute inset-0 animate-ping">
                <div className="w-20 h-20 rounded-full bg-primary/20" />
              </div>
            )}
            <div className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-glow transition-all duration-500 ${
              isCompleted 
                ? 'bg-gradient-to-br from-green-500 to-green-600 scale-110' 
                : 'bg-gradient-to-br from-primary to-primary-dark'
            }`}>
              {getIcon(currentType)}
            </div>
          </div>

          {/* Title and status */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">
              {isCompleted 
                ? t.dialogs.autoSync.syncComplete
                : t.dialogs.autoSync.title
              }
            </h3>
            <p className="text-sm text-muted-foreground">
              {storeName || t.dialogs.autoSync.storeName}
            </p>
            
            {isCompleted ? (
              <div className="flex flex-col items-center justify-center gap-3 pt-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950/30 rounded-full">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                    {tf('dialogs.autoSync.itemsImported', { count: itemsSynced })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t.dialogs.autoSync.successMessage}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm font-medium">
                  {tf('dialogs.autoSync.importing', { type: getTypeLabel(currentType) })}
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-xs space-y-2">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-700 ease-out ${
                  isCompleted 
                    ? 'bg-gradient-to-r from-green-500 to-green-600' 
                    : 'bg-gradient-to-r from-primary to-primary-dark'
                }`}
                style={{ width: `${progress}%` }} 
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {isCompleted 
                ? t.dialogs.autoSync.successMessage
                : `${getTypeLabel(currentType)} • ${progress}%`
              }
            </p>
          </div>

          {/* Footer message */}
          {isCompleted ? (
            <Button onClick={handleClose} className="mt-2">
              {t.dialogs.autoSync.closeButton}
            </Button>
          ) : (
            <div className="text-center max-w-xs space-y-3">
              <p className="text-xs text-muted-foreground">{t.dialogs.autoSync.pleaseWait}</p>
              {showCloseButton && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleClose}
                  className="text-xs"
                >
                  {t.dialogs.autoSync.closeButton || 'Close'}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
