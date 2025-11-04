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
  CheckCircle,
  Hash,
  Image as ImageIcon
} from 'lucide-react';
import { WhiteBackgroundPreviewDialog } from './WhiteBackgroundPreviewDialog';

interface PreviewImage {
  productId: string;
  productTitle: string;
  originalUrl: string;
  generatedUrl: string | null;
  status: 'pending' | 'generating' | 'success' | 'error';
  error?: string;
}

interface Product {
  id: string;
  title: string;
  image_url: string;
  google_product_category: string | null;
  google_mpn: string | null;
  google_condition: string | null;
  google_gtin: string | null;
  google_white_background: boolean | null;
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
  const [generatingGtins, setGeneratingGtins] = useState(false);
  const [generatingCategories, setGeneratingCategories] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previews, setPreviews] = useState<PreviewImage[]>([]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shopify_products')
        .select(`
          id, 
          title, 
          image_url,
          vendor,
          google_product_category,
          google_mpn,
          google_condition,
          google_gtin,
          google_white_background,
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
      google_mpn: product.google_mpn || undefined,
      google_condition: product.google_condition || undefined,
      google_gtin: product.google_gtin || undefined,
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

  const handleGenerateGTINs = async () => {
    if (selectedProducts.size === 0) {
      toast.info('Sélectionnez au moins un produit');
      return;
    }

    try {
      setGeneratingGtins(true);
      const { data, error } = await supabase.functions.invoke('generate-gtin', {
        body: { 
          productIds: Array.from(selectedProducts),
          countryCode: 'FR'
        }
      });

      if (error) throw error;
      toast.success(`GTINs générés pour ${data.results.length} produits`);
      await fetchProducts();
      setSelectedProducts(new Set());
    } catch (error) {
      console.error('Error generating GTINs:', error);
      toast.error('Erreur lors de la génération des GTINs');
    } finally {
      setGeneratingGtins(false);
    }
  };

  const handleGenerateCategories = async () => {
    if (selectedProducts.size === 0) {
      toast.info('Sélectionnez au moins un produit');
      return;
    }

    setGeneratingCategories(true);
    let successCount = 0;
    let errorCount = 0;

    for (const productId of Array.from(selectedProducts)) {
      try {
        const { data, error } = await supabase.functions.invoke('generate-google-category', {
          body: { productId }
        });
        
        if (error) throw error;
        if (data.success) successCount++;
        else errorCount++;
      } catch (error) {
        errorCount++;
      }
    }

    toast.success(`Catégories générées: ${successCount} succès, ${errorCount} erreurs`);
    await fetchProducts();
    setSelectedProducts(new Set());
    setGeneratingCategories(false);
  };

  const handleWhiteBackground = async () => {
    if (selectedProducts.size === 0) {
      toast.info('Sélectionnez au moins un produit');
      return;
    }

    const productsToProcess = products.filter(p => 
      selectedProducts.has(p.id) && p.image_url
    );

    if (productsToProcess.length === 0) {
      toast.error('Aucun produit sélectionné n\'a d\'image');
      return;
    }

    // Initialize previews
    const initialPreviews: PreviewImage[] = productsToProcess.map(p => ({
      productId: p.id,
      productTitle: p.title,
      originalUrl: p.image_url,
      generatedUrl: null,
      status: 'pending' as const,
    }));

    setPreviews(initialPreviews);
    setShowPreview(true);
    setProcessingImages(true);

    // Generate images one by one
    for (let i = 0; i < productsToProcess.length; i++) {
      const product = productsToProcess[i];
      
      setPreviews(prev => prev.map(p => 
        p.productId === product.id 
          ? { ...p, status: 'generating' as const }
          : p
      ));

      try {
        const { data, error } = await supabase.functions.invoke('generate-white-background', {
          body: {
            imageUrl: product.image_url,
            productTitle: product.title
          }
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'AI generation failed');

        setPreviews(prev => prev.map(p => 
          p.productId === product.id 
            ? { ...p, status: 'success' as const, generatedUrl: data.imageUrl }
            : p
        ));
      } catch (error) {
        console.error(`Error generating for ${product.title}:`, error);
        setPreviews(prev => prev.map(p => 
          p.productId === product.id 
            ? { 
                ...p, 
                status: 'error' as const, 
                error: error instanceof Error ? error.message : 'Erreur de génération'
              }
            : p
        ));
      }
    }

    setProcessingImages(false);
  };

  const handleApplyPreviews = async (productIds: string[]) => {
    const toastId = toast.loading('Application des images...');
    let successCount = 0;
    let errorCount = 0;

    for (const productId of productIds) {
      try {
        const preview = previews.find(p => p.productId === productId);
        if (!preview?.generatedUrl) continue;

        // Upload to Supabase Storage
        const fileName = `product-white-bg-${productId}-${Date.now()}.png`;
        
        const base64Response = await fetch(preview.generatedUrl);
        const blob = await base64Response.blob();
        
        const { error: uploadError } = await supabase.storage
          .from('generated-images')
          .upload(fileName, blob, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('generated-images')
          .getPublicUrl(fileName);

        const { error: updateError } = await supabase
          .from('shopify_products')
          .update({ 
            image_url: publicUrl,
            google_white_background: true
          })
          .eq('id', productId);

        if (updateError) throw updateError;

        successCount++;
      } catch (error) {
        console.error(`Error applying preview for ${productId}:`, error);
        errorCount++;
      }
    }

    if (errorCount === 0) {
      toast.success(`${successCount} images appliquées`, { id: toastId });
    } else {
      toast.warning(`${successCount} succès, ${errorCount} erreurs`, { id: toastId });
    }

    await fetchProducts();
    setSelectedProducts(new Set());
    setShowPreview(false);
    setPreviews([]);
  };

  const handleRegeneratePreview = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setPreviews(prev => prev.map(p => 
      p.productId === productId 
        ? { ...p, status: 'generating' as const }
        : p
    ));

    try {
      const { data, error } = await supabase.functions.invoke('generate-white-background', {
        body: {
          imageUrl: product.image_url,
          productTitle: product.title
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'AI generation failed');

      setPreviews(prev => prev.map(p => 
        p.productId === productId 
          ? { ...p, status: 'success' as const, generatedUrl: data.imageUrl }
          : p
      ));

      toast.success('Image régénérée');
    } catch (error) {
      console.error('Error regenerating:', error);
      setPreviews(prev => prev.map(p => 
        p.productId === productId 
          ? { 
              ...p, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : 'Erreur de génération'
            }
          : p
      ));
      toast.error('Erreur lors de la régénération');
    }
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

  const productsOptimized = products.filter(p => 
    p.google_product_category && p.google_gtin && p.google_white_background
  ).length;
  const productsToSync = products.filter(p => 
    p.google_product_category && p.google_gtin && !p.seo_synced_to_shopify
  ).length;
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
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">{completionRate}% complétés (Catégorie + GTIN + Fond blanc)</p>
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleGenerateGTINs}
              disabled={generatingGtins || selectedProducts.size === 0}
              variant="outline"
              className="gap-2"
            >
              {generatingGtins ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Génération GTINs...
                </>
              ) : (
                <>
                  <Hash className="w-4 h-4" />
                  Générer GTINs ({selectedProducts.size})
                </>
              )}
            </Button>
            <Button
              onClick={handleWhiteBackground}
              disabled={processingImages || selectedProducts.size === 0}
              variant="outline"
              className="gap-2"
            >
              {processingImages ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Génération IA...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  Fond blanc IA ({selectedProducts.size})
                </>
              )}
            </Button>
            <Button
              onClick={handleGenerateCategories}
              disabled={generatingCategories || selectedProducts.size === 0}
              variant="outline"
              className="gap-2"
            >
              {generatingCategories ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Génération catégories...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Générer Catégories AI ({selectedProducts.size})
                </>
              )}
            </Button>
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
                <TableHead>MPN</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>GTIN</TableHead>
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
                        <Input
                          value={editData.google_mpn || ''}
                          onChange={(e) => setEditData({ ...editData, google_mpn: e.target.value })}
                          placeholder="MPN ou Marque"
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
                        <Input
                          value={editData.google_gtin || ''}
                          onChange={(e) => setEditData({ ...editData, google_gtin: e.target.value })}
                          placeholder="GTIN (optionnel)"
                          className="min-w-[150px]"
                        />
                      ) : (
                        <span className="text-sm">{product.google_gtin || '-'}</span>
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
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                setSaving(true);
                                toast.info('Génération de la catégorie Google...');
                                const { data, error } = await supabase.functions.invoke('generate-google-category', {
                                  body: { productId: product.id }
                                });
                                if (error) throw error;
                                if (data.success) {
                                  toast.success('Catégorie générée avec succès !');
                                  fetchProducts();
                                } else {
                                  throw new Error(data.error || 'Erreur');
                                }
                              } catch (error: any) {
                                console.error('Error:', error);
                                toast.error(error.message || 'Erreur lors de la génération');
                              } finally {
                                setSaving(false);
                              }
                            }}
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-1" />
                            )}
                            Optimiser avec IA
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(product)}
                          >
                            Modifier
                          </Button>
                        </div>
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
          Champs Google Shopping Simplifiés
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">Champs Essentiels :</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Catégorie de produit (obligatoire)</li>
              <li>MPN = Marque ou Référence (auto-rempli)</li>
              <li>Condition = Neuf par défaut</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Champ Optionnel :</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>GTIN (code-barres international)</li>
              <li>Améliore la visibilité si disponible</li>
            </ul>
          </div>
        </div>
      </Card>
      
      <WhiteBackgroundPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        previews={previews}
        onApply={handleApplyPreviews}
        onRegenerate={handleRegeneratePreview}
      />
    </div>
  );
}
