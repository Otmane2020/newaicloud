import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAutoSyncProgress } from '@/contexts/AutoSyncContext';
import { useLocation } from 'react-router-dom';
import { Loader2, Package, FileText, Image, FolderOpen, Newspaper, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/language';

export function AutoSyncProgressDialog() {
  const { isSyncing, isCompleted, currentType, storeName, itemsSynced } = useAutoSyncProgress();
  const location = useLocation();
  const { t, tf } = useTranslation();
  const [progress, setProgress] = React.useState(20);
  
  // Afficher le dialog partout sauf sur onboarding SANS shopify_pending
  // Si on est sur onboarding AVEC shopify_pending, on affiche le dialog pour montrer le claim en cours
  const isOnboardingWithoutShopify = location.pathname.startsWith('/onboarding') && 
                                      !location.search.includes('shopify_pending');
  // Ne jamais afficher sur les pages d'authentification ou Shopify
  const isAuthPage = location.pathname === '/auth' || 
                     location.pathname === '/reset-password' ||
                     location.pathname.startsWith('/shopify/');
  
  // Détecte si l'utilisateur vient de Shopify "Open app" (host= sans pending_token)
  // Dans ce cas, ne PAS afficher le dialog de sync automatiquement
  const comingFromShopifyOpenApp = location.search.includes('host=') && 
                                    !location.search.includes('pending_token');
  
  const shouldShow = isSyncing && !isOnboardingWithoutShopify && !isAuthPage && !comingFromShopifyOpenApp;

  // Update progress based on currentType
  React.useEffect(() => {
    if (!isSyncing) {
      setProgress(20);
      return;
    }

    if (isCompleted) {
      setProgress(100);
      return;
    }

    const progressMap: Record<string, number> = {
      import: 20,
      products: 40,
      collections: 60,
      pages: 70,
      articles: 80,
      images: 90,
      completed: 100,
    };

    const targetProgress = progressMap[currentType] || 20;
    setProgress(targetProgress);
  }, [currentType, isSyncing, isCompleted]);

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
    return types[type] || type;
  };

  return (
    <Dialog open={shouldShow}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
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
              <div className="flex items-center justify-center gap-2 pt-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">
                  {tf('dialogs.autoSync.itemsImported', { count: itemsSynced })}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm font-medium">
                  {tf('dialogs.autoSync.importingType', { type: getTypeLabel(currentType) })}
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
                ? t.dialogs.autoSync.autoClosing
                : `${getTypeLabel(currentType)} • ${progress}%`
              }
            </p>
          </div>

          {/* Footer message */}
          {!isCompleted && (
            <div className="space-y-1 text-xs text-muted-foreground text-center max-w-xs">
              <p className="font-medium">{t.dialogs.autoSync.pleaseWait}</p>
              <p className="text-xs">{t.dialogs.autoSync.duration}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
