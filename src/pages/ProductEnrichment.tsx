import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Zap, Sparkles, Loader2, CheckCircle, Package, RefreshCw } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  image_url: string;
  enrichment_status: string;
  ai_color: string | null;
  ai_material: string | null;
  ai_shape: string | null;
}

export default function ProductEnrichment() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shopify_products')
        .select('id, title, image_url, enrichment_status, ai_color, ai_material, ai_shape')
        .order('created_at', { ascending: false })
        .limit(100);

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

  const handleEnrichAll = async () => {
    const productsToEnrich = products.filter(p => p.enrichment_status !== 'enriched');
    if (productsToEnrich.length === 0) {
      toast.info('Tous les produits sont déjà enrichis');
      return;
    }
    await handleBulkEnrich(productsToEnrich.map(p => p.id));
  };

  const handleBulkEnrich = async (productIds: string[]) => {
    setEnriching(true);
    setProgress({ current: 0, total: productIds.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < productIds.length; i++) {
      try {
        const { data, error } = await supabase.functions.invoke('enrich-product', {
          body: { productId: productIds[i] }
        });

        if (error) throw error;
        if (data?.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error('Error enriching product:', error);
        errorCount++;
      }
      setProgress({ current: i + 1, total: productIds.length });
    }

    setEnriching(false);
    toast.success(`Enrichissement terminé: ${successCount} succès, ${errorCount} erreurs`);
    await fetchProducts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const enrichedProducts = products.filter(p => p.enrichment_status === 'enriched').length;
  const pendingProducts = products.length - enrichedProducts;
  const enrichmentRate = products.length > 0 ? Math.round((enrichedProducts / products.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 border-2 border-purple-200 p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-purple-600" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Enrichissement Produit IA
              </h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Détectez automatiquement les attributs IA (couleur, matériau, forme) pour améliorer les données de chat et recherche.
            </p>
          </div>
          <div className="flex flex-col gap-3 items-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600">{enrichmentRate}%</div>
              <div className="text-sm text-muted-foreground">Produits enrichis</div>
            </div>
            <Button
              size="lg"
              onClick={handleEnrichAll}
              disabled={enriching || pendingProducts === 0}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 gap-2 shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              Enrichir tout ({pendingProducts})
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-6 h-6 text-gray-600" />
            <h3 className="font-semibold">Total Produits</h3>
          </div>
          <p className="text-4xl font-bold">{products.length}</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="font-semibold text-green-900">Enrichis</h3>
          </div>
          <p className="text-4xl font-bold text-green-900">{enrichedProducts}</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-6 h-6 text-orange-600" />
            <h3 className="font-semibold text-orange-900">À enrichir</h3>
          </div>
          <p className="text-4xl font-bold text-orange-900">{pendingProducts}</p>
        </Card>
      </div>

      {/* Progress */}
      {enriching && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Enrichissement en cours...</span>
            <span className="text-sm text-muted-foreground">
              {progress.current} / {progress.total}
            </span>
          </div>
          <Progress value={(progress.current / progress.total) * 100} className="h-2" />
        </Card>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden hover:shadow-md transition">
            <div className="aspect-square bg-muted relative">
              <img 
                src={product.image_url} 
                alt={product.title} 
                className="w-full h-full object-cover" 
              />
              {product.enrichment_status === 'enriched' && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-green-600 text-white gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Enrichi
                  </Badge>
                </div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <h3 className="font-semibold line-clamp-2">{product.title}</h3>
              {product.enrichment_status === 'enriched' && (
                <div className="flex flex-wrap gap-1">
                  {product.ai_color && (
                    <Badge variant="outline" className="text-xs">
                      {product.ai_color}
                    </Badge>
                  )}
                  {product.ai_material && (
                    <Badge variant="outline" className="text-xs">
                      {product.ai_material}
                    </Badge>
                  )}
                  {product.ai_shape && (
                    <Badge variant="outline" className="text-xs">
                      {product.ai_shape}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Aucun produit à enrichir</p>
          <Button onClick={fetchProducts}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </Card>
      )}
    </div>
  );
}
