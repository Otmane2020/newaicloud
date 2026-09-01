import { useMemo, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Database,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Minus,
  PanelsTopLeft,
  Search,
  Sparkles,
  X,
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
import { Progress } from "@/components/ui/progress";
import RegenerateLanding, { type LandingGenerationStatus } from "@/components/seo/RegenerateLanding";
import { LandingConfigDialog, type LandingConfig } from "@/components/seo/LandingConfigDialog";
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

const DEFAULT_LANDING_CONFIG: LandingConfig = {
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
  contentLength: "moyenne (800 mots)",
  vendorSource: "shopify",
  customHighlights: "",
  designStyle: "modern",
  theme: "light",
  regenerateTitle: true,
  activeOnly: true,
  redoExisting: false,
};

const EMPTY_GENERATION_STATUS: LandingGenerationStatus = {
  progress: 0,
  message: "",
  loading: false,
  ready: false,
  hasError: false,
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
  const [previewProduct, setPreviewProduct] = useState<ScoredProduct | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("current");
  const [selectedLandingProduct, setSelectedLandingProduct] = useState<ScoredProduct | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [landingConfig, setLandingConfig] = useState<LandingConfig>(DEFAULT_LANDING_CONFIG);
  const [generationStarted, setGenerationStarted] = useState(false);
  const [generationMinimized, setGenerationMinimized] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<LandingGenerationStatus>(EMPTY_GENERATION_STATUS);
  const configConfirmedRef = useRef(false);

  const tools = useMemo(
    () => [
      {
        id: "landing" as const,
        icon: PanelsTopLeft,
        label: "Landing Pages",
        description: fr
          ? "Générez une description HTML riche pour chaque produit Shopify et prévisualisez-la dans une vraie fiche produit."
          : "Generate a rich HTML description for each Shopify product and preview it inside a real product page.",
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
        .select("id, title, handle, seo_title, seo_description, landing_page, body_html, image_url, product_type, category, tags, vendor, price, compare_at_price, currency")
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

  const readyForTool = (product: ScoredProduct) => activeTool === "landing" ? product.landingReady : product.catalogReady;
  const readyCount = useMemo(() => rows.filter(readyForTool).length, [rows, activeTool]);
  const needsCount = rows.length - readyCount;

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((product) => {
      const ready = readyForTool(product);
      if (filter === "todo" && ready) return false;
      if (filter === "ready" && !ready) return false;
      if (!query) return true;
      return [product.title, product.category, product.product_type, product.vendor]
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [rows, activeTool, filter, search]);

  const selectTool = (tool: ToolId) => {
    setSearchParams({ tool });
    setFilter(tool === "landing" ? "all" : "todo");
    setSearch("");
  };

  const filterLabel = (id: FilterId) => {
    if (id === "all") return fr ? "Tous" : "All";
    if (activeTool === "landing") {
      if (id === "ready") return fr ? "HTML généré" : "HTML generated";
      return fr ? "À générer" : "To generate";
    }
    if (id === "ready") return fr ? "Prêts" : "Ready";
    return fr ? "À faire" : "To do";
  };

  const productStatus = (product: ScoredProduct) => {
    if (activeTool === "landing") return product.landingReady ? (fr ? "HTML généré" : "HTML generated") : (fr ? "À générer" : "To generate");
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

  const openPreview = (product: ScoredProduct, mode: PreviewMode = "current") => {
    setPreviewProduct(product);
    setPreviewMode(mode === "generated" && product.landingReady ? "generated" : "current");
  };

  const openGeneration = (product: ScoredProduct) => {
    configConfirmedRef.current = false;
    setSelectedLandingProduct(product);
    setGenerationStarted(false);
    setGenerationMinimized(false);
    setGenerationStatus(EMPTY_GENERATION_STATUS);
    setConfigOpen(true);
  };

  const handleConfigOpenChange = (open: boolean) => {
    setConfigOpen(open);
    if (!open && !configConfirmedRef.current && !generationStarted) setSelectedLandingProduct(null);
  };

  const startGeneration = (config: LandingConfig) => {
    configConfirmedRef.current = true;
    setLandingConfig(config);
    setConfigOpen(false);
    setGenerationStarted(true);
    setGenerationMinimized(false);
    setGenerationStatus({ ...EMPTY_GENERATION_STATUS, message: fr ? "Préparation…" : "Preparing…" });
  };

  const closeGeneration = () => {
    if (generationStatus.loading) {
      setGenerationMinimized(true);
      return;
    }
    setSelectedLandingProduct(null);
    setGenerationStarted(false);
    setGenerationMinimized(false);
    setGenerationStatus(EMPTY_GENERATION_STATUS);
    configConfirmedRef.current = false;
  };

  const lengthLabel = (value: string) => {
    const normalized = value.toLowerCase();
    if (normalized.includes("short") || normalized.includes("courte") || normalized.includes("400")) return fr ? "Court" : "Short";
    if (normalized.includes("long") || normalized.includes("longue") || normalized.includes("1500")) return "Long";
    return fr ? "Moyen" : "Medium";
  };

  const layoutLabel = (value: string) => {
    const normalized = value.toLowerCase();
    if (normalized.includes("1 colonne")) return fr ? "1 colonne" : "1 column";
    if (normalized.includes("hero") && normalized.includes("gauche")) return fr ? "Hero gauche" : "Hero left";
    if (normalized.includes("hero") && normalized.includes("droite")) return fr ? "Hero droite" : "Hero right";
    return fr ? "2 colonnes" : "2 columns";
  };

  const previewHtml = previewProduct
    ? stripUnsafeHtml(previewMode === "generated" ? previewProduct.landing_page : previewProduct.body_html)
    : "";
  const previewDocument = buildDescriptionDocument(
    previewHtml,
    fr ? "Aucune description HTML disponible pour ce produit." : "No HTML description is available for this product.",
  );
  const previewUrl = storefrontProductUrl(previewProduct);

  if (requestedTool === "shots") return <Navigate to="/studio?mode=shots" replace />;
  if (requestedTool === "background") return <Navigate to="/studio?mode=backgrounds" replace />;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <WorkspacePageHeader
        section="Product Optimization"
        page={activeTool === "landing" ? "Landing Pages" : currentTool.label}
        count={products.length}
        title={activeTool === "landing" ? "Landing Pages" : currentTool.label}
        description={activeTool === "landing"
          ? fr
            ? "Générez le contenu HTML de la description produit, comparez-le au contenu Shopify actuel, puis synchronisez-le dans la fiche produit."
            : "Generate the product description HTML, compare it with the current Shopify content, then sync it to the product page."
          : currentTool.description}
      />

      <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Product optimization tools">
        {tools.map(({ id, icon: Icon, label }) => {
          const active = activeTool === id;
          return (
            <button key={id} type="button" onClick={() => selectTool(id)} className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium transition ${active ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}>
              <Icon className="h-4 w-4 shrink-0" /><span className="truncate">{label}</span>
            </button>
          );
        })}
      </nav>

      <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{activeTool === "landing" ? <PanelsTopLeft className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5" />}{rows.length} {fr ? "produits" : "products"}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />{readyCount} {activeTool === "landing" ? (fr ? "HTML générés" : "HTML generated") : (fr ? "prêts" : "ready")}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700"><CircleAlert className="h-3.5 w-3.5" />{needsCount} {activeTool === "landing" ? (fr ? "à générer" : "to generate") : (fr ? "à faire" : "to do")}</span>
            </div>
            {activeTool === "landing" && (
              <p className="mt-2 text-xs text-slate-500">
                {fr
                  ? "Choisissez les options avant la génération. Pendant le traitement, réduisez la fenêtre : la génération continue et reste visible dans une barre en haut. Le HTML enrichi est synchronisé dans descriptionHtml de Shopify."
                  : "Choose options before generation. While processing, minimize the window: generation continues and stays visible in a top bar. The enriched HTML syncs to Shopify descriptionHtml."}
              </p>
            )}
          </div>
          {activeTool === "catalog" && <Button asChild className="rounded-xl"><Link to="/products/title-description?view=content">{fr ? "Optimiser le catalogue" : "Optimize catalog"}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}
        </div>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-50 p-1">
            {(["all", "todo", "ready"] as FilterId[]).map((id) => <button key={id} type="button" onClick={() => setFilter(id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === id ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{filterLabel(id)}</button>)}
          </div>
          <div className="relative w-full sm:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={fr ? "Rechercher un produit…" : "Search products…"} className="h-9 rounded-xl border-slate-200 bg-white pl-9 text-sm" /></div>
        </div>

        {isLoading ? (
          <div className="grid min-h-40 place-items-center text-sm text-slate-500"><Loader2 className="mb-2 h-5 w-5 animate-spin" />{fr ? "Chargement…" : "Loading…"}</div>
        ) : filteredRows.length === 0 ? (
          <div className="grid min-h-44 place-items-center p-6 text-center text-sm text-slate-500">{fr ? "Aucun produit trouvé" : "No product found"}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRows.map((product) => (
              <div key={product.id} className="flex flex-col gap-3 p-3 transition hover:bg-slate-50/60 sm:flex-row sm:items-center">
                <Link to={`/products/${product.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <ImageIcon className="h-4 w-4 text-slate-400" />}</div>
                  <div className="min-w-0 text-left"><p className="truncate text-sm font-semibold text-slate-900">{product.title || (fr ? "Produit sans titre" : "Untitled product")}</p><p className="mt-0.5 truncate text-xs text-slate-500">{product.vendor || product.category || product.product_type || (fr ? "Produit catalogue" : "Catalog product")}</p>{activeTool === "landing" && <p className="mt-1 text-[11px] text-slate-400">{fr ? "Description HTML produit" : "Product HTML description"}</p>}</div>
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                  <Badge variant="outline" className={`rounded-full ${readyForTool(product) ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-orange-200 bg-orange-50 text-orange-700"}`}>{productStatus(product)}</Badge>
                  {activeTool === "landing" ? (
                    <>
                      <Button variant="outline" size="sm" className="min-w-24 rounded-xl" onClick={() => openPreview(product, product.landingReady ? "generated" : "current")}><Eye className="mr-1.5 h-3.5 w-3.5" />Preview</Button>
                      <Button size="sm" className="min-w-24 rounded-xl" onClick={() => openGeneration(product)} disabled={Boolean(generationStarted && selectedLandingProduct)}><Sparkles className="mr-1.5 h-3.5 w-3.5" />{product.landingReady ? (fr ? "Régénérer" : "Regenerate") : (fr ? "Générer" : "Generate")}</Button>
                    </>
                  ) : <Button asChild size="sm" className="min-w-24 rounded-xl"><Link to="/products/title-description?view=content">{fr ? "Optimiser" : "Optimize"}</Link></Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={Boolean(previewProduct)} onOpenChange={(open) => { if (!open) { setPreviewProduct(null); setPreviewMode("current"); } }}>
        <DialogContent className="max-h-[94vh] max-w-6xl overflow-y-auto p-0">
          {previewProduct && (
            <div className="bg-slate-100">
              <div className="border-b border-slate-200 bg-white px-5 py-4">
                <DialogHeader>
                  <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
                    <div><DialogTitle className="text-lg">{fr ? "Preview fiche produit" : "Product page preview"}</DialogTitle><DialogDescription className="mt-1">{fr ? "Le contenu HTML est affiché comme description dans une fiche produit, comme dans votre catalogue Shopify." : "The HTML content is shown as the description inside a product page, like in your Shopify catalog."}</DialogDescription></div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setPreviewMode("current")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${previewMode === "current" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>{fr ? "Shopify actuel" : "Current Shopify"}</button>{previewProduct.landingReady && <button type="button" onClick={() => setPreviewMode("generated")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${previewMode === "generated" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>{fr ? "HTML généré" : "Generated HTML"}</button>}</div>
                      {previewUrl && <Button asChild variant="outline" size="sm" className="rounded-xl"><a href={previewUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />{fr ? "Voir sur Shopify" : "Open Shopify"}</a></Button>}
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="p-4 sm:p-6">
                <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="grid gap-0 border-b border-slate-200 md:grid-cols-2">
                    <div className="grid min-h-80 place-items-center bg-slate-50 p-6">{previewProduct.image_url ? <img src={previewProduct.image_url} alt={previewProduct.title || ""} className="max-h-[420px] w-full object-contain" /> : <ImageIcon className="h-10 w-10 text-slate-300" />}</div>
                    <div className="flex flex-col justify-center p-6 sm:p-8">
                      {previewProduct.vendor && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">{previewProduct.vendor}</p>}
                      <h1 className="mt-2 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">{previewProduct.title}</h1>
                      {formatPrice(previewProduct) && <p className="mt-4 text-xl font-semibold text-slate-900">{formatPrice(previewProduct)}</p>}
                      <div className="mt-5 flex flex-wrap gap-2">{previewProduct.product_type && <Badge variant="secondary">{previewProduct.product_type}</Badge>}{previewProduct.category && <Badge variant="outline">{previewProduct.category}</Badge>}</div>
                      <div className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><strong className="text-slate-900">{fr ? "Zone modifiée :" : "Edited area:"}</strong>{" "}{fr ? "la description HTML ci-dessous. L’image, le titre, le prix et les variantes restent des données catalogue séparées." : "the HTML description below. Image, title, price and variants remain separate catalog data."}</div>
                    </div>
                  </div>
                  <div className="p-5 sm:p-7">
                    <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{fr ? "Description produit" : "Product description"}</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{previewMode === "generated" ? (fr ? "HTML généré par l’IA" : "AI-generated HTML") : (fr ? "HTML Shopify actuel" : "Current Shopify HTML")}</h2></div><Badge className={previewMode === "generated" ? "bg-violet-100 text-violet-700 hover:bg-violet-100" : "bg-slate-100 text-slate-700 hover:bg-slate-100"}>{previewMode === "generated" ? "Preview" : "Shopify"}</Badge></div>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><iframe srcDoc={previewDocument} className="h-[52vh] min-h-[360px] w-full border-0" sandbox="" title="Product HTML description preview" /></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedLandingProduct && (
        <LandingConfigDialog
          open={configOpen}
          onOpenChange={handleConfigOpenChange}
          onConfirm={startGeneration}
          productTitle={selectedLandingProduct.title || undefined}
        />
      )}

      {generationStarted && selectedLandingProduct && (
        <>
          <div className={generationMinimized ? "hidden" : "fixed inset-0 z-[80] bg-slate-950/45 p-3 backdrop-blur-[2px] sm:p-6"}>
            <section className="mx-auto flex h-full max-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
              <header className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><Sparkles className="h-4 w-4" /></span>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">{selectedLandingProduct.landingReady ? (fr ? "Régénérer la landing page" : "Regenerate landing page") : (fr ? "Générer la landing page" : "Generate landing page")}</p><p className="truncate text-xs text-slate-500">{fr ? "Génération IA pour" : "AI generation for"} {selectedLandingProduct.title || (fr ? "Produit" : "Product")}</p></div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{landingConfig.designStyle}</Badge><Badge variant="secondary">{layoutLabel(landingConfig.layout)}</Badge><Badge variant="secondary">{lengthLabel(landingConfig.contentLength)}</Badge>
                  <Button variant="outline" size="sm" onClick={() => setGenerationMinimized(true)}><Minus className="mr-1.5 h-4 w-4" />{fr ? "Réduire" : "Minimize"}</Button>
                  {!generationStatus.loading && generationStatus.ready && <Button variant="ghost" size="icon" onClick={closeGeneration} aria-label={fr ? "Fermer" : "Close"}><X className="h-4 w-4" /></Button>}
                </div>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                <RegenerateLanding
                  product={{
                    id: selectedLandingProduct.id,
                    title: selectedLandingProduct.seo_title || selectedLandingProduct.title || (fr ? "Produit" : "Product"),
                    seo_title: selectedLandingProduct.seo_title || undefined,
                    handle: selectedLandingProduct.handle || undefined,
                    description: selectedLandingProduct.seo_description || plainDescription(selectedLandingProduct.body_html) || undefined,
                    image_url: selectedLandingProduct.image_url || undefined,
                  }}
                  config={landingConfig}
                  autoGenerate
                  regenerateExisting={selectedLandingProduct.landingReady}
                  onGenerated={() => void refetch()}
                  onClose={closeGeneration}
                  onStatusChange={setGenerationStatus}
                />
              </div>
            </section>
          </div>

          {generationMinimized && (
            <div className="fixed left-1/2 top-3 z-[90] w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur-xl sm:px-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${generationStatus.ready ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}`}>{generationStatus.ready ? <CheckCircle2 className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}</span>
                  <div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-2"><p className="shrink-0 text-sm font-semibold text-slate-950">{generationStatus.ready ? (fr ? "Landing page prête" : "Landing page ready") : (fr ? "Génération de la landing page" : "Generating landing page")}</p><span className="truncate text-xs text-slate-400">· {selectedLandingProduct.title}</span></div><p className="mt-0.5 truncate text-xs text-slate-500">{generationStatus.message || (fr ? "La génération continue pendant que vous travaillez." : "Generation continues while you work.")}</p></div>
                </div>
                <div className="flex items-center gap-3 md:w-[360px]">
                  <div className="min-w-0 flex-1"><div className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-500"><span>{generationStatus.ready ? (fr ? "Terminée" : "Complete") : (fr ? "Progression" : "Progress")}</span><strong className="tabular-nums text-slate-700">{generationStatus.progress}%</strong></div><Progress value={generationStatus.progress} className="h-1.5" /></div>
                  <Button size="sm" onClick={() => setGenerationMinimized(false)}><Maximize2 className="mr-1.5 h-4 w-4" />{generationStatus.ready ? (fr ? "Voir le résultat" : "View result") : (fr ? "Ouvrir" : "Open")}</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
