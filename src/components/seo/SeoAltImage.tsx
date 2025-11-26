import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ProgressDialog, ResultsDialog, SyncConfirmationDialog, SuccessDialog } from './SeoWorkflowDialogs';
import { TrialLimitDialog } from '@/components/TrialLimitDialog';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { calculateAltTextScore } from '@/lib/seoQuality';
import { useTranslation } from '@/lib/language';
import { Checkbox } from '@/components/ui/checkbox';
import { usePaginatedSeo } from '@/hooks/usePaginatedSeo';
import { 
  Search, 
  RefreshCw, 
  Image as ImageIcon,
  Sparkles,
  Upload,
  Loader2,
  CheckCircle,
  Clock,
  Grid3x3,
  List,
  TrendingUp,
  Eye,
  ArrowRight,
  ShoppingBag,
  Package,
  FileText,
  PenSquare,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface ProductImage {
  id: string;
  product_id?: string;
  content_id?: string;
  content_type?: 'product' | 'collection' | 'page' | 'article' | 'homepage';
  src: string;
  alt_text: string | null;
  position: number;
  shopify_image_id: number;
  created_at: string;
  updated_at: string;
  width: number;
  height: number;
  optimization_count: number;
  last_optimization_at: string | null;
  last_synced_at: string | null;
  image_type: 'product' | 'content';
}

interface Product {
  id: string;
  title: string;
  vendor?: string;
  category?: string;
  image_url?: string;
  handle?: string;
  body_html?: string;
  content?: string;
}

interface ImageWithProduct extends ProductImage {
  product: Product;
}

type AltImageTab = 'all' | 'needs-alt' | 'has-alt' | 'to-sync';
type ContentTypeFilter = 'all' | 'products' | 'collections' | 'pages' | 'articles' | 'homepage';
type SeoScoreSort = 'none' | 'asc' | 'desc';
type StatusFilter = 'all' | 'optimized' | 'not-optimized';
type SyncFilter = 'all' | 'synced' | 'not-synced';
type QualityFilter = 'all' | 'excellent' | 'good' | 'medium' | 'poor';

export interface SeoAltImageRef {
  getProgress: () => { current: number; total: number; isRunning: boolean };
}

export const SeoAltImage = React.forwardRef<SeoAltImageRef, {}>((props, ref) => {
  const [searchParams] = useSearchParams();
  const { selectedStore } = useStore();
  const [images, setImages] = useState<ImageWithProduct[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<AltImageTab>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [seoScoreSort, setSeoScoreSort] = useState<SeoScoreSort>('none');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [syncFilter, setSyncFilter] = useState<SyncFilter>('all');
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>(
    (searchParams.get("filter") as QualityFilter) || "all"
  );
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [isOptimizationComplete, setIsOptimizationComplete] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [optimizedImages, setOptimizedImages] = useState<ImageWithProduct[]>([]);
  const [showOptimizeDialog, setShowOptimizeDialog] = useState(false);
  const [selectedImageForOptimize, setSelectedImageForOptimize] = useState<ImageWithProduct | null>(null);
  const { limits, loading: limitsLoading, canDoAction, refresh: refreshLimits } = useUsageLimits();
  const { t, tf } = useTranslation();

  // Expose progress state via ref
  React.useImperativeHandle(ref, () => ({
    getProgress: () => ({ 
      current: progress.current, 
      total: progress.total, 
      isRunning: generating 
    })
  }));

  const fetchImages = async () => {
    if (!selectedStore?.id) {
      setImages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // ✅ PAGINATION CÔTÉ SERVEUR pour récupérer TOUTES les images
      let allProductImages: any[] = [];
      let hasMore = true;
      let page = 0;
      const PAGE_SIZE = 1000;

      console.log('🔄 [IMAGES] Starting paginated fetch for product images...');

      while (hasMore) {
        const start = page * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;
        
        console.log(`📄 [IMAGES] Fetching product images page ${page + 1} (${start}-${end})...`);
        
        const { data: pageData, error: pageError } = await supabase
          .from('product_images')
          .select(`
            *,
            product:shopify_products!inner(id, title, vendor, category, store_id)
          `)
          .eq('product.store_id', selectedStore.id)
          .range(start, end)
          .order('product_id', { ascending: true })
          .order('position', { ascending: true });
        
        if (pageError) throw pageError;
        
        if (pageData && pageData.length > 0) {
          console.log(`✅ [IMAGES] Product images page ${page + 1} loaded: ${pageData.length} images`);
          allProductImages = [...allProductImages, ...pageData];
          
          if (pageData.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      const productImagesData = allProductImages;
      console.log('✅ [IMAGES] Total product images fetched:', productImagesData.length);

      // ✅ PAGINATION CÔTÉ SERVEUR pour récupérer TOUTES les images de contenu
      let allContentImages: any[] = [];
      hasMore = true;
      page = 0;

      console.log('🔄 [IMAGES] Starting paginated fetch for content images...');

      while (hasMore) {
        const start = page * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;
        
        console.log(`📄 [IMAGES] Fetching content images page ${page + 1} (${start}-${end})...`);
        
        const { data: pageData, error: pageError } = await supabase
          .from('content_images')
          .select('*')
          .eq('store_id', selectedStore.id)
          .range(start, end)
          .order('content_id', { ascending: true })
          .order('position', { ascending: true });
        
        if (pageError) throw pageError;
        
        if (pageData && pageData.length > 0) {
          console.log(`✅ [IMAGES] Content images page ${page + 1} loaded: ${pageData.length} images`);
          allContentImages = [...allContentImages, ...pageData];
          
          if (pageData.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      const contentImagesData = allContentImages;
      console.log('✅ [IMAGES] Total content images fetched:', contentImagesData.length);

      // Map product images
      const productImages = (productImagesData || [])
        .filter(img => img.product && img.product.id)
        .map(img => ({
          ...img,
          product: img.product,
          image_type: 'product' as const
        }));

      // Map content images and fetch their content details
      const contentImages = await Promise.all(
        (contentImagesData || []).map(async (img) => {
          let product: Product = { id: img.content_id, title: t.seo.altImage.unknownContent };

          // Fetch content details based on type with store_id filter
          if (img.content_type === 'collection') {
            const { data } = await supabase
              .from('shopify_collections')
              .select('id, title, handle')
              .eq('id', img.content_id)
              .eq('store_id', selectedStore.id)
              .maybeSingle();
            if (data) product = { ...data, title: `📚 ${data.title}` };
          } else if (img.content_type === 'page') {
            const { data } = await supabase
              .from('shopify_pages')
              .select('id, title, handle')
              .eq('id', img.content_id)
              .eq('store_id', selectedStore.id)
              .maybeSingle();
            if (data) product = { ...data, title: `📄 ${data.title}` };
          } else if (img.content_type === 'article') {
            const { data } = await supabase
              .from('blog_articles')
              .select('id, title')
              .eq('id', img.content_id)
              .eq('store_id', selectedStore.id)
              .maybeSingle();
            if (data) product = { ...data, title: `📰 ${data.title}` };
          } else if (img.content_type === 'homepage') {
            product = { id: img.content_id, title: `🏠 Page d'accueil` };
          }

          return {
            ...img,
            product,
            product_id: undefined,
            image_type: 'content' as const
          };
        })
      );

      // Merge and set images
      const allImages = [...productImages, ...contentImages] as ImageWithProduct[];
      setImages(allImages);
      
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error(t.seo.altImage.errorLoading);
    } finally {
      setLoading(false);
    }
  };

  const handleImportContentImages = async () => {
    try {
      setImporting(true);
      
      // Get active store
      const { data: stores } = await supabase
        .from('shopify_connections')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (!stores) {
        toast.error(t.seo.altImage.noStoreConnected);
        return;
      }

      // Import all types including homepage
      const { data, error } = await supabase.functions.invoke('import-content-images', {
        body: { storeId: stores.id, types: ['collections', 'pages', 'articles', 'homepage'] }
      });

      if (error) throw error;

      const totalImported = data?.totalImported || 0;
      if (totalImported > 0) {
        toast.success(tf('seo.altImage.imagesImported', { count: totalImported }));
      } else {
        toast.info(t.seo.altImage.noNewImages);
      }
      await fetchImages();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(t.seo.altImage.errorImport);
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    if (selectedStore) {
      setLoading(true);
      fetchImages();
    }
  }, [selectedStore?.id]);

  // Handle URL filter params
  useEffect(() => {
    const filterParam = searchParams.get('filter') as QualityFilter | null;
    if (filterParam && ['all', 'excellent', 'good', 'medium', 'poor'].includes(filterParam)) {
      setQualityFilter(filterParam);
    }
  }, [searchParams]);

  const filteredImages = images.filter((img) => {
    // Filter by content type
    if (contentTypeFilter !== 'all') {
      if (contentTypeFilter === 'products' && img.image_type !== 'product') return false;
      if (contentTypeFilter === 'collections' && (!img.content_type || img.content_type !== 'collection')) return false;
      if (contentTypeFilter === 'pages' && (!img.content_type || img.content_type !== 'page')) return false;
      if (contentTypeFilter === 'articles' && (!img.content_type || img.content_type !== 'article')) return false;
      if (contentTypeFilter === 'homepage' && (!img.content_type || img.content_type !== 'homepage')) return false;
    }

    if (activeTab === 'needs-alt' && (img.optimization_count && img.optimization_count > 0)) return false;
    if (activeTab === 'has-alt' && (!img.optimization_count || img.optimization_count === 0)) return false;
    if (activeTab === 'to-sync' && (!img.alt_text || !img.optimization_count || img.last_synced_at)) return false;

    // Status filter
    if (statusFilter === 'optimized' && (!img.optimization_count || img.optimization_count === 0)) return false;
    if (statusFilter === 'not-optimized' && img.optimization_count && img.optimization_count > 0) return false;

    // Sync filter - images don't have direct sync tracking, so we check if alt_text exists as proxy
    if (syncFilter === 'synced' && !img.last_synced_at) return false;
    if (syncFilter === 'not-synced' && img.last_synced_at) return false;

    // Quality filter - Use same logic as calculateImagesSeoScore (reference)
    if (qualityFilter !== 'all') {
      const isAI = (img.optimization_count || 0) > 0;
      const altScore = calculateAltTextScore(img.alt_text || '', isAI);
      // Normalize to 0-100 scale: divide by weight like calculateImagesSeoScore does
      const score = altScore.weight === 0 ? 0 : Math.min(100, Math.round(altScore.score / altScore.weight));

      if (qualityFilter === 'excellent' && score < 80) return false;
      if (qualityFilter === 'good' && (score < 60 || score >= 80)) return false;
      if (qualityFilter === 'medium' && (score < 40 || score >= 60)) return false;
      if (qualityFilter === 'poor' && score >= 40) return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        img.product.title.toLowerCase().includes(term) ||
        img.alt_text?.toLowerCase().includes(term) ||
        img.product.category?.toLowerCase().includes(term)
      );
    }

    return true;
  });

  // Apply SEO score sorting - Use same logic as calculateImagesSeoScore (reference)
  const sortedImages = [...filteredImages];
  if (seoScoreSort !== 'none') {
    sortedImages.sort((a, b) => {
      const isAIA = (a.optimization_count || 0) > 0;
      const isAIB = (b.optimization_count || 0) > 0;
      const altScoreA = calculateAltTextScore(a.alt_text || '', isAIA);
      const altScoreB = calculateAltTextScore(b.alt_text || '', isAIB);
      // Normalize to 0-100 scale: divide by weight like calculateImagesSeoScore does
      const scoreA = altScoreA.weight === 0 ? 0 : Math.min(100, Math.round(altScoreA.score / altScoreA.weight));
      const scoreB = altScoreB.weight === 0 ? 0 : Math.min(100, Math.round(altScoreB.score / altScoreB.weight));
      
      return seoScoreSort === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    });
  }

  // Batch pagination
  const {
    paginatedItems: paginatedImages,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage,
    hasPreviousPage
  } = usePaginatedSeo({
    items: sortedImages,
    itemsPerPage: 50,
    cacheKey: 'images-pagination'
  });

  const handleSelectAll = () => {
    if (selectedImages.size === sortedImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(sortedImages.map((img) => img.id)));
    }
  };

  const handleSelectImage = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  const handleSeoScoreSortToggle = () => {
    if (seoScoreSort === 'none') {
      setSeoScoreSort('desc');
    } else if (seoScoreSort === 'desc') {
      setSeoScoreSort('asc');
    } else {
      setSeoScoreSort('none');
    }
  };

  const handleOptimizeImage = async (imageId: string, useVision = true) => {
    // Check limits BEFORE optimizing
    if (!limits?.canUseOptimizations || limits?.limitReached.optimizations) {
      if (limits?.isTrialing) {
        toast.error('Limite du plan actuel atteinte. Passez à un plan payant pour continuer.');
      } else if (limits?.isPaid) {
        toast.error('Limite mensuelle d\'optimisations atteinte. Passez à un plan supérieur.');
      }
      setShowUpgradeDialog(true);
      return;
    }

    try {
      setGenerating(true);
      const toastId = toast.loading('Optimisation de l\'image en cours...');

      const image = images.find(img => img.id === imageId);
      if (!image) {
        toast.error('Image introuvable', { id: toastId });
        return;
      }

      const imageType = image.image_type || 'product';
      
      const { data, error } = await supabase.functions.invoke('smart-alt-text', {
        body: { 
          image_id: image.id
        }
      });

      // Gérer erreur 403 limite atteinte
      if (error && (error.message?.includes('limite_optimisations_atteinte') || error.message?.includes('403'))) {
        toast.error('Limite d\'optimisations atteinte', { id: toastId });
        setShowUpgradeDialog(true);
        await refreshLimits();
        return;
      }

      if (error) throw error;

      toast.success('ALT text généré avec succès', { id: toastId });
      await fetchImages();
      await refreshLimits();
      
      // Afficher le résultat
      const { data: updatedImage } = await supabase
        .from(imageType === 'product' ? 'product_images' : 'content_images')
        .select('*')
        .eq('id', imageId)
        .single();
      
      if (updatedImage) {
        setOptimizedImages([{ ...updatedImage, image_url: updatedImage.src, product: image.product }] as any);
        setShowResultsDialog(true);
      }
    } catch (error: any) {
      console.error('Error optimizing image:', error);
      toast.error(error.message || 'Erreur lors de l\'optimisation');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateForSelected = async (useVision = false) => {
    const imagesToGenerate = images.filter(
      img => selectedImages.has(img.id)
    );

    if (imagesToGenerate.length === 0) {
      toast.info(t.seo.altImage.noSelection);
      return;
    }

    // Check limits BEFORE optimizing
    if (!limits?.canUseOptimizations || limits?.limitReached.optimizations) {
      if (limits?.isTrialing) {
        toast.error('Limite du plan actuel atteinte. Passez à un plan payant pour continuer.');
      } else if (limits?.isPaid) {
        toast.error('Limite mensuelle d\'optimisations atteinte. Passez à un plan supérieur.');
      }
      setShowUpgradeDialog(true);
      return;
    }

    setGenerating(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: imagesToGenerate.length });

    const functionName = useVision ? 'generate-alt-texts-vision' : 'generate-alt-texts';

    let successCount = 0;
    let errorCount = 0;

      for (let i = 0; i < imagesToGenerate.length; i++) {
      try {
        const img = imagesToGenerate[i];
        const imageType = img.image_type || 'product';
        
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: { 
            image_id: img.id,
            imageType: useVision ? imageType : undefined
          }
        });
        
        // Check for 403 error (limit reached)
        if (error && (error.message?.includes('limite_optimisations_atteinte') || error.message?.includes('403'))) {
          toast.error('Limite d\'optimisations atteinte', {
            description: 'Passez à un plan supérieur pour continuer.'
          });
          setGenerating(false);
          setShowProgressDialog(false);
          setShowUpgradeDialog(true);
          await fetchImages();
          return;
        }
        
        if (error) {
          console.error('Error generating ALT text:', error);
          errorCount++;
        } else {
          successCount++;
        }
        
        setProgress({ current: i + 1, total: imagesToGenerate.length });
      } catch (error) {
        console.error('Error generating ALT text:', error);
        errorCount++;
      }
    }

    if (errorCount > 0) {
      toast.warning(tf('seo.altImage.generatedWithErrors', { success: successCount, errors: errorCount }));
    }

    setGenerating(false);
    setIsOptimizationComplete(true);
    await fetchImages();

    // Show results dialog with refreshed images including image_url
    const refreshedImages = images.filter(img => 
      imagesToGenerate.some(genImg => genImg.id === img.id)
    ).map(img => ({
      ...img,
      image_url: img.src // Map src to image_url for ResultsDialog
    }));
    setOptimizedImages(refreshedImages as any);
    setShowProgressDialog(false);
    setShowResultsDialog(true);
  };

  const handleOptimizeAllImages = async () => {
    // Get all images not optimized by AI
    const imagesToOptimize = images.filter(img => !img.optimization_count || img.optimization_count === 0);

    if (imagesToOptimize.length === 0) {
      toast.info('Toutes les images sont déjà optimisées par IA', {
        action: {
          label: "Ré-optimiser tout",
          onClick: () => handleReoptimizeAllImages()
        }
      });
      return;
    }

    // Check limits BEFORE optimizing
    if (!limits?.canUseOptimizations || limits?.limitReached.optimizations) {
      if (limits?.isTrialing) {
        toast.error('Limite du plan actuel atteinte. Passez à un plan payant pour continuer.');
      } else if (limits?.isPaid) {
        toast.error('Limite mensuelle d\'optimisations atteinte. Passez à un plan supérieur.');
      }
      setShowUpgradeDialog(true);
      return;
    }

    const toastId = toast.loading(`Optimisation de ${imagesToOptimize.length} images...`);
    setGenerating(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: imagesToOptimize.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < imagesToOptimize.length; i++) {
      // Check limits DURING optimization to stop if quota runs out
      await refreshLimits();
      if (!limits?.canUseOptimizations || limits?.limitReached.optimizations) {
        console.log(`⛔ Arrêt de l'optimisation: quota épuisé après ${successCount} images`);
        break;
      }

      try {
        const img = imagesToOptimize[i];
        const imageType = img.image_type || 'product';
        
        const { error } = await supabase.functions.invoke('generate-alt-texts-vision', {
          body: { 
            image_id: img.id,
            imageType: imageType
          }
        });
        
        if (error) {
          console.error('Error generating ALT text:', error);
          errorCount++;
        } else {
          successCount++;
        }
        
        setProgress({ current: i + 1, total: imagesToOptimize.length });
      } catch (error) {
        console.error('Error generating ALT text:', error);
        errorCount++;
      }
    }

    toast.dismiss(toastId);
    if (errorCount > 0) {
      toast.warning(tf('seo.altImage.generatedWithErrors', { success: successCount, errors: errorCount }));
    } else {
      toast.success(tf('seo.altImage.allGenerated', { count: successCount }));
    }

    setGenerating(false);
    setIsOptimizationComplete(true);
    await fetchImages();
    await refreshLimits();
    setShowProgressDialog(false);
  };

  const handleReoptimizeAllImages = async () => {
    // Re-optimize ALL images
    const allImageIds = images.map(img => img.id);
    
    // Check limits BEFORE optimizing
    if (!limits?.canUseOptimizations || limits?.limitReached.optimizations) {
      if (limits?.isTrialing) {
        toast.error('Limite du plan actuel atteinte. Passez à un plan payant pour continuer.');
      } else if (limits?.isPaid) {
        toast.error('Limite mensuelle d\'optimisations atteinte. Passez à un plan supérieur.');
      }
      setShowUpgradeDialog(true);
      return;
    }

    const toastId = toast.loading(`Ré-optimisation de ${images.length} images...`);
    setGenerating(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: images.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < images.length; i++) {
      // Check limits DURING re-optimization to stop if quota runs out
      await refreshLimits();
      if (!limits?.canUseOptimizations || limits?.limitReached.optimizations) {
        console.log(`⛔ Arrêt de la ré-optimisation: quota épuisé après ${successCount} images`);
        break;
      }

      try {
        const img = images[i];
        const imageType = img.image_type || 'product';
        
        const { error } = await supabase.functions.invoke('generate-alt-texts-vision', {
          body: { 
            image_id: img.id,
            imageType: imageType,
            force: true
          }
        });
        
        if (error) {
          console.error('Error generating ALT text:', error);
          errorCount++;
        } else {
          successCount++;
        }
        
        setProgress({ current: i + 1, total: images.length });
      } catch (error) {
        console.error('Error generating ALT text:', error);
        errorCount++;
      }
    }

    toast.dismiss(toastId);
    if (errorCount > 0) {
      toast.warning(`${successCount}/${images.length} images ré-optimisées avec succès`);
    } else {
      toast.success(`${successCount} images ré-optimisées avec succès!`);
    }

    setGenerating(false);
    setIsOptimizationComplete(true);
    await fetchImages();
    await refreshLimits();
    setShowProgressDialog(false);
  };

  const handleSyncSelected = async () => {
    // Filter images that can be synced (exclude homepage images without shopify_image_id)
    const imagesToSync = images.filter(
      img => selectedImages.has(img.id) && 
             img.alt_text && 
             img.shopify_image_id && 
             img.content_type !== 'homepage'
    );

    // Check if any homepage images were selected
    const homepageImagesSelected = images.filter(
      img => selectedImages.has(img.id) && img.content_type === 'homepage'
    ).length;

    if (homepageImagesSelected > 0) {
      toast.info(`${homepageImagesSelected} image(s) homepage ne peuvent pas être synchronisées (elles existent dans le HTML de votre boutique)`);
    }

    if (imagesToSync.length === 0) {
      if (homepageImagesSelected > 0) {
        toast.error('Aucune image synchronisable sélectionnée. Les images homepage ne peuvent pas être synchronisées vers Shopify.');
      } else {
        toast.info('Aucune image à synchroniser');
      }
      return;
    }

    try {
      setSyncing(true);
      setShowProgressDialog(true);
      setIsOptimizationComplete(false);
      setProgress({ current: 0, total: imagesToSync.length });

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < imagesToSync.length; i++) {
        try {
          const { error } = await supabase.functions.invoke('sync-seo-to-shopify', {
            body: { 
              imageId: imagesToSync[i].id, 
              syncAltText: true,
              force: true // Allow immediate sync after ALT text generation
            }
          });
          
          if (error) {
            console.error('Error syncing:', error);
            errorCount++;
          } else {
            successCount++;
          }
          
          setProgress({ current: i + 1, total: imagesToSync.length });
        } catch (error) {
          console.error('Error syncing:', error);
          errorCount++;
        }
      }

      if (errorCount > 0) {
        toast.warning(tf('seo.altImage.toasts.syncWithErrors', { success: successCount, errors: errorCount }));
      } else {
        toast.success(tf('seo.altImage.toasts.syncSuccess', { success: successCount }));
      }

      setSyncing(false);
      setIsOptimizationComplete(true);
      setSelectedImages(new Set());
      await fetchImages();
    } catch (error) {
      console.error('Error in sync process:', error);
      toast.error(t.seo.altImage.toasts.syncError);
      setSyncing(false);
      setShowProgressDialog(false);
    }
  };

  const handleCloseProgressDialog = () => {
    setShowProgressDialog(false);
    setIsOptimizationComplete(false);
    setSelectedImages(new Set());
  };

  const handleCloseResultsDialog = () => {
    setShowResultsDialog(false);
    setOptimizedImages([]);
    setSelectedImages(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter images by content type first for accurate stats
  const imagesFilteredByType = images.filter((img) => {
    if (contentTypeFilter === 'all') return true;
    if (contentTypeFilter === 'products' && img.image_type !== 'product') return false;
    if (contentTypeFilter === 'collections' && (!img.content_type || img.content_type !== 'collection')) return false;
    if (contentTypeFilter === 'pages' && (!img.content_type || img.content_type !== 'page')) return false;
    if (contentTypeFilter === 'articles' && (!img.content_type || img.content_type !== 'article')) return false;
    if (contentTypeFilter === 'homepage' && (!img.content_type || img.content_type !== 'homepage')) return false;
    return true;
  });

  const imagesNotOptimized = imagesFilteredByType.filter(img => !img.optimization_count || img.optimization_count === 0).length;
  const imagesOptimizedByAI = imagesFilteredByType.filter(img => img.optimization_count && img.optimization_count > 0).length;
  const imagesToSync = imagesFilteredByType.filter(img => img.alt_text && img.optimization_count && img.optimization_count > 0 && !img.last_synced_at).length;
  const imagesSynced = imagesFilteredByType.filter(img => img.alt_text && img.last_synced_at).length;
  // Calculate ALT SEO score based on ratio of optimized images to total images (filtered)
  const altSeoScore = imagesFilteredByType.length > 0 
    ? Math.round((imagesOptimizedByAI / imagesFilteredByType.length) * 100)
    : 0;

  const tabs = [
    { id: 'all' as AltImageTab, label: t.seo.altImage.tabs.all, count: imagesFilteredByType.length },
    { id: 'needs-alt' as AltImageTab, label: t.seo.altImage.tabs.notOptimized, count: imagesNotOptimized },
    { id: 'has-alt' as AltImageTab, label: t.seo.altImage.tabs.optimized, count: imagesOptimizedByAI },
    { id: 'to-sync' as AltImageTab, label: t.seo.altImage.tabs.toSync, count: imagesToSync }
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950 dark:via-emerald-950 dark:to-teal-950 border-2 border-green-200 p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-green-600" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                {t.seo.altImage.banner.title}
              </h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">
              {t.seo.altImage.banner.description}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4 text-green-600" />
                <span className="font-medium">{t.seo.altImage.banner.maxAccessibility}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">{t.seo.altImage.banner.seoBoost}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span className="font-medium">{t.seo.altImage.banner.advancedVision}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 items-center">
            {generating ? (
              <div className="text-center space-y-3 w-full max-w-md">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="font-semibold text-lg">Optimisation en cours...</span>
                </div>
                <Progress value={(progress.current / progress.total) * 100} className="h-3" />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{progress.current} / {progress.total}</span>
                  <span className="font-bold text-primary">{Math.round((progress.current / progress.total) * 100)}%</span>
                </div>
                <p className="text-xs text-muted-foreground">💡 Le traitement continue en arrière-plan</p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${
                    altSeoScore >= 80 ? 'text-green-600' : 
                    altSeoScore >= 60 ? 'text-orange-600' : 
                    'text-red-600'
                  }`}>
                    {altSeoScore} / 100
                  </div>
                  <div className="text-sm text-muted-foreground">{t.seo.altImage.stats.seoScore} ({imagesOptimizedByAI}/{imagesFilteredByType.length})</div>
                </div>
                <Button
                  size="lg"
                  onClick={handleOptimizeAllImages}
                  disabled={generating || imagesNotOptimized === 0 || limitsLoading}
                  className="bg-gradient-to-r from-accent via-accent to-accent/80 hover:from-accent/90 hover:via-accent hover:to-accent/70 gap-2 shadow-lg hover:shadow-accent/50 text-accent-foreground font-semibold transition-all duration-300"
                >
                  <Eye className="w-5 h-5" />
                  {t.seo.altImage.banner.optimizeAll} ({imagesNotOptimized})
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Clickable Filter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className="p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={() => {
            setActiveTab('needs-alt');
            toast.info(tf('seo.altImage.toasts.displayNotOptimized', { count: imagesNotOptimized }));
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                {t.seo.altImage.cards.notOptimized}
              </p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{imagesNotOptimized}</p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                {t.seo.altImage.cards.noOptimization}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">{t.seo.altImage.cards.clickToView}</p>
        </Card>

        <Card
          className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={() => {
            setActiveTab('has-alt');
            toast.info(tf('seo.altImage.toasts.displayOptimized', { count: imagesOptimizedByAI }));
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                {t.seo.altImage.cards.aiGenerated}
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{imagesOptimizedByAI}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {t.seo.altImage.cards.aiOptimized}
              </p>
            </div>
            <Sparkles className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 mt-2">{t.seo.altImage.cards.clickToView}</p>
        </Card>

        <Card
          className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={() => {
            setActiveTab('to-sync');
            toast.info(tf('seo.altImage.toasts.displayToSync', { count: imagesToSync }));
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {t.seo.altImage.cards.toSync}
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{imagesToSync}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {t.seo.altImage.cards.aiOnly}
              </p>
            </div>
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">{t.seo.altImage.cards.clickToView}</p>
        </Card>

        <Card
          className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950 border-teal-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={() => {
            setActiveTab('all');
            toast.info(tf('seo.altImage.toasts.displaySynced', { count: imagesSynced }));
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-teal-700 dark:text-teal-300">
                {t.seo.altImage.cards.synced}
              </p>
              <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">{imagesSynced}</p>
              <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                {t.seo.altImage.cards.onShopify}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-teal-600" />
          </div>
          <p className="text-xs text-teal-700 dark:text-teal-300 mt-2">{t.seo.altImage.cards.clickToView}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="bg-background border rounded-lg p-1 flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              goToPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
            <Badge variant={activeTab === tab.id ? 'secondary' : 'outline'}>
              {tab.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Checkbox 
              checked={selectedImages.size === sortedImages.length && sortedImages.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              {selectedImages.size > 0 ? (
                <span className="text-primary">{tf('seo.altImage.actions.imagesSelected', { count: selectedImages.size })}</span>
              ) : (
                <span className="text-muted-foreground">{t.seo.altImage.actions.selectAll}</span>
              )}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => handleGenerateForSelected(false)}
              disabled={selectedImages.size === 0 || generating}
              size="sm"
            >
              <Sparkles className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t.seo.altImage.actions.generateAlt}</span>
            </Button>
            <Button
              onClick={() => handleGenerateForSelected(true)}
              disabled={selectedImages.size === 0 || generating}
              variant="outline"
              size="sm"
            >
              <Eye className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t.seo.altImage.actions.visionAI}</span>
            </Button>
            <Button
              onClick={handleSyncSelected}
              disabled={selectedImages.size === 0 || syncing}
              variant="outline"
              size="sm"
            >
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t.seo.altImage.actions.synchronize}</span>
            </Button>
            <Button
              onClick={handleImportContentImages}
              disabled={importing}
              variant="outline"
              size="sm"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <ImageIcon className="w-4 h-4 sm:mr-2" />}
              <span className="hidden sm:inline">{t.seo.altImage.actions.import}</span>
            </Button>
            <Button
              onClick={fetchImages}
              disabled={loading}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Content Type Filters */}
      <div className="bg-background border rounded-lg p-1 flex flex-wrap gap-1">
        {[
          { id: 'all' as const, label: t.seo.altImage.filters.all, icon: Search },
          { id: 'products' as const, label: t.seo.altImage.filters.products, icon: ShoppingBag },
          { id: 'collections' as const, label: t.seo.altImage.filters.collections, icon: Package },
          { id: 'pages' as const, label: t.seo.altImage.filters.pages, icon: FileText },
          { id: 'articles' as const, label: t.seo.altImage.filters.articles, icon: PenSquare },
          { id: 'homepage' as const, label: t.seo.altImage.filters.homepage, icon: ImageIcon },
        ].map((filter) => {
          const Icon = filter.icon;
          return (
            <button
              key={filter.id}
              onClick={() => {
                setContentTypeFilter(filter.id);
                goToPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                contentTypeFilter === filter.id
                  ? 'bg-secondary text-secondary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-4 h-4" />
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t.seo.altImage.table.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
            <SelectTrigger className="min-w-[150px]">
              <SelectValue placeholder={t.seo.altImage.table.status} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.seo.altImage.table.allStatus}</SelectItem>
              <SelectItem value="optimized">{t.seo.altImage.table.optimized}</SelectItem>
              <SelectItem value="not-optimized">{t.seo.altImage.table.notOptimized}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={syncFilter} onValueChange={(value: SyncFilter) => setSyncFilter(value)}>
            <SelectTrigger className="min-w-[150px]">
              <SelectValue placeholder="Sync" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.seo.altImage.table.allSync}</SelectItem>
              <SelectItem value="synced">{t.seo.altImage.table.synced}</SelectItem>
              <SelectItem value="not-synced">{t.seo.altImage.table.notSynced}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={qualityFilter} onValueChange={(value: any) => setQualityFilter(value as QualityFilter)}>
            <SelectTrigger className="min-w-[150px]">
              <SelectValue placeholder="SEO Quality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.seo.altImage.table.allQualities}</SelectItem>
              <SelectItem value="excellent">{t.seo.altImage.table.excellent}</SelectItem>
              <SelectItem value="good">{t.seo.altImage.table.good}</SelectItem>
              <SelectItem value="medium">{t.seo.altImage.table.medium}</SelectItem>
              <SelectItem value="poor">{t.seo.altImage.table.poor}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={fetchImages}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      {(generating || syncing) && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">
              {generating ? t.seo.altImage.progress.generating : t.seo.altImage.progress.syncing}
            </span>
            <span className="text-sm text-muted-foreground">
              {progress.current} / {progress.total}
            </span>
          </div>
          <Progress value={(progress.current / progress.total) * 100} className="h-2" />
        </Card>
      )}

      {/* Images Grid/List */}
      {viewMode === 'grid' ? (
        <div className="space-y-6">
          {/* Group images by product */}
          {(() => {
            const groupedImages = new Map<string, ImageWithProduct[]>();
            paginatedImages.forEach(img => {
              const productId = img.product.id;
              if (!groupedImages.has(productId)) {
                groupedImages.set(productId, []);
              }
              groupedImages.get(productId)!.push(img);
            });

            return Array.from(groupedImages.entries()).map(([productId, productImages]) => (
              <Card key={productId} className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{productImages[0].product.title}</h3>
                    {productImages[0].product.vendor && (
                      <p className="text-sm text-muted-foreground">{productImages[0].product.vendor}</p>
                    )}
                  </div>
                  <Badge variant="outline">{productImages.length} image{productImages.length > 1 ? 's' : ''}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {productImages.map((img) => (
                    <div key={img.id} className="overflow-hidden hover:shadow-md transition group rounded-lg border">
                      <div className="aspect-square bg-muted relative">
                        <img 
                          src={img.src} 
                          alt={img.alt_text || ''} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        <div className="absolute top-2 left-2">
                          <input
                            type="checkbox"
                            checked={selectedImages.has(img.id)}
                            onChange={() => handleSelectImage(img.id)}
                            className="w-5 h-5 rounded shadow-lg"
                          />
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        {img.alt_text ? (
                          <>
                            <div className="text-xs text-muted-foreground line-clamp-2">{img.alt_text}</div>
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <CheckCircle className="w-3 h-3" />
                              {t.seo.altImage.table.altOk}
                            </Badge>
                          </>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Clock className="w-3 h-3" />
                            {t.seo.altImage.table.noAlt}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setSelectedImageForOptimize(img);
                            setShowOptimizeDialog(true);
                          }}
                          disabled={generating}
                          title="Optimiser avec Vision AI"
                          className="w-full bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary shadow-lg hover:shadow-primary/50 text-primary-foreground font-semibold transition-all duration-300"
                        >
                          <Sparkles className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ));
          })()}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedImages.size === sortedImages.length && sortedImages.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold">{t.seo.altImage.table.image}</th>
                <th className="px-4 py-3 text-left font-semibold">{t.seo.altImage.table.product}</th>
                <th className="px-4 py-3 text-left font-semibold">{t.seo.altImage.table.altText}</th>
                <th className="px-4 py-3 text-left font-semibold">
                  <button
                    onClick={handleSeoScoreSortToggle}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    {t.seo.altImage.table.status}
                    {seoScoreSort === 'none' && <ArrowUpDown className="w-4 h-4" />}
                    {seoScoreSort === 'asc' && <ArrowUp className="w-4 h-4" />}
                    {seoScoreSort === 'desc' && <ArrowDown className="w-4 h-4" />}
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-semibold">{t.seo.altImage.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedImages.map((img) => (
                <tr key={img.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedImages.has(img.id)}
                      onChange={() => handleSelectImage(img.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <img src={img.src} alt={img.alt_text || ''} className="w-16 h-16 object-cover rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{img.product.title}</div>
                    <div className="text-xs text-muted-foreground">{t.seo.altImage.table.position}: {img.position}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-md line-clamp-2">{img.alt_text || '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    {img.alt_text ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {t.seo.altImage.table.altOk}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="w-3 h-3" />
                        {t.seo.altImage.table.noAlt}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => {
                        setSelectedImageForOptimize(img);
                        setShowOptimizeDialog(true);
                      }}
                      disabled={generating}
                      title="Optimiser avec Vision AI"
                      className="bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary shadow-lg hover:shadow-primary/50 text-primary-foreground font-semibold transition-all duration-300"
                    >
                      <Sparkles className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm text-muted-foreground">
            {t.seo.altImage.pagination.page} {currentPage} {t.seo.altImage.pagination.of} {totalPages} ({sortedImages.length} {t.seo.altImage.pagination.imagesTotal})
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={previousPage}
              disabled={!hasPreviousPage}
            >
              {t.seo.altImage.pagination.previous}
            </Button>
            <span className="text-sm">
              {t.seo.altImage.pagination.page} {currentPage} {t.seo.altImage.pagination.of} {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={!hasNextPage}
            >
              {t.seo.altImage.pagination.next}
            </Button>
          </div>
        </div>
      )}

      {/* Single Image Optimize Dialog */}
      <Dialog open={showOptimizeDialog} onOpenChange={setShowOptimizeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t.seo.altImage.dialog.title}
            </DialogTitle>
            <DialogDescription>
              {t.seo.altImage.dialog.description}
            </DialogDescription>
          </DialogHeader>
          
          {selectedImageForOptimize && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden border">
                  <img 
                    src={selectedImageForOptimize.src} 
                    alt={selectedImageForOptimize.alt_text || ''} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">
                    {selectedImageForOptimize.product.title}
                  </h3>
                  {selectedImageForOptimize.product.vendor && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {selectedImageForOptimize.product.vendor}
                    </p>
                  )}
                  {selectedImageForOptimize.alt_text && (
                    <div className="mt-3">
                      <Badge variant="secondary" className="gap-1 mb-2">
                        <CheckCircle className="w-3 h-3" />
                        {t.seo.altImage.dialog.currentAlt}
                      </Badge>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">
                        {selectedImageForOptimize.alt_text}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowOptimizeDialog(false)}
                  disabled={generating}
                >
                  {t.seo.altImage.dialog.cancel}
                </Button>
                <Button
                  onClick={async () => {
                    if (!canDoAction('optimizations')) {
                      toast.error(t.seo.altImage.dialog.limitReached);
                      setShowUpgradeDialog(true);
                      setShowOptimizeDialog(false);
                      return;
                    }
                    setShowOptimizeDialog(false);
                    await handleOptimizeImage(selectedImageForOptimize.id, true);
                  }}
                  disabled={generating}
                  className="gap-2 bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary shadow-lg hover:shadow-primary/50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t.seo.altImage.dialog.optimizing}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {t.seo.altImage.dialog.optimize}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Optimization Progress Dialog */}
      <ProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        type="alt"
        operation={generating ? 'optimizing' : 'syncing'}
        current={progress.current}
        total={progress.total}
      />

      {/* Results Dialog */}
      <ResultsDialog
        open={showResultsDialog}
        onOpenChange={setShowResultsDialog}
        type="alt"
        items={optimizedImages.map(img => ({
          id: img.id,
          title: img.product.title,
          alt_text: img.alt_text || '',
          image_url: img.src
        }))}
        onSyncClick={() => {
          setShowResultsDialog(false);
          handleSyncSelected();
        }}
        onClose={handleCloseResultsDialog}
      />

      {/* Upgrade Dialogs */}
      <TrialLimitDialog
        open={showUpgradeDialog && (limits?.shouldForcePayment || limits?.limitReached?.optimizations)}
        onOpenChange={setShowUpgradeDialog}
        limitType="optimizations"
        currentUsage={limits?.usage.optimizations_count || 0}
        maxUsage={limits?.limits.max_optimizations || 100}
        trialMaxUsage={limits?.isTrialing ? limits?.limits.max_optimizations : undefined}
      />
      
      <UpgradeDialog
        open={showUpgradeDialog && limits?.shouldForcePayment !== true}
        onOpenChange={setShowUpgradeDialog}
        limitType="optimizations"
      />
    </div>
  );
});

SeoAltImage.displayName = 'SeoAltImage';