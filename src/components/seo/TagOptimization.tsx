import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
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
  Zap,
  Filter,
  Clock
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  tags: string | null;
  vendor: string;
  category: string;
  product_type: string;
  image_url: string;
  seo_synced_to_shopify: boolean;
}

type FilterType = 'all' | 'to_optimize' | 'tagged' | 'to_sync' | 'synced';

export function TagOptimization() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editTags, setEditTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Workflow states
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<'optimizing' | 'syncing'>('optimizing');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [optimizedItems, setOptimizedItems] = useState<WorkflowItem[]>([]);
  const [itemsToSync, setItemsToSync] = useState<WorkflowItem[]>([]);
  
  const { limits, loading: limitsLoading } = useUsageLimits();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shopify_products')
        .select('id, title, tags, vendor, category, product_type, image_url, seo_synced_to_shopify')
        .order('title', { ascending: true });

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

  // Get unique categories
  const uniqueCategories = Array.from(new Set(products.map(p => p.product_type).filter(Boolean))).sort();

  // Filtered products logic
  const filteredProducts = products.filter((product) => {
    if (filter === 'to_optimize' && product.tags) return false;
    if (filter === 'tagged' && !product.tags) return false;
    if (filter === 'to_sync' && (product.seo_synced_to_shopify || !product.tags)) return false;
    if (filter === 'synced' && !product.seo_synced_to_shopify) return false;

    // Category filter
    if (selectedCategory !== 'all' && product.product_type !== selectedCategory) return false;

    // Search filter (only by title now)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return product.title?.toLowerCase().includes(term);
    }

    return true;
  });

  // Statistics
  const productsWithTags = products.filter(p => p.tags).length;
  const productsWithoutTags = products.length - productsWithTags;
  const productsToSyncCount = products.filter(p => p.tags && p.tags.length > 0 && !p.seo_synced_to_shopify).length;
  const productsSynced = products.filter(p => p.seo_synced_to_shopify).length;
  
  // Calculate tag SEO score
  const tagSeoScore = products.length > 0 
    ? Math.round(
        products.reduce((sum, p) => {
          return sum + (p.tags ? 80 : 20);
        }, 0) / products.length
      )
    : 0;

  const filters = [
    { id: 'all' as FilterType, label: 'All Products', count: products.length },
    { id: 'to_optimize' as FilterType, label: 'To Tag', count: productsWithoutTags },
    { id: 'tagged' as FilterType, label: 'Tagged', count: productsWithTags },
    { id: 'to_sync' as FilterType, label: 'To Synchronize', count: productsToSyncCount },
    { id: 'synced' as FilterType, label: 'Synchronized', count: productsSynced },
  ];

  // Clickable stats handlers
  const handleToOptimizeClick = () => {
    setFilter('to_optimize');
    toast.info(`Showing ${productsWithoutTags} products to tag`);
  };

  const handleTaggedClick = () => {
    setFilter('tagged');
    toast.info(`Showing ${productsWithTags} tagged products`);
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
    if (productsWithoutTags === 0) {
      toast.info('All products already have tags');
      return;
    }
    setFilter('to_optimize');
    setTimeout(() => {
      handleGenerateAllTags();
    }, 100);
  };

  const handleGenerateAllTags = async () => {
    const productsToGenerate = products.filter(p => !p.tags);
    if (productsToGenerate.length === 0) {
      toast.info('All products already have tags');
      return;
    }

    const remainingLimit = (limits?.limits.max_optimizations || 0) - (limits?.usage.optimizations_count || 0);
    
    if (productsToGenerate.length > remainingLimit) {
      if (limits?.isTrialing) {
        setShowUpgradeDialog(true);
        return;
      } else {
        toast.warning(`Limit reached. Only ${remainingLimit} products will be optimized.`);
        await handleBulkGenerate(productsToGenerate.slice(0, remainingLimit).map(p => p.id));
        return;
      }
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

  const handleGenerateSelected = async (force = false) => {
    if (selectedProducts.size === 0) {
      toast.info('Aucun produit sélectionné');
      return;
    }

    const allSelectedProducts = Array.from(selectedProducts);
    const productsWithTags = allSelectedProducts.filter(id => 
      products.find(p => p.id === id)?.tags
    );
    const productsWithoutTags = allSelectedProducts.filter(id => 
      !products.find(p => p.id === id)?.tags
    );

    // Si force n'est pas activé et que tous les produits ont déjà des tags
    if (!force && productsWithTags.length > 0 && productsWithoutTags.length === 0) {
      toast.info(
        `${productsWithTags.length} produit${productsWithTags.length > 1 ? 's ont' : ' a'} déjà des tags`,
        {
          description: 'Voulez-vous les régénérer ?',
          action: {
            label: 'Régénérer',
            onClick: () => handleGenerateSelected(true)
          }
        }
      );
      return;
    }

    const productsToGenerate = force ? allSelectedProducts : productsWithoutTags;
    const remainingLimit = (limits?.limits.max_optimizations || 0) - (limits?.usage.optimizations_count || 0);
    
    if (productsToGenerate.length > remainingLimit) {
      if (limits?.isTrialing) {
        setShowUpgradeDialog(true);
        return;
      } else {
        toast.warning(`Limite atteinte. Seulement ${remainingLimit} produit${remainingLimit > 1 ? 's seront optimisés' : ' sera optimisé'}.`);
        await handleBulkGenerate(productsToGenerate.slice(0, remainingLimit), force);
        return;
      }
    }

    await handleBulkGenerate(productsToGenerate, force);
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
      toast.info('All products are synchronized');
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
      toast.info('No products to synchronize');
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
              syncGoogleShopping: true
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
                tagSeoScore >= 70 ? 'text-orange-600' : 
                'text-red-600'
              }`}>
                {tagSeoScore}/100
              </div>
              <div className="text-sm text-muted-foreground">SEO Score</div>
            </div>
            <Button
              size="lg"
              onClick={handleGenerateAll}
              disabled={showProgressDialog || productsWithoutTags === 0}
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
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Not Tagged</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{productsWithoutTags}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">Click to view</p>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleTaggedClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Tagged</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{productsWithTags}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 mt-2">Click to view</p>
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
            </div>
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">Click to view</p>
        </Card>
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
                disabled={showProgressDialog || productsWithoutTags === 0}
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
                <Zap className="w-4 h-4" />
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
          {filteredProducts.map((product) => (
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
                  <h3 className="font-semibold truncate">{product.title}</h3>
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
                          {product.tags.split(',').map((tag, i) => (
                            <Badge key={i} variant="secondary">
                              {tag.trim()}
                            </Badge>
                          ))}
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
          {filteredProducts.map((product) => (
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
                  <h3 className="font-semibold line-clamp-2">{product.title}</h3>
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
                        {product.tags.split(',').map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag.trim()}
                          </Badge>
                        ))}
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