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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Palette, Check, Sparkles, Images, Package, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ImageInsights {
  dominantStyles: string[];
  commonAngles: string[];
  colorSchemes: string[];
  aspectRatios: string[];
}

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
  selectedImages: Map<string, string[]>; // Changed to string[] for multiple images per product
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
  const [config, setConfig] = useState<AiBackgroundConfig>({
    prompt: "",
    format: "square",
    similarity: "very-close",
    imageType: "primary",
    selectedImages: new Map(),
    applyTo: "simple",
    selectedVariants: new Map(),
  });

  // SERP Analysis states
  const [serpInsights, setSerpInsights] = useState<ImageInsights | null>(null);
  const [loadingSerpAnalysis, setLoadingSerpAnalysis] = useState(false);
  const [serpError, setSerpError] = useState<string | null>(null);
  
  // Gallery loading state
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingImages, setLoadingImages] = useState(true);

  const singleProduct = selectedProducts.length === 1 ? selectedProducts[0] : null;
  const hasVariants = selectedProducts.some((product) => product.variants && product.variants.length > 0);

  // Détection automatique du format d'application
  const detectApplyTo = (products: Product[]): "simple" | "gallery" | "variants" => {
    // Si un seul produit sélectionné
    if (products.length === 1) {
      const product = products[0];
      // Si le produit a des variantes, proposer le format Variantes par défaut
      if (product.variants && product.variants.length > 1) {
        return "variants";
      }
      // Pour produit simple sans variantes, toujours mode galerie pour afficher toutes les images
      return "gallery";
    }
    // Sinon, format Simple par défaut
    return "simple";
  };

  // Auto-détection au montage du dialogue
  useEffect(() => {
    if (open && selectedProducts.length > 0) {
      const detectedFormat = detectApplyTo(selectedProducts);
      setConfig(prev => ({ ...prev, applyTo: detectedFormat }));
    }
  }, [open, selectedProducts]);

  // Précharger toutes les images de la galerie
  useEffect(() => {
    if (!open) return;
    
    setLoadingImages(true);
    const allImageUrls: string[] = [];
    
    selectedProducts.forEach(product => {
      const images = productImages.get(product.id) || [];
      images.forEach(img => allImageUrls.push(img.src));
      if (product.image_url) allImageUrls.push(product.image_url);
    });

    if (allImageUrls.length === 0) {
      setLoadingImages(false);
      setImagesLoaded(true);
      return;
    }

    let loadedCount = 0;
    const totalImages = allImageUrls.length;

    allImageUrls.forEach(url => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          setLoadingImages(false);
          setImagesLoaded(true);
        }
      };
      img.src = url;
    });
  }, [open, selectedProducts, productImages]);

  // Analyze SERP for product trends
  const analyzeSerpForProduct = async (productTitle: string) => {
    setLoadingSerpAnalysis(true);
    setSerpError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-serp-competitors', {
        body: {
          keyword: productTitle,
          analysisType: 'images',
          maxResults: 20
        }
      });

      if (error) throw error;
      
      if (data?.insights) {
        setSerpInsights(data.insights);
        console.log('📊 SERP insights loaded:', data.insights);
        return data.insights;
      }
      return null;
    } catch (error) {
      console.error('SERP analysis error:', error);
      setSerpError('Impossible d\'analyser les tendances SERP');
      return null;
    } finally {
      setLoadingSerpAnalysis(false);
    }
  };

  // Generate enriched prompt with SERP insights
  const generateEnrichedPrompt = (basePrompt: string, insights: ImageInsights | null) => {
    if (!insights || insights.dominantStyles.length === 0) return basePrompt;

    const styleContext = insights.dominantStyles.slice(0, 3).join(', ');
    const angleContext = insights.commonAngles.slice(0, 3).join(', ');
    const colorContext = insights.colorSchemes.slice(0, 3).join(', ');
    const formatContext = insights.aspectRatios[0] || 'square';

    return `${basePrompt}

Optimisé selon les tendances SERP des concurrents :
- Styles dominants : ${styleContext}
- Angles de vue : ${angleContext}
- Palette de couleurs : ${colorContext}
- Format optimal : ${formatContext}

Créer une image qui suit ces tendances tout en restant unique et professionnelle.`;
  };

  // Générer un prompt par défaut basé sur les produits sélectionnés
  useEffect(() => {
    if (open && selectedProducts.length > 0 && !config.prompt) {
      const productTitles = selectedProducts.map(p => p.title).join(", ");
      const defaultPrompt = `Professional product photography for ${productTitles} with clean modern background and perfect studio lighting`;
      setConfig(prev => ({ ...prev, prompt: defaultPrompt }));
      
      // Launch SERP analysis for the first product
      const mainProduct = selectedProducts[0];
      analyzeSerpForProduct(mainProduct.title);
    }
  }, [open, selectedProducts]);

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
          finalConfig.selectedImages.set(product.id, [images[0].src]);
        }
      });
    }

    // Enrichir le prompt avec le contexte produit
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

    // Enrichir le prompt avec les insights SERP
    let enrichedPrompt = config.prompt;
    
    if (productContext) {
      enrichedPrompt = `${enrichedPrompt}\n\nProduct Context:\n${productContext}`;
    }
    
    if (serpInsights && serpInsights.dominantStyles.length > 0) {
      const serpContext = generateEnrichedPrompt(enrichedPrompt, serpInsights);
      enrichedPrompt = serpContext;
      console.log('✨ Using SERP-enriched prompt:', { serpInsights });
    }

    finalConfig.enrichedPrompt = enrichedPrompt !== config.prompt ? enrichedPrompt : undefined;

    onConfirm(finalConfig);
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

      // Pour produits avec variants: ne permettre qu'UNE SEULE variante sélectionnée
      if (productVariants.includes(variantId)) {
        // Désélection: supprimer la variante
        newSelectedVariants.delete(productId);
        newSelectedImages.delete(productId);
      } else {
        // Sélection: remplacer toute sélection existante par cette variante
        const product = selectedProducts.find(p => p.id === productId);
        if (product) {
          const variant = product.variants?.find(v => v.id === variantId);
          
          if (variant) {
            const variantImage = productImages.get(productId)?.find(
              img => img.variant_id === variantId
            );
            
            // Auto-sélectionner l'image de la variante si disponible
            if (variantImage) {
              newSelectedImages.set(productId, [variantImage.src]);
            } else if (product.image_url) {
              // Fallback sur l'image principale
              newSelectedImages.set(productId, [product.image_url]);
            }
          }
        }
        
        // Remplacer par une seule variante
        newSelectedVariants.set(productId, [variantId]);
      }

      return {
        ...prev,
        selectedVariants: newSelectedVariants,
        selectedImages: newSelectedImages,
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

        {/* Indicateur de chargement des images */}
        {loadingImages && (
          <Alert className="mb-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Chargement de la galerie d'images...
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          {/* Format d'application - EN PREMIER */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Format d'application</Label>
            <RadioGroup
              value={config.applyTo}
              onValueChange={(v) => {
                setConfig({
                  ...config,
                  applyTo: v as "simple" | "gallery" | "variants",
                  selectedVariants: v !== "variants" ? new Map() : config.selectedVariants,
                });
              }}
            >
              {/* Pour produits SANS variants : afficher Image Principale et Toute la Gallerie */}
              {!hasVariants && (
                <>
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
                            Image Principale
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Appliquer à l'image principale uniquement</p>

                        {config.applyTo === "simple" && (
                          <div className="mt-4 space-y-4">
                            {selectedProducts.map((product) => {
                              const allImages = getAllProductImages(product);
                              const selectedImages = config.selectedImages.get(product.id) || [];
                              const selectedImageUrl = selectedImages.length > 0 ? selectedImages[0] : allImages[0]?.src;

                              return (
                                <div key={product.id} className="space-y-3">
                                  <div>
                                    <Label className="text-sm font-medium">{product.title}</Label>
                                  </div>
                                  <div className="w-full max-h-[200px] overflow-y-auto">
                                    <div className="grid grid-cols-4 gap-2 pr-2">
                                      {allImages.map((img, idx) => (
                                        <button
                                          type="button"
                                          key={img.id}
                                          onClick={() => {
                                            const newMap = new Map(config.selectedImages);
                                            newMap.set(product.id, [img.src]);
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
                                            <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                              <Check className="h-6 w-6 text-primary" />
                                            </div>
                                          )}
                                          <Badge className="absolute top-2 left-2 text-xs">
                                            {img.position === 0 ? "Principale" : `#${img.position + 1}`}
                                          </Badge>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Option Gallerie (seulement pour produits sans variants) */}
                  <Card
                    className={`p-4 cursor-pointer transition-all ${
                      config.applyTo === "gallery" ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value="gallery" id="gallery" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          <Label htmlFor="gallery" className="text-base font-medium cursor-pointer">
                            Toute la Gallerie
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Appliquer à toutes les images du produit</p>
                      </div>
                    </div>
                  </Card>
                </>
              )}

              {/* Pour produits AVEC variants : afficher uniquement l'option Variantes */}
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
                        Sélectionnez une seule variante - son image sera automatiquement choisie
                      </p>

                      {config.applyTo === "variants" && selectedProducts.some(p => p.variants && p.variants.length > 0) && (
                        <div className="mt-4 space-y-6">
                          {/* Sélection d'UNE variante */}
                          <div className="space-y-4">
                            <Label className="text-sm font-medium">Sélectionnez une variante</Label>
                            {selectedProducts.map((product) => {
                              const variantsWithImages = getVariantsWithImages(product);
                              if (variantsWithImages.length === 0) return null;

                              const productSelectedVariants = config.selectedVariants.get(product.id) || [];

                              return (
                                <div key={product.id} className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">{product.title}</Label>
                                  </div>

                                  <div className="w-full max-h-[200px] overflow-y-auto">
                                    <div className="grid grid-cols-6 gap-2 pr-2">
                                      {variantsWithImages.map(({ variant, image }) => (
                                        <div key={variant.id} className="flex flex-col items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => toggleVariantSelection(product.id, variant.id)}
                                            className={`relative rounded-md border-2 overflow-hidden transition-all ${
                                              productSelectedVariants.includes(variant.id)
                                                ? "border-primary ring-2 ring-primary"
                                                : "border-border hover:border-primary/50"
                                            }`}
                                            style={{ width: '80px', height: '80px' }}
                                          >
                                            <img
                                              src={typeof image === 'string' ? image : image?.src || "/placeholder.svg"}
                                              alt={getVariantLabel(variant)}
                                              className="w-full h-full object-cover"
                                            />
                                            {productSelectedVariants.includes(variant.id) && (
                                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                                <Check className="h-4 w-4 text-primary" />
                                              </div>
                                            )}
                                          </button>
                                          <span className="text-xs text-muted-foreground truncate w-full text-center">
                                            {getVariantLabel(variant)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Sélection des photos à travailler */}
                          <div className="space-y-4">
                            <Label className="text-sm font-medium">
                              Sélection des photos à travailler (cochez plusieurs images)
                            </Label>
                            {selectedProducts.map((product) => {
                              const allImages = getAllProductImages(product);
                              const selectedImages = config.selectedImages.get(product.id) || [];

                              return (
                                <div key={product.id} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">{product.title}</Label>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newMap = new Map(config.selectedImages);
                                        if (selectedImages.length === allImages.length) {
                                          newMap.set(product.id, []);
                                        } else {
                                          newMap.set(product.id, allImages.map(img => img.src));
                                        }
                                        setConfig({ ...config, selectedImages: newMap });
                                      }}
                                      className="h-7 text-xs"
                                    >
                                      {selectedImages.length === allImages.length ? "Tout désélectionner" : "Tout sélectionner"}
                                    </Button>
                                  </div>
                                  <div className="w-full max-h-[200px] overflow-y-auto">
                                    <div className="grid grid-cols-4 gap-2 pr-2">
                                      {allImages.map((img, idx) => {
                                        const isSelected = selectedImages.includes(img.src);
                                        return (
                                          <button
                                            type="button"
                                            key={img.id}
                                            onClick={() => {
                                              const newMap = new Map(config.selectedImages);
                                              const current = newMap.get(product.id) || [];
                                              if (isSelected) {
                                                newMap.set(product.id, current.filter(src => src !== img.src));
                                              } else {
                                                newMap.set(product.id, [...current, img.src]);
                                              }
                                              setConfig({ ...config, selectedImages: newMap });
                                            }}
                                            className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                                              isSelected
                                                ? "border-primary ring-2 ring-primary"
                                                : "border-border hover:border-primary/50"
                                            }`}
                                          >
                                            <img
                                              src={img.src}
                                              alt={img.alt_text || `Image ${idx + 1}`}
                                              className="w-full h-full object-cover"
                                            />
                                            {isSelected && (
                                              <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                                                <Check className="w-3 h-3" />
                                              </div>
                                            )}
                                            <Badge className="absolute bottom-1 left-1 text-xs bg-black/80 text-white">
                                              {img.id === "main" ? "Principale" : `#${idx + 1}`}
                                            </Badge>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
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

          {/* SERP Insights Display */}
          {loadingSerpAnalysis && (
            <Card className="p-3 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 text-xs text-blue-900">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Analyse des tendances SERP en cours...</span>
              </div>
            </Card>
          )}

          {serpInsights && !loadingSerpAnalysis && (
            <Card className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <p className="text-xs font-semibold text-blue-900">
                    📊 Insights SERP - Tendances des concurrents
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="font-medium text-blue-800">Styles dominants :</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {serpInsights.dominantStyles.slice(0, 3).map((style, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 bg-white/80">
                            {style}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-800">Angles de vue :</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {serpInsights.commonAngles.slice(0, 3).map((angle, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 bg-white/80">
                            {angle}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  {serpInsights.colorSchemes.length > 0 && (
                    <div className="text-[10px]">
                      <span className="font-medium text-blue-800">Palettes : </span>
                      <span className="text-blue-700">{serpInsights.colorSchemes.slice(0, 2).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {serpError && (
            <Alert className="py-2">
              <AlertCircle className="h-3 w-3" />
              <AlertDescription className="text-xs">
                {serpError} - Génération possible sans insights SERP
              </AlertDescription>
            </Alert>
          )}

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
            disabled={
              loadingImages || 
              !config.prompt.trim() || 
              (config.applyTo === "variants" && config.selectedVariants.size === 0)
            }
            className="gap-2"
          >
            {loadingImages ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Générer les arrière-plans
                {config.applyTo === "variants" && getSelectedVariantsCount() > 0 && (
                  <span>({getSelectedVariantsCount()})</span>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
