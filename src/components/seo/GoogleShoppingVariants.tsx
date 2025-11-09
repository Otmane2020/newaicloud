import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ShoppingBag, 
  TrendingUp, 
  Package, 
  AlertCircle,
  Search,
  Loader2,
  Upload,
  Sparkles,
  RefreshCw,
  Zap,
  CheckCircle,
  BookOpen
} from 'lucide-react';
import { ShopifyOptimizationGuide } from './ShopifyOptimizationGuide';

interface ProductVariant {
  id: string;
  product_id: string;
  product_title: string;
  variant_title: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  image_url: string | null;
  product_image_url: string | null;
  optimized_title: string | null;
  optimized_description: string | null;
  google_product_category: string | null;
  google_mpn: string | null;
  google_condition: string | null;
  google_gtin: string | null;
  google_brand: string | null;
  seo_synced_to_shopify: boolean;
}

export function GoogleShoppingVariants() {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [generatingGtin, setGeneratingGtin] = useState(false);
  const [globalOptimizing, setGlobalOptimizing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const fetchVariants = async () => {
    try {
      setLoading(true);
      
      // Fetch products with their variants
      const { data: products, error: productsError } = await supabase
        .from('shopify_products')
        .select(`
          id,
          title,
          image_url,
          vendor,
          optimized_title,
          optimized_description,
          google_product_category,
          google_mpn,
          google_condition,
          google_gtin,
          google_brand,
          seo_synced_to_shopify
        `)
        .order('title', { ascending: true });

      if (productsError) throw productsError;

      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variants')
        .select('*');

      if (variantsError) throw variantsError;

      // Create variant entries
      const variantsList: ProductVariant[] = [];
      
      for (const product of products || []) {
        const productVariants = variantsData?.filter(v => v.product_id === product.id) || [];
        
        if (productVariants.length > 0) {
          // Add each variant as a separate entry
          for (const variant of productVariants) {
            const variantTitle = `${variant.option1 || ''}${variant.option2 ? ' - ' + variant.option2 : ''}${variant.option3 ? ' - ' + variant.option3 : ''}`.trim();
            
            variantsList.push({
              id: variant.id,
              product_id: product.id,
              product_title: product.title,
              variant_title: variantTitle,
              option1: variant.option1,
              option2: variant.option2,
              option3: variant.option3,
              image_url: variant.image_url,
              product_image_url: product.image_url,
              optimized_title: product.optimized_title,
              optimized_description: product.optimized_description,
              google_product_category: product.google_product_category,
              google_mpn: product.google_mpn,
              google_condition: product.google_condition,
              google_gtin: product.google_gtin,
              google_brand: product.google_brand,
              seo_synced_to_shopify: product.seo_synced_to_shopify,
            });
          }
        } else {
          // Product without variants - single entry
          variantsList.push({
            id: product.id,
            product_id: product.id,
            product_title: product.title,
            variant_title: '',
            option1: null,
            option2: null,
            option3: null,
            image_url: null,
            product_image_url: product.image_url,
            optimized_title: product.optimized_title,
            optimized_description: product.optimized_description,
            google_product_category: product.google_product_category,
            google_mpn: product.google_mpn,
            google_condition: product.google_condition,
            google_gtin: product.google_gtin,
            google_brand: product.google_brand,
            seo_synced_to_shopify: product.seo_synced_to_shopify,
          });
        }
      }

      setVariants(variantsList);
    } catch (error) {
      console.error('Error fetching variants:', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVariants();
  }, []);

  const filteredVariants = variants.filter((variant) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      variant.product_title.toLowerCase().includes(term) ||
      variant.variant_title.toLowerCase().includes(term)
    );
  });

  const handleSelectAll = () => {
    if (selectedVariants.size === filteredVariants.length) {
      setSelectedVariants(new Set());
    } else {
      setSelectedVariants(new Set(filteredVariants.map(v => v.product_id)));
    }
  };

  const handleSelectVariant = (productId: string) => {
    const newSelected = new Set(selectedVariants);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedVariants(newSelected);
  };

  const handleOptimizeFeed = async () => {
    const productIds = Array.from(selectedVariants);
    
    if (productIds.length === 0) {
      toast.info('Sélectionnez au moins un produit');
      return;
    }

    try {
      setOptimizing(true);
      toast.info(`Optimisation de ${productIds.length} produit(s)...`);
      
      const { data, error } = await supabase.functions.invoke('optimize-shopping-feed', {
        body: { productIds }
      });

      if (error) throw error;

      const successCount = data.results.filter((r: any) => r.status === 'success').length;
      const errorCount = data.results.filter((r: any) => r.status === 'error').length;

      toast.success(`Optimisation terminée ! ${successCount} succès, ${errorCount} erreurs`);
      setSelectedVariants(new Set());
      await fetchVariants();
    } catch (error) {
      console.error('Error optimizing feed:', error);
      toast.error('Erreur lors de l\'optimisation');
    } finally {
      setOptimizing(false);
    }
  };

  const handleGenerateGTIN = async () => {
    const productIds = Array.from(selectedVariants);
    
    if (productIds.length === 0) {
      toast.info('Sélectionnez au moins un produit');
      return;
    }

    try {
      setGeneratingGtin(true);
      toast.info(`Génération des GTIN pour ${productIds.length} produit(s)...`);
      
      const { data, error } = await supabase.functions.invoke('generate-gtin', {
        body: { productIds, countryCode: 'FR' }
      });

      if (error) throw error;

      const generatedCount = data.results.filter((r: any) => r.status === 'generated').length;
      const existingCount = data.results.filter((r: any) => r.status === 'existing').length;

      toast.success(`GTIN générés ! ${generatedCount} nouveaux, ${existingCount} existants`);
      await fetchVariants();
    } catch (error) {
      console.error('Error generating GTIN:', error);
      toast.error('Erreur lors de la génération des GTIN');
    } finally {
      setGeneratingGtin(false);
    }
  };

  const handleOptimizeAll = async () => {
    const allProductIds = Array.from(new Set(variants.map(v => v.product_id)));
    
    if (allProductIds.length === 0) {
      toast.info('Aucun produit à optimiser');
      return;
    }

    try {
      setGlobalOptimizing(true);
      const toastId = toast.loading(`Optimisation complète de ${allProductIds.length} produit(s)...`);
      
      // Step 1: Optimize titles, descriptions, categories, brands
      const { data: optimizeData, error: optimizeError } = await supabase.functions.invoke('optimize-shopping-feed', {
        body: { productIds: allProductIds }
      });

      if (optimizeError) {
        console.error('Optimize error:', optimizeError);
        throw new Error(optimizeError.message || 'Erreur d\'optimisation');
      }

      // Step 2: Generate GTINs
      const { data: gtinData, error: gtinError } = await supabase.functions.invoke('generate-gtin', {
        body: { productIds: allProductIds, countryCode: 'FR' }
      });

      if (gtinError) {
        console.error('GTIN error:', gtinError);
        throw new Error(gtinError.message || 'Erreur de génération GTIN');
      }

      const optimizeSuccess = optimizeData?.results?.filter((r: any) => r.status === 'success').length || 0;
      const gtinGenerated = gtinData?.results?.filter((r: any) => r.status === 'generated').length || 0;

      toast.success(`Optimisation terminée ! ${optimizeSuccess} produits optimisés, ${gtinGenerated} GTIN générés`, { id: toastId });
      await fetchVariants();
    } catch (error) {
      console.error('Error in global optimization:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'optimisation globale');
    } finally {
      setGlobalOptimizing(false);
    }
  };

  const handleSyncSelected = async () => {
    const productIds = Array.from(selectedVariants);
    
    if (productIds.length === 0) {
      toast.info('Sélectionnez au moins un produit');
      return;
    }

    setSyncing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const productId of productIds) {
      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-seo-to-shopify`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            productId, 
            syncGoogleShopping: true
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error('Error syncing:', error);
        errorCount++;
      }
    }

    setSyncing(false);
    setSelectedVariants(new Set());
    
    toast.success(`Synchronisation terminée: ${successCount} succès, ${errorCount} erreurs`);
    await fetchVariants();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const uniqueProducts = new Set(variants.map(v => v.product_id)).size;
  const optimizedProducts = new Set(
    variants.filter(v => v.google_product_category).map(v => v.product_id)
  ).size;
  const toSyncProducts = new Set(
    variants.filter(v => v.google_product_category && !v.seo_synced_to_shopify).map(v => v.product_id)
  ).size;
  const completionRate = uniqueProducts > 0 ? Math.round((optimizedProducts / uniqueProducts) * 100) : 0;

  // Calcul du score d'optimisation basé sur les signaux produits
  const calculateOptimizationScore = () => {
    if (uniqueProducts === 0) return 0;
    
    let totalScore = 0;
    const productIds = new Set(variants.map(v => v.product_id));
    
    productIds.forEach(productId => {
      const productVariants = variants.filter(v => v.product_id === productId);
      const product = productVariants[0];
      let productScore = 0;
      const maxScore = 7;
      
      if (product.google_product_category) productScore++;
      if (product.google_gtin) productScore++;
      if (product.google_brand) productScore++;
      if (product.google_mpn) productScore++;
      if (product.google_condition) productScore++;
      if (product.optimized_title) productScore++;
      if (product.optimized_description) productScore++;
      
      totalScore += (productScore / maxScore) * 100;
    });
    
    return Math.round(totalScore / uniqueProducts);
  };
  
  const optimizationScore = calculateOptimizationScore();

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white shadow-xl">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Google Shopping - Optimisation</h1>
              <p className="text-white/90 text-lg">
                Donnez les bons signaux produits dans Shopify pour gagner en visibilité dans Google Shopping
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/80 mb-1">Score d'optimisation</div>
              <div className="text-4xl font-bold">{optimizationScore}%</div>
              <div className="text-sm text-white/80 mt-1">
                {optimizationScore >= 80 ? '🎉 Excellent' : 
                 optimizationScore >= 60 ? '👍 Bien' : 
                 optimizationScore >= 40 ? '⚠️ À améliorer' : 
                 '❌ Faible'}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setShowGuide(true)}
              className="bg-white text-purple-600 hover:bg-white/90"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Guide d'optimisation Shopify
            </Button>
            <Button
              onClick={handleOptimizeAll}
              disabled={globalOptimizing || variants.length === 0}
              size="lg"
              className="bg-white/20 hover:bg-white/30 border-white border text-white"
            >
              {globalOptimizing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Optimisation en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Optimiser Tout
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 hover:shadow-lg transition-shadow border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-muted-foreground">Produits</h3>
            <Package className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold">{uniqueProducts}</p>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-muted-foreground">Optimisés</h3>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{optimizedProducts}</p>
          <p className="text-xs text-muted-foreground mt-1">{completionRate}% complétés</p>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-muted-foreground">Variantes</h3>
            <CheckCircle className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{variants.length}</p>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow border-orange-500/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-muted-foreground">À sync</h3>
            <AlertCircle className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-600">{toSyncProducts}</p>
        </Card>
      </div>

      {/* Search & Actions */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={fetchVariants}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleOptimizeFeed}
              disabled={optimizing || selectedVariants.size === 0}
              className="gap-2"
            >
              {optimizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Optimisation...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Optimiser le Feed ({selectedVariants.size})
                </>
              )}
            </Button>
            
            <Button
              onClick={handleGenerateGTIN}
              disabled={generatingGtin || selectedVariants.size === 0}
              variant="outline"
              className="gap-2"
            >
              {generatingGtin ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Générer GTIN ({selectedVariants.size})
                </>
              )}
            </Button>
            
            <Button
              onClick={handleSyncSelected}
              disabled={syncing || selectedVariants.size === 0}
              variant="secondary"
              className="gap-2"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Synchroniser ({selectedVariants.size})
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Variants Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedVariants.size === new Set(filteredVariants.map(v => v.product_id)).size && filteredVariants.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Titre Optimisé</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>GTIN</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVariants.map((variant) => {
                const displayTitle = variant.optimized_title || 
                  `${variant.product_title}${variant.variant_title ? ' - ' + variant.variant_title : ''}`;
                const imageUrl = variant.image_url || variant.product_image_url;
                
                return (
                  <TableRow key={variant.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedVariants.has(variant.product_id)}
                        onCheckedChange={() => handleSelectVariant(variant.product_id)}
                      />
                    </TableCell>
                    <TableCell>
                      {imageUrl ? (
                        <img src={imageUrl} alt={displayTitle} className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="font-medium truncate">{displayTitle}</div>
                      {variant.variant_title && (
                        <div className="text-xs text-muted-foreground">{variant.variant_title}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{variant.google_product_category || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{variant.google_brand || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">{variant.google_gtin || '-'}</span>
                    </TableCell>
                    <TableCell>
                      {variant.seo_synced_to_shopify ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Sync
                        </Badge>
                      ) : variant.google_product_category ? (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          À sync
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Non optimisé
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ShopifyOptimizationGuide open={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}
