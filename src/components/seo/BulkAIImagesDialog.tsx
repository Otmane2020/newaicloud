import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
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
  CheckCircle2,
  Image as ImageIcon,
  Home,
  Camera,
  Eye,
  Sofa,
  BedDouble,
  Check,
  X,
  AlertCircle,
  RotateCcw,
  Focus,
  Maximize2,
  Layers,
  Square,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';
import { Switch } from '@/components/ui/switch';

interface ProductGalleryImage {
  id: string;
  src: string;
  alt_text: string | null;
  position: number | null;
  shopify_image_id: number | null;
  optimization_count?: number | null;
}

interface Product {
  id: string;
  title: string;
  image_url: string | null;
  vendor?: string | null;
  handle?: string | null;
  product_type?: string | null;
  status?: string | null;
}

interface ProductStatus {
  id: string;
  title: string;
  status: 'pending' | 'generating' | 'saving' | 'success' | 'error' | 'skipped';
  imagesGenerated?: number;
  error?: string;
}

interface BulkAIImagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: Product[];
  onComplete?: () => void;
}

const IMAGE_TYPES = [
  { id: 'front', label: 'Vue de face', labelEn: 'Front view', icon: Camera },
  { id: 'angle45', label: 'Vue 45°', labelEn: '45° view', icon: RotateCcw },
  { id: 'profile', label: 'Vue de profil', labelEn: 'Profile view', icon: RotateCcw },
  { id: 'back', label: 'Vue arrière', labelEn: 'Back view', icon: RotateCcw },
  { id: 'top', label: 'Vue du dessus', labelEn: 'Top view', icon: Eye },
  { id: 'low_angle', label: 'Vue contre-plongée', labelEn: 'Low angle view', icon: Camera },
  { id: 'zoom_fabric', label: 'Zoom tissu/matière', labelEn: 'Fabric/material zoom', icon: Focus },
  { id: 'zoom_legs', label: 'Zoom pieds/structure', labelEn: 'Legs/structure zoom', icon: Focus },
  { id: 'zoom_detail', label: 'Zoom détail', labelEn: 'Detail zoom', icon: Maximize2 },
];

const DECOR_TYPES = [
  { id: 'living_room', label: 'Salon', labelEn: 'Living room', icon: Sofa },
  { id: 'dining_room', label: 'Salle à manger', labelEn: 'Dining room', icon: Home },
  { id: 'bedroom', label: 'Chambre', labelEn: 'Bedroom', icon: BedDouble },
  { id: 'office', label: 'Bureau', labelEn: 'Office', icon: Home },
];

// Helper to detect AI-generated images
// STRICT: Only check specific URL patterns that we generate - ignore optimization_count entirely
// Shopify CDN images are NEVER considered AI-generated regardless of optimization_count
const isAiGeneratedImage = (imgSrc: string, _optimizationCount?: number | null): boolean => {
  // Shopify CDN images are NEVER AI-generated
  if (imgSrc.includes('cdn.shopify.com')) {
    return false;
  }
  
  // Only our specific AI generation patterns
  const aiPatterns = [
    'ai_generated_',           // Our AI generated images
    'white_background_',       // White background generations
    '/generated-images/',      // Supabase generated images bucket
  ];
  
  return aiPatterns.some(pattern => imgSrc.includes(pattern));
};

