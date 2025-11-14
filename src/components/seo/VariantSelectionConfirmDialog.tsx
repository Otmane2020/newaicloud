import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Image as ImageIcon, Check } from "lucide-react";

interface Product {
  id: string;
  title: string;
  image_url: string | null;
  variants?: ProductVariant[];
}

interface ProductVariant {
  id: string;
  title: string;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
}

interface VariantSelectionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: Product[];
  selectedVariants: Map<string, string[]>;
  applyTo: "simple" | "variants";
  onConfirm: () => void;
}

export function VariantSelectionConfirmDialog({
  open,
  onOpenChange,
  selectedProducts,
  selectedVariants,
  applyTo,
  onConfirm,
}: VariantSelectionConfirmDialogProps) {
  const getTotalVariantsCount = (): number => {
    let count = 0;
    selectedVariants.forEach((variantIds) => {
      count += variantIds.length;
    });
    return count;
  };

  const getVariantLabel = (variant: ProductVariant): string => {
    const options = [variant.option1, variant.option2, variant.option3].filter(Boolean).join(" - ");
    return options || variant.title || `Variante ${variant.id.slice(-4)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Confirmation de l'application
          </DialogTitle>
          <DialogDescription>
            Vérifiez les produits et variantes qui vont être traités avec l'arrière-plan IA
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4">
            {applyTo === "simple" && (
              <Card className="p-4 bg-primary/5 border-primary">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <span className="font-medium">Format Simple - Image principale</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  L'arrière-plan IA sera appliqué à l'image principale de chaque produit
                </p>
                <div className="space-y-2">
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-2 p-2 bg-background rounded-lg">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{product.title}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {applyTo === "variants" && (
              <Card className="p-4 bg-primary/5 border-primary">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="font-medium">Format Variantes</span>
                  <Badge variant="secondary">{getTotalVariantsCount()} variantes</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  L'arrière-plan IA sera appliqué aux variantes sélectionnées de chaque produit
                </p>
                <div className="space-y-3">
                  {selectedProducts.map((product) => {
                    const productVariantIds = selectedVariants.get(product.id) || [];
                    if (productVariantIds.length === 0) return null;

                    const selectedProductVariants = product.variants?.filter((v) =>
                      productVariantIds.includes(v.id)
                    ) || [];

                    return (
                      <div key={product.id} className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-background rounded-lg">
                          <Check className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">{product.title}</span>
                          <Badge variant="outline" className="ml-auto">
                            {productVariantIds.length} variantes
                          </Badge>
                        </div>
                        <div className="ml-6 space-y-1">
                          {selectedProductVariants.map((variant) => (
                            <div
                              key={variant.id}
                              className="text-xs text-muted-foreground flex items-center gap-2 p-1"
                            >
                              <div className="w-1 h-1 rounded-full bg-primary" />
                              {getVariantLabel(variant)}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onConfirm}>
            Confirmer et générer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
