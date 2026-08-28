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
import { Download, Eye, Loader2, Package, Sparkles, Upload } from "lucide-react";

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
  const { t, tf, language } = useTranslation();
  const fr = language === "fr";
  const [products, setProducts] = useState<ProductSourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<ProductSourceData | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [enriching, setEnriching] = useState(false);
  const [syncingAttributes, setSyncingAttributes] = useState(false);

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

  const syncAttributesToShopify = async () => {
    const productIds = Array.from(selectedProducts);
    if (!productIds.length) {
      toast.info(fr ? "Sélectionnez au moins un produit." : "Select at least one product.");
      return;
    }

    try {
      setSyncingAttributes(true);
      const { data, error } = await supabase.functions.invoke("export-shopify-attributes", {
        body: { productIds },
      });

      if (error) throw error;
      if (!data || data.error) throw new Error(data?.error || "Shopify attribute export failed");

      const attributes = Number(data.attributes_exported) || 0;
      const exportedProducts = Number(data.products_exported) || 0;
      const failed = Number(data.failed) || 0;

      if (failed > 0) {
        toast.warning(
          fr ? `${exportedProducts} produit(s) envoyé(s), ${failed} échec(s).` : `${exportedProducts} product(s) exported, ${failed} failed.`,
          { description: fr ? `${attributes} attribut(s) ajouté(s) à Shopify.` : `${attributes} attribute(s) added to Shopify.` },
        );
      } else {
        toast.success(
          fr ? `${attributes} attribut(s) ajouté(s) à Shopify.` : `${attributes} attribute(s) added to Shopify.`,
        );
      }
    } catch (error: any) {
      console.error("Shopify attribute export failed:", error);
      toast.error(fr ? "Impossible d’ajouter les attributs à Shopify." : "Unable to add attributes to Shopify.", {
        description: error?.message,
      });
    } finally {
      setSyncingAttributes(false);
    }
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
    <div className="mx-auto w-full max-w-[1600px] space-y-4">
      <WorkspacePageHeader
        section={fr ? "Catalogue" : "Catalog"}
        page={fr ? "Données enrichies" : "Enriched Data"}
        count={products.length}
        title={t.seo.productSource.title}
        description={fr
          ? "L’IA analyse couleurs, matières, dimensions, style, éclairage et arrière-plan afin d’extraire un maximum d’attributs fiables à valider puis ajouter dans Shopify."
          : "AI analyzes colors, materials, dimensions, style, lighting, and background to extract the maximum reliable attributes for review and export to Shopify."}
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
            <Button
              variant="outline"
              onClick={syncAttributesToShopify}
              disabled={syncingAttributes || selectedProducts.size === 0}
              title={fr ? "Ajouter les attributs validés aux métachamps Shopify" : "Add validated attributes to Shopify metafields"}
            >
              {syncingAttributes ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {fr ? "Ajouter à Shopify" : "Add to Shopify"}
            </Button>
            <details className="relative">
              <summary className="flex min-h-9 cursor-pointer list-none items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted">
                <Download className="mr-2 h-4 w-4" /> {fr ? "Plus" : "More"}
              </summary>
              <div className="absolute right-0 z-30 mt-2 grid w-56 gap-1 rounded-xl border bg-white p-2 shadow-xl">
                <Button onClick={loadProducts} disabled={enriching} variant="ghost" className="justify-start">{fr ? "Actualiser" : "Refresh"}</Button>
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

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
          {[
            { label: fr ? "Produits" : "Products", value: products.length, tone: "text-slate-950" },
            { label: fr ? "Enrichissement" : "Enrichment", value: `${enrichmentRate.toFixed(0)}%`, tone: enrichmentRate >= 80 ? "text-emerald-700" : enrichmentRate >= 50 ? "text-amber-700" : "text-rose-700" },
            { label: fr ? "Qualité moyenne" : "Average quality", value: `${avgQuality.toFixed(1)}/10`, tone: avgQuality >= 8 ? "text-emerald-700" : avgQuality >= 5 ? "text-amber-700" : "text-rose-700" },
            { label: fr ? "Vision IA" : "Vision AI", value: products.filter((product) => product.ai_vision_model).length, tone: "text-violet-700" },
          ].map((stat) => (
            <div key={stat.label} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs font-medium text-slate-500">{stat.label}</span>
              <strong className={`text-lg tabular-nums ${stat.tone}`}>{stat.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-2 sm:flex-row sm:items-center">
          <label className="flex h-9 items-center gap-2 px-2 text-sm text-slate-600">
            <Checkbox
              checked={filteredProducts.length > 0 && filteredProducts.every((product) => selectedProducts.has(product.id))}
              onCheckedChange={toggleSelectAll}
            />
            <span>{fr ? "Tout sélectionner" : "Select all"} · {selectedProducts.size}/{filteredProducts.length}</span>
          </label>
          <Input
            placeholder={fr ? "Rechercher un produit…" : "Search products…"}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-9 sm:ml-auto sm:max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 sm:w-40"><SelectValue placeholder={fr ? "Statut" : "Status"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{fr ? "Tous les statuts" : "All statuses"}</SelectItem>
              <SelectItem value="enriched">{fr ? "Enrichis" : "Enriched"}</SelectItem>
              <SelectItem value="pending">{fr ? "En attente" : "Pending"}</SelectItem>
              <SelectItem value="error">{fr ? "Erreur" : "Error"}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 sm:w-48"><SelectValue placeholder={fr ? "Catégorie" : "Category"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{fr ? "Toutes les catégories" : "All categories"}</SelectItem>
              {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredProducts.map((product) => (
            <div key={product.id} className="grid grid-cols-[auto_48px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition hover:bg-slate-50">
              <Checkbox checked={selectedProducts.has(product.id)} onCheckedChange={() => toggleProductSelection(product.id)} />
              <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {product.image_url ? <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" /> : <Package className="m-3 h-6 w-6 text-slate-300" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-950">{product.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>{product.category || (fr ? "Sans catégorie" : "Uncategorized")}</span>
                  {product.ai_material && <span>{product.ai_material}</span>}
                  {typeof product.ai_presentation_quality === "number" && <span>{fr ? "Qualité" : "Quality"} {product.ai_presentation_quality}/10</span>}
                  {product.ai_vision_model && <span className="text-violet-600">Vision AI</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={product.enrichment_status === "enriched" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : product.enrichment_status === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                  {product.enrichment_status === "enriched" ? (fr ? "Enrichi" : "Enriched") : product.enrichment_status === "error" ? (fr ? "Erreur" : "Error") : (fr ? "En attente" : "Pending")}
                </Badge>
                {product.enrichment_status !== "enriched" && (
                  <Button size="sm" variant="outline" onClick={() => handleEnrichProduct(product.id)} disabled={enriching}>
                    <Sparkles className="h-4 w-4" /><span className="sr-only">{fr ? "Enrichir avec l’IA" : "Enrich with AI"}</span>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(product)}>
                  <Eye className="h-4 w-4" /><span className="sr-only">{fr ? "Détails" : "Details"}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-sm font-medium">{fr ? "Aucun produit trouvé" : "No products found"}</p>
            <p className="text-sm text-muted-foreground">{fr ? "Modifiez les filtres de recherche." : "Try changing the search filters."}</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(selectedProduct)} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedProduct?.title || (fr ? "Produit" : "Product")}</DialogTitle></DialogHeader>
          {selectedProduct && (
            <Tabs defaultValue="attributes" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="attributes">{fr ? "Attributs IA" : "AI attributes"}</TabsTrigger>
                <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
                <TabsTrigger value="vision">Vision AI</TabsTrigger>
                <TabsTrigger value="category">{fr ? "Catégorie" : "Category"}</TabsTrigger>
              </TabsList>

              <TabsContent value="attributes" className="space-y-4">
                {selectedProduct.image_url && <img src={selectedProduct.image_url} alt={selectedProduct.title} className="h-64 w-full rounded-lg object-cover" />}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="font-medium">{fr ? "Couleur" : "Color"}</p><p className="text-muted-foreground">{selectedProduct.ai_color || "N/A"}</p></div>
                  <div><p className="font-medium">{fr ? "Matériau" : "Material"}</p><p className="text-muted-foreground">{selectedProduct.ai_material || "N/A"}</p></div>
                  <div><p className="font-medium">{fr ? "Forme" : "Shape"}</p><p className="text-muted-foreground">{selectedProduct.ai_shape || "N/A"}</p></div>
                  <div><p className="font-medium">Texture</p><p className="text-muted-foreground">{selectedProduct.ai_texture || "N/A"}</p></div>
                  <div><p className="font-medium">{fr ? "Motif" : "Pattern"}</p><p className="text-muted-foreground">{selectedProduct.ai_pattern || "N/A"}</p></div>
                  <div><p className="font-medium">{fr ? "Finition" : "Finish"}</p><p className="text-muted-foreground">{selectedProduct.ai_finish || "N/A"}</p></div>
                </div>
              </TabsContent>

              <TabsContent value="dimensions" className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="font-medium">{fr ? "Longueur" : "Length"}</p><p className="text-muted-foreground">{selectedProduct.smart_length ? `${selectedProduct.smart_length} ${selectedProduct.smart_length_unit || ""}` : "N/A"}</p></div>
                <div><p className="font-medium">{fr ? "Largeur" : "Width"}</p><p className="text-muted-foreground">{selectedProduct.smart_width ? `${selectedProduct.smart_width} ${selectedProduct.smart_width_unit || ""}` : "N/A"}</p></div>
                <div><p className="font-medium">{fr ? "Hauteur" : "Height"}</p><p className="text-muted-foreground">{selectedProduct.smart_height ? `${selectedProduct.smart_height} ${selectedProduct.smart_height_unit || ""}` : "N/A"}</p></div>
                <div><p className="font-medium">{fr ? "Profondeur" : "Depth"}</p><p className="text-muted-foreground">{selectedProduct.smart_depth ? `${selectedProduct.smart_depth} ${selectedProduct.smart_depth_unit || ""}` : "N/A"}</p></div>
                <div><p className="font-medium">{fr ? "Diamètre" : "Diameter"}</p><p className="text-muted-foreground">{selectedProduct.smart_diameter ? `${selectedProduct.smart_diameter} ${selectedProduct.smart_diameter_unit || ""}` : "N/A"}</p></div>
                <div><p className="font-medium">{fr ? "Poids" : "Weight"}</p><p className="text-muted-foreground">{selectedProduct.smart_weight ? `${selectedProduct.smart_weight} ${selectedProduct.smart_weight_unit || ""}` : "N/A"}</p></div>
              </TabsContent>

              <TabsContent value="vision" className="space-y-4 text-sm">
                <div><p className="font-medium">{fr ? "Analyse Vision IA" : "Vision AI analysis"}</p><p className="whitespace-pre-wrap text-muted-foreground">{selectedProduct.ai_vision_analysis || (fr ? "Aucune analyse disponible" : "No analysis available")}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="font-medium">{fr ? "Modèle" : "Model"}</p><p className="text-muted-foreground">{selectedProduct.ai_vision_model || "N/A"}</p></div>
                  <div><p className="font-medium">{fr ? "Confiance" : "Confidence"}</p><p className="text-muted-foreground">{selectedProduct.ai_vision_confidence ? `${selectedProduct.ai_vision_confidence}%` : "N/A"}</p></div>
                  <div><p className="font-medium">{fr ? "Éclairage" : "Lighting"}</p><p className="text-muted-foreground">{selectedProduct.ai_lighting_type || "N/A"}</p></div>
                  <div><p className="font-medium">{fr ? "Style de fond" : "Background style"}</p><p className="text-muted-foreground">{selectedProduct.ai_background_style || "N/A"}</p></div>
                </div>
              </TabsContent>

              <TabsContent value="category" className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="font-medium">{fr ? "Catégorie" : "Category"}</p><p className="text-muted-foreground">{selectedProduct.category || "N/A"}</p></div>
                <div><p className="font-medium">{fr ? "Sous-catégorie" : "Subcategory"}</p><p className="text-muted-foreground">{selectedProduct.sub_category || "N/A"}</p></div>
                <div><p className="font-medium">Style</p><p className="text-muted-foreground">{selectedProduct.style || "N/A"}</p></div>
                <div><p className="font-medium">{fr ? "Pièce" : "Room"}</p><p className="text-muted-foreground">{selectedProduct.room || "N/A"}</p></div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductSource;
