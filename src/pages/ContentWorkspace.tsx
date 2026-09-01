import { useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Database,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  PanelsTopLeft,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import RegenerateLanding from "@/components/seo/RegenerateLanding";
import type { LandingConfig } from "@/components/seo/LandingConfigDialog";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";

type ToolId = "landing" | "catalog";
type FilterId = "todo" | "ready" | "all";
type PreviewMode = "current" | "generated";

type ProductRow = {
  id: string;
  title: string | null;
  handle: string | null;
  seo_title: string | null;
  seo_description: string | null;
  landing_page: string | null;
  body_html: string | null;
  image_url: string | null;
  product_type: string | null;
  category: string | null;
  tags: string | null;
  vendor: string | null;
  price: number | null;
  compare_at_price: number | null;
  currency: string | null;
};

type ScoredProduct = ProductRow & {
  landingReady: boolean;
  catalogReady: boolean;
  catalogScore: number;
};

const PAGE_SIZE = 20;

const QUICK_LANDING_CONFIG: LandingConfig = {
  layout: "2 colonnes",
  colorScheme: {
    paletteId: "modern",
    primary: "#111827",
    secondary: "#374151",
    background: "#FFFFFF",
    surface: "#F8FAFC",
    text: "#0F172A",
    textMuted: "#64748B",
  },
  contentLength: "medium",
  vendorSource: "shopify",
  customHighlights: "",
  designStyle: "modern",
  theme: "light",
  regenerateTitle: true,
  activeOnly: true,
  redoExisting: false,
};

const stripUnsafeHtml = (html: string | null) => {
  if (!html) return "";
  const withoutScripts = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "");
  const body = withoutScripts.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (body?.[1] || withoutScripts)
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .trim();
};

