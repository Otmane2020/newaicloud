import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Image as ImageIcon } from "lucide-react";

interface ImagePriceDebugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    productTitle?: string;
    variantTitle?: string;
    imageUrl?: string;
    segment?: string;
    minPrice?: number | null;
    maxPrice?: number | null;
    error?: string;
  } | null;
}

export function ImagePriceDebugDialog({ open, onOpenChange, data }: ImagePriceDebugDialogProps) {
  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Analyse par Image
          </DialogTitle>
          <DialogDescription>
            Estimation de la gamme de prix basée sur l'analyse visuelle du produit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {data.error ? (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{data.error}</p>
            </div>
          ) : (
            <>
              {data.imageUrl && (
                <div className="flex justify-center">
                  <img 
                    src={data.imageUrl} 
                    alt={data.productTitle || data.variantTitle || "Product"} 
                    className="max-h-48 rounded-md border object-contain"
                  />
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1">Produit</p>
                <p className="text-sm text-muted-foreground">
                  {data.variantTitle || data.productTitle || "N/A"}
                </p>
              </div>

              {data.segment && (
                <div>
                  <p className="text-sm font-medium mb-2">Segment détecté</p>
                  <Badge variant={
                    data.segment === "luxe" ? "destructive" :
                    data.segment === "haut de gamme" ? "default" :
                    "secondary"
                  }>
                    {data.segment.charAt(0).toUpperCase() + data.segment.slice(1)}
                  </Badge>
                </div>
              )}

              {(data.minPrice !== null && data.maxPrice !== null) ? (
                <div>
                  <p className="text-sm font-medium mb-1">Fourchette estimée</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">
                      {data.minPrice?.toFixed(2)}€
                    </span>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-lg font-bold">
                      {data.maxPrice?.toFixed(2)}€
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Basé sur l'analyse visuelle du produit et des comparaisons de marché
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Aucune fourchette de prix n'a pu être estimée
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}