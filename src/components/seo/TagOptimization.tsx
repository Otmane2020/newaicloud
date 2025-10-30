import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { OptimizationProgressDialog } from './OptimizationProgressDialog';
import { OptimizationResultsDialog } from './OptimizationResultsDialog';
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
  Filter
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  tags: string | null;
  vendor: string;
  category: string;
  image_url: string;
  seo_synced_to_shopify: boolean;
}

type FilterType = 'all' | 'to_optimize' | 'tagged' | 'synced';

export function TagOptimization() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editTags, setEditTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filter, setFilter] = useState<FilterType>('all');
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [isOptimizationComplete, setIsOptimizationComplete] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [optimizedProducts, setOptimizedProducts] = useState<Product[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { limits, loading: limitsLoading } = useUsageLimits();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shopify_products')
        .select('id, title, tags, vendor, category, image_url, seo_synced_to_shopify')
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

  // Filtered products logic
  const filteredProducts = products.filter((product) => {
    if (filter === 'to_optimize' && product.tags) return false;
    if (filter === 'tagged' && !product.tags) return false;
    if (filter === 'synced' && !product.seo_synced_to_shopify) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      product.title.toLowerCase().includes(term) ||
      product.tags?.toLowerCase().includes(term) ||
      product.category?.toLowerCase().includes(term)
    );
  });

  // Statistics
  const productsWithTags = products.filter(p => p.tags).length;
  const productsWithoutTags = products.length - productsWithTags;
  const productsToSync = products.filter(p => p.tags && !p.seo_synced_to_shopify).length;
  const productsSynced = products.filter(p => p.seo_synced_to_shopify).length;
  const tagCompletionRate = products.length > 0 ? Math.round((productsWithTags / products.length) * 100) : 0;

  const filters = [
    { id: 'all' as FilterType, label: 'All Products', count: products.length },
    { id: 'to_optimize' as FilterType, label: 'To Optimize', count: productsWithoutTags },
    { id: 'tagged' as FilterType, label: 'Tagged', count: productsWithTags },
    { id: 'synced' as FilterType, label: 'Synced', count: productsSynced },
  ];

  // Clickable stats handlers
  const handleToOptimizeClick = () => {
    setFilter('to_optimize');
    toast.info(`Showing ${productsWithoutTags} products to optimize`);
  };

  const handleTaggedClick = () => {
    setFilter('tagged');
    toast.info(`Showing ${productsWithTags} tagged products`);
  };

  const handleSyncedClick = () => {
    setFilter('synced');
    toast.info(`Showing ${productsSynced} synced products`);
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
    const productsToGenerate = force 
      ? Array.from(selectedProducts)
      : Array.from(selectedProducts).filter(id =>
          !products.find(p => p.id === id)?.tags
        );
    if (productsToGenerate.length === 0) {
      toast.info('No products selected');
      return;
    }

    const remainingLimit = (limits?.limits.max_optimizations || 0) - (limits?.usage.optimizations_count || 0);
    
    if (productsToGenerate.length > remainingLimit) {
      if (limits?.isTrialing) {
        setShowUpgradeDialog(true);
        return;
      } else {
        toast.warning(`Limit reached. Only ${remainingLimit} products will be optimized.`);
        await handleBulkGenerate(productsToGenerate.slice(0, remainingLimit), force);
        return;
      }
    }

    await handleBulkGenerate(productsToGenerate, force);
  };

  const handleBulkGenerate = async (productIds: string[], force = false) => {
    setGenerating(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: productIds.length });

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const generatedProducts: Product[] = [];

    for (let i = 0; i < productIds.length; i++) {
      try {
        // Get user session token
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
              generatedProducts.push(product);
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

    setGenerating(false);
    setIsOptimizationComplete(true);
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

    setOptimizedProducts(updatedProducts.filter(Boolean) as Product[]);
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
    setShowProgressDialog(false);
    setShowResultsDialog(false);
    setSyncing(true);
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

    setSyncing(false);
    setProgress({ current: 0, total: 0 });
    setSelectedProducts(new Set());
    
    if (errorCount > 0) {
      console.error('Sync errors:', errors);
      toast.error(`Sync completed: ${successCount} successful, ${errorCount} errors. Check your Shopify credentials.`);
    } else {
      toast.success(`Sync successful: ${successCount} products synchronized`);
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
              <div className="text-3xl md:text-4xl font-bold text-orange-600">{tagCompletionRate}</div>
              <div className="text-sm text-muted-foreground">SEO Score</div>
            </div>
            <Button
              size="lg"
              onClick={handleGenerateAll}
              disabled={generating || productsWithoutTags === 0}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card 
          className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleTaggedClick}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">Tagged</h3>
            </div>
            <Badge className="bg-green-600 text-white hover:bg-green-700 text-xs">
              {tagCompletionRate}%
            </Badge>
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">{productsWithTags}</p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">Click to view</p>
        </Card>

        <Card 
          className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleToOptimizeClick}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Plus className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100">To Optimize</h3>
            </div>
          </div>
          <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{productsWithoutTags}</p>
          <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">Click to view</p>
        </Card>

        <Card 
          className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleSyncedClick}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Synced</h3>
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{productsSynced}</p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Click to view</p>
        </Card>

        <Card 
          className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Hash className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">To Sync</h3>
            </div>
          </div>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{productsToSync}</p>
          <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">Ready for Shopify</p>
        </Card>
      </div>

      {/* Controls Section */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search and View Controls */}
          <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products, tags, categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
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
          </div>

          {/* Bulk Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAll}
              disabled={generating || productsWithoutTags === 0}
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Optimize All</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateSelected(false)}
              disabled={generating || selectedProducts.size === 0}
              className="flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Optimize ({selectedProducts.size})</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncSelected}
              disabled={syncing || selectedProducts.size === 0}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Sync ({selectedProducts.size})</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAll}
              disabled={syncing || productsToSync === 0}
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
      {(generating || syncing) && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">
              {generating ? 'Generating tags...' : 'Synchronizing...'}
            </span>
            <span className="text-sm text-muted-foreground">
              {progress.current} / {progress.total}
            </span>
          </div>
          <Progress value={(progress.current / progress.total) * 100} className="h-2" />
        </Card>
      )}

      {/* Products List */}
      {viewMode === 'list' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left w-12">
                    <Checkbox
                      checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">Product</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">Tags</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-muted/30 transition">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={() => handleSelectProduct(product.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <Tags className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium line-clamp-1">{product.title}</div>
                          <div className="text-xs text-muted-foreground">{product.vendor}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {product.tags ? (
                        <div className="flex flex-wrap gap-1">
                          {product.tags.split(',').slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag.trim()}
                            </Badge>
                          ))}
                          {product.tags.split(',').length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{product.tags.split(',').length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No tags</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {product.tags ? (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Tagged
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Plus className="w-3 h-3" />
                          To Optimize
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
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
                    <Tags className="w-12 h-12 text-muted-foreground" />
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
                    {product.category && (
                      <>
                        <span>•</span>
                        <span>{product.category}</span>
                      </>
                    )}
                  </div>
                </div>

                {editingProduct === product.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="Enter tags separated by commas"
                      disabled={saving}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveTags(product.id)}
                        disabled={saving}
                        className="flex-1"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={saving}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap gap-1 mb-2 min-h-[32px]">
                      {product.tags ? (
                        product.tags.split(',').map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag.trim()}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No tags</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditTags(product.id, product.tags || '')}
                      className="w-full gap-2"
                    >
                      <Plus className="w-3 h-3" />
                      {product.tags ? 'Edit Tags' : 'Add Tags'}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <Tags className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No products found</p>
        </div>
      )}

      {/* Dialogs */}
      <OptimizationProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        title={generating ? "Optimizing Tags" : "Syncing to Shopify"}
        current={progress.current}
        total={progress.total}
        isComplete={isOptimizationComplete}
        onSyncClick={handleSyncSelected}
        onClose={handleCloseProgressDialog}
      />

      <OptimizationResultsDialog
        open={showResultsDialog}
        onOpenChange={setShowResultsDialog}
        type="tags"
        items={optimizedProducts}
        onSyncClick={() => {
          setShowResultsDialog(false);
          handleSyncSelected();
        }}
        onClose={handleCloseResultsDialog}
      />

      <TrialLimitDialog
        open={showUpgradeDialog && limits?.shouldForcePayment === true}
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
}