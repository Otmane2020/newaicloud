import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/language';
import { useStore } from '@/contexts/StoreContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { usePaginatedSeo } from '@/hooks/usePaginatedSeo';
import { 
  ProgressDialog, 
  ResultsDialog, 
  SyncConfirmationDialog, 
  SuccessDialog,
  WorkflowItem 
} from './SeoWorkflowDialogs';
import { TrialLimitDialog } from '@/components/TrialLimitDialog';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { calculateTagsScore } from '@/lib/seoQuality';
import { 
  Search, 
  RefreshCw, 
  Tags, 
  Plus, 
  X, 
  Loader2, 
  Target, 
  TrendingUp,
  Sparkles,
  ArrowRight,
  Hash,
  CheckCircle,
  Grid3x3,
  List,
  Upload,
  Filter,
  Clock
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

interface Product {
  id: string;
  title: string;
  tags: string | null;
  vendor: string;
  category: string;
  product_type: string;
  image_url: string;
  seo_synced_to_shopify: boolean;
  optimization_count: number;
}

type FilterType = 'all' | 'to_optimize' | 'tagged' | 'to_sync' | 'synced';
type StatusFilter = 'all' | 'optimized' | 'not-optimized';
type SyncFilter = 'all' | 'synced' | 'not-synced';
type QualityFilter = 'all' | 'excellent' | 'good' | 'medium' | 'poor';

export function TagOptimization() {
  const { t, tf } = useTranslation();
  const { selectedStore } = useStore();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editTags, setEditTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [syncFilter, setSyncFilter] = useState<SyncFilter>('all');
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>(
    (searchParams.get("filter") as QualityFilter) || "all"
  );
  
  // Workflow states
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<'optimizing' | 'syncing'>('optimizing');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [optimizedItems, setOptimizedItems] = useState<WorkflowItem[]>([]);
  const [itemsToSync, setItemsToSync] = useState<WorkflowItem[]>([]);
  
  const { limits, loading: limitsLoading, canDoAction, refresh: refreshLimits } = useUsageLimits();

  const fetchProducts = async () => {
    if (!selectedStore?.id) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // ✅ PAGINATION CÔTÉ SERVEUR pour récupérer TOUS les produits
      let allProducts: any[] = [];
      let hasMore = true;
      let page = 0;
      const PAGE_SIZE = 1000;

      console.log('🔄 [TAGS] Starting paginated fetch...');

      while (hasMore) {
        const start = page * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;
        
        console.log(`📄 [TAGS] Fetching page ${page + 1} (${start}-${end})...`);
        
        const { data: pageData, error: pageError } = await supabase
          .from('shopify_products')
          .select('id, title, tags, vendor, category, product_type, image_url, seo_synced_to_shopify, optimization_count')
          .eq('store_id', selectedStore.id)
          .range(start, end)
          .order('title', { ascending: true });
        
        if (pageError) throw pageError;
        
        if (pageData && pageData.length > 0) {
          console.log(`✅ [TAGS] Page ${page + 1} loaded: ${pageData.length} products`);
          allProducts = [...allProducts, ...pageData];
          
          if (pageData.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      console.log('✅ [TAGS] Total products fetched:', allProducts.length);
      setProducts(allProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error(t.seo.tags.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedStore) {
        setLoading(true);
        fetchProducts();
      } else {
        setProducts([]);
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [selectedStore?.id]);

  // Réagir aux changements de filtre dans l'URL
  useEffect(() => {
    const filterParam = searchParams.get("filter") as QualityFilter;
    if (filterParam && ['all', 'excellent', 'good', 'medium', 'poor'].includes(filterParam)) {
      setQualityFilter(filterParam);
    }
  }, [searchParams]);

  // Get unique categories
  const uniqueCategories = Array.from(new Set(products.map(p => p.product_type).filter(Boolean))).sort();

  // Filtered products logic
  const filteredProducts = products.filter((product) => {
    if (filter === 'to_optimize' && product.optimization_count && product.optimization_count > 0) return false;
    if (filter === 'tagged' && (!product.optimization_count || product.optimization_count === 0)) return false;
    if (filter === 'to_sync' && (product.seo_synced_to_shopify || (!product.optimization_count || product.optimization_count === 0))) return false;
    if (filter === 'synced' && !product.seo_synced_to_shopify) return false;

    // Status filter
    if (statusFilter === 'optimized' && (!product.optimization_count || product.optimization_count === 0)) return false;
    if (statusFilter === 'not-optimized' && product.optimization_count && product.optimization_count > 0) return false;

    // Sync filter
    if (syncFilter === 'synced' && !product.seo_synced_to_shopify) return false;
    if (syncFilter === 'not-synced' && product.seo_synced_to_shopify) return false;

    // Quality filter (for tags: max is 20 points)
    if (qualityFilter !== 'all') {
      const calculateTagsScore = (tags: string | null): number => {
        if (!tags || tags.trim().length === 0) return 0;
        const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
        let score = 0;
        if (tagArray.length > 0) score += 5;
        if (tagArray.length >= 3 && tagArray.length <= 10) {
          score += 10;
        } else if (tagArray.length > 0) {
          score += 5;
        }
        const qualityTags = tagArray.filter(t => t.length > 3);
        if (qualityTags.length >= tagArray.length * 0.7) {
          score += 5;
        }
        return Math.min(score, 20);
      };

      const score = calculateTagsScore(product.tags);

      if (qualityFilter === 'excellent' && score < 16) return false;
      if (qualityFilter === 'good' && (score < 12 || score >= 16)) return false;
      if (qualityFilter === 'medium' && (score < 8 || score >= 12)) return false;
      if (qualityFilter === 'poor' && score >= 8) return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && product.product_type !== selectedCategory) return false;

    // Search filter (only by title now)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return product.title?.toLowerCase().includes(term);
    }

    return true;
  });

  // Batch pagination
  const {
    paginatedItems: paginatedProducts,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage,
    hasPreviousPage
  } = usePaginatedSeo({
    items: filteredProducts,
    itemsPerPage: 50,
    cacheKey: 'tags-pagination'
  });

  // Statistics - based on optimization_count
  const productsNotOptimized = products.filter(p => !p.optimization_count || p.optimization_count === 0).length;
  const productsOptimized = products.filter(p => p.optimization_count && p.optimization_count > 0).length;
  const productsToSyncCount = products.filter(p => p.optimization_count && p.optimization_count > 0 && !p.seo_synced_to_shopify).length;
  const productsSynced = products.filter(p => p.seo_synced_to_shopify).length;
  
  // Calculate tag SEO score based on real quality of tags
  const tagSeoScore = products.length > 0 
    ? Math.round(
        (products.reduce((sum, p) => {
          const score = calculateTagsScore(p.tags);
          // Debug first few products
          if (products.indexOf(p) < 3) {
            console.log('🏷️ [TAG DEBUG]', {
              productId: p.id,
              title: p.title,
              tags: p.tags,
              calculatedScore: score
            });
          }
          return sum + score;
        }, 0) / products.length) * 5 // Multiply by 5 INSIDE Math.round() for consistency with Dashboard
      )
    : 0;
  
  console.log('🎯 [TAG SEO SCORE]', {
    totalProducts: products.length,
    finalScore: tagSeoScore,
    productsWithTags: products.filter(p => p.tags && p.tags.trim().length > 0).length
  });

  const filters = [
    { id: 'all' as FilterType, label: t.seo.tags.filters.all, count: products.length },
    { id: 'to_optimize' as FilterType, label: t.seo.tags.filters.toOptimize, count: productsNotOptimized },
    { id: 'tagged' as FilterType, label: t.seo.tags.filters.optimized, count: productsOptimized },
    { id: 'to_sync' as FilterType, label: t.seo.tags.filters.toSync, count: productsToSyncCount },
    { id: 'synced' as FilterType, label: t.seo.tags.filters.synced, count: productsSynced },
  ];

  // Clickable stats handlers
  const handleToOptimizeClick = () => {
    setFilter('to_optimize');
    toast.info(tf('seo.tags.showing', { count: productsNotOptimized }));
  };

  const handleOptimizedClick = () => {
    setFilter('tagged');
    toast.info(tf('seo.tags.messages.showingOptimized', { count: productsOptimized }));
  };

  const handleToSyncClick = () => {
    setFilter('to_sync');
    toast.info(`Showing ${productsToSyncCount} products to synchronize`);
  };

  const handleSyncedClick = () => {
    setFilter('synced');
    toast.info(`Showing ${productsSynced} synchronized products`);
  };

  const handleGenerateAll = () => {
    if (productsNotOptimized === 0) {
      toast.info(t.seo.tags.allOptimized);
      return;
    }
    setFilter('to_optimize');
    setTimeout(() => {
      handleGenerateAllTags();
    }, 100);
  };

  const handleGenerateAllTags = async () => {
    const productsToGenerate = products.filter(p => !p.optimization_count || p.optimization_count === 0);
    if (productsToGenerate.length === 0) {
      toast.info(t.seo.tags.allOptimized);
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

    await handleBulkGenerate(productsToGenerate.map(p => p.id));
  };

  const handleEditTags = (productId: string, currentTags: string) => {
    setEditingProduct(productId);
    setEditTags(currentTags || '');
  };

  const handleSaveTags = async (productId: string) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('shopify_products')
        .update({ tags: editTags })
        .eq('id', productId);

      if (error) throw error;

      toast.success('Tags updated successfully');
      setEditingProduct(null);
      setEditTags('');
      await fetchProducts();
    } catch (error) {
      console.error('Error saving tags:', error);
      toast.error('Failed to save tags');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditTags('');
  };

  const handleOptimizeProduct = async (productId: string) => {
    // Check limits before optimizing
    if (!canDoAction('optimizations')) {
      toast.error('Limite d\'optimisations atteinte');
      setShowUpgradeDialog(true);
      return;
    }

    try {
      setOptimizing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-tags`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, force: false }),
      });

      const result = await response.json();
      
      // Check for 403 error (limit reached)
      if (response.status === 403 || result.error === 'limite_optimisations_atteinte') {
        toast.error('Limite d\'optimisations atteinte', {
          description: result.message || 'Passez à un plan supérieur pour continuer.'
        });
        setShowUpgradeDialog(true);
        await refreshLimits();
        return;
      }

      if (response.ok && result.success) {
        toast.success(t.seo.tags.messages.tagsOptimizedSuccess);
        await fetchProducts();
        await refreshLimits();
      } else {
        throw new Error(result.error || 'Failed to generate tags');
      }
    } catch (error: any) {
      console.error('Error optimizing tags:', error);
      toast.error(error.message || 'Erreur lors de l\'optimisation');
    } finally {
      setOptimizing(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleGenerateSelected = async (force = false, productIds?: string[]) => {
    // Use provided productIds or fall back to selectedProducts
    const idsToUse = productIds ? new Set(productIds) : selectedProducts;

    if (idsToUse.size === 0) {
      toast.info(t.seo.tags.noSelected);
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

    const allSelectedProducts = Array.from(idsToUse);
    const productsWithTags = allSelectedProducts.filter(id => 
      products.find(p => p.id === id)?.tags
    );
    const productsWithoutTags = allSelectedProducts.filter(id => 
      !products.find(p => p.id === id)?.tags
    );

    // Check for products already optimized in trial
    if (!force && limits?.isTrialing) {
      const alreadyOptimized = allSelectedProducts.filter(id => {
        const product = products.find(p => p.id === id);
        return product && (product.optimization_count || 0) >= 1;
      });

      if (alreadyOptimized.length > 0) {
        const s = alreadyOptimized.length > 1 ? 's' : '';
        const ont = alreadyOptimized.length > 1 ? 'ont' : 'a';
        toast.info(
          tf('seo.tags.alreadyOptimized', { count: alreadyOptimized.length, s, ont }),
          {
            description: t.seo.tags.trialCanRegenerate,
            action: {
              label: t.seo.tags.regenerate,
              onClick: () => handleGenerateSelected(true)
            }
          }
        );
        return;
      }
    }

    // Si force n'est pas activé et que tous les produits ont déjà des tags
    if (!force && productsWithTags.length > 0 && productsWithoutTags.length === 0) {
      const s = productsWithTags.length > 1 ? 's' : '';
      const ont = productsWithTags.length > 1 ? 'ont' : 'a';
      toast.info(
        tf('seo.tags.haveTags', { count: productsWithTags.length, s, ont }),
        {
          description: t.seo.tags.wantRegenerate,
          action: {
            label: t.seo.tags.regenerate,
            onClick: () => handleGenerateSelected(true)
          }
        }
      );
      return;
    }

    await handleBulkGenerate(force ? allSelectedProducts : productsWithoutTags, force);
  };

  const handleBulkGenerate = async (productIds: string[], force = false) => {
    setShowProgressDialog(true);
    setCurrentOperation('optimizing');
    setProgress({ current: 0, total: productIds.length });

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const generatedItems: WorkflowItem[] = [];

    for (let i = 0; i < productIds.length; i++) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No active session');
        }

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-tags`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId: productIds[i], force }),
        });

        const result = await response.json();
        
        // Check for 403 error (limit reached)
        if (response.status === 403 || result.error === 'limite_optimisations_atteinte') {
          toast.error('Limite d\'optimisations atteinte', {
            description: result.message || 'Passez à un plan supérieur pour continuer.'
          });
          setShowProgressDialog(false);
          setShowUpgradeDialog(true);
          await fetchProducts();
          return;
        }
        
        if (response.ok && result.success) {
          if (result.skipped) {
            skipCount++;
          } else {
            successCount++;
            const product = products.find(p => p.id === productIds[i]);
            if (product) {
              generatedItems.push({
                id: product.id,
                title: product.title,
                tags: product.tags || '',
                image_url: product.image_url
              });
            }
          }
        } else {
          console.error(`Error for product ${productIds[i]}:`, result);
          errorCount++;
        }
      } catch (error) {
        console.error('Error generating tags:', error);
        errorCount++;
      }
      setProgress({ current: i + 1, total: productIds.length });
    }

    await fetchProducts();
    
    const updatedProducts = await Promise.all(
      productIds.map(async (id) => {
        const { data } = await supabase
          .from('shopify_products')
          .select('id, title, tags, image_url')
          .eq('id', id)
          .single();
        return data;
      })
    );

    setOptimizedItems(updatedProducts.filter(Boolean).map(p => ({
      id: p!.id,
      title: p!.title,
      tags: p!.tags || '',
      image_url: p!.image_url
    })));
    setShowProgressDialog(false);
    setShowResultsDialog(true);
  };

  const handleSyncAll = async () => {
    const productsToSync = products.filter(p => p.tags && !p.seo_synced_to_shopify);
    if (productsToSync.length === 0) {
      toast.info(t.seo.tags.allSynced);
      return;
    }
    await handleBulkSync(productsToSync.map(p => p.id));
  };

  const handleSyncSelected = async () => {
    const productsToSync = Array.from(selectedProducts).filter(id => {
      const product = products.find(p => p.id === id);
      return product && product.tags && !product.seo_synced_to_shopify;
    });
    if (productsToSync.length === 0) {
      toast.info(t.seo.tags.noToSync);
      return;
    }
    await handleBulkSync(productsToSync);
  };

  const handleBulkSync = async (productIds: string[]) => {
    setShowResultsDialog(false);
    setShowSyncDialog(false);
    setShowProgressDialog(true);
    setCurrentOperation('syncing');
    setProgress({ current: 0, total: productIds.length });

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < productIds.length; i++) {
      try {
        const { data: authData } = await supabase.auth.getSession();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-seo-to-shopify`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authData.session?.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              productId: productIds[i], 
              syncTags: true,
              syncGoogleShopping: true,
              force: true // Allow immediate sync after tag generation
            }),
          }
        );

        if (response.ok) {
          successCount++;
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          errorCount++;
          errors.push(`Product ${i + 1}: ${errorData.error || 'Unknown error'}`);
          console.error(`Sync error for product ${productIds[i]}:`, errorData);
        }
      } catch (error) {
        console.error('Error syncing:', error);
        errorCount++;
        errors.push(`Product ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      setProgress({ current: i + 1, total: productIds.length });
    }

    setShowProgressDialog(false);
    setShowSuccessDialog(true);
    setSelectedProducts(new Set());
    
    if (errorCount > 0) {
      console.error('Sync errors:', errors);
    }
    
    await fetchProducts();
  };

  const handleCloseProgressDialog = () => {
    setShowProgressDialog(false);
    setSelectedProducts(new Set());
  };

  const handleCloseResultsDialog = () => {
    setShowResultsDialog(false);
    setOptimizedItems([]);
    setSelectedProducts(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <Card className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950 border-2 border-orange-200 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Tags className="w-6 h-6 text-orange-600" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Tag Optimization
              </h1>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Organize your products with relevant tags. Improve discoverability and increase conversions by 30%.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-orange-600" />
                <span className="font-medium">Optimal organization</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-medium">+30% discoverability</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Hash className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Smart tags</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 items-center">
            <div className="text-center">
              <div className={`text-3xl md:text-4xl font-bold ${
                tagSeoScore >= 80 ? 'text-green-600' : 
                tagSeoScore >= 60 ? 'text-orange-600' : 
                'text-red-600'
              }`}>
                {tagSeoScore}/100
              </div>
              <div className="text-sm text-muted-foreground">SEO Score</div>
            </div>
            <Button
              size="lg"
              onClick={handleGenerateAll}
              disabled={showProgressDialog || productsNotOptimized === 0}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 gap-2 shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              Start Optimization
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Clickable Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleToOptimizeClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">{t.seo.tags.status.notOptimized}</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{productsNotOptimized}</p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                {t.seo.tags.stats.toOptimize}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">{t.seo.altImage.stats.clickToView}</p>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleOptimizedClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">{t.seo.tags.status.optimized}</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{productsOptimized}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {t.seo.tags.stats.byAI}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 mt-2">{t.seo.altImage.stats.clickToView}</p>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleToSyncClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">To Synchronize</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{productsToSyncCount}</p>
            </div>
            <Clock className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">Click to view</p>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleSyncedClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Synchronized</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{productsSynced}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Synced to Shopify
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">Click to view</p>
        </Card>
      </div>

      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Selection Counter */}
          <div className="flex items-center gap-3">
            <Checkbox 
              checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              {selectedProducts.size > 0 ? (
                <span className="text-primary">{selectedProducts.size} produit(s) sélectionné(s)</span>
              ) : (
                <span className="text-muted-foreground">Sélectionner tout</span>
              )}
            </span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => handleGenerateSelected()}
              disabled={selectedProducts.size === 0 || showProgressDialog}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <Sparkles className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Générer Tags</span>
            </Button>
            <Button
              onClick={handleGenerateAllTags}
              disabled={showProgressDialog || productsNotOptimized === 0}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <Sparkles className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Générer tout</span>
            </Button>
            <Button
              onClick={handleSyncSelected}
              disabled={selectedProducts.size === 0}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Synchroniser</span>
            </Button>
            <Button
              onClick={handleSyncAll}
              disabled={productsToSyncCount === 0}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Synchroniser tout</span>
            </Button>
            <Button
              onClick={fetchProducts}
              disabled={loading}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {/* Large Search Bar and Category Filter */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search products by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-12 px-4 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[200px]"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
              <SelectTrigger className="h-12 min-w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="optimized">Optimized</SelectItem>
                <SelectItem value="not-optimized">Not Optimized</SelectItem>
              </SelectContent>
            </Select>

            <Select value={syncFilter} onValueChange={(value: SyncFilter) => setSyncFilter(value)}>
              <SelectTrigger className="h-12 min-w-[180px]">
                <SelectValue placeholder="Sync" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sync</SelectItem>
                <SelectItem value="synced">Synced</SelectItem>
                <SelectItem value="not-synced">Not Synced</SelectItem>
              </SelectContent>
            </Select>

            <Select value={qualityFilter} onValueChange={(value: any) => setQualityFilter(value as QualityFilter)}>
              <SelectTrigger className="h-12 min-w-[180px]">
                <SelectValue placeholder="SEO Quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Qualities</SelectItem>
                <SelectItem value="excellent">Excellent (≥16)</SelectItem>
                <SelectItem value="good">Good (12-15)</SelectItem>
                <SelectItem value="medium">Medium (8-11)</SelectItem>
                <SelectItem value="poor">Poor (&lt;8)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="flex items-center gap-2"
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
                <span className="hidden sm:inline">{viewMode === 'grid' ? 'List' : 'Grid'}</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="lg:hidden flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </Button>
            </div>

            {/* Bulk Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAll}
                disabled={showProgressDialog || productsNotOptimized === 0}
                className="flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Optimize All</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateSelected(false)}
                disabled={showProgressDialog || selectedProducts.size === 0}
                className="flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Optimize ({selectedProducts.size})</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncSelected}
                disabled={showProgressDialog || selectedProducts.size === 0}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Sync ({selectedProducts.size})</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncAll}
                disabled={showProgressDialog || productsToSyncCount === 0}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Sync All</span>
              </Button>
              
              <Button variant="outline" size="icon" onClick={fetchProducts}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Filters */}
        {showMobileFilters && (
          <div className="lg:hidden mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 gap-2">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex items-center justify-between p-3 rounded-md text-sm font-medium transition ${
                    filter === f.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {f.label}
                  <Badge variant={filter === f.id ? 'secondary' : 'outline'}>
                    {f.count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Desktop Filters */}
      <div className="hidden lg:flex bg-background border rounded-lg p-1 gap-1">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition flex-1 justify-center ${
              filter === f.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {f.label}
            <Badge variant={filter === f.id ? 'secondary' : 'outline'}>
              {f.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Progress Indicator */}
      {showProgressDialog && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">
              {currentOperation === 'optimizing' ? 'Generating tags...' : 'Synchronizing...'}
            </span>
            <span className="text-sm text-muted-foreground">
              {progress.current} / {progress.total}
            </span>
          </div>
          <Progress value={(progress.current / progress.total) * 100} className="h-2" />
        </Card>
      )}

      {/* Products Display */}
      {viewMode === 'list' ? (
        <div className="max-h-[600px] overflow-y-auto space-y-2">
          {paginatedProducts.map((product) => (
            <Card key={product.id} className="p-4">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedProducts.has(product.id)}
                  onCheckedChange={() => handleSelectProduct(product.id)}
                />
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{product.title}</h3>
                    {(() => {
                      const isOptimized = product.optimization_count && product.optimization_count > 0;
                      const hasTags = product.tags && product.tags.trim().length > 0;
                      
                      if (isOptimized) {
                        return (
                          <Badge className="bg-green-500 text-white text-xs">
                            {t.seo.tags.status.optimized}
                          </Badge>
                        );
                      } else if (!hasTags) {
                        return (
                          <Badge className="bg-red-500 text-white text-xs">
                            {t.seo.tags.status.pending}
                          </Badge>
                        );
                      } else {
                        return (
                          <Badge className="bg-orange-500 text-white text-xs">
                            {t.seo.tags.status.pending}
                          </Badge>
                        );
                      }
                    })()}
                  </div>
                  <p className="text-sm text-muted-foreground">{product.vendor}</p>
                   {product.tags ? (
                    editingProduct === product.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          value={editTags}
                          onChange={(e) => setEditTags(e.target.value)}
                          className="flex-1"
                          placeholder="Enter tags..."
                        />
                        <Button size="sm" onClick={() => handleSaveTags(product.id)} disabled={saving}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            let tagArray: string[] = [];
                            try {
                              tagArray = JSON.parse(product.tags);
                            } catch {
                              tagArray = product.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
                            }
                            return (
                              <>
                                {tagArray.slice(0, 5).map((tag, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {tagArray.length > 5 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{tagArray.length - 5}
                                  </Badge>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditTags(product.id, product.tags || '')}
                        >
                          Edit
                        </Button>
                      </div>
                    )
                  ) : (
                    <Badge variant="outline" className="mt-2">No tags</Badge>
                  )}
                 </div>
                 <div className="flex items-center gap-2">
                   <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                          <Button
                             size="sm"
                             variant="default"
                             onClick={() => {
                               if (!canDoAction('optimizations')) {
                                 toast.error("Limite d'optimisations atteinte");
                                 setShowUpgradeDialog(true);
                                 return;
                               }
                               // Optimiser directement ce produit
                               handleGenerateSelected(false, [product.id]);
                             }}
                            disabled={optimizing}
                            className="bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary shadow-lg hover:shadow-primary/50 text-primary-foreground font-semibold transition-all duration-300"
                          >
                           <Sparkles className="w-4 h-4" />
                         </Button>
                       </TooltipTrigger>
                       <TooltipContent>
                         <p>Optimiser les tags</p>
                       </TooltipContent>
                     </Tooltip>
                   </TooltipProvider>
                   {product.seo_synced_to_shopify && (
                     <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                       <CheckCircle className="w-3 h-3 mr-1" />
                       Synced
                     </Badge>
                   )}
                 </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <div className="aspect-square bg-muted relative">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Hash className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Checkbox
                    checked={selectedProducts.has(product.id)}
                    onCheckedChange={() => handleSelectProduct(product.id)}
                    className="bg-background shadow-lg"
                  />
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold line-clamp-2">{product.title}</h3>
                    {(() => {
                      const isOptimized = product.optimization_count && product.optimization_count > 0;
                      const hasTags = product.tags && product.tags.trim().length > 0;
                      
                      if (isOptimized) {
                        return (
                          <Badge className="bg-green-500 text-white text-xs">
                            {t.seo.tags.status.optimized}
                          </Badge>
                        );
                      } else if (!hasTags) {
                        return (
                          <Badge className="bg-red-500 text-white text-xs">
                            {t.seo.tags.status.pending}
                          </Badge>
                        );
                      } else {
                        return (
                          <Badge className="bg-orange-500 text-white text-xs">
                            {t.seo.tags.status.pending}
                          </Badge>
                        );
                      }
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground">{product.vendor}</p>
                </div>
                {product.tags ? (
                  editingProduct === product.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        placeholder="Enter tags..."
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveTags(product.id)} disabled={saving}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          let tagArray: string[] = [];
                          try {
                            tagArray = JSON.parse(product.tags);
                          } catch {
                            tagArray = product.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
                          }
                          return (
                            <>
                              {tagArray.slice(0, 5).map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {tagArray.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{tagArray.length - 5}
                                </Badge>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTags(product.id, product.tags || '')}
                        className="w-full"
                      >
                        Edit Tags
                      </Button>
                    </div>
                  )
                ) : (
                  <Badge variant="outline">No tags</Badge>
                )}
                {product.seo_synced_to_shopify && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 w-full justify-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Synced
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {filteredProducts.length === 0 && (
        <Card className="p-12 text-center">
          <Hash className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search term</p>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center py-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={previousPage}
                  className={!hasPreviousPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                if (totalPages <= 7) {
                  return i + 1;
                }
                
                // Show first 3, current page neighbors, and last page with ellipses
                if (i < 2) return i + 1; // First 2 pages
                if (i === 2 && currentPage > 4) return '...'; // Ellipsis after page 2
                if (i === 2) return 3;
                if (i === 3 && currentPage <= 4) return 4;
                if (i === 3) return currentPage;
                if (i === 4 && currentPage >= totalPages - 3) return totalPages - 2;
                if (i === 4) return '...'; // Ellipsis before last page
                if (i === 5) return totalPages - 1;
                return totalPages;
              }).map((page, index) => (
                page === '...' ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <span className="flex h-9 w-9 items-center justify-center">...</span>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => goToPage(page as number)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={nextPage}
                  className={!hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Dialogs */}
      <ProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        type="tags"
        operation={currentOperation}
        current={progress.current}
        total={progress.total}
      />

      <ResultsDialog
        open={showResultsDialog}
        onOpenChange={setShowResultsDialog}
        type="tags"
        items={optimizedItems}
        onSyncClick={() => {
          setShowResultsDialog(false);
          const itemsWithTags = optimizedItems.filter(item => item.tags);
          if (itemsWithTags.length > 0) {
            setItemsToSync(itemsWithTags);
            setShowSyncDialog(true);
          }
        }}
        onClose={handleCloseResultsDialog}
      />

      {/* Sync Confirmation Dialog */}
      <SyncConfirmationDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        type="tags"
        itemCount={itemsToSync.length}
        onConfirm={async () => {
          setShowSyncDialog(false);
          await handleBulkSync(itemsToSync.map(item => item.id));
        }}
        loading={showProgressDialog && currentOperation === 'syncing'}
      />

      <SuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        type="tags"
        count={progress.current}
        onClose={() => {
          setShowSuccessDialog(false);
          setSelectedProducts(new Set());
        }}
      />

      {limits?.isTrialing ? (
        <TrialLimitDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          limitType="optimizations"
          currentUsage={limits?.usage.optimizations_count || 0}
          maxUsage={limits?.limits.max_optimizations || 0}
        />
      ) : (
        <UpgradeDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          limitType="optimizations"
        />
      )}
    </div>
  );
}