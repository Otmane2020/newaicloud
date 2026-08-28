import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Zap, Sparkles, Loader2, CheckCircle, Package, RefreshCw, UploadCloud } from 'lucide-react';

type EditableAttribute =
  | 'ai_color'
  | 'ai_material'
  | 'ai_shape'
  | 'ai_texture'
  | 'ai_finish'
  | 'style'
  | 'category'
  | 'sub_category';

interface Product {
  id: string;
  shopify_id: string | number | null;
  title: string;
  image_url: string;
  enrichment_status: string;
  ai_color: string | null;
  ai_material: string | null;
  ai_shape: string | null;
  ai_texture: string | null;
  ai_pattern: string | null;
  ai_finish: string | null;
  ai_design_elements: string | null;
  style: string | null;
  category: string | null;
  sub_category: string | null;
  smart_length: number | null;
  smart_length_unit: string | null;
  smart_width: number | null;
  smart_width_unit: string | null;
  smart_height: number | null;
  smart_height_unit: string | null;
  smart_depth: number | null;
  smart_depth_unit: string | null;
  smart_diameter: number | null;
  smart_diameter_unit: string | null;
  smart_weight: number | null;
  smart_weight_unit: string | null;
  smart_seat_height: number | null;
  smart_seat_height_unit: string | null;
}

const editableAttributes: Array<{ field: EditableAttribute; label: string; placeholder: string }> = [
  { field: 'ai_color', label: 'Couleur', placeholder: 'Ex. Chêne Wotan' },
  { field: 'ai_material', label: 'Matériau', placeholder: 'Ex. Bois, métal' },
  { field: 'ai_shape', label: 'Forme', placeholder: 'Ex. Rectangulaire' },
  { field: 'ai_texture', label: 'Texture', placeholder: 'Ex. Rainuré' },
  { field: 'ai_finish', label: 'Finition', placeholder: 'Ex. Mat' },
  { field: 'style', label: 'Style', placeholder: 'Ex. Contemporain' },
  { field: 'category', label: 'Catégorie', placeholder: 'Ex. Meuble' },
  { field: 'sub_category', label: 'Sous-catégorie', placeholder: 'Ex. Meuble TV' },
];

