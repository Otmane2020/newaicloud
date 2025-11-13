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

interface ImageSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productTitle: string;
  mainImageUrl: string | null;
  variantImages: ProductImage[];
  onConfirm: (selectedImageUrl: string, applyTo: 'main' | 'all' | 'variants', selectedVariantIds?: string[]) => void;
}

export function ImageSelectionDialog({
  open,
  onOpenChange,
  productTitle,
  mainImageUrl,
  variantImages,
  onConfirm,
}: ImageSelectionDialogProps) {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>(mainImageUrl || '');
  const [applyTo, setApplyTo] = useState<'main' | 'all' | 'variants'>('main');
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);

  const handleConfirm = () => {
    if (!selectedImageUrl) return;
    if (applyTo === 'variants' && selectedVariantIds.length === 0) return;
    onConfirm(selectedImageUrl, applyTo, selectedVariantIds);
    onOpenChange(false);
  };

  const toggleVariantSelection = (variantId: string) => {
    setSelectedVariantIds(prev => 
      prev.includes(variantId) 
        ? prev.filter(id => id !== variantId)
        : [...prev, variantId]
    );
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
                {variantImages.map((img) => (
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
                      alt={img.alt_text || `Variante ${img.position}`}
                      className="w-full h-full object-cover"
                    />
                    {selectedImageUrl === img.src && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    <Badge className="absolute bottom-2 left-2 text-xs">
                      Variante {img.position}
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Application Target */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Appliquer le résultat à</Label>
            <RadioGroup value={applyTo} onValueChange={(v) => {
              setApplyTo(v as 'main' | 'all' | 'variants');
              if (v !== 'variants') {
                setSelectedVariantIds([]);
              }
            }}>
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="main" id="main" />
                <Label htmlFor="main" className="flex-1 cursor-pointer text-sm">
                  Image principale uniquement
                  <p className="text-xs text-muted-foreground mt-1">
                    Remplace uniquement l'image principale du produit
                  </p>
                </Label>
              </div>
              
              {variantImages.length > 0 && (
                <div className="p-3 rounded-lg border space-y-3">
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="variants" id="variants" className="mt-1" />
                    <Label htmlFor="variants" className="flex-1 cursor-pointer text-sm">
                      Variantes spécifiques
                      <p className="text-xs text-muted-foreground mt-1">
                        Sélectionnez les variantes à modifier
                      </p>
                    </Label>
                  </div>
                  
                  {applyTo === 'variants' && (
                    <div className="pl-6 grid grid-cols-3 gap-2">
                      {variantImages.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => toggleVariantSelection(variant.id)}
                          className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                            selectedVariantIds.includes(variant.id)
                              ? 'border-primary ring-2 ring-primary'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <img
                            src={variant.src}
                            alt={variant.alt_text || `Variante ${variant.position}`}
                            className="w-full h-full object-cover"
                          />
                          {selectedVariantIds.includes(variant.id) && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <div className="bg-primary text-primary-foreground rounded-full p-1">
                                <Check className="w-4 h-4" />
                              </div>
                            </div>
                          )}
                          <Badge className="absolute bottom-1 left-1 text-[10px]">
                            #{variant.position}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex-1 cursor-pointer text-sm">
                  Toutes les images
                  <p className="text-xs text-muted-foreground mt-1">
                    Remplace l'image principale et toutes les variantes
                  </p>
                </Label>
              </div>
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
            disabled={!selectedImageUrl || (applyTo === 'variants' && selectedVariantIds.length === 0)}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            Confirmer et générer
            {applyTo === 'variants' && selectedVariantIds.length > 0 && (
              <span className="ml-2">({selectedVariantIds.length})</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
