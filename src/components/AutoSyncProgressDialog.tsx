import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAutoSyncProgress } from '@/contexts/AutoSyncContext';
import { useLocation } from 'react-router-dom';
import { Loader2, Package, FileText, Image, FolderOpen, Newspaper } from 'lucide-react';

export function AutoSyncProgressDialog() {
  const { isSyncing, currentType, storeName } = useAutoSyncProgress();
  const location = useLocation();
  
  // Afficher le dialog partout sauf sur onboarding SANS shopify_pending
  // Si on est sur onboarding AVEC shopify_pending, on affiche le dialog pour montrer le claim en cours
  const isOnboardingWithoutShopify = location.pathname.startsWith('/onboarding') && 
                                      !location.search.includes('shopify_pending');
  const shouldShow = isSyncing && !isOnboardingWithoutShopify;

  const getIcon = (type: string) => {
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
    const labels: Record<string, string> = {
      products: 'Produits',
      collections: 'Collections',
      pages: 'Pages',
      articles: 'Articles',
      images: 'Images'
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={shouldShow}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <div className="w-20 h-20 rounded-full bg-primary/20" />
            </div>
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-glow">
              {getIcon(currentType)}
            </div>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">
              Synchronisation automatique
            </h3>
            <p className="text-sm text-muted-foreground">
              {storeName}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-medium">
                Importation de {getTypeLabel(currentType)}...
              </span>
            </div>
          </div>

          <div className="w-full max-w-xs space-y-2">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary-dark animate-pulse" 
                   style={{ width: '60%' }} />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Étape en cours : {getTypeLabel(currentType)}
            </p>
          </div>

          <div className="space-y-1 text-xs text-muted-foreground text-center max-w-xs">
            <p className="font-medium">Veuillez patienter pendant la synchronisation...</p>
            <p className="text-xs">Cela peut prendre jusqu'à 1 minute selon la taille de votre boutique</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
