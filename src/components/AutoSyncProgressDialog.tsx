import React from 'react';
import { useAutoSyncProgress } from '@/contexts/AutoSyncContext';
import { useLocation } from 'react-router-dom';
import { Loader2, Package, FileText, Image, FolderOpen, Newspaper, CheckCircle2, X } from 'lucide-react';
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

  // Reset states when a new sync starts
  React.useEffect(() => {
    if (isSyncing && !isCompleted) {
      setForceClosed(false);
    }
  }, [isSyncing, isCompleted]);

  // Auto-close 3 seconds after completion
  React.useEffect(() => {
    if (isCompleted) {
      const autoCloseTimer = setTimeout(() => {
        setForceClosed(true);
        endSync();
      }, 3000);
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
  };

  // Progress based on sync_type (real-time from backend)
  const progress = isCompleted ? 100 : (TYPE_PROGRESS[currentType] || 10);

  const getIcon = (type: string) => {
    if (isCompleted) {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
    switch (type) {
      case 'products':
      case 'costs':
        return <Package className="w-5 h-5 text-primary" />;
      case 'collections':
        return <FolderOpen className="w-5 h-5 text-primary" />;
      case 'pages':
        return <FileText className="w-5 h-5 text-primary" />;
      case 'articles':
        return <Newspaper className="w-5 h-5 text-primary" />;
      case 'images':
        return <Image className="w-5 h-5 text-primary" />;
      default:
        return <Package className="w-5 h-5 text-primary" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const types = t.dialogs.autoSync.types as Record<string, string>;
    if (!type || type === 'products' || type === 'costs') return types['products'] || 'Products';
    return types[type] || type;
  };

  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 min-w-[280px] max-w-[320px]">
        {/* Header with close button */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isCompleted 
                ? 'bg-green-100 dark:bg-green-950/50' 
                : 'bg-primary/10'
            }`}>
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">
                {isCompleted ? t.dialogs.autoSync.syncComplete : t.dialogs.autoSync.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {storeName || t.dialogs.autoSync.storeName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              {getIcon(currentType)}
              <span className="text-muted-foreground">
                {isCompleted 
                  ? tf('dialogs.autoSync.itemsImported', { count: itemsSynced })
                  : tf('dialogs.autoSync.importing', { type: getTypeLabel(currentType) })
                }
              </span>
            </div>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          
          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ease-out ${
                isCompleted 
                  ? 'bg-green-500' 
                  : 'bg-primary'
              }`}
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
