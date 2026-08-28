import { useEffect, useMemo, useState } from "react";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Download, Eye, Loader2, Package, Sparkles } from "lucide-react";

interface ProductSourceData {
  id: string;
  title: string;
  image_url: string | null;
  ai_color: string | null;
  ai_material: string | null;
  ai_shape: string | null;
  ai_texture: string | null;
  ai_pattern: string | null;
  ai_finish: string | null;
  ai_design_elements: string | null;
  ai_vision_analysis: string | null;
  ai_vision_model: string | null;
  ai_vision_timestamp: string | null;
  ai_vision_confidence: number | null;
  ai_presentation_quality: number | null;
  ai_craftsmanship_level: string | null;
  ai_lighting_type: string | null;
  ai_background_style: string | null;
  ai_condition_notes: string | null;
  smart_length: number | null;
  smart_length_unit: string | null;
  smart_width: number | null;
  smart_width_unit: string | null;
  smart_height: number | null;
  smart_height_unit: string | null;
  smart_diameter: number | null;
  smart_diameter_unit: string | null;
  smart_depth: number | null;
  smart_depth_unit: string | null;
  smart_weight: number | null;
  smart_weight_unit: string | null;
  smart_seat_height: number | null;
  smart_seat_height_unit: string | null;
  category: string | null;
  sub_category: string | null;
  style: string | null;
  room: string | null;
  functionality: string | null;
  characteristics: string | null;
  enrichment_status: string;
  last_enriched_at: string | null;
  chat_text: string | null;
}

