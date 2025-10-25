import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
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
}

type QuickFilterTab = 'all' | 'not-enriched' | 'enriched' | 'pending-sync' | 'synced';

export function SeoOptimization() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<QuickFilterTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const ITEMS_PER_PAGE = 50;

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shopify_products')
        .select('*')
        .order('imported_at', { ascending: false });

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
    if (activeTab === 'not-enriched' && product.enrichment_status === 'enriched') return false;
    if (activeTab === 'enriched' && product.enrichment_status !== 'enriched') return false;
    if (activeTab === 'pending-sync' && (product.enrichment_status !== 'enriched' || product.seo_synced_to_shopify)) return false;
    if (activeTab === 'synced' && !product.seo_synced_to_shopify) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return product.title.toLowerCase().includes(term);
    }

    return true;
  });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
    const productsToGenerate = products.filter(
      p => selectedProducts.has(p.id) && (!p.seo_title || !p.seo_description)
    );

    if (productsToGenerate.length === 0) {
      toast.info('Aucun produit à optimiser');
      return;
    }

    setGenerating(true);
    setProgress({ current: 0, total: productsToGenerate.length });

    for (let i = 0; i < productsToGenerate.length; i++) {
      try {
        await supabase.functions.invoke('generate-seo-with-deepseek', {
          body: { productId: productsToGenerate[i].id }
        });
        setProgress({ current: i + 1, total: productsToGenerate.length });
      } catch (error) {
        console.error('Error generating SEO:', error);
      }
    }

    setGenerating(false);
    setProgress({ current: 0, total: 0 });
    setSelectedProducts(new Set());
    toast.success('Génération SEO terminée');
    await fetchProducts();
  };

  const handleGenerateAll = async () => {
    const productsToGenerate = products.filter(p => !p.seo_title || !p.seo_description);

    if (productsToGenerate.length === 0) {
      toast.info('Tous les produits sont déjà optimisés');
      return;
    }

    setGenerating(true);
    setProgress({ current: 0, total: productsToGenerate.length });

    const BATCH_SIZE = 3;
    for (let i = 0; i < productsToGenerate.length; i += BATCH_SIZE) {
      const batch = productsToGenerate.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (product) => {
        try {
          await supabase.functions.invoke('generate-seo-with-deepseek', {
            body: { productId: product.id }
          });
        } catch (error) {
          console.error('Error generating SEO:', error);
        }
      }));

      setProgress({ current: Math.min(i + BATCH_SIZE, productsToGenerate.length), total: productsToGenerate.length });
    }

    setGenerating(false);
    setProgress({ current: 0, total: 0 });
    toast.success('Génération SEO terminée');
    await fetchProducts();
  };

  const handleSyncSelected = async () => {
    const productsToSync = products.filter(
      p => selectedProducts.has(p.id) && p.enrichment_status === 'enriched'
    );

    if (productsToSync.length === 0) {
      toast.info('Aucun produit à synchroniser');
      return;
    }

    setSyncing(true);
    setProgress({ current: 0, total: productsToSync.length });

    for (let i = 0; i < productsToSync.length; i++) {
      try {
        await supabase.functions.invoke('sync-seo-to-shopify', {
          body: { productId: productsToSync[i].id }
        });
        setProgress({ current: i + 1, total: productsToSync.length });
      } catch (error) {
        console.error('Error syncing:', error);
      }
    }

    setSyncing(false);
    setProgress({ current: 0, total: 0 });
    setSelectedProducts(new Set());
    toast.success('Synchronisation terminée');
    await fetchProducts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const notEnrichedCount = products.filter(p => p.enrichment_status !== 'enriched').length;
  const enrichedCount = products.filter(p => p.enrichment_status === 'enriched').length;
  const pendingSyncCount = products.filter(p => p.enrichment_status === 'enriched' && !p.seo_synced_to_shopify).length;
  const syncedCount = products.filter(p => p.seo_synced_to_shopify).length;
  const optimizationRate = products.length > 0 ? Math.round((enrichedCount / products.length) * 100) : 0;

  const tabs = [
    { id: 'all' as QuickFilterTab, label: 'Tous', count: products.length },
    { id: 'not-enriched' as QuickFilterTab, label: 'Non enrichis', count: notEnrichedCount },
    { id: 'enriched' as QuickFilterTab, label: 'Enrichis', count: enrichedCount },
    { id: 'pending-sync' as QuickFilterTab, label: 'À synchroniser', count: pendingSyncCount },
    { id: 'synced' as QuickFilterTab, label: 'Synchronisés', count: syncedCount }
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner with CTA */}
      <Card className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950 dark:via-purple-950 dark:to-pink-950 border-2 border-primary/20 p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Optimisation SEO Intelligente
              </h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Boostez votre visibilité avec des meta tags optimisés par IA. Augmentez votre trafic organique jusqu'à 50% en quelques clics.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-medium">+50% de trafic organique</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="font-medium">SEO optimisé</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-yellow-600" />
                <span className="font-medium">Automation complète</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              onClick={handleGenerateAll}
              disabled={generating || notEnrichedCount === 0}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2 shadow-lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Optimisation en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Optimiser Tout ({notEnrichedCount})
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {notEnrichedCount} produits à optimiser
            </p>
          </div>
        </div>
      </Card>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <Package className="w-6 h-6 text-gray-600 dark:text-gray-400" />
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
              <h3 className="font-semibold text-green-900 dark:text-green-100">Optimisés</h3>
            </div>
            <Badge className="bg-green-600 text-white">{optimizationRate}%</Badge>
          </div>
          <p className="text-4xl font-bold text-green-900 dark:text-green-100 mb-1">{enrichedCount}</p>
          <p className="text-sm text-green-700 dark:text-green-300">Sur {products.length} produits</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">À synchroniser</h3>
            </div>
          </div>
          <p className="text-4xl font-bold text-blue-900 dark:text-blue-100 mb-1">{pendingSyncCount}</p>
          <p className="text-sm text-blue-700 dark:text-blue-300">Prêts pour Shopify</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
                <Upload className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">Synchronisés</h3>
            </div>
          </div>
          <p className="text-4xl font-bold text-purple-900 dark:text-purple-100 mb-1">{syncedCount}</p>
          <p className="text-sm text-purple-700 dark:text-purple-300">Actifs sur Shopify</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="bg-background border rounded-lg p-1 flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setCurrentPage(1);
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

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher des produits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedProducts.size > 0 && (
            <>
              <Button
                onClick={handleGenerateForSelected}
                disabled={generating}
                className="gap-2"
                variant="secondary"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Générer ({selectedProducts.size})
                  </>
                )}
              </Button>
              <Button
                onClick={handleSyncSelected}
                disabled={syncing}
                className="gap-2"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Synchro...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Synchroniser ({selectedProducts.size})
                  </>
                )}
              </Button>
            </>
          )}
          <Button variant="outline" size="icon" onClick={fetchProducts}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      {(generating || syncing) && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">
              {generating ? 'Génération SEO...' : 'Synchronisation...'}
            </span>
            <span className="text-sm text-muted-foreground">
              {progress.current} / {progress.total}
            </span>
          </div>
          <Progress value={(progress.current / progress.total) * 100} className="h-2" />
        </Card>
      )}

      {/* Products Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold min-w-[250px]">Produit</th>
                <th className="px-4 py-3 text-left font-semibold min-w-[150px]">Catégorie</th>
                <th className="px-4 py-3 text-left font-semibold min-w-[300px]">Titre SEO</th>
                <th className="px-4 py-3 text-left font-semibold min-w-[350px]">Description SEO</th>
                <th className="px-4 py-3 text-left font-semibold min-w-[150px]">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.image_url && (
                        <img src={product.image_url} alt={product.title} className="w-12 h-12 object-cover rounded" />
                      )}
                      <div>
                        <div className="font-medium line-clamp-1">{product.title}</div>
                        <div className="text-xs text-muted-foreground">{product.vendor}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{product.category || '-'}</div>
                    <div className="text-xs text-muted-foreground">{product.sub_category || '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="line-clamp-2">{product.seo_title || '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="line-clamp-2">{product.seo_description || '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {product.enrichment_status === 'enriched' ? (
                        <Badge variant="secondary" className="gap-1 w-fit">
                          <Sparkles className="w-3 h-3" />
                          Enrichi
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 w-fit">
                          <Clock className="w-3 h-3" />
                          Non enrichi
                        </Badge>
                      )}
                      {product.seo_synced_to_shopify && (
                        <Badge variant="default" className="gap-1 w-fit bg-green-500">
                          <CheckCircle className="w-3 h-3" />
                          Synchronisé
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
            <div className="text-sm text-muted-foreground">
              Affichage {startIndex + 1} à {Math.min(startIndex + ITEMS_PER_PAGE, filteredProducts.length)} sur {filteredProducts.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>
              <span className="text-sm">
                Page {currentPage} sur {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}