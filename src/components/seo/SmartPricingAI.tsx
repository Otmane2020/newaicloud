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
  CheckCheck,
  Percent,
  Calculator,
  ArrowUpDown
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProductPricing {
  id: string;
  title: string;
  image_url: string | null;
  collection_ids: string[];
  collection_names: string[];
  price: number | null;
  compare_at_price: number | null;
  cost_price: number | null;
  shopify_product_id: string | null;
  selected: boolean;
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
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
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

      // Fetch products with collection names
      const { data: productsData, error: productsError } = await supabase
        .from('shopify_products')
        .select('*')
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

          return {
            id: product.id,
            title: product.title || '',
            image_url: product.image_url || null,
            collection_ids: (product.collection_ids || []) as string[],
            collection_names: collectionNames,
            price: typeof product.price === 'number' ? product.price : null,
            compare_at_price: typeof product.compare_at_price === 'number' ? product.compare_at_price : null,
            cost_price: null,
            shopify_product_id: product.shopify_id ? String(product.shopify_id) : null,
            selected: false,
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

  const updateProductPrice = (productId: string, field: 'price' | 'compare_at_price' | 'cost_price', value: string) => {
    const numValue = parseFloat(value) || null;
    setProducts(prev =>
      prev.map(p =>
        p.id === productId ? { ...p, [field]: numValue } : p
      )
    );
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

  const filteredProducts = selectedCollection === 'all'
    ? products
    : products.filter(p => p.collection_ids.includes(selectedCollection));

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
            <h2 className="text-2xl font-bold mb-2">Smart Pricing AI</h2>
            <p className="text-muted-foreground">
              Gérez vos prix, remises et marges par collection avec synchronisation Shopify instantanée
            </p>
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

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
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
                <th className="p-4 text-left">Collection(s)</th>
                <th className="p-4 text-right">Prix</th>
                <th className="p-4 text-right">Prix comparé</th>
                <th className="p-4 text-center">Remise</th>
                <th className="p-4 text-right">Prix de revient</th>
                <th className="p-4 text-center">Marge</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const discount = calculateDiscount(product.price || 0, product.compare_at_price);
                const margin = calculateMargin(product.price || 0, product.cost_price);

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
                      <div className="flex flex-wrap gap-1">
                        {product.collection_names.map((name, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={product.price || ''}
                        onChange={(e) => updateProductPrice(product.id, 'price', e.target.value)}
                        className="w-24 text-right"
                      />
                    </td>
                    <td className="p-4 text-right">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={product.compare_at_price || ''}
                        onChange={(e) => updateProductPrice(product.id, 'compare_at_price', e.target.value)}
                        className="w-24 text-right"
                      />
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
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={product.cost_price || ''}
                        onChange={(e) => updateProductPrice(product.id, 'cost_price', e.target.value)}
                        className="w-24 text-right"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-4 text-center">
                      {margin > 0 ? (
                        <Badge
                          variant="outline"
                          className={`gap-1 ${
                            margin >= 40
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : margin >= 20
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          <TrendingUp className="w-3 h-3" />
                          {margin}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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
