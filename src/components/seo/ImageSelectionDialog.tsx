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
import { Check, Sparkles, Palette } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

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
  
  // Configuration avancée pour AI Background
  const [imageFormat, setImageFormat] = useState<string>('square');
  const [imageType, setImageType] = useState<'primary' | 'secondary'>('primary');
  const [similarity, setSimilarity] = useState<string>('very-close');

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

  const handlePresetSelect = (value: string) => {
    setAiPrompt(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            {isAiBackground && <Palette className="h-5 w-5 text-primary" />}
            {isAiBackground ? 'Configuration de l\'arrière-plan IA' : 'Générer un fond blanc'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Personnalisez les paramètres de génération pour "{productTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Colonne 1: Sélection de l'image source */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Sélection de la photo à retravailler</Label>
            <ScrollArea className="h-[400px] pr-2">
              <div className="grid grid-cols-2 gap-2">
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

          {/* Colonne 2: Paramètres de génération */}
          {isAiBackground && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Paramètres de génération</Label>
              <ScrollArea className="h-[400px] pr-2">
                <div className="space-y-3">
                  {/* Format d'image */}
                  <Card className="p-3">
                    <Label htmlFor="format" className="text-xs font-medium mb-2 block">Format d'image</Label>
                    <Select value={imageFormat} onValueChange={setImageFormat}>
                      <SelectTrigger id="format" className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="square">Carré (1:1)</SelectItem>
                        <SelectItem value="portrait">Portrait (3:4)</SelectItem>
                        <SelectItem value="landscape">Paysage (4:3)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Card>

                  {/* Type d'image */}
                  <Card className="p-3">
                    <Label className="text-xs font-medium mb-2 block">Type d'image</Label>
                    <div className="space-y-2">
                      <Card 
                        className={`p-2 cursor-pointer transition-all ${
                          imageType === "primary" 
                            ? "border-primary bg-primary/5 ring-1 ring-primary" 
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => setImageType("primary")}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-3 h-3 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                            imageType === "primary" 
                              ? "border-primary bg-primary" 
                              : "border-muted-foreground"
                          }`}>
                            {imageType === "primary" && <Check className="h-2 w-2 text-white" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-xs">Image Principale</h4>
                            <p className="text-[10px] text-muted-foreground">Produit centré et bien visible</p>
                          </div>
                        </div>
                      </Card>
                      <Card 
                        className={`p-2 cursor-pointer transition-all ${
                          imageType === "secondary" 
                            ? "border-primary bg-primary/5 ring-1 ring-primary" 
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => setImageType("secondary")}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-3 h-3 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                            imageType === "secondary" 
                              ? "border-primary bg-primary" 
                              : "border-muted-foreground"
                          }`}>
                            {imageType === "secondary" && <Check className="h-2 w-2 text-white" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-xs">Image Secondaire</h4>
                            <p className="text-[10px] text-muted-foreground">Photo d'ambiance lifestyle</p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </Card>

                  {/* Ressemblance */}
                  <Card className="p-3">
                    <Label htmlFor="similarity" className="text-xs font-medium mb-2 block">Ressemblance à l'original</Label>
                    <Select value={similarity} onValueChange={setSimilarity}>
                      <SelectTrigger id="similarity" className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="very-close">🎯 Très proche (90%)</SelectItem>
                        <SelectItem value="close">✓ Proche (70%)</SelectItem>
                        <SelectItem value="medium">⚖️ Équilibré (50%)</SelectItem>
                        <SelectItem value="creative">🎨 Créatif (30%)</SelectItem>
                        <SelectItem value="very-creative">✨ Très créatif (10%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Card>

                  {/* Style prédéfini */}
                  <Card className="p-3">
                    <Label htmlFor="preset" className="text-xs font-medium mb-2 block">Style prédéfini</Label>
                    <Select value={aiPrompt} onValueChange={handlePresetSelect}>
                      <SelectTrigger id="preset" className="h-8 text-xs">
                        <SelectValue placeholder="Choisir un style..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Place this product in a professional studio setting with soft lighting and neutral gray backdrop">
                          🎬 Studio professionnel
                        </SelectItem>
                        <SelectItem value="Place this product in a luxurious natural environment with elegant plants and soft natural lighting">
                          🌿 Nature luxueuse
                        </SelectItem>
                        <SelectItem value="Place this product in a modern minimalist setting with clean lines and geometric shapes">
                          ⚪ Minimaliste moderne
                        </SelectItem>
                        <SelectItem value="Place this product in a contemporary urban setting with industrial elements and modern aesthetics">
                          🏙️ Urbain contemporain
                        </SelectItem>
                        <SelectItem value="Place this product in an elegant classical setting with refined decorative elements and soft warm lighting">
                          ✨ Élégance classique
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Card>
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Colonne 3: Prompt personnalisé + Application */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{isAiBackground ? 'Prompt & Application' : 'Application'}</Label>
            <ScrollArea className="h-[400px] pr-2">
              <div className="space-y-3">
                {isAiBackground && (
                  <div className="space-y-2">
                    <Label htmlFor="ai-prompt" className="text-xs font-medium">Ou créez votre propre prompt (en anglais)</Label>
                    <Textarea
                      id="ai-prompt"
                      placeholder="Ex: Place this product in a premium e-commerce setting with professional lighting, elegant backdrop, and attractive staging that drives customer engagement and conversion..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={6}
                      className="text-xs resize-none"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      💡 Conseil : Décrivez un environnement premium qui valorise le produit
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Appliquer le résultat à</Label>
                  {!hasVariants ? (
                    <RadioGroup value={applyTo} onValueChange={(v) => setApplyTo(v as 'main' | 'secondary')}>
                      <div className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="main" id="main" />
                        <Label htmlFor="main" className="flex-1 cursor-pointer text-xs">
                          <div className="font-medium">Photo principale</div>
                          <div className="text-[10px] text-muted-foreground">Remplace l'image principale</div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="secondary" id="secondary" />
                        <Label htmlFor="secondary" className="flex-1 cursor-pointer text-xs">
                          <div className="font-medium">Photo secondaire</div>
                          <div className="text-[10px] text-muted-foreground">Ajoute comme nouvelle image</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  ) : (
                    <RadioGroup value={selectedVariantId} onValueChange={setSelectedVariantId}>
                      <div className="max-h-[120px] overflow-y-auto space-y-1">
                        {variants.map((variant) => {
                          const variantLabel = [variant.option1, variant.option2, variant.option3]
                            .filter(Boolean)
                            .join(' / ') || variant.title;
                          
                          return (
                            <div key={variant.id} className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                              <RadioGroupItem value={variant.id} id={`variant-${variant.id}`} />
                              <Label htmlFor={`variant-${variant.id}`} className="flex-1 cursor-pointer text-xs">
                                {variantLabel}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </RadioGroup>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={`w-full sm:w-auto text-xs gap-2 ${
              isAiBackground ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : ''
            }`}
          >
            {isAiBackground && <Sparkles className="h-4 w-4" />}
            {isAiBackground ? 'Générer les arrière-plans' : 'Confirmer et générer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
