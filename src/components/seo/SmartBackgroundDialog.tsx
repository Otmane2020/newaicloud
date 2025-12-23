import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
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
  X,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { BackgroundStyleManager } from './BackgroundStyleManager';
import { useImageOptimization } from '@/hooks/useImageOptimization';
import { useTranslation } from '@/lib/language';

interface ProductGalleryImage {
  id: string;
  src: string;
  alt_text: string | null;
  position: number | null;
  shopify_image_id: number | null;
  optimization_count?: number | null; // 🆕 Track AI-generated images
}

type BackgroundFormat = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
type BackgroundMode = 'white_shopping' | 'smart_serp' | '3d_shopping' | '3d_generate';
type BackgroundStyle = 'shopping' | 'lifestyle' | 'moderne' | 'living_room' | 'studio' | 'nature' | 'luxury_showroom';

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
  // Style manager dialog
  const [showStyleManager, setShowStyleManager] = useState(false);
  // 🆕 Apply position: 'main' (replace main image) or 'secondary' (add as secondary)
  const [applyPosition, setApplyPosition] = useState<'main' | 'secondary'>('main');
  // 🆕 Custom prompt for additional user instructions
  const [customPrompt, setCustomPrompt] = useState('');
  // 🆕 Apply/Sync progress tracking
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState<{ 
    current: number; 
    total: number; 
    items: Map<string, { title: string; status: 'pending' | 'syncing' | 'success' | 'error'; error?: string }>;
  }>({ current: 0, total: 0, items: new Map() });
  // 🆕 Track stuck time for force stop
  const [stuckTime, setStuckTime] = useState(0);
  const lastProgressRef = useRef({ success: 0, error: 0 });

  const { generateWhiteBackground, applyOptimizedImage } = useImageOptimization();

  // Access translations
  const sb = t.dialogs.smartBackground;

  // Memoize product IDs to prevent unnecessary re-renders
  const productIds = useMemo(() => selectedProducts.map(p => p.id).filter(Boolean), [selectedProducts]);

  // Initialize with fallback images immediately, then load gallery async
  useEffect(() => {
    if (open && productIds.length > 0) {
      // Step 1: Initialize immediately with product.image_url fallbacks
      const initialImages = new Map<string, ProductGalleryImage[]>();
      selectedProducts.forEach(p => {
        if (p.image_url) {
          initialImages.set(p.id, [{
            id: `fallback-${p.id}`,
            src: p.image_url,
            alt_text: p.title,
            position: 1,
            shopify_image_id: null
          }]);
        }
      });
      setProductGalleryImages(initialImages);
      console.log('[SmartBg] Initialized with', initialImages.size, 'fallback images');

      // Step 2: Load actual gallery images (will merge/override)
      loadAllGalleryImages();
      loadImageHistory();
    }
  }, [open, productIds.join(',')]);

  const loadAllGalleryImages = async () => {
    const ids = selectedProducts.map(p => p.id).filter(Boolean);
    
    // Guard: skip query if no valid product IDs
    if (ids.length === 0) {
      console.log('[SmartBg] No product IDs, skipping gallery load');
      return;
    }
    
    setLoadingGallery(true);
    
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('id, src, alt_text, position, shopify_image_id, product_id, optimization_count') // 🆕 Added optimization_count
        .in('product_id', ids)
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
          shopify_image_id: img.shopify_image_id,
          optimization_count: (img as any).optimization_count // 🆕
        });
      });
      
      // Merge with existing fallbacks - keep fallbacks for products without gallery images
      setProductGalleryImages(prev => {
        const merged = new Map(prev);
        imagesByProduct.forEach((images, productId) => {
          merged.set(productId, images); // Override with actual gallery images
        });
        return merged;
      });
      
      // 🆕 Smart pre-selection: skip products where main image is already AI-generated
      const newSelectedImages = new Map<string, { url: string; imageId?: string; position?: number }>();
      
      // Helper to detect ALL AI-generated images (white background, AI images, any generation)
      const isAiGeneratedImage = (img: ProductGalleryImage): boolean => {
        if (img.optimization_count && img.optimization_count > 0) return true;
        const aiPatterns = ['ai_generated_', 'white_background', 'generated-images/', '/storage/v1/object/public/generated'];
        return aiPatterns.some(pattern => img.src.includes(pattern));
      };
      
      imagesByProduct.forEach((images, productId) => {
        // Sort by position to get main image first
        const sortedImages = [...images].sort((a, b) => (a.position || 999) - (b.position || 999));
        const mainImage = sortedImages[0];
        
        // 🆕 If main image is already AI-generated, DON'T select this product at all
        // User must manually select if they want to regenerate
        if (mainImage && isAiGeneratedImage(mainImage)) {
          // Product skipped - main image already processed
          return;
        }
        
        // Find first non-AI image to process
        const nonAiImage = sortedImages.find(img => !isAiGeneratedImage(img));
        
        if (nonAiImage) {
          newSelectedImages.set(productId, {
            url: nonAiImage.src,
            imageId: nonAiImage.id,
            position: nonAiImage.position || 1
          });
        }
        // If no non-AI images at all, product is not pre-selected
      });
      setSelectedImages(newSelectedImages);
      
      console.log('[SmartBg] Loaded gallery images for', imagesByProduct.size, 'products, pre-selected', newSelectedImages.size, 'non-AI images');
    } catch (error) {
      console.error('[SmartBg] Error loading gallery images:', error);
    } finally {
      setLoadingGallery(false);
    }
  };

  const loadImageHistory = async () => {
    const productIds = selectedProducts.map(p => p.id).filter(Boolean);
    
    // Guard: skip query if no valid product IDs
    if (productIds.length === 0) {
      console.log('[SmartBg] No product IDs, skipping history load');
      setImageHistory(new Map());
      return;
    }
    
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

  // Get all available images for a product (gallery + variants) with AI detection
  const getProductImages = (product: Product): { url: string; label: string; imageId?: string; position?: number; isAiGenerated?: boolean }[] => {
    const images: { url: string; label: string; imageId?: string; position?: number; isAiGenerated?: boolean }[] = [];
    const seenUrls = new Set<string>();
    const normalizeUrl = (url?: string | null) => (url ? url.split("?")[0].replace(/_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\.[a-zA-Z0-9]+$)/i, "") : "");
    
    // First, add gallery images from database
    const galleryImages = productGalleryImages.get(product.id) || [];
    galleryImages.forEach((img, idx) => {
      const key = normalizeUrl(img.src);
      if (!key) return;
      if (!seenUrls.has(key)) {
        seenUrls.add(key);
        // 🆕 Detect ALL AI-generated images (white background, AI images, any generation)
        const aiPatterns = ['ai_generated_', 'white_background', 'generated-images/', '/storage/v1/object/public/generated'];
        const isAiGenerated = (img.optimization_count && img.optimization_count > 0) || 
          aiPatterns.some(pattern => img.src.includes(pattern));
        images.push({
          url: img.src,
          label: idx === 0 ? 'Image principale' : `Photo ${idx + 1}`,
          imageId: img.id,
          position: img.position || idx + 1,
          isAiGenerated
        });
      }
    });
    
    // If no gallery images, fallback to product.image_url
    if (images.length === 0 && product.image_url) {
      images.push({ url: product.image_url, label: 'Image principale', isAiGenerated: false });
      seenUrls.add(normalizeUrl(product.image_url));
    }
    
    // Add variant images if different (dedupe ignoring ?v=...)
    if (product.variants) {
      product.variants.forEach((v, idx) => {
        const key = normalizeUrl(v.image_url);
        if (v.image_url && key && !seenUrls.has(key)) {
          seenUrls.add(key);
          images.push({ url: v.image_url, label: v.title || `Variante ${idx + 1}`, isAiGenerated: false });
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

  // Ref to track cancellation
  const cancelledRef = useRef(false);
  const [errorCount, setErrorCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);

  // 🆕 Detect stuck state and reset
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isGenerating) {
      interval = setInterval(() => {
        // Check if progress changed
        if (lastProgressRef.current.success === successCount && lastProgressRef.current.error === errorCount) {
          setStuckTime(prev => prev + 1);
        } else {
          setStuckTime(0);
          lastProgressRef.current = { success: successCount, error: errorCount };
        }
      }, 1000);
    } else {
      setStuckTime(0);
      lastProgressRef.current = { success: 0, error: 0 };
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating, successCount, errorCount]);

  const handleGenerateAll = async () => {
    if (selectedProducts.length === 0) {
      toast.error(sb.noProductSelected);
      return;
    }

    // 🆕 Check if any products have selected images
    const productsWithSelection = selectedProducts.filter(p => selectedImages.has(p.id));
    if (productsWithSelection.length === 0) {
      toast.error(language === 'fr' ? 'Aucune image sélectionnée. Cochez les images à traiter.' : 'No images selected. Check images to process.');
      return;
    }

    cancelledRef.current = false;
    setIsGenerating(true);
    setCurrentProductIndex(0);
    setErrorCount(0);
    setSuccessCount(0);
    setStuckTime(0);
    const newPreviews = new Map<string, string>();

    // Format map
    const formatMap: Record<BackgroundFormat, 'square' | 'portrait' | 'landscape'> = {
      '1:1': 'square',
      '4:3': 'landscape',
      '3:4': 'portrait',
      '16:9': 'landscape',
      '9:16': 'portrait',
    };

    // Pre-fetch ALL product data in a single batch query for speed
    console.log(`🚀 [SmartBg] Starting bulk generation for ${productsWithSelection.length} products with selection`);
    const productIds = productsWithSelection.map(p => p.id);
    
    const { data: allProductDetails } = await supabase
      .from('shopify_products')
      .select('id, body_html, seo_description, serp_data, vision_attributes')
      .in('id', productIds);

    const productDataMap = new Map(
      (allProductDetails || []).map(p => [p.id, p])
    );

    // 🆕 Reduced batch size and increased delays to prevent rate limiting/stuck
    const BATCH_SIZE = 2; // Reduced from 3
    const TIMEOUT_MS = 90000; // 90 second timeout per generation
    
    for (let batchStart = 0; batchStart < productsWithSelection.length; batchStart += BATCH_SIZE) {
      if (cancelledRef.current) {
        console.log('🛑 [SmartBg] Generation cancelled by user');
        break;
      }

      const batch = productsWithSelection.slice(batchStart, batchStart + BATCH_SIZE);
      
      // Process batch in parallel with timeout
      const batchResults = await Promise.allSettled(
        batch.map(async (product, batchIndex) => {
          const globalIndex = batchStart + batchIndex;
          setCurrentProductIndex(globalIndex);

          const selectedImage = getSelectedImage(product);
          if (!selectedImage?.url) {
            console.warn(`[SmartBg] No image for ${product.title}`);
            return null;
          }

          // Get pre-fetched data
          const productDetails = productDataMap.get(product.id);
          const serpData = productDetails?.serp_data || null;
          const visionAiData = productDetails?.vision_attributes || null;
          const productDescription = productDetails?.body_html || productDetails?.seo_description || null;

          // Determine format: 3d_shopping forces 1:1
          const effectiveFormat = bgMode === '3d_shopping' ? 'square' : formatMap[bgFormat];
          
          // Determine mode for API
          const apiMode = bgMode === '3d_shopping' ? '3d_google_shopping' 
            : bgMode === '3d_generate' ? '3d_generate' 
            : 'google_shopping';
          
          // 🆕 Wrap in timeout promise
          const generatePromise = generateWhiteBackground.mutateAsync({
            imageUrl: selectedImage.url,
            productTitle: product.title,
            resolution: '2000x2000',
            format: effectiveFormat,
            mode: apiMode,
            product_id: product.id,
            serpData,
            visionAiData,
            productDescription,
            backgroundStyle: bgMode === 'smart_serp' ? bgStyle : 'shopping',
            customPrompt: customPrompt.trim() || undefined,
          });

          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout: génération trop longue')), TIMEOUT_MS)
          );

          const result = await Promise.race([generatePromise, timeoutPromise]);
          return { productId: product.id, imageUrl: result.imageUrl, title: product.title };
        })
      );

      // Process results
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value?.imageUrl) {
          newPreviews.set(result.value.productId, result.value.imageUrl);
          setSuccessCount(prev => prev + 1);
          setGeneratedPreviews(new Map(newPreviews)); // Update UI progressively
        } else if (result.status === 'rejected') {
          console.error('[SmartBg] Generation error:', result.reason);
          setErrorCount(prev => prev + 1);
        }
      }

      // 🆕 Increased delay between batches to avoid rate limits
      if (batchStart + BATCH_SIZE < productsWithSelection.length && !cancelledRef.current) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Increased from 500ms
      }
    }

    setGeneratedPreviews(newPreviews);
    setIsGenerating(false);

    const finalSuccess = newPreviews.size;
    if (finalSuccess > 0) {
      toast.success(sb.backgroundsGenerated.replace('{{count}}', String(finalSuccess)));
    }
    if (cancelledRef.current) {
      toast.info(sb.generationCancelled);
    }
  };

  const handleCancelGeneration = () => {
    cancelledRef.current = true;
    toast.info(sb.cancelGeneration);
  };

  const handleApplyAll = async () => {
    if (generatedPreviews.size === 0) return;

    // Initialize progress tracking
    const itemsToProcess = Array.from(generatedPreviews.entries());
    const initialItems = new Map<string, { title: string; status: 'pending' | 'syncing' | 'success' | 'error'; error?: string }>();
    
    for (const [productId] of itemsToProcess) {
      const product = selectedProducts.find((p) => p.id === productId);
      if (product) {
        initialItems.set(productId, { title: product.title, status: 'pending' });
      }
    }
    
    setApplyProgress({ current: 0, total: itemsToProcess.length, items: initialItems });
    setIsApplying(true);
    setIsGenerating(true);
    const newApplied = new Set<string>();
    let completedCount = 0;

    for (const [productId, generatedImageUrl] of itemsToProcess) {
      const product = selectedProducts.find((p) => p.id === productId);
      if (!product) continue;

      // Update status to syncing
      setApplyProgress(prev => {
        const newItems = new Map(prev.items);
        newItems.set(productId, { title: product.title, status: 'syncing' });
        return { ...prev, items: newItems };
      });

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
          console.log(`[SmartBg] Applying to image ${targetImageId} for ${product.title}, applyAsMain: ${applyPosition === 'main'}`);
          
          await applyOptimizedImage.mutateAsync({
            imageId: targetImageId,
            productId: productId,
            optimizedUrl: generatedImageUrl,
            originalUrl: originalUrl,
            optimizationType: 'white_background',
            aiModel: 'gemini-2.5-flash-image-preview',
            resolution: '2000x2000',
            qualityScore: 95,
            applyAsMain: applyPosition === 'main',
          });
          
          newApplied.add(productId);
          completedCount++;
          
          // Update status to success
          setApplyProgress(prev => {
            const newItems = new Map(prev.items);
            newItems.set(productId, { title: product.title, status: 'success' });
            return { current: completedCount, total: prev.total, items: newItems };
          });
        } else {
          console.warn(`[SmartBg] No image found for product ${product.title}`);
          completedCount++;
          setApplyProgress(prev => {
            const newItems = new Map(prev.items);
            newItems.set(productId, { title: product.title, status: 'error', error: 'No image found' });
            return { current: completedCount, total: prev.total, items: newItems };
          });
        }
      } catch (error) {
        console.error('Error applying background for', product.title, error);
        completedCount++;
        setApplyProgress(prev => {
          const newItems = new Map(prev.items);
          newItems.set(productId, { 
            title: product.title, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Sync failed' 
          });
          return { current: completedCount, total: prev.total, items: newItems };
        });
      }
      
      // Small delay between items
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setAppliedProducts(newApplied);
    setIsGenerating(false);
    
    // Keep progress dialog open for 2 seconds after completion, then close
    setTimeout(() => {
      setIsApplying(false);
      
      if (newApplied.size > 0) {
        toast.success(sb.backgroundsApplied.replace('{{count}}', String(newApplied.size)), {
          description: sb.appliedDescription,
          duration: 5000,
        });
        
        setTimeout(() => {
          onOpenChange(false);
          onComplete?.();
        }, 500);
      } else {
        toast.warning(sb.noImageApplied, {
          description: sb.checkGeneration
        });
      }
    }, 2000);
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
          applyAsMain: applyPosition === 'main', // 🆕 Use position choice
        });
        toast.success(sb.historyApplied);
        setShowHistory(null);
        onComplete?.();
      }
    } catch (error) {
      console.error('Error applying history image:', error);
      toast.error(sb.applyError);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl lg:max-w-5xl h-[90vh] sm:h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              {sb.title}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {sb.description}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-4">
            {/* Format & Mode Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Square className="h-4 w-4" />
                  {sb.outputFormat}
                </Label>
                <Select value={bgFormat} onValueChange={(v) => setBgFormat(v as BackgroundFormat)}>
                  <SelectTrigger>
                    <SelectValue placeholder={sb.chooseFormat} />
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
                  {sb.generationMode}
                </Label>
                <Select value={bgMode} onValueChange={(v) => setBgMode(v as BackgroundMode)}>
                  <SelectTrigger>
                    <SelectValue placeholder={sb.chooseMode} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white_shopping">
                      <div className="flex items-center gap-2">
                        <Square className="h-4 w-4 text-muted-foreground" />
                        White Background - Google Shopping
                      </div>
                    </SelectItem>
                    <SelectItem value="3d_shopping">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">3D</span>
                        3D Google Shopping 1×1 - White
                      </div>
                    </SelectItem>
                    <SelectItem value="smart_serp">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Smart Background - SERP + Vision AI
                      </div>
                    </SelectItem>
                    <SelectItem value="3d_generate">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-purple-500">3D</span>
                        3D Generate - Recréer produit en 3D
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {bgMode === 'white_shopping' && sb.whiteDesc}
                  {bgMode === '3d_shopping' && sb.threeDShoppingDesc}
                  {bgMode === 'smart_serp' && sb.smartSerpDesc}
                  {bgMode === '3d_generate' && sb.threeDGenerateDesc}
                </p>
              </div>
            </div>

            {/* 🆕 Apply Position Selector */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                {language === 'fr' ? 'Position de l\'image' : 'Image position'}
              </Label>
              <Select value={applyPosition} onValueChange={(v) => setApplyPosition(v as 'main' | 'secondary')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                      {language === 'fr' ? 'Principale (remplace l\'image actuelle)' : 'Main (replaces current image)'}
                    </div>
                  </SelectItem>
                  <SelectItem value="secondary">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">2</span>
                      {language === 'fr' ? 'Secondaire (garde l\'ordre actuel)' : 'Secondary (keeps current order)'}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {applyPosition === 'main' 
                  ? (language === 'fr' ? 'L\'image générée deviendra l\'image principale du produit sur Shopify.' : 'Generated image will become the main product image on Shopify.')
                  : (language === 'fr' ? 'L\'image générée gardera sa position actuelle dans la galerie.' : 'Generated image will keep its current position in the gallery.')
                }
              </p>
            </div>

            {/* Style Buttons - Only for smart_serp or 3d_generate mode */}
            {(bgMode === 'smart_serp' || bgMode === '3d_generate') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{sb.backgroundStyle}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowStyleManager(true)}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    {language === 'fr' ? 'Gérer les styles' : 'Manage styles'}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'shopping' as BackgroundStyle, label: 'Shopping', icon: ShoppingBag, desc: 'E-commerce professionnel' },
                    { value: 'luxury_showroom' as BackgroundStyle, label: '✨ Luxury 3D', icon: Sparkles, desc: 'Showroom luxe avec reflets' },
                    { value: 'lifestyle' as BackgroundStyle, label: 'Lifestyle', icon: Sparkle, desc: 'Ambiance naturelle' },
                    { value: 'moderne' as BackgroundStyle, label: 'Moderne', icon: Camera, desc: 'Design épuré' },
                    { value: 'living_room' as BackgroundStyle, label: 'Living Room', icon: Sofa, desc: 'Intérieur cosy' },
                    { value: 'studio' as BackgroundStyle, label: 'Studio #Home furniture', icon: Home, desc: 'Photos style Ferucci' },
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
                  {bgStyle === 'shopping' && sb.styleDescriptions.shopping}
                  {bgStyle === 'luxury_showroom' && (language === 'fr' ? 'Showroom luxe avec sol brillant, reflets miroir, éclairage dramatique et particules scintillantes.' : 'Luxury showroom with glossy floor, mirror reflections, dramatic lighting and sparkle particles.')}
                  {bgStyle === 'lifestyle' && sb.styleDescriptions.lifestyle}
                  {bgStyle === 'moderne' && sb.styleDescriptions.moderne}
                  {bgStyle === 'living_room' && sb.styleDescriptions.livingRoom}
                  {bgStyle === 'studio' && sb.styleDescriptions.studio}
                  {bgStyle === 'nature' && sb.styleDescriptions.nature}
                </p>
              </div>
            )}

            {/* 🆕 Custom Prompt Field */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                {language === 'fr' ? 'Prompt personnalisé (optionnel)' : 'Custom prompt (optional)'}
              </Label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={language === 'fr' 
                  ? 'Ex: Ajouter des plantes vertes, lumière chaude, style scandinave...' 
                  : 'E.g: Add green plants, warm lighting, scandinavian style...'}
                className="w-full h-20 px-3 py-2 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {language === 'fr' 
                  ? 'Ajoutez des instructions spécifiques pour personnaliser l\'arrière-plan généré.' 
                  : 'Add specific instructions to customize the generated background.'}
              </p>
            </div>

            {/* Products Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{selectedProducts.length} {language === 'fr' ? 'produit(s) sélectionné(s)' : 'product(s) selected'}</Label>
                {loadingGallery && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {language === 'fr' ? 'Chargement des images...' : 'Loading images...'}
                  </div>
                )}
              </div>
              <ScrollArea className="h-[200px] sm:h-[280px] lg:h-[350px] border rounded-lg p-2 sm:p-3">
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
                      <Card key={product.id} className={`p-2 sm:p-3 transition-all ${hasGenerated ? 'ring-2 ring-green-500' : ''} ${isCurrentlyGenerating ? 'ring-2 ring-primary animate-pulse' : ''}`}>
                        <div className="flex items-start gap-2 sm:gap-3">
                          {/* Product info */}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                              <p className="font-medium text-sm sm:text-base truncate">{product.title}</p>
                              <div className="flex gap-1 flex-shrink-0">
                                <Badge variant="outline" className="text-[9px] sm:text-[10px]">{bgFormat}</Badge>
                                <Badge variant={bgMode === 'smart_serp' ? 'default' : 'secondary'} className="text-[9px] sm:text-[10px]">
                                  {bgMode === 'smart_serp' ? 'Smart' : 'White'}
                                </Badge>
                                {productHistory.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 sm:h-6 px-1.5 gap-1"
                                    onClick={() => setShowHistory(showHistory === product.id ? null : product.id)}
                                  >
                                    <History className="h-3 w-3" />
                                    <span className="text-[9px] sm:text-[10px]">{productHistory.length}</span>
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Image selection grid - visual display */}
                            {hasMultipleImages && !hasGenerated && (
                              <div className="mb-3">
                                <p className="text-xs text-muted-foreground mb-2">
                                  {sb.selectSourceImage} ({productImages.length} {language === 'fr' ? 'disponibles' : 'available'}):
                                </p>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2">
                                  {productImages.map((img, idx) => {
                                    // 🆕 Check if image is selected (not pre-selected by default if AI)
                                    const isSelected = selectedImages.get(product.id)?.url === img.url;
                                    const isAiGenerated = img.isAiGenerated;
                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => {
                                          // Toggle selection: if already selected, deselect; otherwise select
                                          if (isSelected) {
                                            setSelectedImages(prev => {
                                              const newMap = new Map(prev);
                                              newMap.delete(product.id);
                                              return newMap;
                                            });
                                          } else {
                                            setSelectedImages(prev => new Map(prev).set(product.id, {
                                              url: img.url,
                                              imageId: img.imageId,
                                              position: img.position
                                            }));
                                          }
                                        }}
                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'}`}
                                      >
                                        <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                                        {/* 🆕 AI Badge */}
                                        {isAiGenerated && (
                                          <Badge variant="secondary" className="absolute top-0.5 left-0.5 text-[8px] px-1 py-0 bg-purple-500/90 text-white border-0">
                                            AI
                                          </Badge>
                                        )}
                                        {isSelected && (
                                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                            <Check className="h-6 w-6 text-primary drop-shadow-md" />
                                          </div>
                                        )}
                                        <span className="absolute bottom-0.5 right-0.5 text-[9px] bg-background/80 px-1 rounded">
                                          {idx + 1}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                                {/* 🆕 Hint text */}
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {language === 'fr' 
                                    ? 'Cliquez pour sélectionner/déselectionner. Les images AI ne sont pas pré-sélectionnées.' 
                                    : 'Click to select/deselect. AI images are not pre-selected.'}
                                </p>
                              </div>
                            )}

                            {/* History panel */}
                            {showHistory === product.id && productHistory.length > 0 && (
                              <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                                <p className="text-xs font-medium mb-2">
                                  {sb.history}:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {productHistory.slice(0, 6).map((item) => (
                                    <button
                                      key={item.id}
                                      onClick={() => handleApplyFromHistory(product, item)}
                                      disabled={isGenerating}
                                      className="relative w-20 h-20 rounded-lg overflow-hidden border border-border hover:border-primary transition-all hover:scale-105 group"
                                    >
                                      <img src={item.optimized_url} alt={sb.history} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <CheckCircle2 className="h-5 w-5 text-white" />
                                      </div>
                                    </button>
                                  ))}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {language === 'fr' ? 'Cliquez pour appliquer' : 'Click to apply'}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Current/Generated image preview - LARGER SIZE */}
                          <div 
                            className="w-20 h-20 sm:w-28 sm:h-28 lg:w-36 lg:h-36 rounded-lg overflow-hidden bg-muted relative cursor-pointer flex-shrink-0"
                            onClick={() => hasGenerated && handlePreviewProduct(product)}
                          >
                            {/* Always show image using currentImage OR product.image_url fallback */}
                            {(currentImage || product.image_url) ? (
                              <img
                                src={hasGenerated ? generatedPreviews.get(product.id) : (currentImage || product.image_url || '')}
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                            ) : loadingGallery ? (
                              <div className="w-full h-full flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                              </div>
                            )}

                            {isCurrentlyGenerating && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 text-white animate-spin" />
                              </div>
                            )}

                            {hasGenerated && (
                              <div className="absolute top-1.5 right-1.5">
                                <CheckCircle2 className="h-6 w-6 text-green-500 bg-white rounded-full" />
                              </div>
                            )}

                            {hasMultipleImages && !hasGenerated && (
                              <div className="absolute top-1.5 left-1.5">
                                <Badge variant="secondary" className="text-[10px] px-1.5">
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

            {/* Progress - Style Google Shopping */}
            {isGenerating && (
              <div className="p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-xl border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {language === 'fr' ? 'Image' : 'Image'}
                    </span>
                    <span className="font-semibold text-foreground">
                      {successCount + errorCount} / {selectedImages.size}
                    </span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-bold text-primary">
                    {selectedImages.size > 0 ? Math.round(((successCount + errorCount) / selectedImages.size) * 100) : 0}%
                  </span>
                </div>
                <Progress value={selectedImages.size > 0 ? ((successCount + errorCount) / selectedImages.size) * 100 : 0} className="h-3 sm:h-4" />
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="text-success">✓ {successCount} {sb.generated}</span>
                    {errorCount > 0 && <span className="text-destructive">| ✗ {errorCount} {sb.failed}</span>}
                  </span>
                  <div className="flex gap-2">
                    {stuckTime > 30 && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="h-7 px-2 gap-1"
                        onClick={() => {
                          cancelledRef.current = true;
                          setIsGenerating(false);
                          toast.error(language === 'fr' ? 'Génération forcée à s\'arrêter' : 'Generation force stopped');
                        }}
                      >
                        {language === 'fr' ? 'Forcer Arrêt' : 'Force Stop'}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleCancelGeneration} className="h-7 px-2 gap-1 text-destructive hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                      {sb.cancel}
                    </Button>
                  </div>
                </div>
                {stuckTime > 10 && (
                  <p className="text-xs text-amber-600">
                    {language === 'fr' 
                      ? `⏳ Aucun progrès depuis ${stuckTime}s...` 
                      : `⏳ No progress for ${stuckTime}s...`}
                  </p>
                )}
              </div>
            )}

            {/* Applied Products Preview */}
            {appliedProducts.size > 0 && (
              <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <p className="text-sm font-medium text-green-600">
                    {sb.backgroundsApplied.replace('{{count}}', String(appliedProducts.size))}
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

          <DialogFooter className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t bg-background gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating} className="w-full sm:w-auto">
              {appliedProducts.size > 0 ? sb.close : sb.cancel}
            </Button>

            {appliedProducts.size === 0 && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {generatedPreviews.size > 0 ? (
                  <>
                    <Button variant="outline" onClick={handleRegenerate} disabled={isGenerating} className="gap-2 w-full sm:w-auto">
                      <RefreshCw className="h-4 w-4" />
                      {language === 'fr' ? 'Régénérer' : 'Regenerate'}
                    </Button>
                    <Button onClick={handleApplyAll} disabled={isGenerating} className="gap-2 w-full sm:w-auto">
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {sb.applyAll} ({generatedPreviews.size})
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleGenerateAll} disabled={isGenerating} className="gap-2 w-full sm:w-auto">
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    {sb.generateAll.replace('{{count}}', String(selectedProducts.length))}
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog - Dynamic aspect ratio based on bgFormat */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewProduct?.title}</DialogTitle>
            <DialogDescription>{language === 'fr' ? 'Comparaison avant/après' : 'Before/after comparison'} - Format: {bgFormat}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Original</Label>
              <div className={`rounded-lg overflow-hidden bg-muted border flex items-center justify-center ${
                bgFormat === '1:1' ? 'aspect-square' : 
                bgFormat === '3:4' ? 'aspect-[3/4]' : 
                bgFormat === '4:3' ? 'aspect-[4/3]' : 
                bgFormat === '16:9' ? 'aspect-video' : 
                bgFormat === '9:16' ? 'aspect-[9/16] max-h-[500px]' : 'aspect-square'
              }`}>
                {previewProduct?.image_url && (
                  <img
                    src={previewProduct.image_url}
                    alt="Original"
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {sb.title}
              </Label>
              <div className={`rounded-lg overflow-hidden bg-white border-2 border-primary/20 flex items-center justify-center ${
                bgFormat === '1:1' ? 'aspect-square' : 
                bgFormat === '3:4' ? 'aspect-[3/4]' : 
                bgFormat === '4:3' ? 'aspect-[4/3]' : 
                bgFormat === '16:9' ? 'aspect-video' : 
                bgFormat === '9:16' ? 'aspect-[9/16] max-h-[500px]' : 'aspect-square'
              }`}>
                {previewProduct && generatedPreviews.has(previewProduct.id) && (
                  <img
                    src={generatedPreviews.get(previewProduct.id)}
                    alt="Generated"
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              {sb.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply/Sync Progress Dialog */}
      <Dialog open={isApplying} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              {language === 'fr' ? 'Synchronisation en cours...' : 'Syncing in progress...'}
            </DialogTitle>
            <DialogDescription>
              {language === 'fr' 
                ? `Application et synchronisation des images (${applyProgress.current}/${applyProgress.total})`
                : `Applying and syncing images (${applyProgress.current}/${applyProgress.total})`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress 
                value={applyProgress.total > 0 ? (applyProgress.current / applyProgress.total) * 100 : 0} 
                className="h-2" 
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{applyProgress.current} / {applyProgress.total}</span>
                <span className="font-medium text-primary">
                  {applyProgress.total > 0 ? Math.round((applyProgress.current / applyProgress.total) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* Product List */}
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {Array.from(applyProgress.items.entries()).map(([productId, item]) => (
                  <div 
                    key={productId}
                    className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                      item.status === 'syncing' ? 'bg-primary/5 border-primary/30' :
                      item.status === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' :
                      item.status === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' :
                      'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.error && (
                        <p className="text-xs text-red-600 dark:text-red-400 truncate">{item.error}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {item.status === 'pending' && (
                        <Badge variant="outline" className="text-xs">{language === 'fr' ? 'En attente' : 'Pending'}</Badge>
                      )}
                      {item.status === 'syncing' && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {language === 'fr' ? 'Sync...' : 'Syncing...'}
                        </Badge>
                      )}
                      {item.status === 'success' && (
                        <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs gap-1">
                          <Check className="w-3 h-3" />
                          {language === 'fr' ? 'OK' : 'Done'}
                        </Badge>
                      )}
                      {item.status === 'error' && (
                        <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs gap-1">
                          <X className="w-3 h-3" />
                          {language === 'fr' ? 'Erreur' : 'Error'}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
