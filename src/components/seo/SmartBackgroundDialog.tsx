import { useState, useEffect } from 'react';
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
  RefreshCw,
  History,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useImageOptimization } from '@/hooks/useImageOptimization';
import { useTranslation } from '@/lib/language';

interface ProductGalleryImage {
  id: string;
  src: string;
  alt_text: string | null;
  position: number | null;
  shopify_image_id: number | null;
}

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

interface ImageHistoryItem {
  id: string;
  optimized_url: string;
  original_url: string | null;
  created_at: string;
  optimization_type: string;
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
  const { t, language } = useTranslation();
  const [bgFormat, setBgFormat] = useState<BackgroundFormat>('1:1');
  const [bgMode, setBgMode] = useState<BackgroundMode>('smart_serp');
  const [bgStyle, setBgStyle] = useState<BackgroundStyle>('shopping');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [generatedPreviews, setGeneratedPreviews] = useState<Map<string, string>>(new Map());
  const [showPreview, setShowPreview] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [appliedProducts, setAppliedProducts] = useState<Set<string>>(new Set());
  // Track selected image per product (product_id -> { url, imageId, position })
  const [selectedImages, setSelectedImages] = useState<Map<string, { url: string; imageId?: string; position?: number }>>(new Map());
  // Store loaded gallery images per product
  const [productGalleryImages, setProductGalleryImages] = useState<Map<string, ProductGalleryImage[]>>(new Map());
  const [loadingGallery, setLoadingGallery] = useState(false);
  // Image history per product
  const [imageHistory, setImageHistory] = useState<Map<string, ImageHistoryItem[]>>(new Map());
  const [showHistory, setShowHistory] = useState<string | null>(null);

  const { generateWhiteBackground, applyOptimizedImage } = useImageOptimization();

  // Translation helpers
  const getText = (fr: string, en: string) => language === 'fr' ? fr : en;

  // Load gallery images for all selected products
  useEffect(() => {
    if (open && selectedProducts.length > 0) {
      loadAllGalleryImages();
      loadImageHistory();
    }
  }, [open, selectedProducts]);