const normalizeText = (text: string | null | undefined): string => {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const escapeCsvCell = (value: unknown): string => {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
};

const ProductSource = () => {
  const { user } = useAuth();
  const { t, tf } = useTranslation();
  const [products, setProducts] = useState<ProductSourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<ProductSourceData | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [enriching, setEnriching] = useState(false);

  const loadProducts = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shopify_products")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts((data || []) as ProductSourceData[]);
    } catch (error: any) {
      toast.error(t.seo.productSource.errors.loadProducts, {
        description: error?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, [user?.id]);

  const filteredProducts = useMemo(() => {
    const keywords = normalizeText(searchTerm).split(" ").filter(Boolean);

    return products.filter((product) => {
      if (statusFilter !== "all" && product.enrichment_status !== statusFilter) return false;
      if (categoryFilter !== "all" && product.category !== categoryFilter) return false;
      if (!keywords.length) return true;

      const searchable = normalizeText([
        product.title,
        product.category,
        product.sub_category,
        product.style,
        product.room,
        product.functionality,
        product.characteristics,
        product.enrichment_status,
        product.chat_text,
      ].filter(Boolean).join(" "));

      return keywords.every((keyword) => searchable.includes(keyword));
    });
  }, [products, searchTerm, statusFilter, categoryFilter]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category).filter((value): value is string => Boolean(value)))),
    [products],
  );

  const enrichedCount = products.filter((product) => product.enrichment_status === "enriched").length;
  const enrichmentRate = products.length ? (enrichedCount / products.length) * 100 : 0;
  const qualityProducts = products.filter((product) => typeof product.ai_presentation_quality === "number");
  const avgQuality = qualityProducts.length
    ? qualityProducts.reduce((sum, product) => sum + (product.ai_presentation_quality || 0), 0) / qualityProducts.length
    : 0;

  const handleEnrichProduct = async (productId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("enrich-product", {
        body: { productId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || t.seo.productSource.errors.enrichProduct);

      toast.success(t.seo.productSource.success.productEnriched);
      await loadProducts();
    } catch (error: any) {
      console.error("Error enriching product:", error);
      toast.error(error?.message || t.seo.productSource.errors.enrichProduct);
    }
  };

  const enrichMany = async (ids: string[]) => {
    if (!ids.length) {
      toast.info(t.seo.productSource.info.allEnriched);
      return;
    }

    setEnriching(true);
    toast.info(tf("seo.productSource.info.enriching", { count: ids.length }));

    try {
      for (const id of ids) {
        await handleEnrichProduct(id);
      }
      setSelectedProducts(new Set());
    } finally {
      setEnriching(false);
    }
  };

  const handleEnrichAll = async () => {
    const pendingIds = products
      .filter((product) => product.enrichment_status === "pending")
      .map((product) => product.id);
    await enrichMany(pendingIds);
  };

  const handleEnrichSelected = async () => {
    if (!selectedProducts.size) {
      toast.info(t.seo.productSource.info.noSelection);
      return;
    }
    await enrichMany(Array.from(selectedProducts));
  };

  const handleDeleteSelected = async () => {
    if (!selectedProducts.size) {
      toast.info(t.seo.productSource.info.noSelection);
      return;
    }

    try {
      const { error } = await supabase
        .from("shopify_products")
        .delete()
        .in("id", Array.from(selectedProducts));

      if (error) throw error;

      toast.success(tf("seo.productSource.success.productsDeleted", { count: selectedProducts.size }));
      setSelectedProducts(new Set());
      await loadProducts();
    } catch (error: any) {
      toast.error(error?.message || t.seo.productSource.errors.deleteProducts);
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allVisibleSelected = filteredProducts.length > 0
      && filteredProducts.every((product) => selectedProducts.has(product.id));

    if (allVisibleSelected) {
      setSelectedProducts(new Set());
      return;
    }

    setSelectedProducts(new Set(filteredProducts.map((product) => product.id)));
  };

  const exportData = () => {
    const dataBlob = new Blob([JSON.stringify(filteredProducts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `produits-enrichis-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t.seo.productSource.success.dataExported);
  };

  const exportToCSV = () => {
    const headers = [
      "Titre",
      "Catégorie",
      "Couleur",
      "Matériau",
      "Forme",
      "Longueur",
      "Largeur",
      "Hauteur",
      "Qualité",
      "Status",
    ];

    const rows = filteredProducts.map((product) => [
      product.title,
      product.category || "",
      product.ai_color || "",
      product.ai_material || "",
      product.ai_shape || "",
      product.smart_length ? `${product.smart_length} ${product.smart_length_unit || ""}`.trim() : "",
      product.smart_width ? `${product.smart_width} ${product.smart_width_unit || ""}`.trim() : "",
      product.smart_height ? `${product.smart_height} ${product.smart_height_unit || ""}`.trim() : "",
      product.ai_presentation_quality || "",
      product.enrichment_status,
    ]);

    const csvLines = [
      headers.map(escapeCsvCell).join(","),
      ...rows.map((row) => row.map(escapeCsvCell).join(",")),
    ];
    const csv = csvLines.join(String.fromCharCode(10));

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `products-enriched-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t.seo.productSource.success.csvExported);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <WorkspacePageHeader
        section="Catalog"
        page="Product Sources"
        count={products.length}
        title={t.seo.productSource.title}
        description={t.seo.productSource.subtitle}
        actions={
          <>
            <Button
              onClick={selectedProducts.size > 0 ? handleEnrichSelected : handleEnrichAll}
              disabled={enriching}
            >
              {enriching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {selectedProducts.size > 0
                ? tf("seo.productSource.actions.enrichSelection", { count: selectedProducts.size })
                : enriching
                  ? t.seo.productSource.actions.enriching
                  : t.seo.productSource.actions.enrichAll}
            </Button>
            <details className="relative">
              <summary className="flex min-h-9 cursor-pointer list-none items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted">
                <Download className="mr-2 h-4 w-4" /> More
              </summary>
              <div className="absolute right-0 z-30 mt-2 grid w-56 gap-1 rounded-xl border bg-white p-2 shadow-xl">
                <Button onClick={loadProducts} disabled={enriching} variant="ghost" className="justify-start">Refresh</Button>
                <Button onClick={exportToCSV} variant="ghost" className="justify-start">{t.seo.productSource.actions.exportCSV}</Button>
                <Button onClick={exportData} variant="ghost" className="justify-start">{t.seo.productSource.actions.exportJSON}</Button>
                {selectedProducts.size > 0 && (
                  <Button onClick={handleDeleteSelected} variant="ghost" className="justify-start text-red-600">
                    {tf("seo.productSource.actions.deleteSelection", { count: selectedProducts.size })}
                  </Button>
                )}
              </div>
            </details>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Total Produits</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{products.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Taux d'enrichissement</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrichmentRate.toFixed(1)}%</div>
            <Progress value={enrichmentRate} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Qualité Moyenne</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{avgQuality.toFixed(1)}/10</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Vision AI Actif</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{products.filter((product) => product.ai_vision_model).length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={filteredProducts.length > 0 && filteredProducts.every((product) => selectedProducts.has(product.id))}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium">Tout sélectionner ({selectedProducts.size}/{filteredProducts.length})</span>
            </div>
            <Input
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="enriched">Enrichis</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="error">Erreur</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="relative transition-shadow hover:shadow-lg">
            <div className="absolute left-4 top-4 z-10">
              <Checkbox
                checked={selectedProducts.has(product.id)}
                onCheckedChange={() => toggleProductSelection(product.id)}
                className="bg-card"
              />
            </div>
            <CardHeader>
              {product.image_url && (
                <img src={product.image_url} alt={product.title} className="mb-4 h-48 w-full rounded-lg object-cover" />
              )}
              <CardTitle className="line-clamp-2 text-lg">{product.title}</CardTitle>
              <div className="mt-2 flex gap-1">
                <Badge variant={product.enrichment_status === "enriched" ? "default" : "secondary"}>{product.enrichment_status}</Badge>
                {product.ai_vision_model && <Badge variant="outline"><Eye className="mr-1 h-3 w-3" />Vision AI</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                {product.ai_color && <div><span className="text-muted-foreground">Couleur: </span>{product.ai_color}</div>}
                {product.ai_material && <div><span className="text-muted-foreground">Matériau: </span>{product.ai_material}</div>}
                {product.ai_shape && <div><span className="text-muted-foreground">Forme: </span>{product.ai_shape}</div>}
              </div>

              {(product.smart_length || product.smart_width || product.smart_height) && (
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {product.smart_length && <span>L: {product.smart_length}{product.smart_length_unit}</span>}
                  {product.smart_width && <span>l: {product.smart_width}{product.smart_width_unit}</span>}
                  {product.smart_height && <span>H: {product.smart_height}{product.smart_height_unit}</span>}
                </div>
              )}

              {typeof product.ai_presentation_quality === "number" && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Qualité</span><span>{product.ai_presentation_quality}/10</span></div>
                  <Progress value={product.ai_presentation_quality * 10} />
                </div>
              )}

              <div className="flex gap-2">
                {product.enrichment_status !== "enriched" && (
                  <Button size="sm" className="flex-1" onClick={() => handleEnrichProduct(product.id)} disabled={enriching}>
                    <Sparkles className="mr-1 h-3 w-3" />Enrichir IA
                  </Button>
                )}
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedProduct(product)}>
                  <Eye className="mr-1 h-3 w-3" />Détails
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Aucun produit trouvé</p>
            <p className="text-sm text-muted-foreground">Essayez de modifier vos filtres de recherche</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(selectedProduct)} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedProduct?.title || "Produit"}</DialogTitle></DialogHeader>
          {selectedProduct && (
            <Tabs defaultValue="attributes" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="attributes">Attributs IA</TabsTrigger>
                <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
                <TabsTrigger value="vision">Vision AI</TabsTrigger>
                <TabsTrigger value="category">Catégorie</TabsTrigger>
              </TabsList>

              <TabsContent value="attributes" className="space-y-4">
                {selectedProduct.image_url && <img src={selectedProduct.image_url} alt={selectedProduct.title} className="h-64 w-full rounded-lg object-cover" />}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="font-medium">Couleur</p><p className="text-muted-foreground">{selectedProduct.ai_color || "N/A"}</p></div>
                  <div><p className="font-medium">Matériau</p><p className="text-muted-foreground">{selectedProduct.ai_material || "N/A"}</p></div>
                  <div><p className="font-medium">Forme</p><p className="text-muted-foreground">{selectedProduct.ai_shape || "N/A"}</p></div>
                  <div><p className="font-medium">Texture</p><p className="text-muted-foreground">{selectedProduct.ai_texture || "N/A"}</p></div>
                  <div><p className="font-medium">Motif</p><p className="text-muted-foreground">{selectedProduct.ai_pattern || "N/A"}</p></div>
                  <div><p className="font-medium">Finition</p><p className="text-muted-foreground">{selectedProduct.ai_finish || "N/A"}</p></div>
                </div>
              </TabsContent>

              <TabsContent value="dimensions" className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="font-medium">Longueur</p><p className="text-muted-foreground">{selectedProduct.smart_length ? `${selectedProduct.smart_length} ${selectedProduct.smart_length_unit || ""}` : "N/A"}</p></div>
                <div><p className="font-medium">Largeur</p><p className="text-muted-foreground">{selectedProduct.smart_width ? `${selectedProduct.smart_width} ${selectedProduct.smart_width_unit || ""}` : "N/A"}</p></div>
                <div><p className="font-medium">Hauteur</p><p className="text-muted-foreground">{selectedProduct.smart_height ? `${selectedProduct.smart_height} ${selectedProduct.smart_height_unit || ""}` : "N/A"}</p></div>
                <div><p className="font-medium">Profondeur</p><p className="text-muted-foreground">{selectedProduct.smart_depth ? `${selectedProduct.smart_depth} ${selectedProduct.smart_depth_unit || ""}` : "N/A"}</p></div>
                <div><p className="font-medium">Diamètre</p><p className="text-muted-foreground">{selectedProduct.smart_diameter ? `${selectedProduct.smart_diameter} ${selectedProduct.smart_diameter_unit || ""}` : "N/A"}</p></div>
                <div><p className="font-medium">Poids</p><p className="text-muted-foreground">{selectedProduct.smart_weight ? `${selectedProduct.smart_weight} ${selectedProduct.smart_weight_unit || ""}` : "N/A"}</p></div>
              </TabsContent>

              <TabsContent value="vision" className="space-y-4 text-sm">
                <div><p className="font-medium">Analyse Vision AI</p><p className="whitespace-pre-wrap text-muted-foreground">{selectedProduct.ai_vision_analysis || "Aucune analyse disponible"}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="font-medium">Modèle</p><p className="text-muted-foreground">{selectedProduct.ai_vision_model || "N/A"}</p></div>
                  <div><p className="font-medium">Confiance</p><p className="text-muted-foreground">{selectedProduct.ai_vision_confidence ? `${selectedProduct.ai_vision_confidence}%` : "N/A"}</p></div>
                  <div><p className="font-medium">Éclairage</p><p className="text-muted-foreground">{selectedProduct.ai_lighting_type || "N/A"}</p></div>
                  <div><p className="font-medium">Style de fond</p><p className="text-muted-foreground">{selectedProduct.ai_background_style || "N/A"}</p></div>
                </div>
              </TabsContent>

              <TabsContent value="category" className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="font-medium">Catégorie</p><p className="text-muted-foreground">{selectedProduct.category || "N/A"}</p></div>
                <div><p className="font-medium">Sous-catégorie</p><p className="text-muted-foreground">{selectedProduct.sub_category || "N/A"}</p></div>
                <div><p className="font-medium">Style</p><p className="text-muted-foreground">{selectedProduct.style || "N/A"}</p></div>
                <div><p className="font-medium">Pièce</p><p className="text-muted-foreground">{selectedProduct.room || "N/A"}</p></div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductSource;
