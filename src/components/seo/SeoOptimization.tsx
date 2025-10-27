import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { OptimizationProgressDialog } from './OptimizationProgressDialog';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [isOptimizationComplete, setIsOptimizationComplete] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { limits, loading: limitsLoading, refresh: refreshLimits } = useUsageLimits();

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
    // Check usage limits
    if (!limits?.canUseOptimizations) {
      toast.error('Limite d\'essai atteinte. Activez votre abonnement pour continuer.');
      setShowUpgradeDialog(true);
      return;
    }

    const productsToGenerate = products.filter(
      p => selectedProducts.has(p.id) && (!p.seo_title || !p.seo_description)
    );

    if (productsToGenerate.length === 0) {
      toast.info('Aucun produit à optimiser');
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
        if (error.message?.includes('trial_limit_reached')) {
          toast.error('Limite d\'essai atteinte.');
          setShowUpgradeDialog(true);
          break;
        }
      }
    }

    setGenerating(false);
    setIsOptimizationComplete(true);
    await fetchProducts();
    await refreshLimits();
  };

  const handleGenerateAll = async () => {
    // Check usage limits
    if (!limits?.canUseOptimizations) {
      toast.error('Limite d\'essai atteinte. Activez votre abonnement pour continuer.');
      setShowUpgradeDialog(true);
      return;
    }

    const productsToGenerate = products.filter(p => !p.seo_title || !p.seo_description);

    if (productsToGenerate.length === 0) {
      toast.info('Tous les produits sont déjà optimisés');
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
            toast.error('Limite d\'essai atteinte.');
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
      toast.info('Aucun produit à synchroniser');
      return;
    }

    setShowProgressDialog(false);
    setSyncing(true);
    setProgress({ current: 0, total: productsToSync.length });

    for (let i = 0; i < productsToSync.length; i++) {
      try {
        await supabase.functions.invoke('sync-seo-to-shopify', {
          body: { 
            productId: productsToSync[i].id,
            syncTags: true,
            syncGoogleShopping: true
          }
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

  const handleCloseProgressDialog = () => {
    setShowProgressDialog(false);
    setIsOptimizationComplete(false);
    setSelectedProducts(new Set());
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
      {/* Usage limits alert */}
      {limits && limits.isTrialing && (
        <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <AlertDescription className="text-sm">
            {limits.limitReached.optimizations ? (
              <span className="text-orange-900 dark:text-orange-100 font-medium">
                ⚠️ Limite d'essai atteinte : {limits.usage.optimizations_count}/{limits.limits.max_optimizations} optimisations utilisées
              </span>
            ) : (
              <span>
                📊 Essai gratuit : {limits.usage.optimizations_count}/{limits.limits.max_optimizations} optimisations utilisées
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

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

      {/* Filters & Stats */}
      <Card className="p-6">
        <div className="flex flex-wrap gap-3 mb-6">
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

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedProducts.size === filteredProducts.length ? 'Désélectionner' : 'Tout sélectionner'}
            </Button>
            <Button
              size="sm"
              onClick={handleGenerateForSelected}
              disabled={generating || selectedProducts.size === 0}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Optimiser ({selectedProducts.size})
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Products List */}
      <div className="space-y-3">
        {paginatedProducts.map((product) => (
          <Card key={product.id} className="p-4 hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={selectedProducts.has(product.id)}
                onChange={() => handleSelectProduct(product.id)}
                className="w-5 h-5"
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
                {product.seo_title && (
                  <p className="text-xs text-green-600 mt-1">✓ SEO optimisé</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={product.enrichment_status === 'enriched' ? 'default' : 'secondary'}>
                  {product.enrichment_status === 'enriched' ? 'Enrichi' : 'En attente'}
                </Badge>
                {product.seo_synced_to_shopify && (
                  <Badge variant="outline" className="bg-green-50">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Synchro
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}
      
      <OptimizationProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        title="Optimisation SEO en cours"
        current={progress.current}
        total={progress.total}
        isComplete={isOptimizationComplete}
        onSyncClick={handleSyncSelected}
        onClose={handleCloseProgressDialog}
      />
      
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType="optimizations"
        usage={limits?.usage.optimizations_count}
        limit={limits?.limits.max_optimizations}
      />
    </div>
  );
}
