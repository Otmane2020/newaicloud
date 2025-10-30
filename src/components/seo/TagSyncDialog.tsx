import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Loader2 } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  seo_title?: string;
  seo_description?: string;
  tags?: string;
  image_url?: string;
}

interface TagSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onConfirm: () => void;
  loading?: boolean;
}

export function TagSyncDialog({ open, onOpenChange, products, onConfirm, loading }: TagSyncDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Confirmer la synchronisation</DialogTitle>
          <DialogDescription>
            {products.length} produit{products.length > 1 ? 's' : ''} prêt{products.length > 1 ? 's' : ''} à être synchronisé{products.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-96">
          <div className="space-y-3">
            {products.map(product => (
              <div key={product.id} className="border rounded p-3 flex items-start gap-3">
                {product.image_url && (
                  <img src={product.image_url} alt="" className="w-12 h-12 rounded object-cover" />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{product.title}</h4>
                  {product.tags && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Tags: {product.tags}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Synchroniser avec Shopify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
