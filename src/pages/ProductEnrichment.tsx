import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Sparkles,
  Store,
  UploadCloud,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";
import { toast } from "sonner";

type EditableAttribute =
  | "ai_color"
  | "ai_material"
  | "ai_shape"
  | "ai_texture"
  | "ai_finish"
  | "style"
  | "category"
  | "sub_category";

type FilterId = "all" | "enriched" | "pending";

type Product = {
  id: string;
  shopify_id: string | number | null;
  title: string;
  image_url: string | null;
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
};

type DimensionItem = {
  key: "length" | "width" | "height" | "depth" | "diameter" | "weight" | "seat";
  label: string;
  value: number;
  unit: string | null;
  suspicious: boolean;
};

const toCentimeters = (value: number, unit: string | null) => {
  const normalized = (unit || "").trim().toLowerCase();
  if (!normalized || normalized === "cm") return value;
  if (normalized === "mm") return value / 10;
  if (normalized === "m") return value * 100;
  return null;
};

const toKilograms = (value: number, unit: string | null) => {
  const normalized = (unit || "").trim().toLowerCase();
  if (!normalized || normalized === "kg") return value;
  if (normalized === "g") return value / 1000;
  return null;
};

const isSuspiciousDimension = (key: DimensionItem["key"], value: number, unit: string | null) => {
  if (!Number.isFinite(value) || value <= 0) return true;

  if (key === "weight") {
    const kilograms = toKilograms(value, unit);
    return kilograms === null ? value > 10000 : kilograms > 400;
  }

  const centimeters = toCentimeters(value, unit);
  if (centimeters === null) return value > 10000;
  if (key === "seat") return centimeters < 10 || centimeters > 150;
  return centimeters < 2 || centimeters > 600;
};

const getDimensions = (product: Product, fr: boolean): DimensionItem[] => {
  const candidates: Array<Omit<DimensionItem, "suspicious"> | null> = [
    product.smart_length != null
      ? { key: "length", label: fr ? "Longueur" : "Length", value: product.smart_length, unit: product.smart_length_unit }
      : null,
    product.smart_width != null
      ? { key: "width", label: fr ? "Largeur" : "Width", value: product.smart_width, unit: product.smart_width_unit }
      : null,
    product.smart_height != null
      ? { key: "height", label: fr ? "Hauteur" : "Height", value: product.smart_height, unit: product.smart_height_unit }
      : null,
    product.smart_depth != null
      ? { key: "depth", label: fr ? "Profondeur" : "Depth", value: product.smart_depth, unit: product.smart_depth_unit }
      : null,
    product.smart_diameter != null
      ? { key: "diameter", label: fr ? "Diamètre" : "Diameter", value: product.smart_diameter, unit: product.smart_diameter_unit }
      : null,
    product.smart_weight != null
      ? { key: "weight", label: fr ? "Poids" : "Weight", value: product.smart_weight, unit: product.smart_weight_unit }
      : null,
    product.smart_seat_height != null
      ? { key: "seat", label: fr ? "Hauteur d’assise" : "Seat height", value: product.smart_seat_height, unit: product.smart_seat_height_unit }
      : null,
  ];

  return candidates.filter(Boolean).map((item) => {
    const dimension = item as Omit<DimensionItem, "suspicious">;
    return {
      ...dimension,
      suspicious: isSuspiciousDimension(dimension.key, dimension.value, dimension.unit),
    };
  });
};

