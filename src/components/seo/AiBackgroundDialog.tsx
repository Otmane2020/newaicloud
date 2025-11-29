import { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Palette, Check, Sparkles, Loader2, CheckSquare, Square } from "lucide-react";
import { useTranslation } from "@/lib/language";

interface ProductImage {
  id: string;
  src: string;
  alt_text?: string | null;
  position: number;
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
  image_url?: string | null;
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
  selectedImages: Map<string, string[]>;
  applyTo: "simple" | "gallery" | "variants";
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
  const { language } = useTranslation();
  const [config, setConfig] = useState<AiBackgroundConfig>({
    prompt: "",
    format: "square",
    similarity: "very-close",
    imageType: "primary",
    selectedImages: new Map(),
    applyTo: "simple",
    selectedVariants: new Map(),
  });

  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingImages, setLoadingImages] = useState(true);
  const [imageLoadStates, setImageLoadStates] = useState<Map<string, boolean>>(new Map());

  const singleProduct = selectedProducts.length === 1 ? selectedProducts[0] : null;
  const hasVariants = selectedProducts.some((product) => product.variants && product.variants.length > 0);

  // Détection automatique du format d'application
  const detectApplyTo = (products: Product[]): "simple" | "gallery" | "variants" => {
    if (products.length === 1) {
      const product = products[0];
      if (product.variants && product.variants.length > 1) {
        return "variants";
      }
      return "gallery";
    }
    return "simple";
  };

  // Auto-détection au montage du dialogue SANS auto-sélection
  useEffect(() => {
    if (!open || selectedProducts.length === 0) return;
    
    const detectedMode = detectApplyTo(selectedProducts);
    console.log('🎯 [AI BG Dialog] Detected mode:', detectedMode, 'for', selectedProducts.length, 'products');
    
    setConfig(prev => ({ 
      ...prev, 
      applyTo: detectedMode,
      selectedImages: new Map(),
      selectedVariants: new Map()
    }));
  }, [open, selectedProducts, productImages]);

  // Précharger toutes les images de la galerie
  useEffect(() => {
    if (!open) {
      setLoadingImages(true);
      setImagesLoaded(false);
      setImageLoadStates(new Map());
      return;
    }
    
    setLoadingImages(true);
    const allImageUrls: string[] = [];
    const newLoadStates = new Map<string, boolean>();
    
    selectedProducts.forEach(product => {
      const images = productImages.get(product.id) || [];
      images.forEach(img => {
        allImageUrls.push(img.src);
        newLoadStates.set(img.src, false);
      });
      if (product.image_url) {
        allImageUrls.push(product.image_url);
        newLoadStates.set(product.image_url, false);
      }
    });

    setImageLoadStates(newLoadStates);

    if (allImageUrls.length === 0) {
      setLoadingImages(false);
      setImagesLoaded(true);
      return;
    }

    let loadedCount = 0;
    const totalImages = allImageUrls.length;
    
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ Image loading timeout - forcing loaded state');
      setLoadingImages(false);
      setImagesLoaded(true);
    }, 10000);

    allImageUrls.forEach(url => {
      const img = new Image();
      
      img.onload = () => {
        loadedCount++;
        setImageLoadStates(prev => new Map(prev).set(url, true));
        if (loadedCount === totalImages) {
          clearTimeout(timeoutId);
          setLoadingImages(false);
          setImagesLoaded(true);
        }
      };
      
      img.onerror = () => {
        console.warn('❌ Failed to load image:', url);
        loadedCount++;
        setImageLoadStates(prev => new Map(prev).set(url, true));
        if (loadedCount === totalImages) {
          clearTimeout(timeoutId);
          setLoadingImages(false);
          setImagesLoaded(true);
        }
      };
      
      img.src = url;
    });

    return () => clearTimeout(timeoutId);
  }, [open, selectedProducts, productImages]);

  // Helper pour obtenir toutes les images d'un produit (dédupliquées par URL)
  const getAllProductImages = (product: Product): ProductImage[] => {
    const images = productImages.get(product.id) || [];
    const seenUrls = new Set<string>();
    const uniqueImages: ProductImage[] = [];
    
    // Ajouter l'image principale en premier si elle existe
    if (product.image_url) {
      seenUrls.add(product.image_url);
      uniqueImages.push({
        id: `main-${product.id}`,
        src: product.image_url,
        alt_text: product.seo_title || product.title,
        position: -1
      });
    }
    
    // Ajouter les autres images en évitant les doublons
    images.forEach((img, idx) => {
      if (!seenUrls.has(img.src)) {
        seenUrls.add(img.src);
        uniqueImages.push({
          ...img,
          id: img.id || `img-${product.id}-${idx}` // Assurer un ID unique
        });
      }
    });
    
    return uniqueImages.sort((a, b) => a.position - b.position);
  };

  // Helper functions for image selection
  const selectAllImages = () => {
    if (config.applyTo === "gallery" && singleProduct) {
      const allImages = getAllProductImages(singleProduct);
      const newSelectedImages = new Map<string, string[]>();
      newSelectedImages.set(singleProduct.id, allImages.map(img => img.src));
      setConfig(prev => ({ ...prev, selectedImages: newSelectedImages }));
    } else if (config.applyTo === "simple") {
      const newSelectedImages = new Map<string, string[]>();
      selectedProducts.forEach(product => {
        if (product.image_url) {
          newSelectedImages.set(product.id, [product.image_url]);
        }
      });
      setConfig(prev => ({ ...prev, selectedImages: newSelectedImages }));
    }
  };

  const deselectAllImages = () => {
    setConfig(prev => ({ ...prev, selectedImages: new Map() }));
  };

  const toggleImageSelection = (productId: string, imageSrc: string) => {
    setConfig(prev => {
      const newSelectedImages = new Map(prev.selectedImages);
      const currentImages = newSelectedImages.get(productId) || [];
      
      if (currentImages.includes(imageSrc)) {
        const filtered = currentImages.filter(src => src !== imageSrc);
        if (filtered.length === 0) {
          newSelectedImages.delete(productId);
        } else {
          newSelectedImages.set(productId, filtered);
        }
      } else {
        newSelectedImages.set(productId, [...currentImages, imageSrc]);
      }
      
      return { ...prev, selectedImages: newSelectedImages };
    });
  };

  const getSelectedImagesCount = (): number => {
    let count = 0;
    config.selectedImages.forEach(images => count += images.length);
    config.selectedVariants.forEach(variants => count += variants.length);
    return count;
  };

  const handleConfirm = async () => {
    onConfirm(config);
    onOpenChange(false);
  };

  const handlePresetSelect = (value: string) => {
    setConfig({ ...config, prompt: value });
  };

  const toggleVariantSelection = (productId: string, variantId: string) => {
    setConfig((prev) => {
      const newSelectedVariants = new Map(prev.selectedVariants);
      const newSelectedImages = new Map(prev.selectedImages);
      const productVariants = newSelectedVariants.get(productId) || [];

      if (productVariants.includes(variantId)) {
        newSelectedVariants.delete(productId);
        newSelectedImages.delete(productId);
      } else {
        const product = selectedProducts.find(p => p.id === productId);
        if (product) {
          const variant = product.variants?.find(v => v.id === variantId);
          
          if (variant) {
            // Use variant's image_url directly if available
            const imageSrc = variant.image_url;
            
            if (imageSrc) {
              newSelectedImages.set(productId, [imageSrc]);
            } else {
              // Fallback: try to find image by shopify_image_id
              const variantImage = variant.image_id 
                ? productImages.get(productId)?.find(img => String(img.id) === String(variant.image_id))
                : undefined;
              
              if (variantImage) {
                newSelectedImages.set(productId, [variantImage.src]);
              } else if (product.image_url) {
                newSelectedImages.set(productId, [product.image_url]);
              }
            }
          }
        }
        
        newSelectedVariants.set(productId, [variantId]);
      }

      return {
        ...prev,
        selectedVariants: newSelectedVariants,
        selectedImages: newSelectedImages,
      };
    });
  };

  const getVariantLabel = (variant: ProductVariant): string => {
    const options = [variant.option1, variant.option2, variant.option3].filter(Boolean).join(" - ");
    return options || variant.title || `Variante ${variant.id.slice(-4)}`;
  };

  const presetStyles = [
    {
      name: language === 'fr' ? "Cozy Lifestyle – Salon moderne" : "Cozy Lifestyle – Modern Living Room",
      prompt: "A cozy lifestyle setting with warm lighting and a comfortable modern living room interior. Soft ambient light, natural textures, wooden elements, neutral tones. The product is displayed as the hero element, well-lit, perfectly integrated into the scene, with a premium aesthetic suitable for e-commerce.",
      icon: "🛋️",
    },
    {
      name: language === 'fr' ? "Studio professionnel" : "Professional Studio",
      prompt: "Professional studio photography with a clean white background and perfect soft lighting. High-end commercial style, sharp focus on the product, no distractions, premium e-commerce aesthetic.",
      icon: "📸",
    },
    {
      name: language === 'fr' ? "Nature luxueuse" : "Luxurious Nature",
      prompt: "Luxurious natural setting with green plants, wood textures, soft daylight and refined organic décor. Warm, elegant, high-end natural ambiance that highlights the product in a premium lifestyle environment.",
      icon: "🌿",
    },
    {
      name: language === 'fr' ? "Minimaliste moderne" : "Modern Minimalist",
      prompt: "Modern minimalist interior with clean lines, neutral colors, soft daylight and a refined, uncluttered aesthetic. The product is centered and highlighted in a sleek, contemporary composition ideal for e-commerce.",
      icon: "🧼",
    },
    {
      name: language === 'fr' ? "Urbain contemporain" : "Urban Contemporary",
      prompt: "Contemporary urban background with industrial elements, concrete textures, large windows, and modern architecture. Stylish, modern city-inspired atmosphere that enhances the product in a premium lifestyle shot.",
      icon: "🏙️",
    },
    {
      name: "Urbain contemporain",
      prompt: "contemporary urban background with industrial elements and modern architecture",
      icon: "🏙️",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Générer un Background IA
            {singleProduct && ` - ${singleProduct.title}`}
          </DialogTitle>
          <DialogDescription>
            {config.applyTo === 'gallery' && "Sélectionnez les images à traiter"}
            {config.applyTo === 'variants' && "Sélectionnez une variante"}
            {config.applyTo === 'simple' && `${selectedProducts.length} produit(s) sélectionné(s)`}
          </DialogDescription>
        </DialogHeader>

        {loadingImages && (
          <Alert className="mb-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Chargement de la galerie d'images...
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          {/* Section Images */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                {config.applyTo === 'variants' ? 'Choisissez une variante' : 'Images qui seront traitées'}
              </Label>
              {config.applyTo !== 'variants' && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllImages}
                    disabled={loadingImages}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Sélectionner tout
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={deselectAllImages}
                    disabled={loadingImages}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Tout désélectionner
                  </Button>
                </div>
              )}
            </div>

            {/* Mode Gallery: Afficher toutes les images avec checkboxes */}
            {config.applyTo === 'gallery' && singleProduct && (
              <Card className="p-4">
                <ScrollArea className="h-[300px]">
                  <div className="grid grid-cols-4 gap-3 pr-4">
                    {getAllProductImages(singleProduct).map((img, idx) => {
                      const isSelected = config.selectedImages.get(singleProduct.id)?.includes(img.src);
                      const isLoaded = imageLoadStates.get(img.src);
                      
                      return (
                        <button
                          type="button"
                          key={img.id}
                          onClick={() => toggleImageSelection(singleProduct.id, img.src)}
                          disabled={!isLoaded}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                          } ${!isLoaded ? 'opacity-50' : ''}`}
                        >
                          <img
                            src={img.src}
                            alt={img.alt_text || `Image ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {idx === 0 && (
                            <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
                              Principale
                            </Badge>
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                              <div className="bg-primary text-primary-foreground rounded-full p-2">
                                <Check className="h-4 w-4" />
                              </div>
                            </div>
                          )}
                          {!isLoaded && (
                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </Card>
            )}

            {/* Mode Variants: Afficher les variantes */}
            {config.applyTo === 'variants' && singleProduct && singleProduct.variants && (
              <Card className="p-4">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {singleProduct.variants.map(variant => {
                      const isSelected = config.selectedVariants.get(singleProduct.id)?.includes(variant.id);
                      // Use variant's image_url directly if available
                      const imageSrc = variant.image_url || singleProduct.image_url;

                      return (
                        <button
                          type="button"
                          key={variant.id}
                          onClick={() => toggleVariantSelection(singleProduct.id, variant.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                            isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          {imageSrc && (
                            <img
                              src={imageSrc}
                              alt={getVariantLabel(variant)}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 text-left">
                            <div className="font-medium">{getVariantLabel(variant)}</div>
                          </div>
                          {isSelected && (
                            <div className="bg-primary text-primary-foreground rounded-full p-1">
                              <Check className="h-4 w-4" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </Card>
            )}

            {/* Mode Simple: Afficher images principales */}
            {config.applyTo === 'simple' && (
              <Card className="p-4">
                <div className="grid grid-cols-4 gap-3">
                  {selectedProducts.map(product => {
                    if (!product.image_url) return null;
                    const isSelected = config.selectedImages.get(product.id)?.includes(product.image_url);
                    
                    return (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() => toggleImageSelection(product.id, product.image_url!)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <p className="text-xs text-white truncate">{product.title}</p>
                        </div>
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground rounded-full p-2">
                              <Check className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Section Configuration */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Configuration</Label>
            
            {/* Description du background */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Description du background</Label>
              <Textarea
                value={config.prompt}
                onChange={(e) => setConfig(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder="Ex: studio blanc minimaliste avec éclairage doux"
                className="min-h-[100px]"
              />
              
              {/* Styles prédéfinis */}
              <div className="mt-3 flex flex-wrap gap-2">
                {presetStyles.map((preset) => (
                  <Button
                    key={preset.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetSelect(preset.prompt)}
                    className="text-xs"
                  >
                    <span className="mr-1">{preset.icon}</span>
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Format d'image</Label>
              <Select value={config.format} onValueChange={(value) => setConfig(prev => ({ ...prev, format: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Carré (1:1)</SelectItem>
                  <SelectItem value="portrait">Portrait (3:4)</SelectItem>
                  <SelectItem value="landscape">Paysage (4:3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!config.prompt || getSelectedImagesCount() === 0}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Générer {getSelectedImagesCount()} image(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
