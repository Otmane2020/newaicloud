import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
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
  CheckCircle
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  tags: string;
  vendor: string;
  category: string;
  image_url: string;
}

export function TagOptimization() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editTags, setEditTags] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shopify_products')
        .select('id, title, tags, vendor, category, image_url')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const productsWithTags = products.filter(p => p.tags).length;
  const productsWithoutTags = products.length - productsWithTags;
  const tagCompletionRate = products.length > 0 ? Math.round((productsWithTags / products.length) * 100) : 0;

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
      </div>

      {/* Search */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher par produit, tag ou catégorie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchProducts}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Products Grid */}
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

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <Tags className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun produit trouvé</p>
        </div>
      )}
    </div>
  );
}