const buildDescriptionDocument = (html: string, emptyMessage: string) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #0f172a; }
    body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; line-height: 1.65; }
    img { max-width: 100%; height: auto; }
    table { max-width: 100%; border-collapse: collapse; }
    a { color: #6d28d9; }
    h1, h2, h3, h4 { line-height: 1.25; color: #0f172a; }
    .empty { min-height: 220px; display: grid; place-items: center; text-align: center; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>${html || `<div class="empty">${emptyMessage}</div>`}</body>
</html>`;

export default function ContentWorkspace() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTool = searchParams.get("tool") || "landing";
  const activeTool: ToolId = requestedTool === "catalog" ? "catalog" : "landing";

  const [filter, setFilter] = useState<FilterId>(activeTool === "landing" ? "all" : "todo");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedLandingProduct, setSelectedLandingProduct] = useState<ScoredProduct | null>(null);
  const [generationStarted, setGenerationStarted] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<ScoredProduct | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("current");

  const tools = useMemo(
    () => [
      {
        id: "landing" as const,
        icon: PanelsTopLeft,
        label: "Landing Pages",
        description: fr
          ? "Comparez le HTML Shopify actuel à la nouvelle landing générée pour chaque produit."
          : "Compare the current Shopify HTML with the newly generated landing for every product.",
      },
      {
        id: "catalog" as const,
        icon: Database,
        label: fr ? "Catalogue" : "Catalog",
        description: fr
          ? "Complétez titres, descriptions, SEO et données catalogue."
          : "Complete titles, descriptions, SEO and catalog data.",
      },
    ],
    [fr],
  );

  const currentTool = tools.find((tool) => tool.id === activeTool) || tools[0];

  const { data: products = [], isLoading, refetch } = useQuery<ProductRow[]>({
    queryKey: ["product-optimization-quick", selectedStore?.id],
    enabled: !!selectedStore?.id,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedStore?.id) return [];

      const { data, error } = await supabase
        .from("shopify_products")
        .select(
          "id, title, handle, seo_title, seo_description, landing_page, body_html, image_url, product_type, category, tags, vendor, price, compare_at_price, currency",
        )
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("imported_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ProductRow[];
    },
  });

  const rows = useMemo<ScoredProduct[]>(
    () => products.map((product) => {
      const richDescription = Boolean(product.landing_page?.trim()) || (product.body_html?.length || 0) > 300;
      const checks = [
        Boolean(product.seo_title),
        Boolean(product.seo_description),
        richDescription,
        Boolean(product.category),
        Boolean(product.product_type),
        Boolean(product.tags),
      ];
      const catalogScore = Math.round((checks.filter(Boolean).length / checks.length) * 100);
      return {
        ...product,
        landingReady: Boolean(product.landing_page?.trim()),
        catalogReady: catalogScore === 100,
        catalogScore,
      };
    }),
    [products],
  );

  const readyCount = useMemo(
    () => rows.filter((product) => activeTool === "landing" ? product.landingReady : product.catalogReady).length,
    [rows, activeTool],
  );
  const needsCount = rows.length - readyCount;

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((product) => {
      const ready = activeTool === "landing" ? product.landingReady : product.catalogReady;
      if (filter === "todo" && ready) return false;
      if (filter === "ready" && !ready) return false;
      if (!query) return true;
      return [product.title, product.category, product.product_type, product.vendor]
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [rows, activeTool, filter, search]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginatedRows = filteredRows.slice(pageStart, pageStart + PAGE_SIZE);
  const visibleStart = filteredRows.length === 0 ? 0 : pageStart + 1;
  const visibleEnd = Math.min(pageStart + PAGE_SIZE, filteredRows.length);

  const selectTool = (tool: ToolId) => {
    setSearchParams({ tool });
    setFilter(tool === "landing" ? "all" : "todo");
    setSearch("");
    setPage(1);
  };

  const setProductFilter = (id: FilterId) => {
    setFilter(id);
    setPage(1);
  };

  const filterLabel = (id: FilterId) => {
    if (id === "all") return fr ? "Tous" : "All";
    if (activeTool === "landing") {
      if (id === "ready") return fr ? "Générés" : "Generated";
      return fr ? "Non générés" : "Not generated";
    }
    if (id === "ready") return fr ? "Prêts" : "Ready";
    return fr ? "À faire" : "To do";
  };

  const productStatus = (product: ScoredProduct) => {
    if (activeTool === "landing") {
      return product.landingReady
        ? (fr ? "Généré : Oui" : "Generated: Yes")
        : (fr ? "Généré : Non" : "Generated: No");
    }
    return product.catalogReady ? (fr ? "Complet" : "Complete") : `${product.catalogScore}%`;
  };

  const plainDescription = (html: string | null) =>
    (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const storefrontProductUrl = (product: ScoredProduct | null) => {
    if (!product?.handle) return null;
    const rawDomain = selectedStore?.public_domain || selectedStore?.store_url;
    if (!rawDomain) return null;
    const normalizedDomain = /^https?:\/\//i.test(rawDomain) ? rawDomain : `https://${rawDomain}`;
    return `${normalizedDomain.replace(/\/$/, "")}/products/${encodeURIComponent(product.handle)}`;
  };

  const formatPrice = (product: ScoredProduct) => {
    if (product.price == null || Number.isNaN(Number(product.price))) return null;
    const currency = (product.currency || (fr ? "EUR" : "USD")).toUpperCase();
    try {
      return new Intl.NumberFormat(fr ? "fr-FR" : "en-US", { style: "currency", currency }).format(Number(product.price));
    } catch {
      return `${Number(product.price).toFixed(2)} ${currency}`;
    }
  };

  const openPreview = (product: ScoredProduct, mode: PreviewMode) => {
    setPreviewProduct(product);
    setPreviewMode(mode === "generated" && product.landingReady ? "generated" : "current");
  };

  const openGeneration = (product: ScoredProduct) => {
    setSelectedLandingProduct(product);
    setGenerationStarted(false);
  };

  const closeGeneration = () => {
    setSelectedLandingProduct(null);
    setGenerationStarted(false);
  };

  const previewHtml = previewProduct
    ? stripUnsafeHtml(previewMode === "generated" ? previewProduct.landing_page : previewProduct.body_html)
    : "";
  const previewDocument = buildDescriptionDocument(
    previewHtml,
    previewMode === "generated"
      ? (fr ? "Aucune landing générée pour ce produit." : "No generated landing is available for this product.")
      : (fr ? "Aucune description HTML Shopify disponible pour ce produit." : "No current Shopify HTML description is available for this product."),
  );
  const previewUrl = storefrontProductUrl(previewProduct);

  if (requestedTool === "shots") return <Navigate to="/studio?mode=shots" replace />;
  if (requestedTool === "background") return <Navigate to="/studio?mode=backgrounds" replace />;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <WorkspacePageHeader
        section={activeTool === "landing" ? "Studio" : "Product Optimization"}
        page={activeTool === "landing" ? "Landing Pages" : currentTool.label}
        count={products.length}
        title={activeTool === "landing" ? "Landing Pages" : currentTool.label}
        description={
          activeTool === "landing"
            ? fr
              ? "Tous les produits Shopify, leur HTML actuel et la nouvelle landing générée au même endroit."
              : "All Shopify products, their current HTML and the newly generated landing in one place."
            : currentTool.description
        }
      />

      <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Product optimization tools">
        {tools.map(({ id, icon: Icon, label }) => {
          const active = activeTool === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectTool(id)}
              className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium transition ${active ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </nav>

      <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                {activeTool === "landing" ? <PanelsTopLeft className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5" />}
                {rows.length} {fr ? "produits" : "products"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {readyCount} {activeTool === "landing" ? (fr ? "générés" : "generated") : (fr ? "prêts" : "ready")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                <CircleAlert className="h-3.5 w-3.5" />
                {needsCount} {activeTool === "landing" ? (fr ? "non générés" : "not generated") : (fr ? "à faire" : "to do")}
              </span>
            </div>
            {activeTool === "landing" && (
              <p className="mt-2 text-xs text-slate-500">
                {fr
                  ? "HTML Shopify actuel = body_html importé. Nouvelle landing = landing_page créée par CatalogOptimizer. Une description Shopify longue ne compte jamais comme une landing générée."
                  : "Current Shopify HTML = imported body_html. New landing = landing_page created by CatalogOptimizer. A long Shopify description never counts as a generated landing."}
              </p>
            )}
          </div>
          {activeTool === "catalog" && (
            <Button asChild className="rounded-xl">
              <Link to="/products/title-description?view=content">
                {fr ? "Optimiser le catalogue" : "Optimize catalog"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-50 p-1">
            {(["all", "todo", "ready"] as FilterId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setProductFilter(id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === id ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {filterLabel(id)}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={fr ? "Rechercher un produit…" : "Search products…"}
              className="h-9 rounded-xl border-slate-200 bg-white pl-9 text-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid min-h-40 place-items-center text-sm text-slate-500">{fr ? "Chargement…" : "Loading…"}</div>
        ) : filteredRows.length === 0 ? (
          <div className="grid min-h-44 place-items-center p-6 text-center text-sm text-slate-500">{fr ? "Aucun produit trouvé" : "No product found"}</div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {paginatedRows.map((product) => {
                const ready = activeTool === "landing" ? product.landingReady : product.catalogReady;
                return (
                  <div key={product.id} className="flex flex-col gap-3 p-3 transition hover:bg-slate-50/60 lg:flex-row lg:items-center">
                    <Link to={`/products/${product.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <ImageIcon className="h-4 w-4 text-slate-400" />}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="truncate text-sm font-semibold text-slate-900">{product.title || (fr ? "Produit sans titre" : "Untitled product")}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{product.vendor || product.category || product.product_type || (fr ? "Produit catalogue" : "Catalog product")}</p>
                        {activeTool === "landing" && (
                          <p className="mt-1 text-[11px] text-slate-400">
                            {product.body_html?.trim()
                              ? (fr ? "HTML Shopify disponible" : "Shopify HTML available")
                              : (fr ? "Pas de description HTML Shopify" : "No Shopify HTML description")}
                          </p>
                        )}
                      </div>
                    </Link>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <Badge variant="outline" className={`rounded-full ${ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-orange-200 bg-orange-50 text-orange-700"}`}>
                        {productStatus(product)}
                      </Badge>

                      {activeTool === "landing" ? (
                        <>
                          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => openPreview(product, "current")}>
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            {fr ? "HTML actuel" : "Current HTML"}
                          </Button>
                          {product.landingReady && (
                            <Button variant="outline" size="sm" className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50" onClick={() => openPreview(product, "generated")}>
                              <Eye className="mr-1.5 h-3.5 w-3.5" />
                              {fr ? "Nouvelle landing" : "Generated landing"}
                            </Button>
                          )}
                          <Button size="sm" className="rounded-xl" onClick={() => openGeneration(product)}>
                            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                            {product.landingReady ? (fr ? "Régénérer" : "Regenerate") : (fr ? "Générer" : "Generate")}
                          </Button>
                        </>
                      ) : (
                        <Button asChild size="sm" className="min-w-24 rounded-xl">
                          <Link to="/products/title-description?view=content">{fr ? "Optimiser" : "Optimize"}</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                {fr
                  ? `${visibleStart}–${visibleEnd} sur ${filteredRows.length} produit(s)`
                  : `${visibleStart}–${visibleEnd} of ${filteredRows.length} product(s)`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={safePage <= 1}
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {fr ? "Précédent" : "Previous"}
                </Button>
                <span className="min-w-24 text-center text-xs font-semibold text-slate-700">
                  {fr ? `Page ${safePage} / ${pageCount}` : `Page ${safePage} / ${pageCount}`}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage(Math.min(pageCount, safePage + 1))}
                >
                  {fr ? "Suivant" : "Next"}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Dialog
        open={Boolean(previewProduct)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewProduct(null);
            setPreviewMode("current");
          }
        }}
      >
        <DialogContent className="max-h-[94vh] max-w-6xl overflow-y-auto p-0">
          {previewProduct && (
            <div className="bg-slate-100">
              <div className="border-b border-slate-200 bg-white px-5 py-4">
                <DialogHeader>
                  <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <DialogTitle className="text-lg">
                        {previewMode === "generated"
                          ? (fr ? "Aperçu de la nouvelle landing" : "Generated landing preview")
                          : (fr ? "Aperçu HTML Shopify actuel" : "Current Shopify HTML preview")}
                      </DialogTitle>
                      <DialogDescription className="mt-1">
                        {fr
                          ? "Comparez la description HTML actuellement importée depuis Shopify avec le HTML généré par CatalogOptimizer."
                          : "Compare the HTML description currently imported from Shopify with the HTML generated by CatalogOptimizer."}
                      </DialogDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex rounded-xl bg-slate-100 p-1">
                        <button
                          type="button"
                          onClick={() => setPreviewMode("current")}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${previewMode === "current" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                        >
                          {fr ? "HTML actuel" : "Current HTML"}
                        </button>
                        {previewProduct.landingReady && (
                          <button
                            type="button"
                            onClick={() => setPreviewMode("generated")}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${previewMode === "generated" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}
                          >
                            {fr ? "Nouvelle landing" : "Generated landing"}
                          </button>
                        )}
                      </div>
                      {previewUrl && (
                        <Button asChild variant="outline" size="sm" className="rounded-xl">
                          <a href={previewUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            {fr ? "Voir sur Shopify" : "Open Shopify"}
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="p-4 sm:p-6">
                <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="grid gap-0 border-b border-slate-200 md:grid-cols-2">
                    <div className="grid min-h-80 place-items-center bg-slate-50 p-6">
                      {previewProduct.image_url ? (
                        <img src={previewProduct.image_url} alt={previewProduct.title || ""} className="max-h-[420px] w-full object-contain" />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-slate-300" />
                      )}
                    </div>
                    <div className="flex flex-col justify-center p-6 sm:p-8">
                      {previewProduct.vendor && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">{previewProduct.vendor}</p>}
                      <h1 className="mt-2 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">{previewProduct.title}</h1>
                      {formatPrice(previewProduct) && <p className="mt-4 text-xl font-semibold text-slate-900">{formatPrice(previewProduct)}</p>}
                      <div className="mt-5 flex flex-wrap gap-2">
                        {previewProduct.product_type && <Badge variant="secondary">{previewProduct.product_type}</Badge>}
                        {previewProduct.category && <Badge variant="outline">{previewProduct.category}</Badge>}
                      </div>
                      <div className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                        <strong className="text-slate-900">{fr ? "Source affichée :" : "Displayed source:"}</strong>{" "}
                        {previewMode === "generated"
                          ? (fr ? "landing_page générée par CatalogOptimizer." : "landing_page generated by CatalogOptimizer.")
                          : (fr ? "body_html actuellement importé depuis Shopify." : "body_html currently imported from Shopify.")}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-7">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{fr ? "Description produit" : "Product description"}</p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-950">
                          {previewMode === "generated" ? (fr ? "Nouvelle landing générée" : "Generated landing") : (fr ? "HTML Shopify actuel" : "Current Shopify HTML")}
                        </h2>
                      </div>
                      <Badge className={previewMode === "generated" ? "bg-violet-100 text-violet-700 hover:bg-violet-100" : "bg-slate-100 text-slate-700 hover:bg-slate-100"}>
                        {previewMode === "generated" ? "CatalogOptimizer" : "Shopify"}
                      </Badge>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <iframe srcDoc={previewDocument} className="h-[52vh] min-h-[360px] w-full border-0" sandbox="" title="Product HTML description preview" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedLandingProduct)}
        onOpenChange={(open) => {
          if (!open) closeGeneration();
        }}
      >
        <DialogContent className={generationStarted ? "max-h-[94vh] max-w-6xl overflow-y-auto" : "max-w-3xl"}>
          {selectedLandingProduct && !generationStarted && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><Wand2 className="h-4 w-4" /></span>
                  <div>
                    <DialogTitle>{fr ? "Générer une nouvelle landing HTML" : "Generate a new HTML landing"}</DialogTitle>
                    <DialogDescription className="mt-1">
                      {fr
                        ? "CatalogOptimizer génère une nouvelle description HTML enrichie. L'HTML Shopify actuel reste disponible pour comparaison avant synchronisation."
                        : "CatalogOptimizer generates a new enriched HTML description. The current Shopify HTML remains available for comparison before sync."}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {selectedLandingProduct.image_url ? <img src={selectedLandingProduct.image_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-950">{selectedLandingProduct.title || (fr ? "Produit" : "Product")}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedLandingProduct.landingReady
                      ? (fr ? "Une landing existe déjà · régénération possible" : "A landing already exists · regeneration available")
                      : (fr ? "Aucune landing CatalogOptimizer générée" : "No CatalogOptimizer landing generated")}
                  </p>
                </div>
                <Badge className={selectedLandingProduct.landingReady ? "rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "rounded-full bg-orange-100 text-orange-700 hover:bg-orange-100"}>
                  {selectedLandingProduct.landingReady ? (fr ? "Généré : Oui" : "Generated: Yes") : (fr ? "Généré : Non" : "Generated: No")}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { title: fr ? "Contenu riche" : "Rich content", text: fr ? "Sections, bénéfices et informations produit structurées." : "Structured sections, benefits and product information." },
                  { title: "SEO", text: fr ? "Texte enrichi à partir des vraies données catalogue." : "Copy enriched from real catalog data." },
                  { title: "Mobile-first", text: fr ? "HTML responsive pour la fiche produit Shopify." : "Responsive HTML for the Shopify product page." },
                  { title: fr ? "Comparaison avant/après" : "Before / after", text: fr ? "Aperçu du HTML Shopify actuel et de la nouvelle landing séparément." : "Preview current Shopify HTML and the generated landing separately." },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                      <div><p className="text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.text}</p></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between">
                <Button variant="outline" className="rounded-xl" onClick={() => { const product = selectedLandingProduct; closeGeneration(); openPreview(product, "current"); }}>
                  <Eye className="mr-2 h-4 w-4" />
                  {fr ? "Voir HTML Shopify actuel" : "View current Shopify HTML"}
                </Button>
                <Button className="rounded-xl px-5" onClick={() => setGenerationStarted(true)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {selectedLandingProduct.landingReady ? (fr ? "Régénérer la landing" : "Regenerate landing") : (fr ? "Générer la landing" : "Generate landing")}
                </Button>
              </div>
            </div>
          )}

          {selectedLandingProduct && generationStarted && (
            <>
              <DialogHeader className="mb-4">
                <DialogTitle>{fr ? "Génération de la landing HTML" : "HTML landing generation"}</DialogTitle>
                <DialogDescription>
                  {fr
                    ? "Le moteur existant génère le nouveau HTML. Après génération, revenez à la liste pour comparer HTML actuel et nouvelle landing."
                    : "The existing engine generates the new HTML. After generation, return to the list to compare current HTML and generated landing."}
                </DialogDescription>
              </DialogHeader>
              <RegenerateLanding
                product={{
                  id: selectedLandingProduct.id,
                  title: selectedLandingProduct.seo_title || selectedLandingProduct.title || (fr ? "Produit" : "Product"),
                  seo_title: selectedLandingProduct.seo_title || undefined,
                  handle: selectedLandingProduct.handle || undefined,
                  description: plainDescription(selectedLandingProduct.body_html),
                  image_url: selectedLandingProduct.image_url || undefined,
                }}
                config={QUICK_LANDING_CONFIG}
                autoGenerate={!selectedLandingProduct.landingReady}
                onGenerated={() => void refetch()}
                onClose={closeGeneration}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
