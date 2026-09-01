import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
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
};

type ScoredProduct = ProductRow & {
  landingReady: boolean;
  catalogReady: boolean;
  imageReady: boolean;
  catalogScore: number;
};

const TOOL_IDS: ToolId[] = ["landing", "catalog"];

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

export default function ContentWorkspace() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTool = searchParams.get("tool") as ToolId | null;
  const activeTool: ToolId = requestedTool && TOOL_IDS.includes(requestedTool) ? requestedTool : "landing";

  const [filter, setFilter] = useState<FilterId>(activeTool === "landing" ? "all" : "todo");
  const [search, setSearch] = useState("");
  const [selectedLandingProduct, setSelectedLandingProduct] = useState<ScoredProduct | null>(null);
  const [generationStarted, setGenerationStarted] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<ScoredProduct | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("current");

  useEffect(() => {
    setFilter(activeTool === "landing" ? "all" : "todo");
    setSearch("");
  }, [activeTool]);

  const tools = useMemo(
    () => [
      {
        id: "landing" as const,
        icon: PanelsTopLeft,
        label: "Landing Pages",
        description: fr
          ? "Générez une landing page optimisée pour chaque produit, sans perdre de vue la page Shopify actuelle."
          : "Generate an optimized landing page for every product while keeping the current Shopify page visible.",
        action: fr ? "Génération groupée" : "Bulk generation",
        href: "/products/title-description?view=landing",
      },
      {
        id: "catalog" as const,
        icon: Database,
        label: fr ? "Catalogue" : "Catalog",
        description: fr
          ? "Complétez titres, descriptions et données catalogue."
          : "Complete titles, descriptions and catalog data.",
        action: fr ? "Optimiser le catalogue" : "Optimize catalog",
        href: "/products/title-description?view=content",
      },
    ],
    [fr],
  );

  const currentTool = tools.find((tool) => tool.id === activeTool) || tools[0];

  const { data: products = [], isLoading, refetch } = useQuery<ProductRow[]>({
    queryKey: ["product-optimization-quick", selectedStore?.id],
    enabled: !!selectedStore?.id,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !selectedStore?.id) return [];

      const { data, error } = await supabase
        .from("shopify_products")
        .select(
          "id, title, handle, seo_title, seo_description, landing_page, body_html, image_url, product_type, category, tags",
        )
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("imported_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ProductRow[];
    },
  });

  const rows = useMemo<ScoredProduct[]>(
    () =>
      products.map((product) => {
        const richDescription = Boolean(product.landing_page?.trim()) || (product.body_html?.length || 0) > 300;
        const catalogChecks = [
          Boolean(product.seo_title),
          Boolean(product.seo_description),
          richDescription,
          Boolean(product.category),
          Boolean(product.product_type),
          Boolean(product.tags),
        ];
        const catalogScore = Math.round((catalogChecks.filter(Boolean).length / catalogChecks.length) * 100);

        return {
          ...product,
          // A Landing Page is "Generated" only when CatalogOptimizer has actually stored landing_page HTML.
          // Existing Shopify body_html is the current product page and must not count as generated content.
          landingReady: Boolean(product.landing_page?.trim()),
          catalogReady: catalogScore === 100,
          imageReady: Boolean(product.image_url),
          catalogScore,
        };
      }),
    [products],
  );

  const readyForTool = (product: ScoredProduct) => {
    if (activeTool === "landing") return product.landingReady;
    return product.catalogReady;
  };

  const readyCount = useMemo(() => rows.filter(readyForTool).length, [rows, activeTool]);
  const needsCount = rows.length - readyCount;

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((product) => {
      const ready = readyForTool(product);
      if (filter === "todo" && ready) return false;
      if (filter === "ready" && !ready) return false;
      if (!query) return true;

      return [product.title, product.category, product.product_type]
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [rows, activeTool, filter, search]);

  const CurrentIcon = currentTool.icon;

  const selectTool = (tool: ToolId) => {
    setSearchParams({ tool });
  };

  const filterLabel = (id: FilterId) => {
    if (id === "all") return fr ? "Tous" : "All";
    if (activeTool === "landing") {
      if (id === "ready") return fr ? "Générées" : "Generated";
      return fr ? "Non générées" : "Not generated";
    }
    if (id === "ready") return fr ? "Prêts" : "Ready";
    return fr ? "À faire" : "To do";
  };

  const productStatus = (product: ScoredProduct) => {
    if (activeTool === "landing") {
      return product.landingReady ? (fr ? "Générée" : "Generated") : (fr ? "Non générée" : "Not generated");
    }
    return product.catalogReady ? (fr ? "Complet" : "Complete") : `${product.catalogScore}%`;
  };

  const plainDescription = (html: string | null) =>
    (html || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const storefrontProductUrl = (product: ScoredProduct | null) => {
    if (!product?.handle) return null;
    const rawDomain = selectedStore?.public_domain || selectedStore?.store_url;
    if (!rawDomain) return null;

    const normalizedDomain = /^https?:\/\//i.test(rawDomain) ? rawDomain : `https://${rawDomain}`;
    return `${normalizedDomain.replace(/\/$/, "")}/products/${encodeURIComponent(product.handle)}`;
  };

  const openPreview = (product: ScoredProduct, mode: PreviewMode = "current") => {
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

  const renderProductIdentity = (product: ScoredProduct, clickable = false) => {
    const content = (
      <>
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {product.image_url ? (
            <img src={product.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <ImageIcon className="h-4 w-4 text-slate-400" />
          )}
        </div>
        <div className="min-w-0 text-left">
          <p className="truncate text-sm font-semibold text-slate-900">
            {product.title || (fr ? "Produit sans titre" : "Untitled product")}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {product.category || product.product_type || (fr ? "Catégorie à compléter" : "Category missing")}
          </p>
          {clickable && activeTool === "landing" && (
            <p className="mt-1 text-[11px] font-medium text-violet-600">
              {fr ? "Cliquer pour voir la page Shopify actuelle" : "Click to preview the current Shopify page"}
            </p>
          )}
        </div>
      </>
    );

    if (clickable && activeTool === "landing") {
      return (
        <button
          type="button"
          onClick={() => openPreview(product, "current")}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          {content}
        </button>
      );
    }

    return (
      <Link to={`/products/${product.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        {content}
      </Link>
    );
  };

  const previewUrl = storefrontProductUrl(previewProduct);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <WorkspacePageHeader
        section="Product Optimization"
        page={activeTool === "landing" ? "Landing Pages" : currentTool.label}
        count={products.length}
        title={activeTool === "landing" ? "Landing Pages" : currentTool.label}
        description={
          activeTool === "landing"
            ? fr
              ? "Tous vos produits au même endroit : vérifiez la page actuelle, générez une landing optimisée, puis prévisualisez le résultat."
              : "All products in one place: review the current page, generate an optimized landing page, then preview the result."
            : currentTool.description
        }
      />

      <nav
        className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
        aria-label="Product optimization tools"
      >
        {tools.map(({ id, icon: Icon, label }) => {
          const active = activeTool === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectTool(id)}
              className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium transition ${
                active
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </nav>

      {activeTool === "landing" ? (
        <>
          <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    <PanelsTopLeft className="h-3.5 w-3.5" />
                    {rows.length} {fr ? "produits" : "products"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {readyCount} {fr ? "générées" : "generated"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                    <CircleAlert className="h-3.5 w-3.5" />
                    {needsCount} {fr ? "non générées" : "not generated"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {fr
                    ? "Une page n’est marquée Générée que si CatalogOptimizer a créé une landing_page. Le contenu Shopify existant reste une page actuelle, pas une génération IA."
                    : "A page is marked Generated only when CatalogOptimizer created landing_page content. Existing Shopify content remains the current page, not an AI generation."}
                </p>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1 rounded-xl bg-slate-50 p-1">
                {(["all", "todo", "ready"] as FilterId[]).map((id) => (
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

              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={fr ? "Rechercher un produit…" : "Search products…"}
                  className="h-9 rounded-xl border-slate-200 bg-white pl-9 text-sm"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="grid min-h-40 place-items-center text-sm text-slate-500">
                {fr ? "Chargement…" : "Loading…"}
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="grid min-h-44 place-items-center p-6 text-center">
                <div>
                  <Search className="mx-auto h-7 w-7 text-slate-400" />
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {fr ? "Aucun produit trouvé" : "No product found"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {fr ? "Modifiez la recherche ou le filtre." : "Change the search or status filter."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRows.map((product) => (
                  <div
                    key={product.id}
                    className="flex flex-col gap-3 p-3 transition hover:bg-slate-50/60 sm:flex-row sm:items-center"
                  >
                    {renderProductIdentity(product, true)}

                    <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                      <Badge
                        variant="outline"
                        className={`rounded-full ${
                          product.landingReady
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-orange-200 bg-orange-50 text-orange-700"
                        }`}
                      >
                        {productStatus(product)}
                      </Badge>

                      <Button
                        variant="outline"
                        size="sm"
                        className="min-w-24 rounded-xl"
                        onClick={() => openPreview(product, product.landingReady ? "generated" : "current")}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        {fr ? "Preview" : "Preview"}
                      </Button>

                      {!product.landingReady && (
                        <Button size="sm" className="min-w-24 rounded-xl" onClick={() => openGeneration(product)}>
                          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                          {fr ? "Generate" : "Generate"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : (
        <>
          <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700">
                  <CurrentIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-950">{currentTool.label}</h2>
                    <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-600">
                      {rows.length}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{currentTool.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <div className="flex items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <strong>{readyCount}</strong> {fr ? "prêts" : "ready"}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex items-center gap-1.5 text-orange-700">
                    <CircleAlert className="h-4 w-4" />
                    <strong>{needsCount}</strong> {fr ? "à faire" : "to do"}
                  </span>
                </div>
                <Button asChild className="rounded-xl">
                  <Link to={currentTool.href}>
                    {currentTool.action}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1 rounded-xl bg-slate-50 p-1">
                {(["todo", "ready", "all"] as FilterId[]).map((id) => (
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
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={fr ? "Rechercher un produit…" : "Search products…"}
                  className="h-9 rounded-xl border-slate-200 bg-white pl-9 text-sm"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="grid min-h-40 place-items-center text-sm text-slate-500">
                {fr ? "Chargement…" : "Loading…"}
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="grid min-h-44 place-items-center p-6 text-center text-sm text-slate-500">
                {fr ? "Rien à traiter ici" : "Nothing to process here"}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRows.map((product) => (
                  <div
                    key={product.id}
                    className="flex flex-col gap-3 p-3 transition hover:bg-slate-50/60 sm:flex-row sm:items-center"
                  >
                    {renderProductIdentity(product)}
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <Badge
                        variant="outline"
                        className={`rounded-full ${
                          product.catalogReady
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-orange-200 bg-orange-50 text-orange-700"
                        }`}
                      >
                        {productStatus(product)}
                      </Badge>
                      <Button asChild size="sm" className="min-w-24 rounded-xl">
                        <Link to={currentTool.href}>{currentTool.action}</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <Dialog
        open={Boolean(previewProduct)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewProduct(null);
            setPreviewMode("current");
          }
        }}
      >
        <DialogContent className="max-h-[94vh] max-w-7xl overflow-hidden p-0">
          {previewProduct && (
            <div className="flex max-h-[94vh] flex-col">
              <div className="border-b border-slate-200 bg-white px-5 py-4">
                <DialogHeader>
                  <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <DialogTitle className="text-lg">
                        {previewProduct.title || (fr ? "Produit" : "Product")}
                      </DialogTitle>
                      <DialogDescription className="mt-1">
                        {previewMode === "generated"
                          ? fr
                            ? "Landing Page générée par CatalogOptimizer"
                            : "Landing Page generated by CatalogOptimizer"
                          : fr
                            ? "Page produit Shopify actuelle"
                            : "Current Shopify product page"}
                      </DialogDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex rounded-xl bg-slate-100 p-1">
                        <button
                          type="button"
                          onClick={() => setPreviewMode("current")}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            previewMode === "current" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
                          }`}
                        >
                          {fr ? "Page actuelle" : "Current page"}
                        </button>
                        {previewProduct.landingReady && (
                          <button
                            type="button"
                            onClick={() => setPreviewMode("generated")}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                              previewMode === "generated" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
                            }`}
                          >
                            {fr ? "Générée" : "Generated"}
                          </button>
                        )}
                      </div>
                      {previewUrl && previewMode === "current" && (
                        <Button asChild variant="outline" size="sm" className="rounded-xl">
                          <a href={previewUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            {fr ? "Ouvrir en ligne" : "Open live"}
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="min-h-0 flex-1 bg-slate-100 p-3 sm:p-4">
                <div className="h-[72vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {previewMode === "generated" && previewProduct.landing_page ? (
                    <iframe
                      srcDoc={previewProduct.landing_page}
                      className="h-full w-full border-0"
                      sandbox="allow-same-origin allow-scripts"
                      title="CatalogOptimizer Landing Page Preview"
                    />
                  ) : previewUrl ? (
                    <iframe
                      src={previewUrl}
                      className="h-full w-full border-0"
                      title="Current Shopify Product Page"
                    />
                  ) : (
                    <div className="h-full overflow-y-auto p-6 sm:p-10">
                      <div className="mx-auto max-w-3xl">
                        {previewProduct.image_url && (
                          <img
                            src={previewProduct.image_url}
                            alt=""
                            className="mx-auto mb-6 max-h-80 rounded-2xl object-contain"
                          />
                        )}
                        <h2 className="text-2xl font-bold text-slate-950">{previewProduct.title}</h2>
                        <div
                          className="prose prose-slate mt-5 max-w-none"
                          dangerouslySetInnerHTML={{
                            __html:
                              previewProduct.body_html ||
                              `<p>${fr ? "Aucun contenu Shopify actuel disponible." : "No current Shopify content available."}</p>`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {previewMode === "current" && previewUrl && (
                  <p className="mt-2 text-center text-[11px] text-slate-500">
                    {fr
                      ? "Si le thème Shopify bloque l’aperçu intégré, utilisez « Ouvrir en ligne » pour voir la page exacte."
                      : "If the Shopify theme blocks embedded preview, use Open live to view the exact page."}
                  </p>
                )}
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
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700">
                    <Wand2 className="h-4 w-4" />
                  </span>
                  <div>
                    <DialogTitle>{fr ? "Générer une Landing Page optimisée" : "Generate an optimized Landing Page"}</DialogTitle>
                    <DialogDescription className="mt-1">
                      {fr
                        ? "CatalogOptimizer transforme les données de ce produit en une page moderne, mobile-first et orientée conversion."
                        : "CatalogOptimizer turns this product data into a modern, mobile-first, conversion-focused page."}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {selectedLandingProduct.image_url ? (
                    <img src={selectedLandingProduct.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {selectedLandingProduct.title || (fr ? "Produit" : "Product")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {fr ? "Statut actuel : Non générée" : "Current status: Not generated"}
                  </p>
                </div>
                <Badge className="rounded-full bg-orange-100 text-orange-700 hover:bg-orange-100">
                  {fr ? "Non générée" : "Not generated"}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    title: fr ? "Structure conversion" : "Conversion structure",
                    text: fr ? "Hero, bénéfices, preuves et CTA hiérarchisés." : "Hero, benefits, proof and prioritized CTAs.",
                  },
                  {
                    title: fr ? "Contenu SEO" : "SEO content",
                    text: fr ? "Titre et contenu enrichis à partir du catalogue." : "Title and content enriched from catalog data.",
                  },
                  {
                    title: "Mobile-first",
                    text: fr ? "Mise en page responsive et lisible sur mobile." : "Responsive layout optimized for mobile reading.",
                  },
                  {
                    title: fr ? "Design moderne" : "Modern design",
                    text: fr ? "Palette sobre, sections aérées et visuel produit prioritaire." : "Clean palette, spacious sections and product-first visuals.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />
                  <div>
                    <p className="text-sm font-semibold text-violet-950">
                      {fr ? "Configuration recommandée" : "Recommended configuration"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-violet-800/80">
                      {fr
                        ? "Design moderne · 2 colonnes · contenu moyen · analyse du visuel · optimisation du titre · preview avant synchronisation Shopify."
                        : "Modern design · 2 columns · medium content · visual analysis · title optimization · preview before Shopify sync."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    const product = selectedLandingProduct;
                    closeGeneration();
                    openPreview(product, "current");
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {fr ? "Preview page actuelle" : "Preview current page"}
                </Button>
                <Button className="rounded-xl px-5" onClick={() => setGenerationStarted(true)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {fr ? "Generate Landing Page" : "Generate Landing Page"}
                </Button>
              </div>
            </div>
          )}

          {selectedLandingProduct && generationStarted && (
            <>
              <DialogHeader className="mb-4">
                <DialogTitle>{fr ? "Génération & preview" : "Generation & preview"}</DialogTitle>
                <DialogDescription>
                  {fr
                    ? "La landing est générée avec la configuration recommandée. Vérifiez le résultat avant de synchroniser avec Shopify."
                    : "The landing page is generated with the recommended configuration. Review it before syncing to Shopify."}
                </DialogDescription>
              </DialogHeader>
              <RegenerateLanding
                product={{
                  id: selectedLandingProduct.id,
                  title:
                    selectedLandingProduct.seo_title ||
                    selectedLandingProduct.title ||
                    (fr ? "Produit" : "Product"),
                  seo_title: selectedLandingProduct.seo_title || undefined,
                  handle: selectedLandingProduct.handle || undefined,
                  description: plainDescription(selectedLandingProduct.body_html),
                  image_url: selectedLandingProduct.image_url || undefined,
                }}
                config={QUICK_LANDING_CONFIG}
                autoGenerate
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
