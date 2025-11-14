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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Palette, Check, Sparkles } from 'lucide-react';

interface ProductImage {
  id: string;
  src: string;
  alt_text?: string | null;
  position: number;
  variant_id?: string;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
}

interface Product {
  id: string;
  title: string;
  image_url: string | null;
}

interface AiBackgroundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: Product[];
  productImages: Map<string, ProductImage[]>;
  onConfirm: (config: AiBackgroundConfig) => void;
}

export interface AiBackgroundConfig {
  prompt: string;
  format: string;
  similarity: string;
  imageType: 'primary' | 'secondary';
  selectedImages: Map<string, string>; // productId -> imageUrl
  applyTo: 'main' | 'all' | 'variants';
  selectedVariantIds?: string[];
}

export function AiBackgroundDialog({
  open,
  onOpenChange,
  selectedProducts,
  productImages,
  onConfirm,
}: AiBackgroundDialogProps) {
  const [config, setConfig] = useState<AiBackgroundConfig>({
    prompt: '',
    format: 'square',
    similarity: 'medium',
    imageType: 'primary',
    selectedImages: new Map(),
    applyTo: 'main',
    selectedVariantIds: [],
  });

  const singleProduct = selectedProducts.length === 1 ? selectedProducts[0] : null;
  const variantImages = singleProduct ? productImages.get(singleProduct.id) || [] : [];
  const uniqueVariantImages = variantImages.reduce((acc: ProductImage[], current) => {
    if (!acc.find(img => img.src === current.src)) {
      acc.push(current);
    }
    return acc;
  }, []);

  const handleConfirm = () => {
    if (!config.prompt.trim()) return;
    if (config.applyTo === 'variants' && (!config.selectedVariantIds || config.selectedVariantIds.length === 0)) return;
    
    // Set default selected image if none selected
    const finalConfig = { ...config };
    if (finalConfig.selectedImages.size === 0) {
      selectedProducts.forEach(product => {
        finalConfig.selectedImages.set(product.id, product.image_url || '');
      });
    }
    
    onConfirm(finalConfig);
    onOpenChange(false);
  };

  const handlePresetSelect = (value: string) => {
    setConfig({ ...config, prompt: value });
  };

  const toggleVariantSelection = (variantId: string) => {
    setConfig(prev => ({
      ...prev,
      selectedVariantIds: prev.selectedVariantIds?.includes(variantId)
        ? prev.selectedVariantIds.filter(id => id !== variantId)
        : [...(prev.selectedVariantIds || []), variantId]
    }));
  };

  const getVariantLabel = (variant: ProductImage): string => {
    const options = [variant.option1, variant.option2, variant.option3]
      .filter(Boolean)
      .join(' - ');
    return options || `Variante ${variant.position}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Configuration de l'arrière-plan IA
          </DialogTitle>
          <DialogDescription>
            Personnalisez les paramètres de génération pour {selectedProducts.length} produit(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Paramètres de génération */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Paramètres de génération</Label>

            {/* Format */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="format" className="text-sm font-medium">Format d'image</Label>
                <Select value={config.format} onValueChange={(value) => setConfig({ ...config, format: value })}>
                  <SelectTrigger id="format" className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">Carré (1:1)</SelectItem>
                    <SelectItem value="portrait">Portrait (3:4)</SelectItem>
                    <SelectItem value="landscape">Paysage (4:3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Type d'image */}
            <Card className="p-4 space-y-3">
              <Label className="text-sm font-medium">Type d'image</Label>
              <div className="grid grid-cols-2 gap-3">
                <Card
                  className={`p-3 cursor-pointer transition-all ${
                    config.imageType === 'primary'
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setConfig({ ...config, imageType: 'primary' })}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                      config.imageType === 'primary' ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                      {config.imageType === 'primary' && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold text-sm">Image Principale</h4>
                      <p className="text-xs text-muted-foreground">Produit centré et bien visible</p>
                    </div>
                  </div>
                </Card>
                <Card
                  className={`p-3 cursor-pointer transition-all ${
                    config.imageType === 'secondary'
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setConfig({ ...config, imageType: 'secondary' })}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                      config.imageType === 'secondary' ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                      {config.imageType === 'secondary' && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold text-sm">Image Secondaire</h4>
                      <p className="text-xs text-muted-foreground">Photo d'ambiance lifestyle</p>
                    </div>
                  </div>
                </Card>
              </div>
            </Card>

            {/* Ressemblance */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="similarity" className="text-sm font-medium">Ressemblance à l'original</Label>
                <Select value={config.similarity} onValueChange={(value) => setConfig({ ...config, similarity: value })}>
                  <SelectTrigger id="similarity" className="w-[180px]">
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
              </div>
            </Card>
          </div>

          {/* Style et Prompt */}
          <div className="space-y-3">
            <Label htmlFor="preset-select">Style prédéfini</Label>
            <Select value={config.prompt} onValueChange={handlePresetSelect}>
              <SelectTrigger id="preset-select">
                <SelectValue placeholder="Choisir un style..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modern minimalist white studio with soft shadows">🏢 Studio minimaliste blanc</SelectItem>
                <SelectItem value="natural wood surface with plants and soft daylight">🌿 Ambiance naturelle bois</SelectItem>
                <SelectItem value="luxurious marble surface with gold accents">✨ Luxe marbre et or</SelectItem>
                <SelectItem value="cozy living room with warm lighting">🏠 Salon cosy chaleureux</SelectItem>
                <SelectItem value="industrial concrete background with metal elements">🏭 Industriel béton</SelectItem>
                <SelectItem value="scandinavian interior with neutral tones">🇸🇪 Design scandinave</SelectItem>
              </SelectContent>
            </Select>

            <div className="space-y-2">
              <Label htmlFor="custom-prompt">Ou créez votre propre prompt (en anglais)</Label>
              <Textarea
                id="custom-prompt"
                placeholder="vitrine dans un salon scandinave"
                value={config.prompt}
                onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                💡 Conseil : Décrivez l'environnement souhaité, l'éclairage et l'ambiance
              </p>
            </div>
          </div>

          {/* Sélection d'images source */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Sélection de la photo source</Label>
            {selectedProducts.map((product) => {
              const images = productImages.get(product.id) || [];
              const selectedImageUrl = config.selectedImages.get(product.id) || product.image_url;

              return (
                <Card key={product.id} className="p-4">
                  <h4 className="font-semibold mb-3 text-sm">{product.title}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Image principale */}
                    {product.image_url && (
                      <button
                        onClick={() => {
                          const newMap = new Map(config.selectedImages);
                          newMap.set(product.id, product.image_url!);
                          setConfig({ ...config, selectedImages: newMap });
                        }}
                        className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                          selectedImageUrl === product.image_url
                            ? 'border-primary ring-2 ring-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <img src={product.image_url} alt="Principale" className="w-full h-full object-cover" />
                        {selectedImageUrl === product.image_url && (
                          <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <Badge className="absolute bottom-1 left-1 text-xs">Principale</Badge>
                      </button>
                    )}
                    
                    {/* Images de galerie */}
                    {images.slice(0, 2).map((img, idx) => (
                      <button
                        key={img.id}
                        onClick={() => {
                          const newMap = new Map(config.selectedImages);
                          newMap.set(product.id, img.src);
                          setConfig({ ...config, selectedImages: newMap });
                        }}
                        className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                          selectedImageUrl === img.src
                            ? 'border-primary ring-2 ring-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <img src={img.src} alt={img.alt_text || `#${idx + 1}`} className="w-full h-full object-cover" />
                        {selectedImageUrl === img.src && (
                          <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <Badge className="absolute bottom-1 left-1 text-xs">#{idx + 1}</Badge>
                      </button>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Cible d'application (uniquement pour un seul produit avec variantes) */}
          {singleProduct && uniqueVariantImages.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Appliquer le résultat à</Label>
              <RadioGroup value={config.applyTo} onValueChange={(v) => {
                setConfig({
                  ...config,
                  applyTo: v as 'main' | 'all' | 'variants',
                  selectedVariantIds: v !== 'variants' ? [] : config.selectedVariantIds
                });
              }}>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="main" id="main" />
                  <Label htmlFor="main" className="flex-1 cursor-pointer text-sm">
                    Image principale uniquement
                    <p className="text-xs text-muted-foreground mt-1">Remplace uniquement l'image principale du produit</p>
                  </Label>
                </div>
                
                <div className="p-3 rounded-lg border space-y-3">
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="variants" id="variants" className="mt-1" />
                    <Label htmlFor="variants" className="flex-1 cursor-pointer text-sm">
                      Variantes spécifiques
                      <p className="text-xs text-muted-foreground mt-1">Sélectionnez les variantes à modifier</p>
                    </Label>
                  </div>
                  
                  {config.applyTo === 'variants' && (
                    <ScrollArea className="max-h-[200px]">
                      <div className="pl-6 grid grid-cols-3 gap-2">
                        {uniqueVariantImages.map((variant) => (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => toggleVariantSelection(variant.id)}
                            className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                              config.selectedVariantIds?.includes(variant.id)
                                ? 'border-primary ring-2 ring-primary'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <img
                              src={variant.src}
                              alt={variant.alt_text || getVariantLabel(variant)}
                              className="w-full h-full object-cover"
                            />
                            {config.selectedVariantIds?.includes(variant.id) && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <div className="bg-primary text-primary-foreground rounded-full p-1">
                                  <Check className="w-4 h-4" />
                                </div>
                              </div>
                            )}
                            <Badge className="absolute bottom-1 left-1 right-1 text-[10px] text-center truncate">
                              {getVariantLabel(variant)}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="flex-1 cursor-pointer text-sm">
                    Toutes les images
                    <p className="text-xs text-muted-foreground mt-1">Remplace l'image principale et toutes les variantes</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              !config.prompt.trim() ||
              (config.applyTo === 'variants' && (!config.selectedVariantIds || config.selectedVariantIds.length === 0))
            }
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Générer les arrière-plans
            {config.applyTo === 'variants' && config.selectedVariantIds && config.selectedVariantIds.length > 0 && (
              <span>({config.selectedVariantIds.length})</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
