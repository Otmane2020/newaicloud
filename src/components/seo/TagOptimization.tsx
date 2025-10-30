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

type FilterType = 'all' | 'with-tags' | 'without-tags' | 'to-sync';

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

  // Statistics
  const productsWithTags = products.filter(p => p.tags).length;
  const productsWithoutTags = products.length - productsWithTags;
  const productsToSync = products.filter(p => p.tags && !p.seo_synced_to_shopify).length;
  const tagCompletionRate = products.length > 0 ? Math.round((productsWithTags / products.length) * 100) : 0;

  const filters = [
    { id: 'all' as FilterType, label: 'All Products', count: products.length },
    { id: 'with-tags' as FilterType, label: 'With Tags', count: productsWithTags },
    { id: 'without-tags' as FilterType, label: 'Without Tags', count: productsWithoutTags },
    { id: 'to-sync' as FilterType, label: 'To Sync', count: productsToSync },
  ];

  // Clickable stats handlers
  const handleWithTagsClick = () => {
    setFilter('with-tags');
    toast.info(`Showing ${productsWithTags} products with tags`);
  };

  const handleWithoutTagsClick = () => {
    setFilter('without-tags');
    toast.info(`Showing ${productsWithoutTags} products without tags`);
  };

  const handleToSyncClick = () => {
    setFilter('to-sync');
    toast.info(`Showing ${productsToSync} products ready to sync`);
  };

  const handleGenerateAll = () => {
    if (productsWithoutTags === 0) {
      toast.info('All products already have tags');
      return;
    }
    setFilter('without-tags');
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

  // Rest of the functions remain the same as previous version...
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

  const handleBulkGenerate = async (productIds: string[], force = false) => {
    setGenerating(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: productIds.length });

    // ... rest of bulk generate logic
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
              <div className="text-3xl md:text-4xl font-bold text-orange-600">{tagCompletionRate}%</div>
              <div className="text-sm text-muted-foreground">Products tagged</div>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleWithTagsClick}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-green-900 dark:text-green-100">With Tags</h3>
            </div>
            <Badge className="bg-green-600 text-white hover:bg-green-700">
              {tagCompletionRate}%
            </Badge>
          </div>
          <p className="text-4xl font-bold text-green-900 dark:text-green-100 mb-1">{productsWithTags}</p>
          <p className="text-sm text-green-700 dark:text-green-300">Organized products • Click to view</p>
        </Card>

        <Card 
          className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleWithoutTagsClick}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-xl">
                <Plus className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">Without Tags</h3>
            </div>
          </div>
          <p className="text-4xl font-bold text-orange-900 dark:text-orange-100 mb-1">{productsWithoutTags}</p>
          <p className="text-sm text-orange-700 dark:text-orange-300">To optimize • Click to view</p>
        </Card>

        <Card 
          className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleToSyncClick}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
                <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">To Sync</h3>
            </div>
          </div>
          <p className="text-4xl font-bold text-blue-900 dark:text-blue-100 mb-1">{productsToSync}</p>
          <p className="text-sm text-blue-700 dark:text-blue-300">Ready for Shopify • Click to view</p>
        </Card>
      </div>

      {/* Rest of the component remains the same... */}
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

      {/* ... Rest of the component (products list, dialogs, etc.) */}
    </div>
  );
}