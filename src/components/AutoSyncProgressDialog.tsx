import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { useAutoSyncProgress } from '@/contexts/AutoSyncContext';
import { useLocation } from 'react-router-dom';
import { Loader2, Package, FileText, Image, FolderOpen, Newspaper, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from '@/lib/language';

export function AutoSyncProgressDialog() {
  const { isSyncing, isCompleted, currentType, storeName, itemsSynced, endSync } = useAutoSyncProgress();
  const location = useLocation();
  const { t, tf } = useTranslation();
  const [progress, setProgress] = React.useState(5);
  const [displayType, setDisplayType] = React.useState('import');
  const syncStartTimeRef = React.useRef<number | null>(null);
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Simulate incremental progress over time
  React.useEffect(() => {
    if (isSyncing && !isCompleted) {
      if (!syncStartTimeRef.current) {
        syncStartTimeRef.current = Date.now();
        setProgress(5);
        setDisplayType('import');
      }
      
      // Increment progress every 2 seconds
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - (syncStartTimeRef.current || Date.now());
        const seconds = elapsed / 1000;
        
        // Progress simulation: 5% → 95% over ~3 minutes
        // Fast at start, slower near end (logarithmic-like)
        let newProgress = Math.min(95, 5 + (seconds * 0.5));
        
        // Determine display type based on progress
        let newType = 'import';
        if (newProgress >= 85) {
          newType = 'images';
        } else if (newProgress >= 70) {
          newType = 'articles';
        } else if (newProgress >= 55) {
          newType = 'pages';
        } else if (newProgress >= 40) {
          newType = 'collections';
        } else if (newProgress >= 20) {
          newType = 'products';
        }
        
        setProgress(Math.round(newProgress));
        setDisplayType(newType);
      }, 2000);
      
      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    } else if (isCompleted) {
      setProgress(100);
      setDisplayType('completed');
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    } else {
      syncStartTimeRef.current = null;
      setProgress(5);
      setDisplayType('import');
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
  }, [isSyncing, isCompleted]);
  
  // Afficher le dialog partout sauf sur onboarding SANS shopify_pending
  const isOnboardingWithoutShopify = location.pathname.startsWith('/onboarding') && 
                                      !location.search.includes('shopify_pending');
  // Ne jamais afficher sur les pages d'authentification ou Shopify
  const isAuthPage = location.pathname === '/auth' || 
                     location.pathname === '/reset-password' ||
                     location.pathname.startsWith('/shopify/');
  
  // Détecte si l'utilisateur vient de Shopify "Open app" (host= sans pending_token)
  const comingFromShopifyOpenApp = location.search.includes('host=') && 
                                    !location.search.includes('pending_token');
  
  const shouldShow = isSyncing && !isOnboardingWithoutShopify && !isAuthPage && !comingFromShopifyOpenApp;

  const handleClose = () => {
    endSync();
  };

  const getIcon = (type: string) => {
    if (isCompleted) {
      return <CheckCircle2 className="w-6 h-6 text-primary-foreground" />;
    }
    switch (type) {
      case 'products':
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
    // Skip "import" type to avoid "Importing Import..." - use products label instead
    if (type === 'import') return types['products'] || 'Products';
    return types[type] || type;
  };

  return (
    <Dialog open={shouldShow} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className={`sm:max-w-md ${isCompleted ? '' : '[&>button]:hidden'}`}>
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
              {getIcon(displayType)}
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
                  {tf('dialogs.autoSync.importing', { type: getTypeLabel(displayType) })}
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-xs space-y-2">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ease-out ${
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
                : `${getTypeLabel(displayType)} • ${progress}%`
              }
            </p>
          </div>

          {/* Footer message or close button */}
          {isCompleted ? (
            <Button onClick={handleClose} className="mt-2">
              {t.dialogs.autoSync.closeButton}
            </Button>
          ) : (
            <div className="space-y-3 text-center max-w-xs">
              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="font-medium">{t.dialogs.autoSync.pleaseWait}</p>
                <p className="text-xs">{t.dialogs.autoSync.duration}</p>
              </div>
              <Button 
                onClick={handleClose} 
                variant="ghost" 
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                {t.buttons?.close || 'Fermer'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
