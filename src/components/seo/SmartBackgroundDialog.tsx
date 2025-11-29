import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2,
  Sparkles,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Wand2,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  ShoppingBag,
  Sofa,
  Sparkle,
  Home,
  Camera,
  TreePine,
} from 'lucide-react';
import { toast } from 'sonner';
import { useImageOptimization } from '@/hooks/useImageOptimization';

type BackgroundFormat = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
type BackgroundMode = 'white_shopping' | 'smart_serp';
type BackgroundStyle = 'shopping' | 'lifestyle' | 'moderne' | 'living_room' | 'studio' | 'nature';

interface ProductVariant {
  id: string;
  title: string;
  image_url?: string | null;
}

interface Product {
  id: string;
  title: string;
  image_url: string | null;
  vendor?: string | null;
  handle?: string | null;
  variants?: ProductVariant[];
}

interface SmartBackgroundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: Product[];
  onComplete?: () => void;
  storeUrl?: string | null;
}

export const SmartBackgroundDialog = ({
  open,
  onOpenChange,
  selectedProducts,
  onComplete,
  storeUrl,
}: SmartBackgroundDialogProps) => {
  const [bgFormat, setBgFormat] = useState<BackgroundFormat>('1:1');
  const [bgMode, setBgMode] = useState<BackgroundMode>('smart_serp');
  const [bgStyle, setBgStyle] = useState<BackgroundStyle>('shopping');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [generatedPreviews, setGeneratedPreviews] = useState<Map<string, string>>(new Map());
  const [showPreview, setShowPreview] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [appliedProducts, setAppliedProducts] = useState<Set<string>>(new Set());
  // Track selected image per product (product_id -> image_url)
  const [selectedImages, setSelectedImages] = useState<Map<string, string>>(new Map());

  const { generateWhiteBackground, applyOptimizedImage } = useImageOptimization();

  // Get all available images for a product (main + variants)
  const getProductImages = (product: Product): { url: string; label: string }[] => {
    const images: { url: string; label: string }[] = [];
    if (product.image_url) {
      images.push({ url: product.image_url, label: 'Image principale' });
    }
    if (product.variants) {
      product.variants.forEach((v, idx) => {
        if (v.image_url && !images.find(img => img.url === v.image_url)) {
          images.push({ url: v.image_url, label: v.title || `Variante ${idx + 1}` });
        }
      });
    }
    return images;
  };

  // Get the selected image for a product (or default to main image)
  const getSelectedImage = (product: Product): string | null => {
    return selectedImages.get(product.id) || product.image_url;
  };

  const handleGenerateAll = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Aucun produit sélectionné');
      return;
    }

    setIsGenerating(true);
    setCurrentProductIndex(0);
    const newPreviews = new Map<string, string>();

    for (let i = 0; i < selectedProducts.length; i++) {
      const product = selectedProducts[i];
      setCurrentProductIndex(i);

      const imageUrl = getSelectedImage(product);
      if (!imageUrl) {
        toast.warning(`${product.title}: Pas d'image`);
        continue;
      }

      try {
        // Map format to edge function format
        const formatMap: Record<BackgroundFormat, 'square' | 'portrait' | 'landscape'> = {
          '1:1': 'square',
          '4:3': 'landscape',
          '3:4': 'portrait',
          '16:9': 'landscape',
          '9:16': 'portrait',
        };

        // Fetch SERP and Vision data if smart mode
        let serpData = null;
        let visionAiData = null;
        let productDescription = null;

        // Get existing product data
        const { data: productDetails } = await supabase
          .from('shopify_products')
          .select('body_html, seo_description, serp_data, vision_attributes')
          .eq('id', product.id)
          .single();

        if (productDetails) {
          serpData = productDetails.serp_data;
          visionAiData = productDetails.vision_attributes;
          productDescription = productDetails.body_html || productDetails.seo_description;
        }

        // Fetch SERP data if smart mode and no existing data
        if (bgMode === 'smart_serp' && !serpData) {
          console.log('🔍 [SmartBg] Fetching SERP data for:', product.title);
          const { data: serpResult } = await supabase.functions.invoke('search-similar-products-specs', {
            body: { productTitle: product.title, limit: 5 },
          });

          if (serpResult?.similarProducts || serpResult?.averageWeight || serpResult?.averageDimensions) {
            serpData = {
              dimensions: serpResult.averageDimensions
                ? `${serpResult.averageDimensions.length || ''} x ${serpResult.averageDimensions.width || ''} x ${serpResult.averageDimensions.height || ''}`
                    .replace(/\s+x\s+x\s+/g, '')
                    .trim()
                : null,
              weight: serpResult.averageWeight,
              materials: serpResult.similarProducts?.flatMap((p: any) => p.materials || []).slice(0, 3) || [],
              dominantStyles: serpResult.similarProducts?.flatMap((p: any) => (p.style ? [p.style] : [])).slice(0, 2) || [],
              confidence: serpResult.confidence,
            };
            console.log('✅ [SmartBg] SERP data formatted:', serpData);
          }
        }

        const result = await generateWhiteBackground.mutateAsync({
          imageUrl: imageUrl,
          productTitle: product.title,
          resolution: '2000x2000',
          format: formatMap[bgFormat],
          mode: 'google_shopping',
          product_id: product.id,
          serpData: bgMode === 'smart_serp' ? serpData : null,
          visionAiData: bgMode === 'smart_serp' ? visionAiData : null,
          productDescription: bgMode === 'smart_serp' ? productDescription : null,
          backgroundStyle: bgMode === 'smart_serp' ? bgStyle : undefined,
        });

        if (result.imageUrl) {
          newPreviews.set(product.id, result.imageUrl);
          toast.success(`${product.title}: Background généré`);
        }
      } catch (error) {
        console.error('Error generating background for', product.title, error);
        toast.error(`${product.title}: Erreur de génération`);
      }
    }

    setGeneratedPreviews(newPreviews);
    setIsGenerating(false);

    if (newPreviews.size > 0) {
      toast.success(`${newPreviews.size} background(s) généré(s)`);
    }
  };

  const handleApplyAll = async () => {
    if (generatedPreviews.size === 0) return;

    setIsGenerating(true);
    const newApplied = new Set<string>();

    for (const [productId, generatedImageUrl] of generatedPreviews) {
      const product = selectedProducts.find((p) => p.id === productId);
      if (!product) continue;

      try {
        // Get the selected source image URL for this product
        const selectedImageUrl = getSelectedImage(product);
        
        // Find the position of the selected image in product_images
        const { data: allImages } = await supabase
          .from('product_images')
          .select('id, src, position')
          .eq('product_id', productId)
          .order('position');
        
        // Find the image that matches the selected source image
        let targetImage = allImages?.find(img => img.src === selectedImageUrl);
        
        // Fallback to first image if no match found
        if (!targetImage && allImages?.length) {
          targetImage = allImages[0];
        }

        if (targetImage?.id) {
          console.log(`[SmartBg] Applying to image at position ${targetImage.position} for ${product.title}`);
          
          await applyOptimizedImage.mutateAsync({
            imageId: targetImage.id,
            productId: productId,
            optimizedUrl: generatedImageUrl,
            originalUrl: selectedImageUrl || product.image_url || '',
            optimizationType: 'white_background',
            aiModel: 'gemini-2.5-flash-image-preview',
            resolution: '2000x2000',
            qualityScore: 95,
          });
          newApplied.add(productId);
        } else {
          console.warn(`[SmartBg] No image found for product ${product.title}`);
        }
      } catch (error) {
        console.error('Error applying background for', product.title, error);
      }
    }

    setAppliedProducts(newApplied);
    setIsGenerating(false);
    
    // Show success with view online option
    toast.success(`${newApplied.size} background(s) appliqué(s) et synchronisé(s)`, {
      description: 'Les images ont été mises à jour sur votre boutique.',
      duration: 8000,
    });
    
    onComplete?.();
  };

  const handleViewOnline = (product: Product) => {
    if (storeUrl && product.handle) {
      window.open(`${storeUrl}/products/${product.handle}`, '_blank');
    }
  };

  const handlePreviewProduct = (product: Product) => {
    setPreviewProduct(product);
    setShowPreview(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Smart Background - Optimisation Photo
            </DialogTitle>
            <DialogDescription>
              Générez des backgrounds professionnels avec SERP Google et bonnes pratiques Shopping
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Format & Mode Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Square className="h-4 w-4" />
                  Format de sortie
                </Label>
                <Select value={bgFormat} onValueChange={(v) => setBgFormat(v as BackgroundFormat)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir le format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">
                      <div className="flex items-center gap-2">
                        <Square className="h-4 w-4" />
                        Carré (1:1) - Google Shopping
                      </div>
                    </SelectItem>
                    <SelectItem value="4:3">
                      <div className="flex items-center gap-2">
                        <RectangleHorizontal className="h-4 w-4" />
                        Paysage (4:3)
                      </div>
                    </SelectItem>
                    <SelectItem value="3:4">
                      <div className="flex items-center gap-2">
                        <RectangleVertical className="h-4 w-4" />
                        Portrait (3:4)
                      </div>
                    </SelectItem>
                    <SelectItem value="16:9">
                      <div className="flex items-center gap-2">
                        <RectangleHorizontal className="h-4 w-4" />
                        Cinéma (16:9) - Bannières
                      </div>
                    </SelectItem>
                    <SelectItem value="9:16">
                      <div className="flex items-center gap-2">
                        <RectangleVertical className="h-4 w-4" />
                        Story (9:16) - Instagram/TikTok
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Mode de génération
                </Label>
                <Select value={bgMode} onValueChange={(v) => setBgMode(v as BackgroundMode)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir le mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white_shopping">
                      <div className="flex items-center gap-2">
                        <Square className="h-4 w-4 text-muted-foreground" />
                        White Background - Google Shopping
                      </div>
                    </SelectItem>
                    <SelectItem value="smart_serp">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Smart Background - SERP + Vision AI
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {bgMode === 'white_shopping'
                    ? 'Fond blanc pur, éclairage studio, conforme Google Merchant Center'
                    : 'Enrichissement SERP (dimensions, matériaux), Vision AI, effet 3D professionnel'}
                </p>
              </div>
            </div>

            {/* Style Buttons - Only for smart_serp mode */}
            {bgMode === 'smart_serp' && (
              <div className="space-y-2">
                <Label className="text-sm">Style de background</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'shopping' as BackgroundStyle, label: 'Shopping', icon: ShoppingBag, desc: 'E-commerce professionnel' },
                    { value: 'lifestyle' as BackgroundStyle, label: 'Lifestyle', icon: Sparkle, desc: 'Ambiance naturelle' },
                    { value: 'moderne' as BackgroundStyle, label: 'Moderne', icon: Camera, desc: 'Design épuré' },
                    { value: 'living_room' as BackgroundStyle, label: 'Living Room', icon: Sofa, desc: 'Intérieur cosy' },
                    { value: 'studio' as BackgroundStyle, label: 'Studio', icon: Home, desc: 'Éclairage studio' },
                    { value: 'nature' as BackgroundStyle, label: 'Nature', icon: TreePine, desc: 'Extérieur naturel' },
                  ].map(({ value, label, icon: Icon, desc }) => (
                    <Button
                      key={value}
                      type="button"
                      variant={bgStyle === value ? 'default' : 'outline'}
                      size="sm"
                      className={`flex items-center gap-1.5 h-9 ${bgStyle === value ? '' : 'hover:bg-accent'}`}
                      onClick={() => setBgStyle(value)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{label}</span>
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {bgStyle === 'shopping' && 'Fond neutre optimisé e-commerce, mise en valeur produit'}
                  {bgStyle === 'lifestyle' && 'Contexte de vie réaliste, ambiance chaleureuse'}
                  {bgStyle === 'moderne' && 'Lignes épurées, design contemporain minimaliste'}
                  {bgStyle === 'living_room' && 'Décor intérieur salon/maison, contexte habitat'}
                  {bgStyle === 'studio' && 'Éclairage professionnel studio photo'}
                  {bgStyle === 'nature' && 'Environnement naturel, plantes et lumière douce'}
                </p>
              </div>
            )}

            {/* Products Grid */}
            <div className="space-y-2">
              <Label>{selectedProducts.length} produit(s) sélectionné(s)</Label>
              <ScrollArea className="h-[300px] border rounded-lg p-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {selectedProducts.map((product, index) => {
                    const hasGenerated = generatedPreviews.has(product.id);
                    const isCurrentlyGenerating = isGenerating && currentProductIndex === index;
                    const productImages = getProductImages(product);
                    const currentImage = getSelectedImage(product);
                    const hasVariantImages = productImages.length > 1;

                    return (
                      <Card
                        key={product.id}
                        className={`p-2 transition-all hover:shadow-md ${
                          hasGenerated ? 'ring-2 ring-green-500' : ''
                        } ${isCurrentlyGenerating ? 'ring-2 ring-primary animate-pulse' : ''}`}
                      >
                        <div 
                          className="aspect-square rounded overflow-hidden bg-muted relative cursor-pointer"
                          onClick={() => hasGenerated && handlePreviewProduct(product)}
                        >
                          {currentImage ? (
                            <img
                              src={hasGenerated ? generatedPreviews.get(product.id) : currentImage}
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}

                          {isCurrentlyGenerating && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 className="h-8 w-8 text-white animate-spin" />
                            </div>
                          )}

                          {hasGenerated && (
                            <div className="absolute top-1 right-1">
                              <CheckCircle2 className="h-5 w-5 text-green-500 bg-white rounded-full" />
                            </div>
                          )}

                          {hasVariantImages && !hasGenerated && (
                            <div className="absolute top-1 left-1">
                              <Badge variant="secondary" className="text-[9px] px-1">
                                {productImages.length} photos
                              </Badge>
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-medium mt-1 line-clamp-1">{product.title}</p>
                        
                        {/* Image selector for products with variants */}
                        {hasVariantImages && !hasGenerated && (
                          <Select
                            value={selectedImages.get(product.id) || product.image_url || ''}
                            onValueChange={(url) => {
                              setSelectedImages(prev => new Map(prev).set(product.id, url));
                            }}
                          >
                            <SelectTrigger className="h-7 text-[10px] mt-1">
                              <SelectValue placeholder="Choisir image" />
                            </SelectTrigger>
                            <SelectContent>
                              {productImages.map((img, idx) => (
                                <SelectItem key={idx} value={img.url} className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <img src={img.url} alt="" className="w-6 h-6 object-cover rounded" />
                                    <span className="truncate max-w-[100px]">{img.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {bgFormat}
                          </Badge>
                          <Badge variant={bgMode === 'smart_serp' ? 'default' : 'secondary'} className="text-[10px]">
                            {bgMode === 'smart_serp' ? 'Smart' : 'White'}
                          </Badge>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Progress */}
            {isGenerating && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm font-medium">
                  Génération en cours: {currentProductIndex + 1}/{selectedProducts.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedProducts[currentProductIndex]?.title}
                </p>
              </div>
            )}

            {/* Applied Products Preview */}
            {appliedProducts.size > 0 && (
              <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <p className="text-sm font-medium text-green-600">
                    {appliedProducts.size} image(s) appliquée(s) avec succès
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedProducts
                    .filter(p => appliedProducts.has(p.id))
                    .map(product => (
                      <Button
                        key={product.id}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleViewOnline(product)}
                        disabled={!storeUrl || !product.handle}
                      >
                        <ExternalLink className="h-3 w-3" />
                        {product.title.slice(0, 20)}...
                      </Button>
                    ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              {appliedProducts.size > 0 ? 'Fermer' : 'Annuler'}
            </Button>

            {appliedProducts.size === 0 && (
              generatedPreviews.size > 0 ? (
                <Button onClick={handleApplyAll} disabled={isGenerating} className="gap-2">
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Appliquer {generatedPreviews.size} background(s)
                </Button>
              ) : (
                <Button onClick={handleGenerateAll} disabled={isGenerating} className="gap-2">
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  Générer les backgrounds
                </Button>
              )
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewProduct?.title}</DialogTitle>
            <DialogDescription>Comparaison avant/après</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Original</Label>
              <div className="aspect-square rounded-lg overflow-hidden bg-muted border">
                {previewProduct?.image_url && (
                  <img
                    src={previewProduct.image_url}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Smart Background
              </Label>
              <div className="aspect-square rounded-lg overflow-hidden bg-white border-2 border-primary/20">
                {previewProduct && generatedPreviews.has(previewProduct.id) && (
                  <img
                    src={generatedPreviews.get(previewProduct.id)}
                    alt="Generated"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
