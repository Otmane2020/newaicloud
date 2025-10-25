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
  Save,
  X,
  CheckCircle
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  image_url: string;
  google_product_category: string | null;
  google_gender: string | null;
  google_age_group: string | null;
  google_mpn: string | null;
  google_condition: string | null;
  google_custom_product: boolean | null;
  google_custom_label_0: string | null;
  google_custom_label_1: string | null;
  google_custom_label_2: string | null;
  google_custom_label_3: string | null;
  google_custom_label_4: string | null;
  seo_synced_to_shopify: boolean;
}

export function GoogleShopping() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shopify_products')
        .select(`
          id, 
          title, 
          image_url,
          google_product_category,
          google_gender,
          google_age_group,
          google_mpn,
          google_condition,
          google_custom_product,
          google_custom_label_0,
          google_custom_label_1,
          google_custom_label_2,
          google_custom_label_3,
          google_custom_label_4,
          seo_synced_to_shopify
        `)
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
    return product.title.toLowerCase().includes(term);
  });

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

  const handleEdit = (product: Product) => {
    setEditingProduct(product.id);
    setEditData({
      google_product_category: product.google_product_category || undefined,
      google_gender: product.google_gender || undefined,
      google_age_group: product.google_age_group || undefined,
      google_mpn: product.google_mpn || undefined,
      google_condition: product.google_condition || undefined,
      google_custom_product: product.google_custom_product || undefined,
      google_custom_label_0: product.google_custom_label_0 || undefined,
      google_custom_label_1: product.google_custom_label_1 || undefined,
      google_custom_label_2: product.google_custom_label_2 || undefined,
      google_custom_label_3: product.google_custom_label_3 || undefined,
      google_custom_label_4: product.google_custom_label_4 || undefined,
    });
  };

  const handleSave = async (productId: string) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('shopify_products')
        .update(editData)
        .eq('id', productId);

      if (error) throw error;

      toast.success('Données Google Shopping mises à jour');
      setEditingProduct(null);
      setEditData({});
      await fetchProducts();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditData({});
  };

  const handleSyncSelected = async () => {
    if (selectedProducts.size === 0) {
      toast.info('Sélectionnez au moins un produit');
      return;
    }

    setSyncing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const productId of Array.from(selectedProducts)) {
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
    setSelectedProducts(new Set());
    
    toast.success(`Synchronisation terminée: ${successCount} succès, ${errorCount} erreurs`);
    await fetchProducts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const productsOptimized = products.filter(p => p.google_product_category).length;
  const productsToSync = products.filter(p => p.google_product_category && !p.seo_synced_to_shopify).length;
  const completionRate = products.length > 0 ? Math.round((productsOptimized / products.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <ShoppingBag className="w-8 h-8 text-primary" />
          Google Shopping
        </h2>
        <p className="text-muted-foreground">
          Gérez et optimisez vos attributs Google Shopping pour améliorer la visibilité de vos produits
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Produits</h3>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold">{products.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Dans votre catalogue</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-900 dark:text-green-100">Optimisés</h3>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">{productsOptimized}</p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">{completionRate}% complétés</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-orange-900 dark:text-orange-100">À synchroniser</h3>
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{productsToSync}</p>
          <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">Prêts pour Shopify</p>
        </Card>
      </div>

      {/* Search & Actions */}
      <Card className="p-4">
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
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSyncSelected}
              disabled={syncing || selectedProducts.size === 0}
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
                  Synchroniser ({selectedProducts.size})
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={fetchProducts}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Catégorie Produit</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead>Groupe d'âge</TableHead>
                <TableHead>MPN</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Custom Product</TableHead>
                <TableHead>Label 0</TableHead>
                <TableHead>Label 1</TableHead>
                <TableHead>Label 2</TableHead>
                <TableHead>Label 3</TableHead>
                <TableHead>Label 4</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const isEditing = editingProduct === product.id;
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={() => handleSelectProduct(product.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.title} className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{product.title}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editData.google_product_category || ''}
                          onChange={(e) => setEditData({ ...editData, google_product_category: e.target.value })}
                          placeholder="Ex: Apparel & Accessories"
                          className="min-w-[200px]"
                        />
                      ) : (
                        <span className="text-sm">{product.google_product_category || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={editData.google_gender || ''}
                          onValueChange={(value) => setEditData({ ...editData, google_gender: value })}
                        >
                          <SelectTrigger className="min-w-[120px]">
                            <SelectValue placeholder="Genre" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Homme</SelectItem>
                            <SelectItem value="female">Femme</SelectItem>
                            <SelectItem value="unisex">Unisexe</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm">{product.google_gender || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={editData.google_age_group || ''}
                          onValueChange={(value) => setEditData({ ...editData, google_age_group: value })}
                        >
                          <SelectTrigger className="min-w-[120px]">
                            <SelectValue placeholder="Âge" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newborn">Nouveau-né</SelectItem>
                            <SelectItem value="infant">Bébé</SelectItem>
                            <SelectItem value="toddler">Bambin</SelectItem>
                            <SelectItem value="kids">Enfant</SelectItem>
                            <SelectItem value="adult">Adulte</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm">{product.google_age_group || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editData.google_mpn || ''}
                          onChange={(e) => setEditData({ ...editData, google_mpn: e.target.value })}
                          placeholder="MPN"
                          className="min-w-[120px]"
                        />
                      ) : (
                        <span className="text-sm">{product.google_mpn || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={editData.google_condition || ''}
                          onValueChange={(value) => setEditData({ ...editData, google_condition: value })}
                        >
                          <SelectTrigger className="min-w-[120px]">
                            <SelectValue placeholder="État" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Neuf</SelectItem>
                            <SelectItem value="refurbished">Reconditionné</SelectItem>
                            <SelectItem value="used">Occasion</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm">{product.google_condition || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Checkbox
                          checked={editData.google_custom_product || false}
                          onCheckedChange={(checked) => setEditData({ ...editData, google_custom_product: checked as boolean })}
                        />
                      ) : (
                        <Checkbox checked={product.google_custom_product || false} disabled />
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editData.google_custom_label_0 || ''}
                          onChange={(e) => setEditData({ ...editData, google_custom_label_0: e.target.value })}
                          placeholder="Label 0"
                          className="min-w-[120px]"
                        />
                      ) : (
                        <span className="text-sm">{product.google_custom_label_0 || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editData.google_custom_label_1 || ''}
                          onChange={(e) => setEditData({ ...editData, google_custom_label_1: e.target.value })}
                          placeholder="Label 1"
                          className="min-w-[120px]"
                        />
                      ) : (
                        <span className="text-sm">{product.google_custom_label_1 || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editData.google_custom_label_2 || ''}
                          onChange={(e) => setEditData({ ...editData, google_custom_label_2: e.target.value })}
                          placeholder="Label 2"
                          className="min-w-[120px]"
                        />
                      ) : (
                        <span className="text-sm">{product.google_custom_label_2 || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editData.google_custom_label_3 || ''}
                          onChange={(e) => setEditData({ ...editData, google_custom_label_3: e.target.value })}
                          placeholder="Label 3"
                          className="min-w-[120px]"
                        />
                      ) : (
                        <span className="text-sm">{product.google_custom_label_3 || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editData.google_custom_label_4 || ''}
                          onChange={(e) => setEditData({ ...editData, google_custom_label_4: e.target.value })}
                          placeholder="Label 4"
                          className="min-w-[120px]"
                        />
                      ) : (
                        <span className="text-sm">{product.google_custom_label_4 || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.seo_synced_to_shopify ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Synchronisé
                        </Badge>
                      ) : product.google_product_category ? (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          À synchroniser
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Non optimisé
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(product.id)}
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(product)}
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          Modifier
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold mb-3">
          Exigences Google Shopping
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">Champs Obligatoires :</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Catégorie de produit Google</li>
              <li>GTIN ou (Marque + MPN)</li>
              <li>Condition du produit</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Champs Recommandés :</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Genre</li>
              <li>Groupe d'âge</li>
              <li>Custom Labels (pour campagnes)</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
