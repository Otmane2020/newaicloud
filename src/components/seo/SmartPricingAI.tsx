import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  DollarSign,
  TrendingUp,
  Package,
  Loader2,
  Upload,
  Download,
  CheckCheck,
  Percent,
  Calculator,
  ArrowUpDown,
  RefreshCw,
  Info,
  Truck
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CompetitorPrice {
  url: string;
  source: string;
  title: string;
  price: number;
  currency: string;
  similarity: number;
}

interface ProductPricing {
  id: string;
  title: string;
  image_url: string | null;
  collection_ids: string[];
  collection_names: string[];
  price: number | null;
  compare_at_price: number | null;
  cost_price: number | null;
  shipping_cost: number | null;
  sku: string | null;
  shopify_product_id: string | null;
  currency: string;
  selected: boolean;
  market_price: number | null;
  smart_price: number | null;
  net_margin: number | null;
  ai_reasoning: string | null;
  competitors: CompetitorPrice[];
}

interface BulkOperation {
  type: 'discount' | 'increase';
  method: 'percentage' | 'value';
  amount: number;
  collection: string;
}

export function SmartPricingAI() {
  const [products, setProducts] = useState<ProductPricing[]>([]);
  const [collections, setCollections] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [analyzingPrices, setAnalyzingPrices] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [taxRate, setTaxRate] = useState<number>(20); // Taux de TVA par défaut: 20%
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null);
  const [bulkOperation, setBulkOperation] = useState<BulkOperation>({
    type: 'discount',
    method: 'percentage',
    amount: 0,
    collection: 'all'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch collections
      const { data: collectionsData } = await supabase
        .from('shopify_collections')
        .select('id, title')
        .eq('user_id', user.id);

      setCollections(collectionsData || []);

      // Fetch products with collection names and variants (for SKU) + AI analysis data
      const { data: productsData, error: productsError } = await supabase
        .from('shopify_products')
        .select(`
          *,
          product_variants(sku, cost_price),
          market_price,
          smart_price,
          ai_reasoning,
          competitors,
          last_pricing_analysis
        `)
        .eq('seller_id', user.id);

      if (productsError) {
        console.error('Products error:', productsError);
        throw productsError;
      }

      if (productsData) {
        // Map collection IDs to names
        const enrichedProducts: ProductPricing[] = productsData.map(product => {
          const collectionNames = (product.collection_ids || [])
            .map(id => collectionsData?.find(c => c.id === id)?.title)
            .filter(Boolean) as string[];
          
          const firstVariant = (product as any).product_variants?.[0];

        return {
          id: product.id,
          title: product.title || '',
          image_url: product.image_url || null,
          collection_ids: (product.collection_ids || []) as string[],
          collection_names: collectionNames,
          price: typeof product.price === 'number' ? product.price : null,
          compare_at_price: typeof product.compare_at_price === 'number' ? product.compare_at_price : null,
          cost_price: typeof product.cost_price === 'number' ? product.cost_price : firstVariant?.cost_price || null,
          shipping_cost: typeof product.shipping_cost === 'number' ? product.shipping_cost : null,
          sku: firstVariant?.sku || null,
          shopify_product_id: product.shopify_id ? String(product.shopify_id) : null,
          currency: product.currency || 'EUR',
          selected: false,
          market_price: product.market_price || null,
          smart_price: product.smart_price || null,
          net_margin: null,
          ai_reasoning: product.ai_reasoning || null,
          competitors: Array.isArray(product.competitors) ? (product.competitors as unknown as CompetitorPrice[]) : [],
        };
        });

        setProducts(enrichedProducts);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const calculateDiscount = (price: number, comparePrice: number | null) => {
    if (!comparePrice || comparePrice <= price) return 0;
    return Math.round(((comparePrice - price) / comparePrice) * 100);
  };

  const calculateMargin = (price: number, costPrice: number | null) => {
    if (!costPrice || costPrice === 0) return 0;
    return Math.round(((price - costPrice) / price) * 100);
  };

  const calculateMarginValue = (price: number | null, costPrice: number | null, shippingCost: number | null = null) => {
    if (!price) return 0;
    const totalCost = (costPrice || 0) + (shippingCost || 0);
    return price - totalCost;
  };

  const calculateNetMargin = (price: number | null, costPrice: number | null, shippingCost: number | null = null) => {
    if (!price) return { value: 0, percentage: 0 };
    
    // Formule : (prix de vente - prix de livraison) / (1 + TVA%) - prix de revient = marge nette
    const priceAfterShipping = price - (shippingCost || 0);
    const priceBeforeTax = priceAfterShipping / (1 + taxRate / 100);
    const netMarginValue = priceBeforeTax - (costPrice || 0);
    const netMarginPercentage = costPrice && costPrice > 0 ? (netMarginValue / costPrice) * 100 : 0;
    
    return {
      value: netMarginValue,
      percentage: netMarginPercentage
    };
  };

  const updateProductPrice = async (productId: string, field: 'price' | 'compare_at_price' | 'cost_price' | 'shipping_cost', value: string) => {
    const numValue = parseFloat(value) || null;
    
    // Update local state
    setProducts(prev =>
      prev.map(p =>
        p.id === productId ? { ...p, [field]: numValue } : p
      )
    );

    // Save to database immediately
    try {
      const { error } = await supabase
        .from('shopify_products')
        .update({ [field]: numValue })
        .eq('id', productId);

      if (error) {
        console.error('Error updating price:', error);
        toast.error('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error updating price:', error);
    }
  };

  const toggleProductSelection = (productId: string) => {
    setProducts(prev =>
      prev.map(p =>
        p.id === productId ? { ...p, selected: !p.selected } : p
      )
    );
  };

  const toggleAllSelection = () => {
    const allSelected = products.every(p => p.selected);
    setProducts(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  };

  const applyBulkOperation = () => {
    setProducts(prev => {
      return prev.map(product => {
        // Check if product belongs to selected collection
        const matchesCollection = 
          bulkOperation.collection === 'all' ||
          product.collection_ids.includes(bulkOperation.collection);

        if (!matchesCollection) return product;

        const currentPrice = product.price || 0;
        let newPrice = currentPrice;
        let newComparePrice = product.compare_at_price;

        if (bulkOperation.type === 'discount') {
          // Apply discount
          if (bulkOperation.method === 'percentage') {
            newPrice = currentPrice * (1 - bulkOperation.amount / 100);
          } else {
            newPrice = currentPrice - bulkOperation.amount;
          }
          // Set compare_at_price to old price
          newComparePrice = currentPrice;
        } else {
          // Apply increase
          if (bulkOperation.method === 'percentage') {
            newPrice = currentPrice * (1 + bulkOperation.amount / 100);
          } else {
            newPrice = currentPrice + bulkOperation.amount;
          }
        }

        return {
          ...product,
          price: Math.max(0, Math.round(newPrice * 100) / 100),
          compare_at_price: newComparePrice
        };
      });
    });

    toast.success('💰 Modification appliquée avec succès');
  };

  const importCostsFromShopify = async () => {
    try {
      setImporting(true);
      setShowImportDialog(false);
      const toastId = toast.loading('🔄 Import des coûts en cours...', {
        description: 'Cette opération peut prendre plusieurs minutes'
      });

      const { data, error } = await supabase.functions.invoke('import-costs-from-shopify');

      if (error) {
        // Handle edge function not deployed error
        if (error.message.includes('not found') || error.message.includes('FunctionsRelayError')) {
          toast.error(
            '❌ La fonction d\'import n\'est pas encore déployée',
            {
              id: toastId,
              description: 'Veuillez patienter quelques instants et réessayer.'
            }
          );
          return;
        }
        throw error;
      }

      if (!data.success) {
        toast.error(`❌ ${data.error}`, { id: toastId });
        return;
      }

      toast.success(
        `✅ Import terminé : ${data.imported} coûts importés`,
        {
          id: toastId,
          description: data.errors > 0 
            ? `⚠️ ${data.errors} produits n'ont pas pu être importés`
            : 'Tous les coûts ont été récupérés avec succès'
        }
      );
      
      await fetchData();
    } catch (error: any) {
      console.error('Import costs error:', error);
      toast.error('❌ Erreur lors de l\'import', {
        description: error.message || 'Une erreur inattendue est survenue'
      });
    } finally {
      setImporting(false);
    }
  };

  const importShippingCosts = async () => {
    try {
      setImporting(true);
      const toastId = toast.loading('🚚 Import des frais de livraison...', {
        description: 'Estimation basée sur le poids des produits'
      });

      // Get first store (for now, assuming single store)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Utilisateur non connecté', { id: toastId });
        return;
      }

      const { data: stores, error: storesError } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (storesError || !stores || stores.length === 0) {
        toast.error('Aucune boutique Shopify connectée', { id: toastId });
        return;
      }

      const { data, error } = await supabase.functions.invoke('import-shipping-costs', {
        body: { storeId: stores[0].id }
      });

      if (error) {
        if (error.message.includes('not found') || error.message.includes('FunctionsRelayError')) {
          toast.error(
            '❌ La fonction d\'import n\'est pas encore déployée',
            {
              id: toastId,
              description: 'Veuillez patienter quelques instants et réessayer.'
            }
          );
          return;
        }
        throw error;
      }

      if (!data.success) {
        toast.error(`❌ ${data.error}`, { id: toastId });
        return;
      }

      toast.success(
        `✅ Frais de livraison Shopify importés`,
        {
          id: toastId,
          description: data.message || `${data.updated} produits mis à jour avec les tarifs réels`
        }
      );

      if (data.failed > 0) {
        toast.warning(`⚠️ ${data.failed} produits n'ont pas pu être traités`, {
          description: data.errors?.join(', ') || 'Certains produits n\'ont pas de tarifs disponibles'
        });
      }
      
      await fetchData();
    } catch (error: any) {
      console.error('Import shipping error:', error);
      toast.error('❌ Erreur lors de l\'import', {
        description: error.message || 'Une erreur inattendue est survenue'
      });
    } finally {
      setImporting(false);
    }
  };

  const analyzeCompetitorPrices = async (selectedOnly: boolean) => {
    try {
      setAnalyzingPrices(true);
      const productsToAnalyze = selectedOnly
        ? products.filter(p => p.selected)
        : products;

      if (productsToAnalyze.length === 0) {
        toast.error('Aucun produit sélectionné');
        return;
      }

      const toastId = toast.loading(`🤖 Analyse IA de ${productsToAnalyze.length} produit(s)...`, {
        description: 'Recherche des prix concurrents et calcul des prix optimaux'
      });

      const { data, error } = await supabase.functions.invoke('analyze-competitor-pricing', {
        body: { 
          productIds: productsToAnalyze.map(p => p.id),
          taxRate
        }
      });

      if (error) {
        if (error.message.includes('not found') || error.message.includes('FunctionsRelayError')) {
          toast.error('❌ Fonction d\'analyse non déployée', {
            id: toastId,
            description: 'Veuillez réessayer dans quelques instants.'
          });
          return;
        }
        throw error;
      }

      if (!data.success) {
        toast.error(`❌ ${data.error}`, { id: toastId });
        return;
      }

      // Update products with AI results AND save to database
      const successfulResults = data.results.filter((r: any) => !r.error);
      
      // Save AI results to database
      for (const result of successfulResults) {
        try {
          await supabase
            .from('shopify_products')
            .update({
              market_price: result.marketPrice,
              smart_price: result.smartPrice,
              ai_reasoning: result.reasoning,
              competitors: result.competitors || [],
              last_pricing_analysis: new Date().toISOString()
            })
            .eq('id', result.productId);
        } catch (error) {
          console.error('Error saving AI analysis:', error);
        }
      }

      setProducts(prev => prev.map(p => {
        const result = data.results.find((r: any) => r.productId === p.id);
        if (result && !result.error) {
          return {
            ...p,
            market_price: result.marketPrice,
            smart_price: result.smartPrice,
            net_margin: result.netMargin,
            ai_reasoning: result.reasoning,
            competitors: result.competitors || [],
          };
        }
        return p;
      }));

      toast.success(`✅ Analyse terminée : ${data.results.length} produit(s)`, {
        id: toastId,
        description: 'Prix intelligents calculés avec succès'
      });

      // Update last analysis time
      setLastAnalysisTime(new Date());

    } catch (error: any) {
      console.error('Price analysis error:', error);
      toast.error('❌ Erreur lors de l\'analyse', {
        description: error.message || 'Une erreur inattendue est survenue'
      });
    } finally {
      setAnalyzingPrices(false);
    }
  };

  const applySmartPrices = (selectedOnly: boolean) => {
    const productsToUpdate = selectedOnly
      ? products.filter(p => p.selected && p.smart_price)
      : products.filter(p => p.smart_price);

    if (productsToUpdate.length === 0) {
      toast.error('Aucun prix intelligent à appliquer');
      return;
    }

    setProducts(prev => prev.map(p => {
      if (productsToUpdate.find(pt => pt.id === p.id)) {
        return {
          ...p,
          compare_at_price: p.price, // Old price becomes compare price
          price: p.smart_price,
        };
      }
      return p;
    }));

    toast.success(`✅ Prix intelligents appliqués à ${productsToUpdate.length} produit(s)`);
  };

  const syncSingleProduct = async (productId: string) => {
    try {
      setSyncing(true);
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const toastId = toast.loading(`Synchronisation de ${product.title}...`);

      // Update price in database
      const { error: updateError } = await supabase
        .from('shopify_products')
        .update({
          price: product.price,
          compare_at_price: product.compare_at_price
        })
        .eq('id', productId);

      if (updateError) throw updateError;

      // Sync to Shopify
      const { error: syncError } = await supabase.functions.invoke('sync-pricing-to-shopify', {
        body: { 
          product_ids: [productId]
        }
      });

      if (syncError) throw syncError;

      toast.success(`✅ ${product.title} synchronisé`, { id: toastId });
      
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const syncToShopify = async (selectedOnly: boolean) => {
    try {
      setSyncing(true);
      const productsToSync = selectedOnly
        ? products.filter(p => p.selected)
        : products;

      if (productsToSync.length === 0) {
        toast.error('Aucun produit sélectionné');
        return;
      }

      const toastId = toast.loading(`Synchronisation de ${productsToSync.length} produit(s)...`);

      // Update prices in database
      const updates = productsToSync.map(p => ({
        id: p.id,
        seller_id: (p as any).seller_id, // Keep seller_id
        title: p.title,
        price: p.price,
        compare_at_price: p.compare_at_price
      }));

      const { error: updateError } = await supabase
        .from('shopify_products')
        .upsert(updates);

      if (updateError) throw updateError;

      // Sync to Shopify
      const { error: syncError } = await supabase.functions.invoke('sync-pricing-to-shopify', {
        body: { 
          product_ids: productsToSync.map(p => p.id)
        }
      });

      if (syncError) throw syncError;

      toast.success(`✅ ${productsToSync.length} produit(s) synchronisé(s)`, { id: toastId });
      
      // Unselect all after sync
      if (selectedOnly) {
        setProducts(prev => prev.map(p => ({ ...p, selected: false })));
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesCollection = selectedCollection === 'all' || product.collection_ids.includes(selectedCollection);
    const matchesSearch = !searchQuery || 
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCollection && matchesSearch;
  });

  const currency = products[0]?.currency || 'EUR';
  const currencySymbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';

  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    return `${price.toFixed(2)} ${currencySymbol}`;
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "à l'instant";
    if (diffMins < 60) return `il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  };

  const isAnalysisOld = () => {
    if (!lastAnalysisTime) return false;
    const diffMs = new Date().getTime() - lastAnalysisTime.getTime();
    return diffMs > 3600000; // older than 1 hour
  };

  const estimatedTime = Math.ceil(products.length * 0.5); // ~0.5 sec per product

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedCount = products.filter(p => p.selected).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950 dark:via-teal-950 dark:to-cyan-950 border-2 border-emerald-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500 rounded-xl">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold">Smart Pricing AI</h2>
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold px-3 py-1 text-xs shadow-lg animate-pulse">
                ✨ NEW
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Gérez vos prix, remises et marges par collection avec synchronisation Shopify instantanée
            </p>
          </div>
        </div>
      </Card>

      {/* Tax Rate Configuration */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950 dark:via-pink-950 dark:to-rose-950 border-2 border-purple-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-500 rounded-xl">
            <Percent className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Configuration des Taxes</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Définissez le taux de taxe (TVA) pour calculer automatiquement les marges nettes
            </p>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Taux de taxe :</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-24 text-right"
                />
                <span className="text-sm font-semibold">%</span>
              </div>
              <Badge variant="outline" className="ml-2">
                {taxRate}% appliqué aux calculs de marge nette
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Bulk Operations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Opérations en masse
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Select
            value={bulkOperation.collection}
            onValueChange={(value) => setBulkOperation(prev => ({ ...prev, collection: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Collection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les collections</SelectItem>
              {collections.map(col => (
                <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={bulkOperation.type}
            onValueChange={(value: 'discount' | 'increase') => setBulkOperation(prev => ({ ...prev, type: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="discount">Réduction</SelectItem>
              <SelectItem value="increase">Augmentation</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={bulkOperation.method}
            onValueChange={(value: 'percentage' | 'value') => setBulkOperation(prev => ({ ...prev, method: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Pourcentage (%)</SelectItem>
              <SelectItem value="value">Valeur (€)</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Montant"
            value={bulkOperation.amount || ''}
            onChange={(e) => setBulkOperation(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
          />

          <Button onClick={applyBulkOperation} className="gap-2">
            <ArrowUpDown className="w-4 h-4" />
            Appliquer
          </Button>
        </div>
      </Card>

      {/* Info Banner about shipping costs */}
      <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-2 border-green-200">
        <div className="flex items-start gap-3">
          <Truck className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-green-900 dark:text-green-100">
            <strong>🚚 Frais de livraison Shopify :</strong>
            <p className="mt-1 text-green-700 dark:text-green-300">
              Cliquez sur "Importer Livraison" pour récupérer les <strong>vrais tarifs de livraison</strong> depuis votre configuration Shopify 
              (basé sur une adresse France par défaut: Paris). Cette opération peut prendre 2-3 minutes.
            </p>
          </div>
        </div>
      </Card>

      {/* Last Analysis Banner */}
      {lastAnalysisTime && (
        <Card className={`p-4 ${isAnalysisOld() ? 'bg-orange-50 dark:bg-orange-950 border-orange-200' : 'bg-green-50 dark:bg-green-950 border-green-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className={`w-5 h-5 ${isAnalysisOld() ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'} flex-shrink-0`} />
              <div>
                <p className={`text-sm font-semibold ${isAnalysisOld() ? 'text-orange-900 dark:text-orange-100' : 'text-green-900 dark:text-green-100'}`}>
                  Dernière analyse IA : {getTimeAgo(lastAnalysisTime)}
                </p>
                {isAnalysisOld() && (
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    ⚠️ Les prix du marché peuvent avoir évolué. Relancez une analyse pour obtenir les données à jour.
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => analyzeCompetitorPrices(false)}
              disabled={analyzingPrices}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${analyzingPrices ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </Card>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Input
            type="text"
            placeholder="🔍 Rechercher par titre ou SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
          <Select value={selectedCollection} onValueChange={setSelectedCollection}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filtrer par collection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les collections</SelectItem>
              {collections.map(col => (
                <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline">{filteredProducts.length} produits</Badge>
          {selectedCount > 0 && (
            <Badge variant="default">{selectedCount} sélectionné(s)</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={() => analyzeCompetitorPrices(true)}
            disabled={analyzingPrices || syncing || selectedCount === 0}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {analyzingPrices ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Calculator className="w-4 h-4" />
            )}
            🤖 Analyser Prix IA
          </Button>
          <Button
            variant="secondary"
            onClick={() => applySmartPrices(true)}
            disabled={syncing || products.filter(p => p.selected && p.smart_price).length === 0}
            className="gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            Appliquer Smart Price
          </Button>
          <TooltipProvider>
            <Tooltip>
              <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <AlertDialogTrigger asChild>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={importing || syncing || products.length === 0}
                      className="gap-2"
                    >
                      {importing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Importer Coûts
                    </Button>
                  </TooltipTrigger>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Importer les coûts depuis Shopify ?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        Cette opération va récupérer les prix de revient de tous vos produits depuis Shopify.
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">⏱️ Temps estimé :</span>
                          <span>{estimatedTime} secondes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">📦 Produits à traiter :</span>
                          <span>{products.length}</span>
                        </div>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <p className="text-xs text-yellow-900 dark:text-yellow-100">
                          <strong>Note :</strong> Les frais de livraison ne seront pas importés 
                          car Shopify ne les stocke pas par produit. Seuls les prix de revient seront synchronisés.
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={importCostsFromShopify}>
                      Lancer l'import
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <TooltipContent>
                <p>Importe les prix de revient depuis Shopify</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ⚠️ Peut prendre plusieurs minutes
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="outline"
            onClick={importShippingCosts}
            disabled={importing || syncing || products.length === 0}
            className="gap-2"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Truck className="w-4 h-4" />
            )}
            Importer Livraison
          </Button>
          <Button
            variant="outline"
            onClick={() => syncToShopify(true)}
            disabled={syncing || selectedCount === 0}
            className="gap-2"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            Sync Sélection
          </Button>
          <Button
            onClick={() => syncToShopify(false)}
            disabled={syncing}
            className="gap-2"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Sync Tout
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="p-4 text-left">
                  <Checkbox
                    checked={products.length > 0 && products.every(p => p.selected)}
                    onCheckedChange={toggleAllSelection}
                  />
                </th>
                <th className="p-4 text-left">Produit</th>
                <th className="p-4 text-left">SKU</th>
                <th className="p-4 text-left">Collection(s)</th>
                <th className="p-4 text-right">Prix</th>
                <th className="p-4 text-right">Prix comparé</th>
                <th className="p-4 text-center">Remise</th>
                <th className="p-4 text-right">Prix de revient</th>
                <th className="p-4 text-right">Frais livraison</th>
                <th className="p-4 text-right">Marge Brute (€)</th>
                <th className="p-4 text-center">Marge Brute (%)</th>
                <th className="p-4 text-right">Marge Nette (€)</th>
                <th className="p-4 text-center">Marge Nette (%)</th>
                <th className="p-4 text-right">Market Price</th>
                <th className="p-4 text-right">Smart Price</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const discount = calculateDiscount(product.price || 0, product.compare_at_price);
                const grossMarginValue = calculateMarginValue(product.price, product.cost_price, product.shipping_cost);
                const grossMarginPercent = calculateMargin(product.price || 0, (product.cost_price || 0) + (product.shipping_cost || 0));
                const netMargin = calculateNetMargin(product.price, product.cost_price, product.shipping_cost);

                return (
                  <tr key={product.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <Checkbox
                        checked={product.selected}
                        onCheckedChange={() => toggleProductSelection(product.id)}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="max-w-[200px]">
                          <p className="font-medium line-clamp-2 text-sm">{product.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground font-mono">{product.sku || '-'}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {product.collection_names.map((name, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={product.price || ''}
                          onChange={(e) => updateProductPrice(product.id, 'price', e.target.value)}
                          className="w-24 text-right"
                        />
                        <span className="text-xs text-muted-foreground font-semibold">{currencySymbol}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={product.compare_at_price || ''}
                          onChange={(e) => updateProductPrice(product.id, 'compare_at_price', e.target.value)}
                          className="w-24 text-right"
                        />
                        <span className="text-xs text-muted-foreground font-semibold">{currencySymbol}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {discount > 0 ? (
                        <Badge variant="destructive" className="gap-1">
                          <Percent className="w-3 h-3" />
                          -{discount}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={product.cost_price || ''}
                          onChange={(e) => updateProductPrice(product.id, 'cost_price', e.target.value)}
                          className="w-24 text-right"
                          placeholder="0.00"
                        />
                        <span className="text-xs text-muted-foreground font-semibold">{currencySymbol}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={product.shipping_cost || ''}
                          onChange={(e) => updateProductPrice(product.id, 'shipping_cost', e.target.value)}
                          className="w-24 text-right"
                          placeholder="0.00"
                        />
                        <span className="text-xs text-muted-foreground font-semibold">{currencySymbol}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {product.price && (product.cost_price || product.shipping_cost) ? (
                        <div className="text-sm font-semibold">
                          {grossMarginValue >= 0 ? '+' : ''}{grossMarginValue.toFixed(2)} {currencySymbol}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {product.price && (product.cost_price || product.shipping_cost) ? (
                        <Badge
                          variant="outline"
                          className={`gap-1 ${
                            grossMarginPercent >= 40
                              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300'
                              : grossMarginPercent >= 20
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300'
                              : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          <TrendingUp className="w-3 h-3" />
                          {grossMarginPercent.toFixed(1)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {product.price ? (
                        <div className={`text-sm font-bold ${
                          netMargin.value >= 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {netMargin.value >= 0 ? '+' : ''}{netMargin.value.toFixed(2)} {currencySymbol}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {product.price ? (
                        <Badge
                          variant="outline"
                          className={`gap-1 font-semibold ${
                            netMargin.percentage >= 20
                              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300'
                              : netMargin.percentage >= 10
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300'
                              : netMargin.percentage >= 0
                              ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300'
                              : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          {netMargin.percentage >= 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingUp className="w-3 h-3 rotate-180" />
                          )}
                          {netMargin.percentage.toFixed(1)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {product.market_price ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                                {product.market_price.toFixed(2)} {currencySymbol}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md p-4">
                              {product.competitors && product.competitors.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="font-semibold text-xs mb-2">🔗 Sources utilisées pour le calcul ({product.competitors.length} trouvées):</p>
                                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                    {product.competitors.slice(0, 10).map((comp, idx) => (
                                      <a
                                        key={idx}
                                        href={comp.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col gap-0.5 p-2 rounded hover:bg-muted/50 transition-colors border border-border text-left"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-xs font-medium text-primary truncate">{comp.source}</span>
                                          <span className="text-xs font-bold whitespace-nowrap">{comp.price.toFixed(2)} {comp.currency}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <span className="truncate">{comp.title}</span>
                                          <Badge variant="outline" className="text-xs px-1 py-0">
                                            {Math.round(comp.similarity * 100)}% similaire
                                          </Badge>
                                        </div>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">Aucune source concurrente trouvée pour ce produit</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground text-xs">Non analysé</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {product.smart_price ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-end gap-2">
                                <Badge variant="secondary" className="gap-1">
                                  🤖 Analysé
                                </Badge>
                                <div className="text-sm font-bold text-purple-600 dark:text-purple-400 cursor-help">
                                  {product.smart_price.toFixed(2)} {currencySymbol}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md p-4">
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs font-semibold mb-1">🤖 Raisonnement IA :</p>
                                  <p className="text-xs text-muted-foreground">{product.ai_reasoning}</p>
                                </div>
                                {product.competitors && product.competitors.length > 0 && (
                                  <div className="border-t pt-3">
                                    <p className="text-xs font-semibold mb-2">🔗 Top 10 Concurrents :</p>
                                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                      {product.competitors.slice(0, 10).map((comp, idx) => (
                                        <a
                                          key={idx}
                                          href={comp.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex flex-col gap-0.5 p-2 rounded hover:bg-muted/50 transition-colors border border-border text-left"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-medium text-primary truncate">{comp.source}</span>
                                            <span className="text-xs font-bold whitespace-nowrap">{comp.price.toFixed(2)} {comp.currency}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="truncate">{comp.title}</span>
                                            <Badge variant="outline" className="text-xs px-1 py-0">
                                              {Math.round(comp.similarity * 100)}% similaire
                                            </Badge>
                                          </div>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground text-xs">Non calculé</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => syncSingleProduct(product.id)}
                              disabled={syncing}
                              className="gap-1"
                            >
                              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Synchroniser ce produit avec Shopify</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {filteredProducts.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Aucun produit trouvé</p>
          <p className="text-muted-foreground">
            Importez vos produits depuis Shopify pour commencer
          </p>
        </Card>
      )}
    </div>
  );
}
