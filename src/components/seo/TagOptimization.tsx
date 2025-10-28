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
  Zap
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
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    // Filter logic
    if (filter === 'with-tags' && !product.tags) return false;
    if (filter === 'without-tags' && product.tags) return false;
    if (filter === 'to-sync' && (product.seo_synced_to_shopify || !product.tags)) return false;

    // Search logic
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      product.title.toLowerCase().includes(term) ||
      product.tags?.toLowerCase().includes(term) ||
      product.category?.toLowerCase().includes(term)
    );
  });

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

      toast.success('Tags mis à jour avec succès');
      setEditingProduct(null);
      setEditTags('');
      await fetchProducts();
    } catch (error) {
      console.error('Error saving tags:', error);
      toast.error('Erreur lors de la sauvegarde des tags');
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

  const handleGenerateAll = async () => {
    const productsToGenerate = products.filter(p => !p.tags);
    if (productsToGenerate.length === 0) {
      toast.info('Tous les produits ont déjà des tags');
      return;
    }

    const remainingLimit = (limits?.limits.max_optimizations || 0) - (limits?.usage.optimizations_count || 0);
    
    if (productsToGenerate.length > remainingLimit) {
      if (limits?.isTrialing) {
        setShowUpgradeDialog(true);
        return;
      } else {
        toast.warning(`Limite atteinte. Seulement ${remainingLimit} produits seront optimisés.`);
        await handleBulkGenerate(productsToGenerate.slice(0, remainingLimit).map(p => p.id));
        return;
      }
    }

    await handleBulkGenerate(productsToGenerate.map(p => p.id));
  };

  const handleGenerateSelected = async (force = false) => {
    const productsToGenerate = force 
      ? Array.from(selectedProducts)
      : Array.from(selectedProducts).filter(id =>
          !products.find(p => p.id === id)?.tags
        );
    if (productsToGenerate.length === 0) {
      toast.info('Aucun produit sélectionné');
      return;
    }

    const remainingLimit = (limits?.limits.max_optimizations || 0) - (limits?.usage.optimizations_count || 0);
    
    if (productsToGenerate.length > remainingLimit) {
      if (limits?.isTrialing) {
        setShowUpgradeDialog(true);
        return;
      } else {
        toast.warning(`Limite atteinte. Seulement ${remainingLimit} produits seront optimisés.`);
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
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-tags`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
            // Get the updated product
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
    
    // Get updated products with new tags
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
      toast.info('Tous les produits sont synchronisés');
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
      toast.info('Aucun produit à synchroniser');
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
          errors.push(`Produit ${i + 1}: ${errorData.error || 'Erreur inconnue'}`);
          console.error(`Sync error for product ${productIds[i]}:`, errorData);
        }
      } catch (error) {
        console.error('Error syncing:', error);
        errorCount++;
        errors.push(`Produit ${i + 1}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
      setProgress({ current: i + 1, total: productIds.length });
    }

    setSyncing(false);
    setProgress({ current: 0, total: 0 });
    setSelectedProducts(new Set());
    
    if (errorCount > 0) {
      console.error('Sync errors:', errors);
      toast.error(`Synchronisation terminée: ${successCount} succès, ${errorCount} erreurs. Vérifiez vos identifiants Shopify.`);
    } else {
      toast.success(`Synchronisation réussie: ${successCount} produits synchronisés`);
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

  const productsWithTags = products.filter(p => p.tags).length;
  const productsWithoutTags = products.length - productsWithTags;
  const productsToSync = products.filter(p => p.tags && !p.seo_synced_to_shopify).length;
  const tagCompletionRate = products.length > 0 ? Math.round((productsWithTags / products.length) * 100) : 0;

  const filters = [
    { id: 'all' as FilterType, label: 'Tous', count: products.length },
    { id: 'with-tags' as FilterType, label: 'Avec tags', count: productsWithTags },
    { id: 'without-tags' as FilterType, label: 'Sans tags', count: productsWithoutTags },
    { id: 'to-sync' as FilterType, label: 'À synchroniser', count: productsToSync },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner with CTA */}
      <Card className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950 border-2 border-orange-200 p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Tags className="w-6 h-6 text-orange-600" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Optimisation des Tags
              </h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Organisez vos produits avec des tags pertinents. Améliorez la découvrabilité et augmentez vos conversions de 30%.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-orange-600" />
                <span className="font-medium">Organisation optimale</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-medium">+30% découvrabilité</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Hash className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Tags intelligents</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 items-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600">{tagCompletionRate}%</div>
              <div className="text-sm text-muted-foreground">Produits tagués</div>
            </div>
            <Button
              size="lg"
              onClick={() => toast.info('Taggez vos produits ci-dessous')}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 gap-2 shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              Commencer l'optimisation
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <Tags className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Total Produits</h3>
            </div>
          </div>
          <p className="text-4xl font-bold mb-1">{products.length}</p>
          <p className="text-sm text-muted-foreground">Dans votre catalogue</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-green-900 dark:text-green-100">Avec Tags</h3>
            </div>
            <Badge className="bg-green-600 text-white">{tagCompletionRate}%</Badge>
          </div>
          <p className="text-4xl font-bold text-green-900 dark:text-green-100 mb-1">{productsWithTags}</p>
          <p className="text-sm text-green-700 dark:text-green-300">Produits organisés</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-xl">
                <Plus className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">Sans Tags</h3>
            </div>
          </div>
          <p className="text-4xl font-bold text-orange-900 dark:text-orange-100 mb-1">{productsWithoutTags}</p>
          <p className="text-sm text-orange-700 dark:text-orange-300">À optimiser</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
                <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">À synchroniser</h3>
            </div>
          </div>
          <p className="text-4xl font-bold text-blue-900 dark:text-blue-100 mb-1">{productsToSync}</p>
          <p className="text-sm text-blue-700 dark:text-blue-300">Prêts pour Shopify</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-background border rounded-lg p-1 flex flex-wrap gap-1">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
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

      {/* Bulk Actions & Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher par produit, tag ou catégorie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4 mr-2" /> : <Grid3x3 className="w-4 h-4 mr-2" />}
              {viewMode === 'grid' ? 'Liste' : 'Grille'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAll}
              disabled={generating || productsWithoutTags === 0}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Optimiser tout
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateSelected(false)}
              disabled={generating || selectedProducts.size === 0}
            >
              <Zap className="w-4 h-4 mr-2" />
              Optimiser sélection ({selectedProducts.size})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateSelected(true)}
              disabled={generating || selectedProducts.size === 0}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Régénérer ({selectedProducts.size})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAll}
              disabled={syncing || productsToSync === 0}
            >
              <Upload className="w-4 h-4 mr-2" />
              Synchroniser tout
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncSelected}
              disabled={syncing || selectedProducts.size === 0}
            >
              <Upload className="w-4 h-4 mr-2" />
              Synchroniser sélection
            </Button>
            <Button variant="outline" size="icon" onClick={fetchProducts}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Progress */}
      {(generating || syncing) && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">
              {generating ? 'Génération des tags...' : 'Synchronisation...'}
            </span>
            <span className="text-sm text-muted-foreground">
              {progress.current} / {progress.total}
            </span>
          </div>
          <Progress value={(progress.current / progress.total) * 100} className="h-2" />
        </Card>
      )}

      {/* Products View */}
      {viewMode === 'list' ? (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  <Checkbox
                    checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold">Image</th>
                <th className="px-4 py-3 text-left font-semibold">Produit</th>
                <th className="px-4 py-3 text-left font-semibold">Tags</th>
                <th className="px-4 py-3 text-left font-semibold">Statut</th>
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
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium line-clamp-1">{product.title}</div>
                    <div className="text-xs text-muted-foreground">{product.vendor}</div>
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
                      <span className="text-xs text-muted-foreground italic">Aucun tag</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {product.tags ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              setGenerating(true);
                              const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-tags`;
                              const response = await fetch(apiUrl, {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ productId: product.id, force: true }),
                              });
                              const result = await response.json();
                              if (response.ok && result.success) {
                                toast.success('Tags régénérés avec succès');
                                await fetchProducts();
                              } else {
                                throw new Error(result.error || 'Erreur');
                              }
                            } catch (error) {
                              console.error('Error regenerating tags:', error);
                              toast.error('Erreur lors de la régénération');
                            } finally {
                              setGenerating(false);
                            }
                          }}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Régénérer
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Plus className="w-3 h-3" />
                        À optimiser
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-md transition group">
              <div className="aspect-square bg-muted relative">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                    placeholder="Tags séparés par des virgules"
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
                          Sauvegarde...
                        </>
                      ) : (
                        'Sauvegarder'
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
                      <span className="text-xs text-muted-foreground italic">Aucun tag</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditTags(product.id, product.tags)}
                    className="w-full gap-2 hover:bg-primary hover:text-primary-foreground"
                  >
                    <Plus className="w-3 h-3" />
                    {product.tags ? 'Modifier les tags' : 'Ajouter des tags'}
                  </Button>
                </div>
              )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <Tags className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun produit trouvé</p>
        </div>
      )}

      {/* Optimization Progress Dialog */}
      <OptimizationProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        title={generating ? "Optimisation des tags en cours" : "Synchronisation Shopify"}
        current={progress.current}
        total={progress.total}
        isComplete={isOptimizationComplete}
        onSyncClick={handleSyncSelected}
        onClose={handleCloseProgressDialog}
      />

      {/* Results Dialog */}
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

      {/* Upgrade Dialogs */}
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