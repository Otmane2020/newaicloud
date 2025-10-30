import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface ProductImage {
  id: string;
  src: string;
  alt_text: string | null;
  position: number;
  product_id: string;
  product_title?: string;
}

interface AltImageSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: ProductImage[];
  onConfirm: () => void;
  loading?: boolean;
}

export function AltImageSyncDialog({
  open,
  onOpenChange,
  images,
  onConfirm,
  loading = false,
}: AltImageSyncDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Synchroniser les textes ALT avec Shopify</DialogTitle>
          <DialogDescription>
            Vous êtes sur le point de synchroniser {images.length} texte{images.length > 1 ? 's' : ''} ALT avec Shopify.
            Cette action mettra à jour vos images de produits.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-3">
            {images.map((image) => (
              <Card key={image.id} className="p-4">
                <div className="flex gap-4">
                  <img
                    src={image.src}
                    alt={image.alt_text || 'Product image'}
                    className="w-24 h-24 object-cover rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    {image.product_title && (
                      <p className="text-sm font-medium truncate">
                        {image.product_title}
                      </p>
                    )}
                    <div>
                      <Badge variant="outline" className="mb-2">
                        Texte ALT
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {image.alt_text || 'Aucun texte ALT'}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Synchronisation...
              </>
            ) : (
              `Synchroniser avec Shopify`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