export default function ProductEnrichment() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savingFields, setSavingFields] = useState<Record<string, boolean>>({});
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const editableAttributes = useMemo<Array<{ field: EditableAttribute; label: string; placeholder: string }>>(
    () => [
      { field: "ai_color", label: fr ? "Couleur" : "Color", placeholder: fr ? "Ex. Chêne Wotan" : "E.g. Wotan oak" },
      { field: "ai_material", label: fr ? "Matériau" : "Material", placeholder: fr ? "Ex. Bois, métal" : "E.g. Wood, metal" },
      { field: "ai_shape", label: fr ? "Forme" : "Shape", placeholder: fr ? "Ex. Rectangulaire" : "E.g. Rectangular" },
      { field: "ai_texture", label: fr ? "Texture" : "Texture", placeholder: fr ? "Ex. Rainuré" : "E.g. Fluted" },
      { field: "ai_finish", label: fr ? "Finition" : "Finish", placeholder: fr ? "Ex. Mat" : "E.g. Matte" },
      { field: "style", label: fr ? "Style" : "Style", placeholder: fr ? "Ex. Contemporain" : "E.g. Contemporary" },
      { field: "category", label: fr ? "Catégorie" : "Category", placeholder: fr ? "Ex. Meuble" : "E.g. Furniture" },
      { field: "sub_category", label: fr ? "Sous-catégorie" : "Subcategory", placeholder: fr ? "Ex. Meuble TV" : "E.g. TV unit" },
    ],
    [fr],
  );

  const fetchProducts = useCallback(async () => {
    if (!selectedStore?.id) {
      setProducts([]);
      setSelectedIds([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setProducts([]);
        return;
      }

      const { data, error } = await supabase
        .from("shopify_products")
        .select(`
          id, shopify_id, title, image_url, enrichment_status,
          ai_color, ai_material, ai_shape, ai_texture, ai_pattern, ai_finish, ai_design_elements,
          style, category, sub_category,
          smart_length, smart_length_unit, smart_width, smart_width_unit,
          smart_height, smart_height_unit, smart_depth, smart_depth_unit,
          smart_diameter, smart_diameter_unit, smart_weight, smart_weight_unit,
          smart_seat_height, smart_seat_height_unit
        `)
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("created_at", { ascending: false })
        .limit(250);

      if (error) throw error;
      const nextProducts = (data || []) as Product[];
      setProducts(nextProducts);
      setSelectedIds((previous) => previous.filter((id) => nextProducts.some((product) => product.id === id)));
      setExpandedIds((previous) => previous.filter((id) => nextProducts.some((product) => product.id === id)));
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error(fr ? "Erreur lors du chargement des produits" : "Unable to load products");
    } finally {
      setLoading(false);
    }
  }, [fr, selectedStore?.id]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const handleBulkEnrich = async (productIds: string[]) => {
    if (!productIds.length) return;
    setEnriching(true);
    setProgress({ current: 0, total: productIds.length });

    let successCount = 0;
    let errorCount = 0;

    for (let index = 0; index < productIds.length; index += 1) {
      try {
        const { data, error } = await supabase.functions.invoke("enrich-product", {
          body: { productId: productIds[index] },
        });
        if (error) throw error;
        if (data?.success) successCount += 1;
        else errorCount += 1;
      } catch (error) {
        console.error("Error enriching product:", error);
        errorCount += 1;
      }
      setProgress({ current: index + 1, total: productIds.length });
    }

    setEnriching(false);
    toast.success(
      fr
        ? `Enrichissement terminé : ${successCount} succès, ${errorCount} erreur(s)`
        : `Enrichment complete: ${successCount} succeeded, ${errorCount} failed`,
    );
    await fetchProducts();
  };

  const handleEnrichAll = async () => {
    const ids = products.filter((product) => product.enrichment_status !== "enriched").map((product) => product.id);
    if (!ids.length) {
      toast.info(fr ? "Tous les produits sont déjà enrichis" : "All products are already enriched");
      return;
    }
    await handleBulkEnrich(ids);
  };

  const handleAttributeChange = (productId: string, field: EditableAttribute, value: string) => {
    setProducts((current) =>
      current.map((product) => (product.id === productId ? { ...product, [field]: value } : product)),
    );
  };

  const saveAttribute = async (productId: string, field: EditableAttribute) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    const saveKey = `${productId}:${field}`;
    setSavingFields((current) => ({ ...current, [saveKey]: true }));

    try {
      const value = product[field]?.trim() || null;
      const { error } = await supabase.from("shopify_products").update({ [field]: value } as never).eq("id", productId);
      if (error) throw error;
    } catch (error) {
      console.error(`Error saving ${field}:`, error);
      toast.error(fr ? "Impossible d’enregistrer l’attribut" : "Unable to save attribute");
    } finally {
      setSavingFields((current) => ({ ...current, [saveKey]: false }));
    }
  };

  const exportableProducts = useMemo(
    () => products.filter((product) => product.enrichment_status === "enriched" && Boolean(product.shopify_id)),
    [products],
  );

  const selectedExportableCount = selectedIds.filter((id) => exportableProducts.some((product) => product.id === id)).length;
  const allExportableSelected =
    exportableProducts.length > 0 && exportableProducts.every((product) => selectedIds.includes(product.id));

  const toggleProduct = (productId: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? Array.from(new Set([...current, productId])) : current.filter((id) => id !== productId),
    );
  };

  const toggleAllExportable = () => {
    if (allExportableSelected) {
      setSelectedIds((current) => current.filter((id) => !exportableProducts.some((product) => product.id === id)));
      return;
    }
    setSelectedIds((current) => Array.from(new Set([...current, ...exportableProducts.map((product) => product.id)])));
  };

  const handleExportAttributes = async () => {
    const selectedProducts = selectedIds.length
      ? exportableProducts.filter((product) => selectedIds.includes(product.id))
      : exportableProducts;

    if (!selectedProducts.length) {
      toast.info(fr ? "Aucun produit enrichi à exporter" : "No enriched product to export");
      return;
    }

    setExporting(true);
    try {
      const overrides = Object.fromEntries(
        selectedProducts.map((product) => [
          product.id,
          {
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
          },
        ]),
      );

      const { data, error } = await supabase.functions.invoke("export-shopify-attributes", {
        body: { productIds: selectedProducts.map((product) => product.id), overrides },
      });
      if (error) throw error;
      if (!data) throw new Error(fr ? "Réponse vide du serveur" : "Empty server response");

      const exportedProducts = Number(data.products_exported || 0);
      const exportedAttributes = Number(data.attributes_exported || 0);
      const failed = Number(data.failed || 0);

      if (failed > 0) {
        toast.warning(
          fr
            ? `Export partiel : ${exportedProducts} produits, ${exportedAttributes} attributs, ${failed} erreur(s)`
            : `Partial export: ${exportedProducts} products, ${exportedAttributes} attributes, ${failed} error(s)`,
        );
      } else {
        toast.success(
          fr
            ? `${exportedAttributes} attributs exportés vers Shopify sur ${exportedProducts} produit(s)`
            : `${exportedAttributes} attributes exported to Shopify across ${exportedProducts} product(s)`,
        );
      }
    } catch (error) {
      console.error("Error exporting Shopify attributes:", error);
      toast.error(fr ? "Échec de l’export des attributs vers Shopify" : "Failed to export attributes to Shopify");
    } finally {
      setExporting(false);
    }
  };

  const enrichedProducts = products.filter((product) => product.enrichment_status === "enriched").length;
  const pendingProducts = products.length - enrichedProducts;
  const enrichmentRate = products.length ? Math.round((enrichedProducts / products.length) * 100) : 0;
  const enrichmentProgress = progress.total ? Math.round((progress.current / progress.total) * 100) : 0;
  const suspiciousProducts = products.filter((product) => getDimensions(product, fr).some((item) => item.suspicious));

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const enriched = product.enrichment_status === "enriched";
      if (filter === "enriched" && !enriched) return false;
      if (filter === "pending" && enriched) return false;
      if (!query) return true;
      return [
        product.title,
        product.ai_color,
        product.ai_material,
        product.style,
        product.category,
        product.sub_category,
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [filter, products, search]);

  const toggleExpanded = (productId: string) => {
    setExpandedIds((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId],
    );
  };

  const filterLabel = (id: FilterId) => {
    if (id === "enriched") return fr ? "Enrichis" : "Enriched";
    if (id === "pending") return fr ? "À enrichir" : "To enrich";
    return fr ? "Tous" : "All";
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1500px] space-y-4">
        <WorkspacePageHeader
          section={fr ? "Catalogue" : "Catalog"}
          page={fr ? "Données enrichies" : "Enriched Data"}
          title={fr ? "Enrichissement Catalogue IA" : "AI Catalog Enrichment"}
          description={
            fr
              ? "Détectez et structurez automatiquement les attributs produit avant export vers Shopify."
              : "Automatically detect and structure product attributes before exporting to Shopify."
          }
        />
        <Card className="grid min-h-52 place-items-center rounded-2xl border-slate-200 bg-white">
          <div className="text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-600" />
            <p className="mt-2 text-sm text-slate-500">{fr ? "Chargement du catalogue…" : "Loading catalog…"}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <WorkspacePageHeader
        section={fr ? "Catalogue" : "Catalog"}
        page={fr ? "Données enrichies" : "Enriched Data"}
        count={products.length}
        title={fr ? "Enrichissement Catalogue IA" : "AI Catalog Enrichment"}
        description={
          fr
            ? "Détectez, corrigez puis exportez couleur, matériau, forme, texture, finition, style, catégories et dimensions vers Shopify."
            : "Detect, review and export color, material, shape, texture, finish, style, categories and dimensions to Shopify."
        }
      />

      <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                <Sparkles className="h-3.5 w-3.5" />
                {enrichmentRate}% {fr ? "enrichi" : "enriched"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                <Package className="h-3.5 w-3.5" />
                {products.length} {fr ? "produits" : "products"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {enrichedProducts} {fr ? "enrichis" : "enriched"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                {pendingProducts} {fr ? "à enrichir" : "to enrich"}
              </span>
              {suspiciousProducts.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {suspiciousProducts.length} {fr ? "à vérifier" : "need review"}
                </span>
              )}
            </div>

            <Progress value={enrichmentRate} className="mt-3 h-1.5 max-w-2xl" />
            <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">
              {fr ? "Shopify reçoit ces données comme metafields produit dans" : "Shopify receives these values as product metafields in"}{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">catalogoptimize</code>{" "}
              {fr ? "sans modifier les variantes." : "without changing variants."}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
            <Button
              onClick={() => void handleEnrichAll()}
              disabled={enriching || pendingProducts === 0}
              className="rounded-xl"
            >
              {enriching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {fr ? "Enrichir tout" : "Enrich all"} ({pendingProducts})
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleExportAttributes()}
              disabled={exporting || exportableProducts.length === 0}
              className="rounded-xl border-slate-200"
            >
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {fr ? "Exporter vers Shopify" : "Export to Shopify"} ({selectedExportableCount || exportableProducts.length})
            </Button>
          </div>
        </div>

        {enriching && (
          <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 p-3">
            <div className="flex items-center justify-between gap-3 text-xs font-medium text-violet-800">
              <span>{fr ? "Enrichissement en cours" : "Enrichment in progress"}</span>
              <span className="tabular-nums">{progress.current}/{progress.total} · {enrichmentProgress}%</span>
            </div>
            <Progress value={enrichmentProgress} className="mt-2 h-1.5" />
          </div>
        )}
      </Card>

      <Card className="rounded-2xl border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex w-fit gap-1 rounded-xl bg-slate-50 p-1">
              {(["all", "enriched", "pending"] as FilterId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    filter === id ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {filterLabel(id)}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={fr ? "Rechercher un produit ou attribut…" : "Search product or attribute…"}
                className="h-9 rounded-xl border-slate-200 pl-9 text-sm"
              />
            </div>
          </div>

          {exportableProducts.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <Checkbox
                checked={allExportableSelected}
                onCheckedChange={() => toggleAllExportable()}
                aria-label={fr ? "Sélectionner tous les produits enrichis" : "Select all enriched products"}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800">{fr ? "Sélection Shopify" : "Shopify selection"}</p>
                <p className="truncate text-[11px] text-slate-500">
                  {selectedExportableCount > 0
                    ? fr
                      ? `${selectedExportableCount} produit(s) sélectionné(s)`
                      : `${selectedExportableCount} product(s) selected`
                    : fr
                      ? `Aucune sélection : export des ${exportableProducts.length} enrichis`
                      : `No selection: export all ${exportableProducts.length} enriched products`}
                </p>
              </div>
              {selectedExportableCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelectedIds([])}>
                  {fr ? "Effacer" : "Clear"}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        {filteredProducts.length === 0 ? (
          <div className="grid min-h-52 place-items-center p-6 text-center">
            <div>
              <Search className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-900">{fr ? "Aucun produit trouvé" : "No product found"}</p>
              <p className="mt-1 text-xs text-slate-500">{fr ? "Modifiez la recherche ou le filtre." : "Change the search or filter."}</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredProducts.map((product) => {
              const enriched = product.enrichment_status === "enriched";
              const exportable = enriched && Boolean(product.shopify_id);
              const selected = selectedIds.includes(product.id);
              const expanded = expandedIds.includes(product.id);
              const dimensions = getDimensions(product, fr);
              const validDimensions = dimensions.filter((item) => !item.suspicious);
              const suspiciousDimensions = dimensions.filter((item) => item.suspicious);
              const summaryAttributes = [
                product.ai_color,
                product.ai_material,
                product.style,
                product.category,
                product.sub_category,
              ].filter(Boolean) as string[];

              return (
                <div key={product.id} className={`transition ${selected ? "bg-violet-50/30" : "hover:bg-slate-50/50"}`}>
                  <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {exportable && (
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) => toggleProduct(product.id, checked === true)}
                          aria-label={`${fr ? "Sélectionner" : "Select"} ${product.title}`}
                          className="shrink-0"
                        />
                      )}

                      <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:h-24 sm:w-24">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.title} className="h-full w-full object-contain bg-white" loading="lazy" />
                        ) : (
                          <Package className="h-6 w-6 text-slate-300" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {product.shopify_id && (
                            <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-[10px] font-medium text-slate-500">
                              <Store className="mr-1 h-3 w-3" />Shopify
                            </Badge>
                          )}
                          {enriched ? (
                            <Badge className="rounded-full bg-emerald-50 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50">
                              <CheckCircle2 className="mr-1 h-3 w-3" />{fr ? "Enrichi" : "Enriched"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="rounded-full border-orange-200 bg-orange-50 text-[10px] font-semibold text-orange-700">
                              {fr ? "À enrichir" : "To enrich"}
                            </Badge>
                          )}
                          {suspiciousDimensions.length > 0 && (
                            <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-[10px] font-semibold text-amber-700">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              {suspiciousDimensions.length} {fr ? "valeur(s) à vérifier" : "value(s) to review"}
                            </Badge>
                          )}
                        </div>

                        <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-5 text-slate-950 sm:text-base">{product.title}</h3>

                        {enriched && (
                          <>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {summaryAttributes.slice(0, 5).map((value, index) => (
                                <span key={`${value}-${index}`} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                                  {value}
                                </span>
                              ))}
                              {product.ai_pattern && (
                                <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                                  {fr ? "Motif" : "Pattern"}: {product.ai_pattern}
                                </span>
                              )}
                            </div>

                            {validDimensions.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {validDimensions.map((item) => (
                                  <span key={item.key} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">
                                    <span className="font-medium text-slate-800">{item.label}</span> {item.value}{item.unit ? ` ${item.unit}` : ""}
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2 sm:pl-3">
                      {!enriched ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled={enriching}
                          onClick={() => void handleBulkEnrich([product.id])}
                        >
                          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                          {fr ? "Enrichir" : "Enrich"}
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => toggleExpanded(product.id)}>
                          {expanded ? <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> : <ChevronDown className="mr-1.5 h-3.5 w-3.5" />}
                          {expanded ? (fr ? "Réduire" : "Collapse") : (fr ? "Modifier" : "Edit")}
                        </Button>
                      )}
                    </div>
                  </div>

                  {expanded && enriched && (
                    <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-4 sm:px-4">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {editableAttributes.map(({ field, label, placeholder }) => {
                          const saveKey = `${product.id}:${field}`;
                          return (
                            <label key={field} className="space-y-1.5">
                              <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                {label}
                                {savingFields[saveKey] && <Loader2 className="h-3 w-3 animate-spin" />}
                              </span>
                              <Input
                                value={product[field] || ""}
                                placeholder={placeholder}
                                onChange={(event) => handleAttributeChange(product.id, field, event.target.value)}
                                onBlur={() => void saveAttribute(product.id, field)}
                                className="h-9 rounded-xl border-slate-200 bg-white text-sm"
                              />
                            </label>
                          );
                        })}
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-violet-600" />
                            <p className="text-xs font-semibold text-slate-800">{fr ? "Dimensions détectées" : "Detected dimensions"}</p>
                          </div>

                          {dimensions.length === 0 ? (
                            <p className="mt-2 text-xs text-slate-500">{fr ? "Aucune dimension détectée." : "No dimensions detected."}</p>
                          ) : (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {dimensions.map((item) => (
                                <span
                                  key={item.key}
                                  title={item.suspicious ? (fr ? "Valeur atypique détectée : vérifiez la source avant export." : "Unusual value detected: verify the source before export.") : undefined}
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] ${
                                    item.suspicious
                                      ? "border-amber-200 bg-amber-50 font-medium text-amber-700"
                                      : "border-slate-200 bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  {item.suspicious && <AlertTriangle className="h-3 w-3" />}
                                  <strong>{item.label}</strong> {item.value}{item.unit ? ` ${item.unit}` : ""}
                                </span>
                              ))}
                            </div>
                          )}

                          {suspiciousDimensions.length > 0 && (
                            <p className="mt-2 text-[11px] leading-5 text-amber-700">
                              {fr
                                ? "Les valeurs atypiques restent visibles mais ne sont plus présentées comme fiables. Vérifiez-les avant export Shopify."
                                : "Unusual values remain visible but are no longer presented as trusted data. Review them before Shopify export."}
                            </p>
                          )}
                        </div>

                        {!product.shopify_id && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                            {fr ? "ID Shopify manquant · export indisponible" : "Missing Shopify ID · export unavailable"}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {products.length === 0 && (
        <Card className="rounded-2xl border-slate-200 bg-white p-10 text-center shadow-sm">
          <Package className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-900">{fr ? "Aucun produit à enrichir" : "No products to enrich"}</p>
          <p className="mt-1 text-xs text-slate-500">{fr ? "Synchronisez d’abord votre catalogue Shopify." : "Sync your Shopify catalog first."}</p>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={() => void fetchProducts()}>
            <RefreshCw className="mr-2 h-4 w-4" />{fr ? "Actualiser" : "Refresh"}
          </Button>
        </Card>
      )}
    </div>
  );
}
