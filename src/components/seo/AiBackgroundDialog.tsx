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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Configuration de l'arrière-plan IA
          </DialogTitle>
          <DialogDescription>
            Personnalisez les paramètres de génération pour {selectedProducts.length} produit(s)
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-4">
          {/* Format d'application - EN PREMIER */}
          <div className="space-y-3">
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
                  config.applyTo === "simple" ? "border-primary bg-primary/5 ring-2 ring-primary" : ""
                }`}
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="simple" id="simple" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="simple" className="flex items-center gap-2 text-base cursor-pointer">
                      <Images className="h-5 w-5" />
                      Format Simple
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">Gallerie</p>

                    {config.applyTo === "simple" && (
                      <div className="mt-4 space-y-4">
                        {selectedProducts.map((product) => {
                          const allImages = getAllProductImages(product);
                          const selectedImageUrl = config.selectedImages.get(product.id) || allImages[0]?.src;

                          return (
                            <div key={product.id} className="space-y-3">
                              <Label className="text-sm font-medium">{product.title}</Label>
                              <ScrollArea className="w-full h-32">
                                <div className="flex gap-3 pb-4">
                                  {allImages.map((img, idx) => (
                                    <button
                                      type="button"
                                      key={img.id}
                                      onClick={() => {
                                        const newMap = new Map(config.selectedImages);
                                        newMap.set(product.id, img.src);
                                        setConfig({ ...config, selectedImages: newMap });
                                      }}
                                      className={`relative w-28 h-28 rounded-lg border-2 overflow-hidden transition-all flex-shrink-0 ${
                                        selectedImageUrl === img.src
                                          ? "border-primary ring-2 ring-primary shadow-lg"
                                          : "border-border hover:border-primary/50"
                                      }`}
                                    >
                                      <img
                                        src={img.src}
                                        alt={img.alt_text || `Image ${idx + 1}`}
                                        className="w-full h-full object-contain bg-muted"
                                      />
                                      {selectedImageUrl === img.src && (
                                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-md">
                                          <Check className="w-4 h-4" />
                                        </div>
                                      )}
                                      <Badge className="absolute bottom-2 left-2 text-xs bg-background/90 backdrop-blur-sm border">
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
                    config.applyTo === "variants" ? "border-primary bg-primary/5 ring-2 ring-primary" : ""
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="variants" id="variants" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="variants" className="flex items-center gap-2 text-base cursor-pointer">
                        <Package className="h-5 w-5" />
                        Format Variantes
                      </Label>
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

                                  <ScrollArea className="w-full h-32">
                                    <div className="flex gap-3 pb-4">
                                      {variantsWithImages.map(({ variant, image }) => (
                                        <button
                                          type="button"
                                          key={variant.id}
                                          onClick={() => toggleVariantSelection(product.id, variant.id)}
                                          className={`relative w-28 h-28 rounded-lg border-2 overflow-hidden transition-all flex-shrink-0 ${
                                            productSelectedVariants.includes(variant.id)
                                              ? "border-primary ring-2 ring-primary shadow-lg"
                                              : "border-border hover:border-primary/50"
                                          }`}
                                        >
                                          <img
                                            src={image!.src}
                                            alt={getVariantLabel(variant)}
                                            className="w-full h-full object-contain bg-muted"
                                          />
                                          {productSelectedVariants.includes(variant.id) && (
                                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                              <div className="bg-primary text-primary-foreground rounded-full p-2 shadow-md">
                                                <Check className="w-5 h-5" />
                                              </div>
                                            </div>
                                          )}
                                          <Badge className="absolute bottom-2 left-2 right-2 text-[10px] text-center truncate px-1 bg-background/90 backdrop-blur-sm border">
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
                                <div key={product.id} className="space-y-3">
                                  <Label className="text-sm font-medium">{product.title}</Label>
                                  <ScrollArea className="w-full h-32">
                                    <div className="flex gap-3 pb-4">
                                      {allImages.map((img, idx) => (
                                        <button
                                          type="button"
                                          key={img.id}
                                          onClick={() => {
                                            const newMap = new Map(config.selectedImages);
                                            newMap.set(product.id, img.src);
                                            setConfig({ ...config, selectedImages: newMap });
                                          }}
                                          className={`relative w-28 h-28 rounded-lg border-2 overflow-hidden transition-all flex-shrink-0 ${
                                            selectedImageUrl === img.src
                                              ? "border-primary ring-2 ring-primary shadow-lg"
                                              : "border-border hover:border-primary/50"
                                          }`}
                                        >
                                          <img
                                            src={img.src}
                                            alt={img.alt_text || `Image ${idx + 1}`}
                                            className="w-full h-full object-contain bg-muted"
                                          />
                                          {selectedImageUrl === img.src && (
                                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-md">
                                              <Check className="w-4 h-4" />
                                            </div>
                                          )}
                                          <Badge className="absolute bottom-2 left-2 text-xs bg-background/90 backdrop-blur-sm border">
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

            {/* Format */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="format" className="text-sm font-medium">
                  Format d'image
                </Label>
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
                    config.imageType === "primary"
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setConfig({ ...config, imageType: "primary" })}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                        config.imageType === "primary" ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}
                    >
                      {config.imageType === "primary" && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold text-sm">Image Principale</h4>
                      <p className="text-xs text-muted-foreground">Produit centré et bien visible</p>
                    </div>
                  </div>
                </Card>
                <Card
                  className={`p-3 cursor-pointer transition-all ${
                    config.imageType === "secondary"
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setConfig({ ...config, imageType: "secondary" })}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                        config.imageType === "secondary" ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}
                    >
                      {config.imageType === "secondary" && <Check className="h-2.5 w-2.5 text-white" />}
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
                <Label htmlFor="similarity" className="text-sm font-medium">
                  Ressemblance à l'original
                </Label>
                <Select
                  value={config.similarity}
                  onValueChange={(value) => setConfig({ ...config, similarity: value })}
                >
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
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Style d'arrière-plan</Label>
              <div className="grid grid-cols-4 gap-2">
                <Card
                  className={`p-3 cursor-pointer border-2 transition-all ${
                    config.prompt === "modern minimalist white studio with soft shadows"
                      ? "border-primary ring-2 ring-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => handlePresetSelect("modern minimalist white studio with soft shadows")}
                >
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-md mb-2 flex items-center justify-center">
                    <span className="text-xl">🏢</span>
                  </div>
                  <p className="text-xs font-medium text-center">Studio blanc</p>
                </Card>
                <Card
                  className={`p-3 cursor-pointer border-2 transition-all ${
                    config.prompt === "natural wood surface with plants and soft daylight"
                      ? "border-primary ring-2 ring-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => handlePresetSelect("natural wood surface with plants and soft daylight")}
                >
                  <div className="aspect-square bg-gradient-to-br from-amber-100 to-amber-200 rounded-md mb-2 flex items-center justify-center">
                    <span className="text-xl">🌿</span>
                  </div>
                  <p className="text-xs font-medium text-center">Naturel bois</p>
                </Card>
                <Card
                  className={`p-3 cursor-pointer border-2 transition-all ${
                    config.prompt === "luxurious marble surface with gold accents"
                      ? "border-primary ring-2 ring-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => handlePresetSelect("luxurious marble surface with gold accents")}
                >
                  <div className="aspect-square bg-gradient-to-br from-gray-200 to-yellow-100 rounded-md mb-2 flex items-center justify-center">
                    <span className="text-xl">✨</span>
                  </div>
                  <p className="text-xs font-medium text-center">Luxe marbre</p>
                </Card>
                <Card
                  className={`p-3 cursor-pointer border-2 transition-all ${
                    config.prompt === "cozy living room with warm lighting"
                      ? "border-primary ring-2 ring-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => handlePresetSelect("cozy living room with warm lighting")}
                >
                  <div className="aspect-square bg-gradient-to-br from-orange-100 to-orange-200 rounded-md mb-2 flex items-center justify-center">
                    <span className="text-xl">🏠</span>
                  </div>
                  <p className="text-xs font-medium text-center">Salon cosy</p>
                </Card>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-prompt">Prompt personnalisé</Label>
              <Textarea
                id="custom-prompt"
                placeholder="Décrivez l'environnement, l'éclairage et l'ambiance..."
                value={config.prompt}
                onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                💡 Décrivez précisément l'environnement souhaité pour un meilleur résultat
              </p>
            </div>
          </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!config.prompt.trim() || (config.applyTo === "variants" && config.selectedVariants.size === 0)}
              className="gap-2"
              size="lg"
            >
              <Sparkles className="h-5 w-5" />
              Générer les arrière-plans
              {config.applyTo === "variants" && getSelectedVariantsCount() > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {getSelectedVariantsCount()}
                </Badge>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
