import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Upload, X } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  seo_title: string;
  seo_description: string;
  image_url?: string;
}

interface SeoSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onConfirm: () => void;
  loading?: boolean;
}

export function SeoSyncDialog({
  open,
  onOpenChange,
  products,
  onConfirm,
  loading = false,
}: SeoSyncDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Confirm Shopify Synchronization
          </DialogTitle>
          <DialogDescription>
            Review the SEO titles and meta descriptions before syncing to Shopify
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition"
              >
                <div className="flex items-start gap-3">
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-2">{product.title}</h4>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          SEO Title:
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950/20 px-3 py-2 rounded">
                          {product.seo_title || (
                            <span className="text-muted-foreground italic">Not defined</span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          SEO Meta Description:
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/20 px-3 py-2 rounded">
                          {product.seo_description || (
                            <span className="text-muted-foreground italic">Not defined</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {products.length} product{products.length > 1 ? 's' : ''} will be synchronized
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={onConfirm}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {loading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-pulse" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Sync to Shopify
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}