export const BulkAIImagesDialog = ({
  open,
  onOpenChange,
  selectedProducts,
  onComplete,
}: BulkAIImagesDialogProps) => {
  const { language } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [productStatuses, setProductStatuses] = useState<Map<string, ProductStatus>>(new Map());
  const [selectedImageTypes, setSelectedImageTypes] = useState<Set<string>>(new Set(['front', 'profile', 'zoom_detail']));
  const [includeDecor, setIncludeDecor] = useState(true);
  const [decorType, setDecorType] = useState<'living_room' | 'dining_room' | 'bedroom' | 'office'>('living_room');
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const cancelledRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [loadingGallery, setLoadingGallery] = useState(false);
  
  // 🆕 Active only filter
  const [activeOnly, setActiveOnly] = useState(true);
  
  // 🆕 Regenerate if already has AI images
  const [regenerateExisting, setRegenerateExisting] = useState(false);
  
  // 🆕 Primary image angle selection
  const [primaryImageAngle, setPrimaryImageAngle] = useState<string>('front');

  // Store loaded gallery images per product
  const [productGalleryImages, setProductGalleryImages] = useState<Map<string, ProductGalleryImage[]>>(new Map());
  // Track selected images per product (product_id -> { url, imageId })
  const [selectedImages, setSelectedImages] = useState<Map<string, Set<string>>>(new Map());

  // 🆕 Filter products by status - FIXED: properly check status
  const filteredProducts = useMemo(() => {
    if (!activeOnly) return selectedProducts;
    return selectedProducts.filter(p => {
      const status = p.status?.toLowerCase();
      return status === 'active' || status === undefined || status === null || status === '';
    });
  }, [selectedProducts, activeOnly]);

  // Memoize product IDs (based on filtered products)
  const productIds = useMemo(() => filteredProducts.map(p => p.id).filter(Boolean), [filteredProducts]);

  // Load gallery images on open (same as SmartBackgroundDialog)
  useEffect(() => {
    if (open && productIds.length > 0) {
      loadAllGalleryImages();
    }
  }, [open, productIds.join(',')]);

  const loadAllGalleryImages = async () => {
    if (productIds.length === 0) return;
    
    setLoadingGallery(true);
    
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('id, src, alt_text, position, shopify_image_id, product_id, optimization_count')
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
          shopify_image_id: img.shopify_image_id,
          optimization_count: (img as any).optimization_count
        });
      });
      
      // Add fallback for products without gallery images
      filteredProducts.forEach(p => {
        if (!imagesByProduct.has(p.id) && p.image_url) {
          imagesByProduct.set(p.id, [{
            id: `fallback-${p.id}`,
            src: p.image_url,
            alt_text: p.title,
            position: 1,
            shopify_image_id: null,
            optimization_count: null
          }]);
        }
      });
      
      setProductGalleryImages(imagesByProduct);
      
      // Smart pre-selection based on regenerateExisting toggle
      const newSelectedImages = new Map<string, Set<string>>();
      
      imagesByProduct.forEach((images, productId) => {
        const nonAiImages = images.filter(img => !isAiGeneratedImage(img.src, img.optimization_count));
        const hasAiImages = images.some(img => isAiGeneratedImage(img.src, img.optimization_count));
        
        if (regenerateExisting) {
          // If regenerate is ON, select first non-AI image (or first image if all are AI)
          if (nonAiImages.length > 0) {
            newSelectedImages.set(productId, new Set([nonAiImages[0].id]));
          } else if (images.length > 0) {
            newSelectedImages.set(productId, new Set([images[0].id]));
          }
        } else {
          // If regenerate is OFF, skip products that already have AI images
          if (hasAiImages) {
            // Don't select - will be skipped
            console.log(`[BulkAI] Product ${productId}: has AI images, skipping (regenerate=off)`);
          } else if (nonAiImages.length > 0) {
            newSelectedImages.set(productId, new Set([nonAiImages[0].id]));
          } else if (images.length > 0) {
            newSelectedImages.set(productId, new Set([images[0].id]));
          }
        }
      });
      
      setSelectedImages(newSelectedImages);
      
      // Initialize product statuses
      const statuses = new Map<string, ProductStatus>();
      filteredProducts.forEach(p => {
        const hasSelectedImages = newSelectedImages.has(p.id) && (newSelectedImages.get(p.id)?.size || 0) > 0;
        const images = imagesByProduct.get(p.id) || [];
        const hasAiImages = images.some(img => isAiGeneratedImage(img.src, img.optimization_count));
        
        statuses.set(p.id, { 
          id: p.id, 
          title: p.title, 
          status: hasSelectedImages ? 'pending' : (hasAiImages && !regenerateExisting ? 'skipped' : 'skipped')
        });
      });
      setProductStatuses(statuses);
      
      console.log('[BulkAI] Loaded gallery images for', imagesByProduct.size, 'products, pre-selected', newSelectedImages.size, 'products');
    } catch (error) {
      console.error('[BulkAI] Error loading gallery images:', error);
      // Fallback to product.image_url
      const fallbackStatuses = new Map<string, ProductStatus>();
      filteredProducts.filter(p => p.image_url).forEach(p => {
        fallbackStatuses.set(p.id, { id: p.id, title: p.title, status: 'pending' });
      });
      setProductStatuses(fallbackStatuses);
    } finally {
      setLoadingGallery(false);
    }
  };

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      cancelledRef.current = false;
      setIsGenerating(false);
      setSuccessCount(0);
      setErrorCount(0);
      setCurrentIndex(0);
    }
  }, [open]);

  // Auto-scroll to current product
  useEffect(() => {
    if (isGenerating && productStatuses.size > 0) {
      const currentProduct = Array.from(productStatuses.values()).find(s => s.status === 'generating');
      if (currentProduct) {
        const el = document.getElementById(`bulk-ai-product-${currentProduct.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [productStatuses, isGenerating]);

  const toggleImageType = (typeId: string) => {
    const newSet = new Set(selectedImageTypes);
    if (newSet.has(typeId)) {
      if (newSet.size > 2) { // Minimum 2 images
        newSet.delete(typeId);
      } else {
        toast.warning(language === 'fr' ? 'Minimum 2 images requises' : 'Minimum 2 images required');
      }
    } else {
      if (newSet.size < 9) {
        newSet.add(typeId);
      } else {
        toast.warning(language === 'fr' ? 'Maximum 9 images' : 'Maximum 9 images');
      }
    }
    setSelectedImageTypes(newSet);
  };

  const updateProductStatus = (productId: string, updates: Partial<ProductStatus>) => {
    setProductStatuses(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(productId);
      if (current) {
        newMap.set(productId, { ...current, ...updates });
      }
      return newMap;
    });
  };

  // Get products with selected images (replacing productsWithImages)
  const productsWithSelection = useMemo(() => {
    return filteredProducts.filter(p => {
      const selected = selectedImages.get(p.id);
      return selected && selected.size > 0;
    });
  }, [filteredProducts, selectedImages]);

  // Toggle image selection for a product
  const toggleImageSelection = (productId: string, imageId: string) => {
    setSelectedImages(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(productId) || new Set<string>();
      const newSet = new Set(current);
      
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      
      if (newSet.size === 0) {
        newMap.delete(productId);
      } else {
        newMap.set(productId, newSet);
      }
      
      // Update status with the new selection state (not stale)
      setProductStatuses(prevStatuses => {
        const statusMap = new Map(prevStatuses);
        const currentStatus = statusMap.get(productId);
        if (currentStatus) {
          statusMap.set(productId, { 
            ...currentStatus, 
            status: newSet.size > 0 ? 'pending' : 'skipped' 
          });
        }
        return statusMap;
      });
      
      return newMap;
    });
  };

  // Get first selected image URL for a product
  const getFirstSelectedImageUrl = (productId: string): string | null => {
    const selected = selectedImages.get(productId);
    if (!selected || selected.size === 0) return null;
    
    const gallery = productGalleryImages.get(productId) || [];
    const firstSelectedId = Array.from(selected)[0];
    const img = gallery.find(g => g.id === firstSelectedId);
    return img?.src || null;
  };

  const handleGenerateAll = async () => {
    if (productsWithSelection.length === 0) {
      toast.error(language === 'fr' ? 'Aucune image sélectionnée' : 'No images selected');
      return;
    }

    if (selectedImageTypes.size === 0 && !includeDecor) {
      toast.error(language === 'fr' ? 'Sélectionnez au moins un type d\'image' : 'Select at least one image type');
      return;
    }

    cancelledRef.current = false;
    setIsGenerating(true);
    setSuccessCount(0);
    setErrorCount(0);

    let localSuccess = 0;
    let localError = 0;

    for (let i = 0; i < productsWithSelection.length; i++) {
      if (cancelledRef.current) break;

      const product = productsWithSelection[i];
      const sourceImageUrl = getFirstSelectedImageUrl(product.id);
      
      if (!sourceImageUrl) {
        updateProductStatus(product.id, { status: 'skipped' });
        continue;
      }
      
      setCurrentIndex(i);
      updateProductStatus(product.id, { status: 'generating' });

      try {
        // Call AI image generation
        const { data, error } = await supabase.functions.invoke('generate-ai-product-images', {
          body: {
            productId: product.id,
            productTitle: product.title,
            productType: product.product_type || 'furniture',
            sourceImageUrl: sourceImageUrl,
            imageTypes: Array.from(selectedImageTypes),
            includeDecor,
            decorType,
            language,
          },
        });

        if (error) throw error;

        if (data?.images && data.images.length > 0) {
          updateProductStatus(product.id, { status: 'saving' });

          // Find selected primary image type to set as main (position 1)
          const primaryImage = data.images.find((img: any) => img.type === primaryImageAngle);
          const otherImages = data.images.filter((img: any) => img.type !== primaryImageAngle);
          
          // Reorder: primary first, then others
          const orderedImages = primaryImage ? [primaryImage, ...otherImages] : data.images;

          // Save images to database
          let savedCount = 0;
          
          // If we have a primary image, shift all existing images positions
          if (primaryImage) {
            // Get all existing images and increment their positions
            const { data: existingImages } = await supabase
              .from('product_images')
              .select('id, position')
              .eq('product_id', product.id)
              .order('position', { ascending: true });
            
            if (existingImages && existingImages.length > 0) {
              // Shift all existing positions by the number of new images
              for (const existing of existingImages) {
                await supabase
                  .from('product_images')
                  .update({ position: (existing.position || 0) + orderedImages.length })
                  .eq('id', existing.id);
              }
            }
          }
          
          for (let imgIndex = 0; imgIndex < orderedImages.length; imgIndex++) {
            const img = orderedImages[imgIndex];
            try {
              let imageUrl = img.url;

              // Upload base64 to storage if needed
              if (img.url.startsWith('data:')) {
                const base64Data = img.url.split(',')[1];
                const filename = `ai_generated_${product.id}_${img.type}_${Date.now()}.png`;
                
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let j = 0; j < byteCharacters.length; j++) {
                  byteNumbers[j] = byteCharacters.charCodeAt(j);
                }
                const byteArray = new Uint8Array(byteNumbers);

                const { error: uploadError } = await supabase.storage
                  .from('generated-images')
                  .upload(filename, byteArray, { contentType: 'image/png' });

                if (!uploadError) {
                  const { data: urlData } = supabase.storage
                    .from('generated-images')
                    .getPublicUrl(filename);
                  imageUrl = urlData.publicUrl;
                }
              }

              // Primary image type gets position 1, others follow
              const imagePosition = primaryImage ? imgIndex + 1 : await getNextPosition(product.id, savedCount);

              // Insert image
              const { data: newImage, error: insertImgError } = await supabase
                .from('product_images')
                .insert({
                  product_id: product.id,
                  src: imageUrl,
                  alt_text: `${product.title} - ${img.label}`,
                  position: imagePosition,
                  optimization_count: 1,
                  is_ai_generated: true, // ✅ Mark as AI-generated to prevent re-export
                })
                .select('id')
                .single();

              // ✅ Create history entry for this AI-generated image
              if (newImage && !insertImgError) {
                const { data: userData } = await supabase.auth.getUser();
                if (userData?.user) {
                  // Get next version number
                  const { data: maxVersion } = await supabase.rpc('get_next_image_version', { 
                    p_image_id: newImage.id 
                  });
                  
                  await supabase.from('product_image_history').insert({
                    product_id: product.id,
                    image_id: newImage.id,
                    user_id: userData.user.id,
                    optimization_type: 'ai_background',
                    original_url: img.url, // Source URL used for generation
                    optimized_url: imageUrl,
                    version_number: maxVersion || 1,
                    is_current: true,
                    ai_model: 'Lovable AI',
                    ai_prompt: `AI-generated ${img.type} image for ${product.title}`,
                  });
                }
              }

              // If this is the primary image (position 1), update product's main image_url
              if (img.type === primaryImageAngle && imageUrl) {
                await supabase
                  .from('shopify_products')
                  .update({ image_url: imageUrl })
                  .eq('id', product.id);
                console.log(`[BulkAI] Set ${primaryImageAngle} as main product image`);
              }

              savedCount++;
            } catch (imgError) {
              console.error('[BulkAI] Error saving image:', imgError);
            }
          }
          
          // Helper function to get next position
          async function getNextPosition(productId: string, offset: number): Promise<number> {
            const { data: existingImages } = await supabase
              .from('product_images')
              .select('position')
              .eq('product_id', productId)
              .order('position', { ascending: false })
              .limit(1);
            return (existingImages?.[0]?.position || 0) + 1 + offset;
          }

          updateProductStatus(product.id, { status: 'success', imagesGenerated: savedCount });
          localSuccess++;
          setSuccessCount(localSuccess);
        } else {
          throw new Error('No images generated');
        }
      } catch (error: any) {
        console.error('[BulkAI] Error:', error);
        updateProductStatus(product.id, { status: 'error', error: error.message });
        localError++;
        setErrorCount(localError);
      }

      // Delay between products to avoid rate limits
      if (i < productsWithSelection.length - 1 && !cancelledRef.current) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsGenerating(false);

    if (localSuccess > 0) {
      toast.success(
        language === 'fr'
          ? `${localSuccess} produit(s) traité(s) avec succès`
          : `${localSuccess} product(s) processed successfully`
      );
    }

    if (localSuccess > 0 && localError === 0) {
      setTimeout(() => {
        onOpenChange(false);
        onComplete?.();
      }, 1500);
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    setIsGenerating(false);
  };

  const progress = productsWithSelection.length > 0
    ? Math.round(((successCount + errorCount) / productsWithSelection.length) * 100)
    : 0;

  const getStatusIcon = (status: ProductStatus['status']) => {
    switch (status) {
      case 'generating':
      case 'saving':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'skipped':
        return <X className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Square className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ProductStatus['status']) => {
    switch (status) {
      case 'generating':
        return <Badge variant="secondary">{language === 'fr' ? 'Génération...' : 'Generating...'}</Badge>;
      case 'saving':
        return <Badge variant="secondary">{language === 'fr' ? 'Sauvegarde...' : 'Saving...'}</Badge>;
      case 'success':
        return <Badge className="bg-green-500">{language === 'fr' ? 'Succès' : 'Success'}</Badge>;
      case 'error':
        return <Badge variant="destructive">{language === 'fr' ? 'Erreur' : 'Error'}</Badge>;
      case 'skipped':
        return <Badge variant="outline">{language === 'fr' ? 'Ignoré' : 'Skipped'}</Badge>;
      default:
        return <Badge variant="outline">{language === 'fr' ? 'En attente' : 'Pending'}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg sm:max-w-2xl md:max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 flex flex-col">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Layers className="h-5 w-5 text-primary" />
              {language === 'fr' ? 'AI Images - Génération en masse' : 'AI Images - Bulk Generation'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {language === 'fr'
                ? `Générer des variantes d'images IA pour ${productsWithSelection.length} produit(s) sélectionné(s)`
                : `Generate AI image variants for ${productsWithSelection.length} selected product(s)`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Loading indicator */}
            {loadingGallery && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {language === 'fr' ? 'Chargement des galeries...' : 'Loading galleries...'}
              </div>
            )}

            {/* Progress - Style Google Shopping */}
            {isGenerating && (
              <div className="space-y-3 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-xl border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {language === 'fr' ? 'Produit' : 'Product'}
                    </span>
                    <span className="font-semibold text-foreground">
                      {successCount + errorCount} / {productsWithSelection.length}
                    </span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-bold text-primary">
                    {Math.round(progress)}%
                  </span>
                </div>
                <Progress value={progress} className="h-3 sm:h-4" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="text-success">✓ {successCount}</span>
                    {errorCount > 0 && <span className="text-destructive">| ✗ {errorCount}</span>}
                  </span>
                </div>
              </div>
            )}

            {/* Configuration (only before generation starts) */}
            {!isGenerating && successCount === 0 && (
              <>
                {/* Filters row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 🆕 Active only toggle */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="active-only-toggle" className="text-sm font-medium cursor-pointer">
                        {language === 'fr' ? 'Actifs uniquement' : 'Active only'}
                      </Label>
                      <Badge variant="secondary" className="text-xs">
                        {filteredProducts.length}/{selectedProducts.length}
                      </Badge>
                    </div>
                    <Switch
                      id="active-only-toggle"
                      checked={activeOnly}
                      onCheckedChange={(checked) => {
                        setActiveOnly(checked);
                        // Reload gallery when filter changes
                        setTimeout(() => loadAllGalleryImages(), 100);
                      }}
                    />
                  </div>

                  {/* 🆕 Regenerate existing toggle */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="regenerate-toggle" className="text-sm font-medium cursor-pointer">
                        {language === 'fr' ? 'Régénérer existants' : 'Regenerate existing'}
                      </Label>
                    </div>
                    <Switch
                      id="regenerate-toggle"
                      checked={regenerateExisting}
                      onCheckedChange={(checked) => {
                        setRegenerateExisting(checked);
                        // Reload gallery to recalculate selections
                        setTimeout(() => loadAllGalleryImages(), 100);
                      }}
                    />
                  </div>
                </div>

                {/* 🆕 Primary image angle dropdown */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">
                    {language === 'fr' ? 'Photo principale :' : 'Primary photo:'}
                  </Label>
                  <select
                    value={primaryImageAngle}
                    onChange={(e) => setPrimaryImageAngle(e.target.value)}
                    className="flex-1 max-w-[200px] h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {IMAGE_TYPES.map(type => (
                      <option key={type.id} value={type.id}>
                        {language === 'fr' ? type.label : type.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    {language === 'fr' ? `Types d'images (${selectedImageTypes.size}/9)` : `Image types (${selectedImageTypes.size}/9)`}
                    <Badge variant="outline" className="text-xs">{language === 'fr' ? 'Min 2 - Max 9' : 'Min 2 - Max 9'}</Badge>
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {IMAGE_TYPES.map(type => (
                      <Card
                        key={type.id}
                        className={`p-2 cursor-pointer transition-all ${
                          selectedImageTypes.has(type.id)
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-muted-foreground/50'
                        }`}
                        onClick={() => toggleImageType(type.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedImageTypes.has(type.id)}
                            onCheckedChange={() => toggleImageType(type.id)}
                          />
                          <type.icon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">
                            {language === 'fr' ? type.label : type.labelEn}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Decor Option */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-decor-bulk"
                      checked={includeDecor}
                      onCheckedChange={(checked) => setIncludeDecor(!!checked)}
                    />
                    <Label htmlFor="include-decor-bulk" className="text-sm cursor-pointer">
                      {language === 'fr' ? 'Ajouter 1 image en décor' : 'Add 1 decor image'}
                    </Label>
                  </div>

                  {includeDecor && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 ml-6">
                      {DECOR_TYPES.map(decor => (
                        <Card
                          key={decor.id}
                          className={`p-2 cursor-pointer transition-all ${
                            decorType === decor.id
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-muted-foreground/50'
                          }`}
                          onClick={() => setDecorType(decor.id as any)}
                        >
                          <div className="flex items-center gap-2">
                            <decor.icon className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">
                              {language === 'fr' ? decor.label : decor.labelEn}
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Product List with Gallery Images */}
            <ScrollArea className="h-[250px] sm:h-[350px] border rounded-lg" ref={scrollRef}>
              <div className="p-3 space-y-4">
                {filteredProducts.map(product => {
                  const status = productStatuses.get(product.id);
                  const galleryImages = productGalleryImages.get(product.id) || [];
                  const productSelectedImages = selectedImages.get(product.id) || new Set();
                  
                  return (
                    <div
                      key={product.id}
                      id={`bulk-ai-product-${product.id}`}
                      className={`p-3 rounded-lg border transition-colors ${
                        status?.status === 'generating' || status?.status === 'saving'
                          ? 'border-primary bg-primary/5'
                          : status?.status === 'success'
                          ? 'border-green-500 bg-green-500/5'
                          : status?.status === 'error'
                          ? 'border-destructive bg-destructive/5'
                          : 'border-border'
                      }`}
                    >
                      {/* Product Header */}
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        {status && getStatusIcon(status.status)}
                        <span className="flex-1 text-xs sm:text-sm font-medium truncate">{product.title}</span>
                        {status?.imagesGenerated && (
                          <span className="text-xs text-muted-foreground">
                            {status.imagesGenerated} img
                          </span>
                        )}
                        {status && getStatusBadge(status.status)}
                      </div>
                      
                      {/* Gallery Images Grid (only show before generation) */}
                      {!isGenerating && successCount === 0 && galleryImages.length > 0 && (
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                          {galleryImages.map(img => {
                            const isSelected = productSelectedImages.has(img.id);
                            const isAi = isAiGeneratedImage(img.src, img.optimization_count);
                            
                            return (
                              <div
                                key={img.id}
                                className={`relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all ${
                                  isSelected 
                                    ? 'border-primary ring-2 ring-primary/30' 
                                    : 'border-transparent hover:border-muted-foreground/50'
                                }`}
                                onClick={() => toggleImageSelection(product.id, img.id)}
                              >
                                <img
                                  src={img.src}
                                  alt={img.alt_text || ''}
                                  className="w-full h-full object-cover"
                                />
                                {/* Selection checkbox overlay */}
                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-sm flex items-center justify-center ${
                                  isSelected ? 'bg-primary' : 'bg-black/50'
                                }`}>
                                  {isSelected && <Check className="h-3 w-3 text-white" />}
                                </div>
                                {/* AI badge */}
                                {isAi && (
                                  <Badge 
                                    variant="secondary" 
                                    className="absolute bottom-1 right-1 text-[10px] px-1 py-0"
                                  >
                                    AI
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Stats */}
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="flex items-center gap-1">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                {productsWithSelection.length} {language === 'fr' ? 'produit(s)' : 'product(s)'}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {successCount} {language === 'fr' ? 'succès' : 'success'}
              </span>
              {errorCount > 0 && (
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  {errorCount} {language === 'fr' ? 'erreur(s)' : 'error(s)'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Footer for Mobile */}
        <div className="fixed sm:relative bottom-0 left-0 right-0 bg-background border-t sm:border-t-0 p-4 sm:p-6 sm:pt-0 flex gap-2 justify-end">
          {isGenerating ? (
            <Button variant="destructive" onClick={handleCancel} className="flex-1 sm:flex-none">
              <X className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
          ) : successCount > 0 ? (
            <Button onClick={() => { onOpenChange(false); onComplete?.(); }} className="flex-1 sm:flex-none">
              <Check className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Fermer' : 'Close'}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="hidden sm:flex">
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Button>
              <Button 
                onClick={handleGenerateAll} 
                disabled={productsWithSelection.length === 0 || loadingGallery}
                className="flex-1 sm:flex-none"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {language === 'fr' 
                  ? `Générer (${productsWithSelection.length})` 
                  : `Generate (${productsWithSelection.length})`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
