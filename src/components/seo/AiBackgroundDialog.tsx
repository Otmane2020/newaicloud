import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Palette, Check, Sparkles, Images, Package } from "lucide-react";

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
  seo_title?: string | null;
  seo_description?: string | null;
  vision_ai_data?: any;
  variants?: ProductVariant[];
}

interface ProductVariant {
  id: string;
  title: string;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  image_id?: string | null;
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
  imageType: "primary" | "secondary";
  selectedImages: Map<string, string>;
  applyTo: "simple" | "variants";
  selectedVariants: Map<string, string[]>;
  enrichedPrompt?: string;
}

export function AiBackgroundDialog({
  open,
  onOpenChange,
  selectedProducts,
  productImages,
  onConfirm,
}: AiBackgroundDialogProps) {
  const [config, setConfig] = useState<AiBackgroundConfig>({
    prompt: "",
    format: "square",
    similarity: "very-close",
    imageType: "primary",
    selectedImages: new Map(),
    applyTo: "simple",
    selectedVariants: new Map(),
  });

  const singleProduct = selectedProducts.length === 1 ? selectedProducts[0] : null;
  const hasVariants = selectedProducts.some((product) => product.variants && product.variants.length > 0);

  // Récupérer toutes les images d'un produit (principale + galerie)
  const getAllProductImages = (product: Product) => {
    const images: ProductImage[] = [];

    // Image principale
    if (product.image_url) {
      images.push({
        id: "main",
        src: product.image_url,
        alt_text: product.title,
        position: 0,
      });
    }

    // Images de galerie
    const galleryImages = productImages.get(product.id) || [];
    images.push(...galleryImages);

    return images;
  };

  // Récupérer les variantes avec leurs images
  const getVariantsWithImages = (product: Product) => {
    if (!product.variants) return [];

    return product.variants
      .map((variant) => {
        // Trouver l'image spécifique à la variante
        const variantImage = productImages.get(product.id)?.find((img) => img.variant_id === variant.id);

        // Si pas d'image spécifique, utiliser l'image principale du produit
        const imageSrc = variantImage?.src || product.image_url;

        return {
          variant,
          image: imageSrc
            ? {
                id: variant.id,
                src: imageSrc,
                alt_text: variant.title,
                position: 0,
                variant_id: variant.id,
              }
            : null,
        };
      })
      .filter((item) => item.image !== null);
  };

  const handleConfirm = () => {
    if (!config.prompt.trim()) return;
    if (config.applyTo === "variants" && config.selectedVariants.size === 0) return;

    // Set default selected images if none selected
    const finalConfig = { ...config };
    if (finalConfig.selectedImages.size === 0) {
      selectedProducts.forEach((product) => {
        const images = getAllProductImages(product);
        if (images.length > 0) {
          finalConfig.selectedImages.set(product.id, images[0].src);
        }
      });
    }

    // Enrichir le prompt
    const productContext = selectedProducts
      .map((product) => {
        const parts = [];
        if (product.title) parts.push(`Product: ${product.title}`);
        if (product.seo_title) parts.push(`SEO Title: ${product.seo_title}`);
        if (product.seo_description) parts.push(`Description: ${product.seo_description}`);
        if (product.vision_ai_data?.description) parts.push(`Vision AI: ${product.vision_ai_data.description}`);
        return parts.join(". ");
      })
      .filter(Boolean)
      .join("\n");

    finalConfig.enrichedPrompt = productContext
      ? `${config.prompt}\n\nProduct Context:\n${productContext}`
      : config.prompt;

    onConfirm(finalConfig);
    onOpenChange(false);
  };

  const handlePresetSelect = (value: string) => {
    setConfig({ ...config, prompt: value });
  };

  const toggleVariantSelection = (productId: string, variantId: string) => {
    setConfig((prev) => {
      const newSelectedVariants = new Map(prev.selectedVariants);
      const productVariants = newSelectedVariants.get(productId) || [];

      if (productVariants.includes(variantId)) {
        const updated = productVariants.filter((id) => id !== variantId);
        if (updated.length === 0) {
          newSelectedVariants.delete(productId);
        } else {
          newSelectedVariants.set(productId, updated);
        }
      } else {
        newSelectedVariants.set(productId, [...productVariants, variantId]);
      }

      return {
        ...prev,
        selectedVariants: newSelectedVariants,
      };
    });
  };

  const toggleAllVariantsForProduct = (productId: string, variantIds: string[]) => {
    setConfig((prev) => {
      const newSelectedVariants = new Map(prev.selectedVariants);
      const currentSelected = newSelectedVariants.get(productId) || [];

      if (currentSelected.length === variantIds.length) {
        newSelectedVariants.delete(productId);
      } else {
        newSelectedVariants.set(productId, [...variantIds]);
      }

      return {
        ...prev,
        selectedVariants: newSelectedVariants,
      };
    });
  };

  const getVariantLabel = (variant: ProductVariant): string => {
    const options = [variant.option1, variant.option2, variant.option3].filter(Boolean).join(" - ");
    return options || variant.title || `Variante ${variant.id.slice(-4)}`;
  };

  const getSelectedVariantsCount = (): number => {
    let count = 0;
    config.selectedVariants.forEach((variantIds) => {
      count += variantIds.length;
    });
    return count;
  };

  // Styles prédéfinis avec les nouveaux noms
  const presetStyles = [
    {
      name: "Studio professionnel",
      prompt: "professional studio photography with clean white background and perfect lighting",
      icon: "📸",
    },
    {
      name: "Nature luxueuse",
      prompt: "luxurious natural setting with plants, wood textures and soft daylight",
      icon: "🌿",
    },
    {
      name: "Minimaliste moderne",
      prompt: "modern minimalist interior with clean lines and neutral colors",
      icon: "⬜",
    },
    {
      name: "Lifestyle chaleureux",
      prompt: "cozy lifestyle setting with warm lighting and comfortable interior",
      icon: "🏠",
    },
    {
      name: "Urbain contemporain",
      prompt: "contemporary urban background with industrial elements and modern architecture",
      icon: "🏙️",
    },
    {
      name: "Élégance classique",
      prompt: "classic elegant setting with luxurious materials and sophisticated lighting",
      icon: "🎩",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
          {/* Format d'application - EN PREMIER */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Format d'application</Label>
            <RadioGroup
              value={config.applyTo}
              onValueChange={(v) => {
                setConfig({
                  ...config,
                  applyTo: v as "simple" | "variants",
                  selectedVariants: v !== "variants" ? new Map() : config.selectedVariants,
                });
              }}
            >
              {/* Option Simple */}
              <Card
                className={`p-4 cursor-pointer transition-all ${
                  config.applyTo === "simple" ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="simple" id="simple" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Images className="h-5 w-5" />
                      <Label htmlFor="simple" className="text-base font-medium cursor-pointer">
                        Format Simple
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Gallerie</p>

                    {config.applyTo === "simple" && (
                      <div className="mt-4 space-y-4">
                        {selectedProducts.map((product) => {
                          const allImages = getAllProductImages(product);
                          const selectedImageUrl = config.selectedImages.get(product.id) || allImages[0]?.src;

                          return (
                            <div key={product.id} className="space-y-3">
                              <div>
                                <Label className="text-sm font-medium">{product.title}</Label>
                              </div>
                              <ScrollArea className="w-full max-h-[200px]">
                                <div className="grid grid-cols-4 gap-2">
                                  {allImages.map((img, idx) => (
                                    <button
                                      type="button"
                                      key={img.id}
                                      onClick={() => {
                                        const newMap = new Map(config.selectedImages);
                                        newMap.set(product.id, img.src);
                                        setConfig({ ...config, selectedImages: newMap });
                                      }}
                                      className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                                        selectedImageUrl === img.src
                                          ? "border-primary ring-2 ring-primary"
                                          : "border-border hover:border-primary/50"
                                      }`}
                                    >
                                      <img
                                        src={img.src}
                                        alt={img.alt_text || `Image ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                      {selectedImageUrl === img.src && (
                                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                                          <Check className="w-3 h-3" />
                                        </div>
                                      )}
                                      <Badge className="absolute bottom-1 left-1 text-xs bg-black/80 text-white">
                                        {img.id === "main" ? "Principale" : `#${idx + 1}`}
                                      </Badge>
                                    </button>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Option Variantes */}
              {hasVariants && (
                <Card
                  className={`p-4 cursor-pointer transition-all ${
                    config.applyTo === "variants" ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="variants" id="variants" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        <Label htmlFor="variants" className="text-base font-medium cursor-pointer">
                          Format Variantes
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Appliquer aux variantes spécifiques sélectionnées
                      </p>

                      {config.applyTo === "variants" && (
                        <div className="mt-4 space-y-6">
                          {/* Sélection des variantes */}
                          <div className="space-y-4">
                            <Label className="text-sm font-medium">Sélection des variantes</Label>
                            {selectedProducts.map((product) => {
                              const variantsWithImages = getVariantsWithImages(product);
                              if (variantsWithImages.length === 0) return null;

                              const productSelectedVariants = config.selectedVariants.get(product.id) || [];
                              const allVariantIds = variantsWithImages.map((v) => v.variant.id);
                              const allSelected = productSelectedVariants.length === allVariantIds.length;

                              return (
                                <div key={product.id} className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">{product.title}</Label>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleAllVariantsForProduct(product.id, allVariantIds)}
                                    >
                                      {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
                                    </Button>
                                  </div>

                                  <ScrollArea className="w-full max-h-[200px]">
                                    <div className="grid grid-cols-4 gap-2">
                                      {variantsWithImages.map(({ variant, image }) => (
                                        <button
                                          type="button"
                                          key={variant.id}
                                          onClick={() => toggleVariantSelection(product.id, variant.id)}
                                          className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                                            productSelectedVariants.includes(variant.id)
                                              ? "border-primary ring-2 ring-primary"
                                              : "border-border hover:border-primary/50"
                                          }`}
                                        >
                                          <img
                                            src={image!.src}
                                            alt={getVariantLabel(variant)}
                                            className="w-full h-full object-cover"
                                          />
                                          {productSelectedVariants.includes(variant.id) && (
                                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                              <div className="bg-primary text-primary-foreground rounded-full p-1">
                                                <Check className="w-4 h-4" />
                                              </div>
                                            </div>
                                          )}
                                          <Badge className="absolute bottom-1 left-1 right-1 text-[10px] text-center truncate px-1 bg-black/80 text-white">
                                            {getVariantLabel(variant)}
                                          </Badge>
                                        </button>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </div>
                              );
                            })}
                          </div>

                          {/* Sélection des photos à travailler */}
                          <div className="space-y-4">
                            <Label className="text-sm font-medium">Sélection des photos à travailler</Label>
                            {selectedProducts.map((product) => {
                              const allImages = getAllProductImages(product);
                              const selectedImageUrl = config.selectedImages.get(product.id) || allImages[0]?.src;

                              return (
                                <div key={product.id} className="space-y-2">
                                  <Label className="text-sm font-medium">{product.title}</Label>
                                  <ScrollArea className="w-full max-h-[200px]">
                                    <div className="grid grid-cols-4 gap-2">
                                      {allImages.map((img, idx) => (
                                        <button
                                          type="button"
                                          key={img.id}
                                          onClick={() => {
                                            const newMap = new Map(config.selectedImages);
                                            newMap.set(product.id, img.src);
                                            setConfig({ ...config, selectedImages: newMap });
                                          }}
                                          className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                                            selectedImageUrl === img.src
                                              ? "border-primary ring-2 ring-primary"
                                              : "border-border hover:border-primary/50"
                                          }`}
                                        >
                                          <img
                                            src={img.src}
                                            alt={img.alt_text || `Image ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                          />
                                          {selectedImageUrl === img.src && (
                                            <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                                              <Check className="w-3 h-3" />
                                            </div>
                                          )}
                                          <Badge className="absolute bottom-1 left-1 text-xs bg-black/80 text-white">
                                            {img.id === "main" ? "Principale" : `#${idx + 1}`}
                                          </Badge>
                                        </button>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}
            </RadioGroup>
          </div>

          {/* Paramètres de génération */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Paramètres de génération</Label>

            <div className="grid grid-cols-2 gap-4">
              {/* Format d'image */}
              <Card className="p-4">
                <Label htmlFor="format" className="text-sm font-medium mb-3 block">
                  Format d'image
                </Label>
                <Select value={config.format} onValueChange={(value) => setConfig({ ...config, format: value })}>
                  <SelectTrigger id="format">
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
              <Card className="p-4">
                <Label className="text-sm font-medium mb-3 block">Type d'image</Label>
                <RadioGroup
                  value={config.imageType}
                  onValueChange={(value) => setConfig({ ...config, imageType: value as "primary" | "secondary" })}
                >
                  <div className="space-y-3">
                    <div
                      className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all ${
                        config.imageType === "primary" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setConfig({ ...config, imageType: "primary" })}
                    >
                      <RadioGroupItem value="primary" id="primary" />
                      <Label htmlFor="primary" className="cursor-pointer flex-1">
                        <div className="font-medium">Image Principale</div>
                        <div className="text-xs text-muted-foreground">Produit centré et bien visible</div>
                      </Label>
                    </div>
                    <div
                      className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all ${
                        config.imageType === "secondary" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setConfig({ ...config, imageType: "secondary" })}
                    >
                      <RadioGroupItem value="secondary" id="secondary" />
                      <Label htmlFor="secondary" className="cursor-pointer flex-1">
                        <div className="font-medium">Image Secondaire</div>
                        <div className="text-xs text-muted-foreground">Photo d'ambiance lifestyle</div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </Card>
            </div>

            {/* Ressemblance */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="similarity" className="text-sm font-medium">
                  Ressemblance à l'original
                </Label>
                <Select
                  value={config.similarity}
                  onValueChange={(value) => setConfig({ ...config, similarity: value })}
                >
                  <SelectTrigger id="similarity" className="w-[200px]">
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

          {/* Style prédéfini */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Style prédéfini</Label>
            <Card className="p-4">
              <Select onValueChange={handlePresetSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un style prédéfini..." />
                </SelectTrigger>
                <SelectContent>
                  {presetStyles.map((style) => (
                    <SelectItem key={style.name} value={style.prompt}>
                      {style.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="mt-4 space-y-2">
                <Label htmlFor="custom-prompt">Ou créez votre propre prompt</Label>
                <Textarea
                  id="custom-prompt"
                  placeholder="Décrivez l'environnement souhaité, l'éclairage et l'ambiance"
                  value={config.prompt}
                  onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  💡 Conseil : Décrivez l'environnement souhaité, l'éclairage et l'ambiance
                </p>
              </div>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!config.prompt.trim() || (config.applyTo === "variants" && config.selectedVariants.size === 0)}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Générer les arrière-plans
            {config.applyTo === "variants" && getSelectedVariantsCount() > 0 && (
              <span>({getSelectedVariantsCount()})</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
