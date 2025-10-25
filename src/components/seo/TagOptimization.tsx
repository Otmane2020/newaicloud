import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, RefreshCw, Tags, Plus, X, Loader2 } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Tags className="w-8 h-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Optimisation des Tags</h2>
            <p className="text-muted-foreground">
              Gérez les tags de vos produits pour améliorer leur organisation
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Total de produits : <span className="font-semibold">{products.length}</span>
        </div>
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
          <div key={product.id} className="bg-card border rounded-lg overflow-hidden hover:shadow-md transition">
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
                    className="w-full gap-2"
                  >
                    <Plus className="w-3 h-3" />
                    {product.tags ? 'Modifier les tags' : 'Ajouter des tags'}
                  </Button>
                </div>
              )}
            </div>
          </div>
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