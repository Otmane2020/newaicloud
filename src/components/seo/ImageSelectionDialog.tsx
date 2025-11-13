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
import { Check, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

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
  image_url?: string;
}

interface ImageSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productTitle: string;
  mainImageUrl: string | null;
  variantImages: ProductImage[];
  hasVariants?: boolean;
  variants?: ProductVariant[];
  isAiBackground?: boolean;
  onConfirm: (
    selectedImageUrl: string, 
    applyTo: 'main' | 'secondary' | 'variant',
    selectedVariantId?: string,
    aiPrompt?: string
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
  isAiBackground = false,
  onConfirm,
}: ImageSelectionDialogProps) {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>(mainImageUrl || '');
  const [applyTo, setApplyTo] = useState<'main' | 'secondary' | 'variant'>('main');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState<string>('');

  // Collecter toutes les images (principale + secondaires + variantes)
  const allImages: Array<{ src: string; label: string; type: 'main' | 'secondary' | 'variant'; variantId?: string }> = [];
  
  if (mainImageUrl) {
    allImages.push({ src: mainImageUrl, label: 'Photo principale', type: 'main' });
  }
  
  variantImages.forEach((img, index) => {
    allImages.push({ src: img.src, label: `Image ${index + 2}`, type: 'secondary' });
  });
  
  if (hasVariants) {
    variants.forEach((variant) => {
      if (variant.image_url) {
        const variantLabel = variant.option1 || variant.title;
        allImages.push({ 
          src: variant.image_url, 
          label: `Variante: ${variantLabel}`, 
          type: 'variant',
          variantId: variant.id
        });
      }
    });
  }

  const handleConfirm = () => {
    if (!selectedImageUrl) return;
    if (applyTo === 'variant' && !selectedVariantId) return;
    if (isAiBackground && !aiPrompt.trim()) return;
    
    onConfirm(
      selectedImageUrl, 
      applyTo,
      selectedVariantId || undefined,
      aiPrompt || undefined
    );
    onOpenChange(false);
  };

  const isConfirmDisabled = 
    !selectedImageUrl || 
    (applyTo === 'variant' && !selectedVariantId) ||
    (isAiBackground && !aiPrompt.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {isAiBackground ? 'Générer un fond IA' : 'Générer un fond blanc'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Configuration pour "{productTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Prompt IA si nécessaire */}
          {isAiBackground && (
            <div className="space-y-2">
              <Label htmlFor="ai-prompt" className="text-sm font-medium">Description du fond souhaité</Label>
              <Textarea
                id="ai-prompt"
                placeholder="Ex: fond de studio professionnel, ambiance minimaliste avec lumière naturelle..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}

          {/* Étape 1: Image source */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">1. Sélectionner l'image source</Label>
            <ScrollArea className="h-[300px] pr-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {allImages.map((img, index) => (
                  <button
                    key={`${img.type}-${index}`}
                    onClick={() => setSelectedImageUrl(img.src)}
                    className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                      selectedImageUrl === img.src
                        ? 'border-primary ring-2 ring-primary ring-offset-2'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img
                      src={img.src}
                      alt={img.label}
                      className="w-full h-full object-cover"
                    />
                    {selectedImageUrl === img.src && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    <Badge className="absolute bottom-2 left-2 text-xs">
                      {img.label}
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Étape 2: Application */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">2. Appliquer le résultat à</Label>
            {!hasVariants ? (
              <RadioGroup value={applyTo} onValueChange={(v) => setApplyTo(v as 'main' | 'secondary')}>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="main" id="main" />
                  <Label htmlFor="main" className="flex-1 cursor-pointer text-sm">
                    <div className="font-medium">Photo principale</div>
                    <div className="text-xs text-muted-foreground">Remplace l'image principale du produit</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="secondary" id="secondary" />
                  <Label htmlFor="secondary" className="flex-1 cursor-pointer text-sm">
                    <div className="font-medium">Photo secondaire</div>
                    <div className="text-xs text-muted-foreground">Ajoute comme nouvelle image secondaire</div>
                  </Label>
                </div>
              </RadioGroup>
            ) : (
              <RadioGroup value={selectedVariantId} onValueChange={setSelectedVariantId}>
                <ScrollArea className="h-[200px]">
                  {variants.map((variant) => {
                    const variantLabel = [variant.option1, variant.option2, variant.option3]
                      .filter(Boolean)
                      .join(' / ') || variant.title;
                    
                    return (
                      <div key={variant.id} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors mb-2">
                        <RadioGroupItem value={variant.id} id={`variant-${variant.id}`} />
                        <Label htmlFor={`variant-${variant.id}`} className="flex-1 cursor-pointer text-sm">
                          {variantLabel}
                        </Label>
                      </div>
                    );
                  })}
                </ScrollArea>
              </RadioGroup>
            )}
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
            disabled={isConfirmDisabled}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            Confirmer et générer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
