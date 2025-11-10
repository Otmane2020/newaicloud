import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useShopifySync } from "@/hooks/useShopifySync";
import { supabase } from "@/integrations/supabase/client";

interface AutoImportDialogProps {
  open: boolean;
  storeId: string | null;
  onComplete: () => void;
}

const contentTypeLabels: Record<string, string> = {
  products: "Produits",
  collections: "Collections",
  pages: "Pages",
  articles: "Articles",
  images: "Images"
};

export function AutoImportDialog({ open, storeId, onComplete }: AutoImportDialogProps) {
  const { isSyncing, currentSyncType, syncShopifyStore } = useShopifySync();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'importing' | 'success' | 'error'>('importing');
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    if (open && storeId) {
      startAutoImport();
    }
  }, [open, storeId]);

  useEffect(() => {
    if (isSyncing && currentSyncType) {
      const types = ['products', 'collections', 'pages', 'articles', 'images'];
      const currentIndex = types.indexOf(currentSyncType);
      setProgress(((currentIndex + 1) / types.length) * 100);
    }
  }, [isSyncing, currentSyncType]);

  const startAutoImport = async () => {
    if (!storeId) return;

    setStatus('importing');
    setProgress(0);

    try {
      const { data: store } = await supabase
        .from('shopify_connections')
        .select('id, store_url, store_name')
        .eq('id', storeId)
        .single();

      if (store) {
        await syncShopifyStore(store);
        
        // Get total imported items
        const { count } = await supabase
          .from('shopify_products')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', storeId);
        
        setTotalItems(count || 0);
        setStatus('success');
        setProgress(100);
        
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    } catch (error) {
      console.error('Auto-import error:', error);
      setStatus('error');
      setTimeout(() => {
        onComplete();
      }, 3000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md"  onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status === 'importing' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            {status === 'success' && <CheckCircle2 className="h-5 w-5 text-affirmative-primary" />}
            {status === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
            {status === 'importing' ? "Import en cours" : status === 'success' ? "Import réussi !" : "Erreur d'import"}
          </DialogTitle>
          <DialogDescription>
            {status === 'importing' && (
              <>
                Importation de votre boutique Shopify en cours...
                {currentSyncType && (
                  <span className="block mt-2 font-medium text-foreground">
                    {contentTypeLabels[currentSyncType] || currentSyncType}
                  </span>
                )}
              </>
            )}
            {status === 'success' && (
              <span className="text-affirmative-primary font-medium">
                {totalItems} éléments importés avec succès
              </span>
            )}
            {status === 'error' && (
              <span className="text-destructive">
                Une erreur s'est produite lors de l'import
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Progress value={progress} className="h-2" />
          
          <div className="text-sm text-muted-foreground text-center">
            {status === 'importing' && "Veuillez patienter, cela peut prendre quelques minutes..."}
            {status === 'success' && "Redirection vers vos produits..."}
            {status === 'error' && "Vous pouvez réessayer depuis la page d'intégration"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
