import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { responsiveDialogClasses, responsivePadding } from "@/lib/dialogUtils";
import { Card, CardContent } from "@/components/ui/card";

interface Product {
  id: string;
  title: string;
  seo_title?: string;
  seo_description?: string;
  landing_page_url?: string;
}

interface ProductLandingPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onConfirm: () => void;
  loading?: boolean;
}

export function ProductLandingPreviewDialog({
  open,
  onOpenChange,
  products,
  onConfirm,
  loading = false
}: ProductLandingPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${responsiveDialogClasses.large} ${responsivePadding.large}`}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Aperçu des Landing Pages</DialogTitle>
          <DialogDescription>
            Vérifiez les landing pages générées avant de les synchroniser avec Shopify
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {products.map((product) => (
            <Card key={product.id} className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {product.title}
                    </h3>
                    {product.seo_title && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">SEO Title:</span> {product.seo_title}
                      </p>
                    )}
                    {product.seo_description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        <span className="font-medium">SEO Description:</span> {product.seo_description}
                      </p>
                    )}
                  </div>
                  {product.landing_page_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(product.landing_page_url, '_blank')}
                      className="shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1 sm:flex-initial"
          >
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 sm:flex-initial"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Synchroniser avec Shopify
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
