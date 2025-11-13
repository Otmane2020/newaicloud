import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

interface ProductImage {
  id: string;
  src: string;
  alt_text?: string;
  position: number;
}

interface ProductVariant {
  id: string;
  title: string;
  option1?: string;
  option2?: string;
  option3?: string;
}

interface ImageSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productTitle: string;
  mainImageUrl: string | null;
  variantImages: ProductImage[];
  hasVariants?: boolean;
  variants?: ProductVariant[];
  onConfirm: (
    selectedImageUrl: string, 
    applyTo: 'main' | 'secondary' | 'variants',
    selectedVariantIds?: string[]
  ) => void;
}

export function ImageSelectionDialog({
  open,
  onOpenChange,
  productTitle,
  mainImageUrl,
  variantImages,
  hasVariants = false,
  variants = [],
  onConfirm,
}: ImageSelectionDialogProps) {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>(mainImageUrl || '');
  const [applyTo, setApplyTo] = useState<'main' | 'secondary' | 'variants'>('main');
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set());

  const handleConfirm = () => {
    if (!selectedImageUrl) return;
    if (applyTo === 'variants' && selectedVariants.size === 0) return;
    
    onConfirm(
      selectedImageUrl, 
      applyTo,
      applyTo === 'variants' ? Array.from(selectedVariants) : undefined
    );
    onOpenChange(false);
  };

  const toggleVariant = (variantId: string) => {
    const newSelected = new Set(selectedVariants);
    if (newSelected.has(variantId)) {
      newSelected.delete(variantId);
    } else {
      newSelected.add(variantId);
    }
    setSelectedVariants(newSelected);
  };

  const toggleAllVariants = () => {
    if (selectedVariants.size === variants.length) {
      setSelectedVariants(new Set());
    } else {
      setSelectedVariants(new Set(variants.map(v => v.id)));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Sélectionner l'image à traiter</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Choisissez l'image source et où appliquer le résultat pour "{productTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Source Image Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Image source</Label>
            <ScrollArea className="h-[300px] pr-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {mainImageUrl && (
                  <button
                    onClick={() => setSelectedImageUrl(mainImageUrl)}
                    className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                      selectedImageUrl === mainImageUrl
                        ? 'border-primary ring-2 ring-primary ring-offset-2'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img
                      src={mainImageUrl}
                      alt="Image principale"
                      className="w-full h-full object-cover"
                    />
                    {selectedImageUrl === mainImageUrl && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    <Badge className="absolute bottom-2 left-2 text-xs">
                      Principale
                    </Badge>
                  </button>
                )}
                {variantImages.map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImageUrl(img.src)}
                    className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                      selectedImageUrl === img.src
                        ? 'border-primary ring-2 ring-primary ring-offset-2'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img
                      src={img.src}
                      alt={img.alt_text || `Image ${index + 2}`}
                      className="w-full h-full object-cover"
                    />
                    {selectedImageUrl === img.src && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    <Badge className="absolute bottom-2 left-2 text-xs">
                      Image {index + 2}
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Application Target */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Appliquer le résultat à</Label>
            <RadioGroup value={applyTo} onValueChange={(v) => setApplyTo(v as 'main' | 'secondary' | 'variants')}>
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="main" id="main" />
                <Label htmlFor="main" className="flex-1 cursor-pointer text-sm">
                  <div className="font-medium">Photo principale</div>
                  <div className="text-xs text-muted-foreground">
                    Remplace l'image principale du produit
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="secondary" id="secondary" />
                <Label htmlFor="secondary" className="flex-1 cursor-pointer text-sm">
                  <div className="font-medium">Photo secondaire</div>
                  <div className="text-xs text-muted-foreground">
                    Ajoute une nouvelle image secondaire
                  </div>
                </Label>
              </div>
              {hasVariants && variants.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="variants" id="variants" />
                    <Label htmlFor="variants" className="flex-1 cursor-pointer text-sm">
                      <div className="font-medium">Photo de variations</div>
                      <div className="text-xs text-muted-foreground">
                        Applique aux variantes sélectionnées
                      </div>
                    </Label>
                  </div>
                  {applyTo === 'variants' && (
                    <div className="ml-6 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {selectedVariants.size} / {variants.length} sélectionnée(s)
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={toggleAllVariants}
                          className="text-xs h-7"
                        >
                          {selectedVariants.size === variants.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </Button>
                      </div>
                      <ScrollArea className="h-[200px] border rounded-md p-3">
                        <div className="space-y-2">
                          {variants.map((variant) => (
                            <div key={variant.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`variant-${variant.id}`}
                                checked={selectedVariants.has(variant.id)}
                                onChange={() => toggleVariant(variant.id)}
                                className="rounded border-border"
                              />
                              <Label
                                htmlFor={`variant-${variant.id}`}
                                className="text-sm font-normal cursor-pointer flex-1"
                              >
                                {variant.title || [variant.option1, variant.option2, variant.option3].filter(Boolean).join(' / ')}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedImageUrl}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            Confirmer et générer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