  const loadAllGalleryImages = async () => {
    setLoadingGallery(true);
    const productIds = selectedProducts.map(p => p.id);
    
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('id, src, alt_text, position, shopify_image_id, product_id')
        .in('product_id', productIds)
        .order('position', { ascending: true });
      
      if (error) throw error;
      
      // Group images by product_id
      const imagesByProduct = new Map<string, ProductGalleryImage[]>();
      data?.forEach(img => {
        const productId = (img as any).product_id;
        if (!imagesByProduct.has(productId)) {
          imagesByProduct.set(productId, []);
        }
        imagesByProduct.get(productId)!.push({
          id: img.id,
          src: img.src,
          alt_text: img.alt_text,
          position: img.position,
          shopify_image_id: img.shopify_image_id
        });
      });
      
      setProductGalleryImages(imagesByProduct);
      console.log('[SmartBg] Loaded gallery images for', imagesByProduct.size, 'products');
    } catch (error) {
      console.error('[SmartBg] Error loading gallery images:', error);
    } finally {
      setLoadingGallery(false);
    }
  };

  const loadImageHistory = async () => {
    const productIds = selectedProducts.map(p => p.id);
    
    try {
      const { data, error } = await supabase
        .from('product_image_history')
        .select('id, product_id, optimized_url, original_url, created_at, optimization_type')
        .in('product_id', productIds)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      // Group by product_id
      const historyByProduct = new Map<string, ImageHistoryItem[]>();
      data?.forEach(item => {
        const productId = (item as any).product_id;
        if (!historyByProduct.has(productId)) {
          historyByProduct.set(productId, []);
        }
        historyByProduct.get(productId)!.push({
          id: item.id,
          optimized_url: item.optimized_url,
          original_url: item.original_url,
          created_at: item.created_at,
          optimization_type: item.optimization_type
        });
      });
      
      setImageHistory(historyByProduct);
      console.log('[SmartBg] Loaded history for', historyByProduct.size, 'products');
    } catch (error) {
      console.error('[SmartBg] Error loading image history:', error);
    }
  };

  // Get all available images for a product (gallery + variants)
  const getProductImages = (product: Product): { url: string; label: string; imageId?: string; position?: number }[] => {
    const images: { url: string; label: string; imageId?: string; position?: number }[] = [];
    const seenUrls = new Set<string>();
    
    // First, add gallery images from database
    const galleryImages = productGalleryImages.get(product.id) || [];
    galleryImages.forEach((img, idx) => {
      if (!seenUrls.has(img.src)) {
        seenUrls.add(img.src);
        images.push({
          url: img.src,
          label: idx === 0 ? 'Image principale' : `Photo ${idx + 1}`,
          imageId: img.id,
          position: img.position || idx + 1
        });
      }
    });
    
    // If no gallery images, fallback to product.image_url
    if (images.length === 0 && product.image_url) {
      images.push({ url: product.image_url, label: 'Image principale' });
    }
    
    // Add variant images if different
    if (product.variants) {
      product.variants.forEach((v, idx) => {
        if (v.image_url && !seenUrls.has(v.image_url)) {
          seenUrls.add(v.image_url);
          images.push({ url: v.image_url, label: v.title || `Variante ${idx + 1}` });
        }
      });
    }
    
    return images;
  };

  // Get the selected image for a product (or default to first image)
  const getSelectedImage = (product: Product): { url: string; imageId?: string; position?: number } | null => {
    const selected = selectedImages.get(product.id);
    if (selected) return selected;
    
    const images = getProductImages(product);
    if (images.length > 0) {
      return { url: images[0].url, imageId: images[0].imageId, position: images[0].position };
    }
    
    if (product.image_url) {
      return { url: product.image_url };
    }
    
    return null;
  };

  const handleGenerateAll = async () => {
    if (selectedProducts.length === 0) {
      toast.error(getText('Aucun produit sélectionné', 'No product selected'));
      return;
    }

    setIsGenerating(true);
    setCurrentProductIndex(0);
    const newPreviews = new Map<string, string>();

    for (let i = 0; i < selectedProducts.length; i++) {
      const product = selectedProducts[i];
      setCurrentProductIndex(i);

      const selectedImage = getSelectedImage(product);
      if (!selectedImage?.url) {
        toast.warning(`${product.title}: ${getText('Pas d\'image', 'No image')}`);
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
          imageUrl: selectedImage.url,
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
          toast.success(`${product.title}: ${getText('Background généré', 'Background generated')}`);
        }
      } catch (error: any) {
        console.error('Error generating background for', product.title, error);
        toast.error(`${product.title}: ${getText('Erreur de génération', 'Generation error')}`);
      }
    }

    setGeneratedPreviews(newPreviews);
    setIsGenerating(false);

    if (newPreviews.size > 0) {
      toast.success(`${newPreviews.size} ${getText('background(s) généré(s)', 'background(s) generated')}`);
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
        // Get the selected source image for this product
        const selectedImageData = getSelectedImage(product);
        
        // If we have imageId from selection, use it directly
        let targetImageId = selectedImageData?.imageId;
        let originalUrl = selectedImageData?.url || product.image_url || '';
        
        // If no imageId, find it from database
        if (!targetImageId) {
          const { data: allImages } = await supabase
            .from('product_images')
            .select('id, src, position')
            .eq('product_id', productId)
            .order('position');
          
          // Find the image that matches the selected source image
          let targetImage = allImages?.find(img => img.src === selectedImageData?.url);
          
          // Fallback to first image if no match found
          if (!targetImage && allImages?.length) {
            targetImage = allImages[0];
          }
          
          targetImageId = targetImage?.id;
        }

        if (targetImageId) {
          console.log(`[SmartBg] Applying to image ${targetImageId} for ${product.title}`);
          
          await applyOptimizedImage.mutateAsync({
            imageId: targetImageId,
            productId: productId,
            optimizedUrl: generatedImageUrl,
            originalUrl: originalUrl,
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

  // Reset previews to regenerate
  const handleRegenerate = () => {
    setGeneratedPreviews(new Map());
    setAppliedProducts(new Set());
  };

  // Apply from history
  const handleApplyFromHistory = async (product: Product, historyItem: ImageHistoryItem) => {
    setIsGenerating(true);
    try {
      const selectedImageData = getSelectedImage(product);
      let targetImageId = selectedImageData?.imageId;
      
      if (!targetImageId) {
        const { data: allImages } = await supabase
          .from('product_images')
          .select('id, src')
          .eq('product_id', product.id)
          .order('position')
          .limit(1);
        targetImageId = allImages?.[0]?.id;
      }

      if (targetImageId) {
        await applyOptimizedImage.mutateAsync({
          imageId: targetImageId,
          productId: product.id,
          optimizedUrl: historyItem.optimized_url,
          originalUrl: historyItem.original_url || '',
          optimizationType: 'white_background',
          aiModel: 'gemini-2.5-flash-image-preview',
          resolution: '2000x2000',
          qualityScore: 95,
        });
        toast.success('Image historique appliquée');
        setShowHistory(null);
        onComplete?.();
      }
    } catch (error) {
      console.error('Error applying history image:', error);
      toast.error('Erreur lors de l\'application');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
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
              <ScrollArea className="h-[350px] border rounded-lg p-3">
                <div className="space-y-4">
                  {selectedProducts.map((product, index) => {
                    const hasGenerated = generatedPreviews.has(product.id);
                    const isCurrentlyGenerating = isGenerating && currentProductIndex === index;
                    const productImages = getProductImages(product);
                    const currentImageData = getSelectedImage(product);
                    const currentImage = currentImageData?.url;
                    const hasMultipleImages = productImages.length > 1;
                    const productHistory = imageHistory.get(product.id) || [];

                    return (
                      <Card key={product.id} className={`p-3 transition-all ${hasGenerated ? 'ring-2 ring-green-500' : ''} ${isCurrentlyGenerating ? 'ring-2 ring-primary animate-pulse' : ''}`}>
                        <div className="flex items-start gap-3">
                          {/* Product info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-medium truncate">{product.title}</p>
                              <div className="flex gap-1">
                                <Badge variant="outline" className="text-[10px]">{bgFormat}</Badge>
                                <Badge variant={bgMode === 'smart_serp' ? 'default' : 'secondary'} className="text-[10px]">
                                  {bgMode === 'smart_serp' ? 'Smart' : 'White'}
                                </Badge>
                              </div>
                              {productHistory.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 gap-1"
                                  onClick={() => setShowHistory(showHistory === product.id ? null : product.id)}
                                >
                                  <History className="h-3 w-3" />
                                  <span className="text-[10px]">{productHistory.length}</span>
                                </Button>
                              )}
                            </div>

                            {/* Image selection grid - visual display */}
                            {hasMultipleImages && !hasGenerated && (
                              <div className="mb-2">
                                <p className="text-xs text-muted-foreground mb-1.5">
                                  {getText('Sélectionner une image source:', 'Select source image:')}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {productImages.map((img, idx) => {
                                    const isSelected = (selectedImages.get(product.id)?.url || productImages[0]?.url) === img.url;
                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => setSelectedImages(prev => new Map(prev).set(product.id, {
                                          url: img.url,
                                          imageId: img.imageId,
                                          position: img.position
                                        }))}
                                        className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'}`}
                                      >
                                        <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                                        {isSelected && (
                                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                            <Check className="h-5 w-5 text-primary" />
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* History panel */}
                            {showHistory === product.id && productHistory.length > 0 && (
                              <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                                <p className="text-xs font-medium mb-2">
                                  {getText('Historique des générations:', 'Generation history:')}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {productHistory.slice(0, 6).map((item) => (
                                    <button
                                      key={item.id}
                                      onClick={() => handleApplyFromHistory(product, item)}
                                      disabled={isGenerating}
                                      className="relative w-18 h-18 min-w-[4.5rem] min-h-[4.5rem] rounded-lg overflow-hidden border border-border hover:border-primary transition-all hover:scale-105 group"
                                    >
                                      <img src={item.optimized_url} alt="Historique" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <CheckCircle2 className="h-5 w-5 text-white" />
                                      </div>
                                    </button>
                                  ))}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {getText('Cliquez pour appliquer', 'Click to apply')}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Current/Generated image preview */}
                          <div 
                            className="w-28 h-28 rounded-lg overflow-hidden bg-muted relative cursor-pointer flex-shrink-0"
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
                                <Loader2 className="h-6 w-6 text-white animate-spin" />
                              </div>
                            )}

                            {hasGenerated && (
                              <div className="absolute top-1 right-1">
                                <CheckCircle2 className="h-5 w-5 text-green-500 bg-white rounded-full" />
                              </div>
                            )}

                            {hasMultipleImages && !hasGenerated && (
                              <div className="absolute top-1 left-1">
                                <Badge variant="secondary" className="text-[9px] px-1">
                                  {productImages.length} photos
                                </Badge>
                              </div>
                            )}
                          </div>
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
                  {getText('Génération en cours:', 'Generating:')} {currentProductIndex + 1}/{selectedProducts.length}
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
                    {appliedProducts.size} {getText('image(s) appliquée(s) avec succès', 'image(s) applied successfully')}
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
              {appliedProducts.size > 0 ? getText('Fermer', 'Close') : getText('Annuler', 'Cancel')}
            </Button>

            {appliedProducts.size === 0 && (
              <>
                {generatedPreviews.size > 0 ? (
                  <>
                    <Button variant="outline" onClick={handleRegenerate} disabled={isGenerating} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      {getText('Régénérer', 'Regenerate')}
                    </Button>
                    <Button onClick={handleApplyAll} disabled={isGenerating} className="gap-2">
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {getText(`Appliquer ${generatedPreviews.size} background(s)`, `Apply ${generatedPreviews.size} background(s)`)}
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleGenerateAll} disabled={isGenerating} className="gap-2">
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    {getText('Générer les backgrounds', 'Generate backgrounds')}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewProduct?.title}</DialogTitle>
            <DialogDescription>{getText('Comparaison avant/après', 'Before/after comparison')}</DialogDescription>
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
              {getText('Fermer', 'Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