export default function ProductEnrichment() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savingFields, setSavingFields] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shopify_products')
        .select(`
          id, shopify_id, title, image_url, enrichment_status,
          ai_color, ai_material, ai_shape, ai_texture, ai_pattern, ai_finish, ai_design_elements,
          style, category, sub_category,
          smart_length, smart_length_unit, smart_width, smart_width_unit,
          smart_height, smart_height_unit, smart_depth, smart_depth_unit,
          smart_diameter, smart_diameter_unit, smart_weight, smart_weight_unit,
          smart_seat_height, smart_seat_height_unit
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      const nextProducts = (data || []) as Product[];
      setProducts(nextProducts);
      setSelectedIds(previous => previous.filter(id => nextProducts.some(product => product.id === id)));
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

  const handleAttributeChange = (productId: string, field: EditableAttribute, value: string) => {
    setProducts(current => current.map(product => (
      product.id === productId ? { ...product, [field]: value } : product
    )));
  };

  const saveAttribute = async (productId: string, field: EditableAttribute) => {
    const product = products.find(item => item.id === productId);
    if (!product) return;

    const saveKey = `${productId}:${field}`;
    setSavingFields(current => ({ ...current, [saveKey]: true }));

    try {
      const value = product[field]?.trim() || null;
      const { error } = await supabase
        .from('shopify_products')
        .update({ [field]: value } as any)
        .eq('id', productId);

      if (error) throw error;
    } catch (error) {
      console.error(`Error saving ${field}:`, error);
      toast.error("Impossible d'enregistrer l'attribut");
    } finally {
      setSavingFields(current => ({ ...current, [saveKey]: false }));
    }
  };

  const toggleProduct = (productId: string, checked: boolean) => {
    setSelectedIds(current => checked
      ? Array.from(new Set([...current, productId]))
      : current.filter(id => id !== productId)
    );
  };

  const exportableProducts = products.filter(product => (
    product.enrichment_status === 'enriched' && Boolean(product.shopify_id)
  ));
  const allExportableSelected = exportableProducts.length > 0
    && exportableProducts.every(product => selectedIds.includes(product.id));

  const toggleAllExportable = () => {
    if (allExportableSelected) {
      setSelectedIds(current => current.filter(id => !exportableProducts.some(product => product.id === id)));
    } else {
      setSelectedIds(current => Array.from(new Set([...current, ...exportableProducts.map(product => product.id)])));
    }
  };

  const handleExportAttributes = async () => {
    const selectedProducts = selectedIds.length > 0
      ? exportableProducts.filter(product => selectedIds.includes(product.id))
      : exportableProducts;

    if (selectedProducts.length === 0) {
      toast.info('Aucun produit enrichi à exporter');
      return;
    }

    setExporting(true);
    try {
      // Send the current UI values as overrides so a just-edited field is exported
      // even if its onBlur database save is still finishing.
      const overrides = Object.fromEntries(selectedProducts.map(product => [product.id, {
        ai_color: product.ai_color,
        ai_material: product.ai_material,
        ai_shape: product.ai_shape,
        ai_texture: product.ai_texture,
        ai_pattern: product.ai_pattern,
        ai_finish: product.ai_finish,
        ai_design_elements: product.ai_design_elements,
        style: product.style,
        category: product.category,
        sub_category: product.sub_category,
      }]));

      const { data, error } = await supabase.functions.invoke('export-shopify-attributes', {
        body: {
          productIds: selectedProducts.map(product => product.id),
          overrides,
        },
      });

      if (error) throw error;
      if (!data) throw new Error('Réponse vide du serveur');

      const exportedProducts = Number(data.products_exported || 0);
      const exportedAttributes = Number(data.attributes_exported || 0);
      const failed = Number(data.failed || 0);

      if (failed > 0) {
        toast.warning(`Export partiel : ${exportedProducts} produits, ${exportedAttributes} attributs, ${failed} erreur(s)`);
      } else {
        toast.success(`${exportedAttributes} attributs exportés vers Shopify sur ${exportedProducts} produit(s)`);
      }
    } catch (error) {
      console.error('Error exporting Shopify attributes:', error);
      toast.error('Échec de l’export des attributs vers Shopify');
    } finally {
      setExporting(false);
    }
  };

  const dimensionBadges = (product: Product) => {
    const dimensions = [
      ['L', product.smart_length, product.smart_length_unit],
      ['l', product.smart_width, product.smart_width_unit],
      ['H', product.smart_height, product.smart_height_unit],
      ['P', product.smart_depth, product.smart_depth_unit],
      ['Ø', product.smart_diameter, product.smart_diameter_unit],
      ['Poids', product.smart_weight, product.smart_weight_unit],
      ["H. assise", product.smart_seat_height, product.smart_seat_height_unit],
    ].filter(([, value]) => value !== null && value !== undefined);

    if (!dimensions.length) return null;

    return (
      <div className="flex flex-wrap gap-1 pt-1">
        {dimensions.map(([label, value, unit]) => (
          <Badge key={`${label}-${value}`} variant="secondary" className="text-[11px] font-normal">
            {label}: {value}{unit ? ` ${unit}` : ''}
          </Badge>
        ))}
      </div>
    );
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
  const selectedExportableCount = selectedIds.filter(id => exportableProducts.some(product => product.id === id)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 border-2 border-purple-200 p-8">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-purple-600" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Enrichissement Catalogue IA
              </h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-3xl">
              Détectez, corrigez puis exportez les attributs produit directement vers Shopify : couleur, matériau, forme, texture, finition, style, catégories et dimensions.
            </p>
            <p className="text-sm text-muted-foreground">
              Dans Shopify, les attributs sont enregistrés comme metafields produit sous le namespace <strong>catalogoptimize</strong>, sans modifier vos variantes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row xl:flex-col gap-3 w-full sm:w-auto">
            <div className="text-center xl:mb-1">
              <div className="text-4xl font-bold text-purple-600">{enrichmentRate}%</div>
              <div className="text-sm text-muted-foreground">Produits enrichis</div>
            </div>
            <Button
              size="lg"
              onClick={handleEnrichAll}
              disabled={enriching || pendingProducts === 0}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 gap-2 shadow-lg"
            >
              {enriching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              Enrichir tout ({pendingProducts})
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleExportAttributes}
              disabled={exporting || exportableProducts.length === 0}
              className="gap-2 bg-white border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
              Exporter les attributs vers Shopify
              {selectedExportableCount > 0 ? ` (${selectedExportableCount})` : ` (${exportableProducts.length})`}
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
          <Progress value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0} className="h-2" />
        </Card>
      )}

      {/* Export selection */}
      {exportableProducts.length > 0 && (
        <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allExportableSelected}
              onCheckedChange={() => toggleAllExportable()}
              aria-label="Sélectionner tous les produits enrichis"
            />
            <div>
              <p className="font-medium">Sélection pour Shopify</p>
              <p className="text-sm text-muted-foreground">
                {selectedExportableCount > 0
                  ? `${selectedExportableCount} produit(s) sélectionné(s)`
                  : `Aucune sélection : le bouton exportera les ${exportableProducts.length} produits enrichis`}
              </p>
            </div>
          </div>
          {selectedExportableCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Effacer la sélection
            </Button>
          )}
        </Card>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {products.map((product) => {
          const exportable = product.enrichment_status === 'enriched' && Boolean(product.shopify_id);
          const selected = selectedIds.includes(product.id);

          return (
            <Card key={product.id} className={`overflow-hidden hover:shadow-md transition ${selected ? 'ring-2 ring-purple-400' : ''}`}>
              <div className="aspect-video bg-muted relative">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-full h-full object-contain bg-white"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}

                {exportable && (
                  <div className="absolute top-2 left-2 rounded-md bg-white/95 px-2 py-1 shadow-sm flex items-center gap-2">
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(checked) => toggleProduct(product.id, checked === true)}
                      aria-label={`Sélectionner ${product.title}`}
                    />
                    <span className="text-xs font-medium">Shopify</span>
                  </div>
                )}

                {product.enrichment_status === 'enriched' && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-600 text-white gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Enrichi
                    </Badge>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-4">
                <h3 className="font-semibold line-clamp-2">{product.title}</h3>

                {product.enrichment_status === 'enriched' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {editableAttributes.map(({ field, label, placeholder }) => {
                        const saveKey = `${product.id}:${field}`;
                        return (
                          <label key={field} className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              {label}
                              {savingFields[saveKey] && <Loader2 className="w-3 h-3 animate-spin" />}
                            </span>
                            <Input
                              value={product[field] || ''}
                              placeholder={placeholder}
                              onChange={(event) => handleAttributeChange(product.id, field, event.target.value)}
                              onBlur={() => saveAttribute(product.id, field)}
                              className="h-8 text-sm"
                            />
                          </label>
                        );
                      })}
                    </div>

                    {product.ai_pattern && (
                      <div className="flex gap-1 items-center text-xs">
                        <span className="text-muted-foreground">Motif :</span>
                        <Badge variant="outline" className="text-xs">{product.ai_pattern}</Badge>
                      </div>
                    )}

                    {dimensionBadges(product)}

                    {!product.shopify_id && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                        Produit non lié à un ID Shopify : export indisponible.
                      </p>
                    )}
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    disabled={enriching}
                    onClick={() => handleBulkEnrich([product.id])}
                  >
                    <Sparkles className="w-4 h-4" />
                    Enrichir ce produit
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
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
