import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { OptimizationProgressDialog } from './OptimizationProgressDialog';
import { OptimizationResultsDialog } from './OptimizationResultsDialog';
import { SeoSyncDialog } from './SeoSyncDialog';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { TrialLimitDialog } from '@/components/TrialLimitDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SeoConfidenceBadge } from './SeoConfidenceBadge';
import { calculateDetailedSeoScore } from '@/lib/seoQuality';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  Sparkles,
  Upload,
  Loader2,
  Package,
  TrendingUp,
  Target,
  Zap,
  ArrowRight,
  Eye,
  ExternalLink,
  Filter,
  Grid3x3,
  List
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  vendor: string;
  category: string;
  sub_category: string;
  seo_title: string;
  seo_description: string;
  enrichment_status: string;
  seo_synced_to_shopify: boolean;
  image_url: string;
  imported_at: string;
  optimization_count: number;
  tags: string;
  product_type: string;
}

type QuickFilterTab = 'all' | 'not-enriched' | 'enriched' | 'pending-sync' | 'synced';

export function SeoOptimization() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<QuickFilterTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [isOptimizationComplete, setIsOptimizationComplete] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [optimizedProducts, setOptimizedProducts] = useState<Product[]>([]);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [productsToSync, setProductsToSync] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { limits, loading: limitsLoading, refresh: refreshLimits } = useUsageLimits();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shopify_products')
        .select('*, optimization_count')
        .order('imported_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Statistics
  const notEnrichedCount = products.filter(p => p.enrichment_status !== 'enriched').length;
  const enrichedCount = products.filter(p => p.enrichment_status === 'enriched').length;
  const pendingSyncCount = products.filter(p => p.enrichment_status === 'enriched' && !p.seo_synced_to_shopify).length;
  const syncedCount = products.filter(p => p.seo_synced_to_shopify).length;
  const optimizationRate = products.length > 0 ? Math.round((enrichedCount / products.length) * 100) : 0;

  // Calculate global SEO score with 30/70 weighting
  const productsNotOptimized = products.filter(p => p.enrichment_status !== 'enriched');
  const productsOptimized = products.filter(p => p.enrichment_status === 'enriched');

  // Score for non-optimized products (based on original Shopify data)
  const scoreWithoutAI = productsNotOptimized.length > 0
    ? Math.round(
        productsNotOptimized.reduce((sum, p) => {
          const score = calculateDetailedSeoScore(
            p.title,        // Original Shopify title
            p.vendor,       // Using vendor as description proxy for non-enriched
            !!p.image_url,
            true,
            p.tags          // Shopify tags
          );
          return sum + score.score;
        }, 0) / productsNotOptimized.length
      )
    : 0;

  // Score for AI-optimized products
  const scoreWithAI = productsOptimized.length > 0
    ? Math.round(
        productsOptimized.reduce((sum, p) => {
          const score = calculateDetailedSeoScore(
            p.seo_title,       // AI-generated title
            p.seo_description, // AI-generated description
            !!p.image_url,
            true,
            p.tags             // Tags
          );
          return sum + score.score;
        }, 0) / productsOptimized.length
      )
    : 0;

  // Apply 30/70 weighting
  const globalSeoScore = products.length > 0
    ? Math.round((0.3 * scoreWithoutAI) + (0.7 * scoreWithAI))
    : 0;

  // Get unique categories
  const uniqueCategories = Array.from(new Set(products.map(p => p.product_type).filter(Boolean))).sort();

  const filteredProducts = products.filter((product) => {
    if (activeTab === 'not-enriched' && product.enrichment_status === 'enriched') return false;
    if (activeTab === 'enriched' && product.enrichment_status !== 'enriched') return false;
    if (activeTab === 'pending-sync' && (product.enrichment_status !== 'enriched' || product.seo_synced_to_shopify)) return false;
    if (activeTab === 'synced' && !product.seo_synced_to_shopify) return false;

    // Category filter
    if (selectedCategory !== 'all' && product.product_type !== selectedCategory) return false;

    // Search filter (only by title now)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return product.title?.toLowerCase().includes(term);
    }

    return true;
  });

  const tabs = [
    { id: 'all' as QuickFilterTab, label: 'All Products', count: products.length },
    { id: 'not-enriched' as QuickFilterTab, label: 'To Optimize', count: notEnrichedCount },
    { id: 'enriched' as QuickFilterTab, label: 'Optimized', count: enrichedCount },
    { id: 'pending-sync' as QuickFilterTab, label: 'To Synchronize', count: pendingSyncCount },
    { id: 'synced' as QuickFilterTab, label: 'Synchronized', count: syncedCount }
  ];

  // Clickable stats handlers
  const handleNotOptimizedClick = () => {
    setActiveTab('not-enriched');
    toast.info(`Showing ${notEnrichedCount} products to optimize`);
  };

  const handleOptimizedClick = () => {
    setActiveTab('enriched');
    toast.info(`Showing ${enrichedCount} optimized products`);
  };

  const handleSyncedClick = () => {
    setActiveTab('synced');
    toast.info(`Showing ${syncedCount} synchronized products`);
  };

  const handleGenerateAll = () => {
    if (notEnrichedCount === 0) {
      toast.info('All products are already optimized');
      return;
    }
    setActiveTab('not-enriched');
    setTimeout(() => {
      handleGenerateAllSeo();
    }, 100);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
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

  const handleGenerateForSelected = async () => {
    // Check usage limits first (only check optimization-specific limits)
    if (!limits?.canUseOptimizations || limits?.limitReached.optimizations) {
      toast.error('Trial limit reached for SEO optimizations');
      setShowUpgradeDialog(true);
      return;
    }

    // Filter eligible products
    const productsToGenerate = products.filter(p => {
      if (!selectedProducts.has(p.id)) return false;
      
      // If in trial, exclude already optimized products
      if (limits?.isTrialing && (p.optimization_count || 0) >= 1) {
        return false;
      }
      
      // Otherwise, only products not yet enriched
      return p.enrichment_status !== 'enriched';
    });

    if (productsToGenerate.length === 0) {
      if (limits?.isTrialing) {
        toast.info('Selected products have already been optimized during your trial. Activate your subscription to re-optimize.');
      } else {
        toast.info('No products to optimize');
      }
      return;
    }

    setGenerating(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: productsToGenerate.length });

    for (let i = 0; i < productsToGenerate.length; i++) {
      try {
        await supabase.functions.invoke('generate-seo-with-deepseek', {
          body: { productId: productsToGenerate[i].id }
        });
        setProgress({ current: i + 1, total: productsToGenerate.length });
      } catch (error: any) {
        console.error('Error generating SEO:', error);
        
        if (error.message?.includes('trial_product_already_optimized')) {
          toast.warning('Some products have already been optimized during your trial.');
        } else if (error.message?.includes('trial_limit_reached')) {
          toast.error('Trial limit reached.');
          setShowUpgradeDialog(true);
          break;
        } else {
          toast.error('Error during optimization');
        }
      }
    }

    setGenerating(false);
    setIsOptimizationComplete(true);
    await fetchProducts();
    await refreshLimits();

    // Get updated products with new SEO data
    const updatedProducts = await Promise.all(
      productsToGenerate.map(async (p) => {
        const { data } = await supabase
          .from('shopify_products')
          .select('id, title, seo_title, seo_description, image_url')
          .eq('id', p.id)
          .single();
        return data;
      })
    );

    setOptimizedProducts(updatedProducts.filter(Boolean) as Product[]);
    setShowProgressDialog(false);
    setShowResultsDialog(true);
  };

  const handleGenerateAllSeo = async () => {
    // Check usage limits first (only check optimization-specific limits)
    if (!limits?.canUseOptimizations || limits?.limitReached.optimizations) {
      toast.error('Trial limit reached for SEO optimizations');
      setShowUpgradeDialog(true);
      return;
    }

    const productsToGenerate = products.filter(p => !p.seo_title || !p.seo_description);

    if (productsToGenerate.length === 0) {
      toast.info('All products are already optimized');
      return;
    }

    setGenerating(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: productsToGenerate.length });

    const BATCH_SIZE = 3;
    for (let i = 0; i < productsToGenerate.length; i += BATCH_SIZE) {
      const batch = productsToGenerate.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (product) => {
        try {
          await supabase.functions.invoke('generate-seo-with-deepseek', {
            body: { productId: product.id }
          });
        } catch (error: any) {
          console.error('Error generating SEO:', error);
          if (error.message?.includes('trial_limit_reached')) {
            toast.error('Trial limit reached.');
            setShowUpgradeDialog(true);
            return;
          }
        }
      }));

      setProgress({ current: Math.min(i + BATCH_SIZE, productsToGenerate.length), total: productsToGenerate.length });
    }

    setGenerating(false);
    setIsOptimizationComplete(true);
    await fetchProducts();
    await refreshLimits();
  };

  const handleSyncSelected = async () => {
    const productsToSync = products.filter(
      p => selectedProducts.has(p.id) && p.enrichment_status === 'enriched'
    );

    if (productsToSync.length === 0) {
      toast.info('No products to synchronize');
      return;
    }

    setSyncing(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: productsToSync.length });

    let successCount = 0;

    for (let i = 0; i < productsToSync.length; i++) {
      try {
        await supabase.functions.invoke('sync-seo-to-shopify', {
          body: { 
            productId: productsToSync[i].id,
            syncTags: true,
            syncGoogleShopping: true
          }
        });
        
        const product = productsToSync[i];
        const { data: productData } = await supabase
          .from('shopify_products')
          .select('shopify_id, shop_name, title')
          .eq('id', product.id)
          .single();

        if (productData?.shopify_id && productData?.shop_name) {
          const shopifyUrl = `https://admin.shopify.com/store/${productData.shop_name}/products/${productData.shopify_id}`;
          toast.success('Product synced to Shopify', {
            description: (
              <>
                <span className="font-medium">{productData.title}</span>
                <br />
                <a 
                  href={shopifyUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
                >
                  View in Shopify <ExternalLink className="w-3 h-3" />
                </a>
              </>
            ),
          });
          successCount++;
        }

        setProgress({ current: i + 1, total: productsToSync.length });
      } catch (error) {
        console.error('Error syncing:', error);
      }
    }

    setSyncing(false);
    setIsOptimizationComplete(true);
    setSelectedProducts(new Set());
    
    await fetchProducts();
  };

  const handleSyncProducts = async (productIds: string[]) => {
    if (productIds.length === 0) {
      toast.info('No products to synchronize');
      return;
    }

    setSyncing(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: productIds.length });

    let successCount = 0;

    for (let i = 0; i < productIds.length; i++) {
      try {
        await supabase.functions.invoke('sync-seo-to-shopify', {
          body: { 
            productId: productIds[i],
            syncTags: true,
            syncGoogleShopping: true
          }
        });
        
        const { data: productData } = await supabase
          .from('shopify_products')
          .select('title, shopify_id, shop_name')
          .eq('id', productIds[i])
          .single();

        if (productData?.shopify_id && productData?.shop_name) {
          const shopifyUrl = `https://admin.shopify.com/store/${productData.shop_name}/products/${productData.shopify_id}`;
          toast.success('Product synced to Shopify', {
            description: (
              <>
                <span className="font-medium">{productData.title}</span>
                <br />
                <a 
                  href={shopifyUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
                >
                  View in Shopify <ExternalLink className="w-3 h-3" />
                </a>
              </>
            ),
          });
          successCount++;
        }
        
        setProgress({ current: i + 1, total: productIds.length });
      } catch (error) {
        console.error('Error syncing:', error);
      }
    }

    setSyncing(false);
    setIsOptimizationComplete(true);
    
    if (successCount > 0) {
      toast.success(`Synchronisation terminée !`, {
        description: `${successCount} produit${successCount > 1 ? 's' : ''} synchronisé${successCount > 1 ? 's' : ''} avec succès sur Shopify`
      });
    }
    
    await fetchProducts();
  };

  const handleCloseProgressDialog = () => {
    setShowProgressDialog(false);
    setIsOptimizationComplete(false);
    setSelectedProducts(new Set());
  };

  const handleCloseResultsDialog = () => {
    setShowResultsDialog(false);
    setOptimizedProducts([]);
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
      <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 border-2 border-blue-200 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SEO Optimization
              </h1>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Generate optimized titles and descriptions automatically to improve your SEO and increase conversions by 40%.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Smart SEO</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-medium">+40% visibility</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-purple-600" />
                <span className="font-medium">Fast generation</span>
              </div>
            </div>
          </div>
            <div className="flex flex-col gap-4 items-center">
              <div className="text-center">
                <div className={`text-3xl md:text-4xl font-bold ${
                  globalSeoScore >= 80 ? 'text-green-600' : 
                  globalSeoScore >= 70 ? 'text-orange-600' : 
                  'text-red-600'
                }`}>
                  {globalSeoScore}/100
                </div>
                <div className="text-sm text-muted-foreground">Global SEO Score</div>
                <div className="text-xs text-muted-foreground mt-1">
                  30% non-optimized + 70% AI-optimized
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {optimizationRate}% optimized
                </div>
              </div>
              <Button
                size="lg"
                onClick={handleGenerateAll}
                disabled={generating || notEnrichedCount === 0}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2 shadow-lg"
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
          onClick={handleNotOptimizedClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Not Optimized</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{notEnrichedCount}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">Click to view</p>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleOptimizedClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Optimized</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{enrichedCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 mt-2">Click to view</p>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={() => {
            setActiveTab('pending-sync');
            toast.info(`Showing ${pendingSyncCount} products to synchronize`);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">To Synchronize</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{pendingSyncCount}</p>
            </div>
            <Upload className="w-8 h-8 text-purple-600" />
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
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{syncedCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">Click to view</p>
        </Card>
      </div>


      {/* Usage limits alert */}
      {limits && limits.isTrialing && (
        <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <AlertDescription className="text-sm">
            {limits.limitReached.optimizations ? (
              <span className="text-orange-900 dark:text-orange-100 font-medium">
                ⚠️ Trial limit reached: {limits.usage.optimizations_count}/{limits.limits.max_optimizations} optimizations used
              </span>
            ) : (
              <span>
                📊 Free trial: {limits.usage.optimizations_count}/{limits.limits.max_optimizations} optimizations used
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

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
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-center gap-2"
            >
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
              variant="default"
              size="sm"
              onClick={handleGenerateForSelected}
              disabled={generating || selectedProducts.size === 0}
              className="flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Optimize Selected ({selectedProducts.size})
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAll}
              disabled={generating || notEnrichedCount === 0}
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Optimize All
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const toSync = products.filter(p => 
                  selectedProducts.has(p.id) && 
                  p.seo_title && 
                  p.seo_description
                );
                if (toSync.length === 0) {
                  toast.error('No optimized products selected for sync');
                  return;
                }
                setProductsToSync(toSync);
                setShowSyncDialog(true);
              }}
              disabled={syncing || selectedProducts.size === 0}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Sync Selection ({selectedProducts.size})
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const toSync = products.filter(p => 
                  p.enrichment_status === 'enriched' && 
                  p.seo_title && 
                  p.seo_description &&
                  !p.seo_synced_to_shopify
                );
                if (toSync.length === 0) {
                  toast.info('All optimized products are already synced');
                  return;
                }
                setProductsToSync(toSync);
                setShowSyncDialog(true);
              }}
              disabled={syncing || pendingSyncCount === 0}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Sync All ({pendingSyncCount})</span>
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
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-between p-3 rounded-md text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {tab.label}
                  <Badge variant={activeTab === tab.id ? 'secondary' : 'outline'}>
                    {tab.count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Desktop Filters */}
      <div className="hidden lg:flex bg-background border rounded-lg p-1 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition flex-1 justify-center ${
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

      {/* Progress Indicator */}
      {(generating || syncing) && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">
              {generating ? 'Generating SEO...' : 'Synchronizing...'}
            </span>
            <span className="text-sm text-muted-foreground">
              {progress.current} / {progress.total}
            </span>
          </div>
          <Progress value={(progress.current / progress.total) * 100} className="h-2" />
        </Card>
      )}

      {/* Products Table */}
      {viewMode === 'list' ? (
        <Card className="overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-20">Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="min-w-[200px]">SEO Title</TableHead>
                <TableHead className="min-w-[250px]">SEO Description</TableHead>
                <TableHead className="w-32">SEO Score</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-32">Synced</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const seoScore = calculateDetailedSeoScore(
                  product.seo_title,
                  product.seo_description,
                  !!product.image_url,
                  true
                );
                
                return (
                  <TableRow key={product.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={() => handleSelectProduct(product.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="font-medium line-clamp-2">{product.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{product.vendor}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        {product.seo_title ? (
                          <p className="text-sm line-clamp-2">{product.seo_title}</p>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Not optimized
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[250px]">
                        {product.seo_description ? (
                          <p className="text-xs text-muted-foreground line-clamp-3">
                            {product.seo_description}
                          </p>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Not optimized
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                     <TableCell>
                       <div className="flex flex-col gap-1">
                         {product.enrichment_status === 'enriched' ? (
                           <>
                             <div className={`text-2xl font-bold ${
                               seoScore.score >= 80 ? 'text-green-600' : 
                               seoScore.score >= 70 ? 'text-orange-600' : 
                               'text-red-600'
                             }`}>
                               {seoScore.score}
                             </div>
                             <span className="text-xs text-muted-foreground">AI-optimized</span>
                           </>
                         ) : (
                           <>
                             {(() => {
                               const initialScore = calculateDetailedSeoScore(
                                 product.title,
                                 product.vendor,
                                 !!product.image_url,
                                 true,
                                 product.tags
                               );
                               return (
                                 <>
                                   <div className={`text-2xl font-bold ${
                                     initialScore.score >= 80 ? 'text-green-600' : 
                                     initialScore.score >= 70 ? 'text-orange-600' : 
                                     'text-red-600'
                                   }`}>
                                     {initialScore.score}
                                   </div>
                                   <span className="text-xs text-muted-foreground">Initial score</span>
                                 </>
                               );
                             })()}
                           </>
                         )}
                       </div>
                     </TableCell>
                    <TableCell>
                      <Badge variant={product.enrichment_status === 'enriched' ? 'default' : 'secondary'}>
                        {product.enrichment_status === 'enriched' ? 'Optimized' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {product.seo_synced_to_shopify ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setProductsToSync([product]);
                            setShowSyncDialog(true);
                          }}
                          disabled={!product.seo_title || !product.seo_description}
                          title="View & Sync"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </Card>
      ) : (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const seoScore = calculateDetailedSeoScore(
              product.seo_title,
              product.seo_description,
              !!product.image_url,
              true
            );
            
            return (
              <Card key={product.id} className="overflow-hidden hover:shadow-md transition">
                <div className="aspect-square bg-muted relative">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground" />
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
                    <h3 className="font-semibold line-clamp-2 mb-1">{product.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {product.vendor && <span>{product.vendor}</span>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">SEO Title</p>
                      {product.seo_title ? (
                        <p className="text-sm line-clamp-2">{product.seo_title}</p>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Not optimized
                        </Badge>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">SEO Description</p>
                      {product.seo_description ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {product.seo_description}
                        </p>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Not optimized
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      {product.enrichment_status === 'enriched' ? (
                        <>
                          <div className={`text-2xl font-bold ${
                            seoScore.score >= 80 ? 'text-green-600' : 
                            seoScore.score >= 70 ? 'text-orange-600' : 
                            'text-red-600'
                          }`}>
                            {seoScore.score}
                          </div>
                          <span className="text-xs text-muted-foreground">AI-optimized</span>
                        </>
                      ) : (
                        <>
                          {(() => {
                            const initialScore = calculateDetailedSeoScore(
                              product.title,
                              product.vendor,
                              !!product.image_url,
                              true,
                              product.tags
                            );
                            return (
                              <>
                                <div className={`text-2xl font-bold ${
                                  initialScore.score >= 80 ? 'text-green-600' : 
                                  initialScore.score >= 70 ? 'text-orange-600' : 
                                  'text-red-600'
                                }`}>
                                  {initialScore.score}
                                </div>
                                <span className="text-xs text-muted-foreground">Initial score</span>
                              </>
                            );
                          })()}
                        </>
                      )}
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setProductsToSync([product]);
                        setShowSyncDialog(true);
                      }}
                      disabled={!product.seo_title || !product.seo_description}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No products found</p>
        </div>
      )}

      {/* Dialogs */}
      <OptimizationProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        title={generating ? "Optimizing SEO" : "Syncing to Shopify"}
        current={progress.current}
        total={progress.total}
        isComplete={isOptimizationComplete}
        onSyncClick={handleSyncSelected}
        onClose={handleCloseProgressDialog}
      />

      <OptimizationResultsDialog
        open={showResultsDialog}
        onOpenChange={setShowResultsDialog}
        type="seo"
        items={optimizedProducts}
        onSyncClick={() => {
          setShowResultsDialog(false);
          const productsWithSeo = optimizedProducts.filter(p => p.seo_title || p.seo_description);
          if (productsWithSeo.length > 0) {
            setProductsToSync(productsWithSeo);
            setShowSyncDialog(true);
          }
        }}
        onClose={handleCloseResultsDialog}
      />

      {/* Sync Confirmation Dialog */}
      <SeoSyncDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        products={productsToSync}
        onConfirm={async () => {
          setSyncing(true);
          const productIds = productsToSync.map(p => p.id);
          await handleSyncProducts(productIds);
          setShowSyncDialog(false);
          setProductsToSync([]);
          setSyncing(false);
        }}
        loading={syncing}
      />
      
      {limits?.shouldForcePayment ? (
        <TrialLimitDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          limitType="optimizations"
          currentUsage={limits?.usage.optimizations_count || 0}
          maxUsage={limits?.limits.max_optimizations || 0}
          trialMaxUsage={limits?.isTrialing ? limits?.limits.max_optimizations : undefined}
        />
      ) : (
        <UpgradeDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          limitType="optimizations"
          usage={limits?.usage.optimizations_count}
          limit={limits?.limits.max_optimizations}
        />
      )}
    </div>
  );
}