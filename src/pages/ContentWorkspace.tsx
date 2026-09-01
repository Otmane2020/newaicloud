import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  CircleAlert,
  Database,
  Image as ImageIcon,
  PanelsTopLeft,
  Search,
  Wand2,
} from "lucide-react";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";

type ToolId = "landing" | "shots" | "catalog" | "background";
type FilterId = "todo" | "ready" | "all";

type ProductRow = {
  id: string;
  title: string | null;
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

const TOOL_IDS: ToolId[] = ["landing", "shots", "catalog", "background"];

export default function ContentWorkspace() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTool = searchParams.get("tool") as ToolId | null;
  const activeTool: ToolId = requestedTool && TOOL_IDS.includes(requestedTool) ? requestedTool : "landing";
  const [filter, setFilter] = useState<FilterId>(activeTool === "shots" || activeTool === "background" ? "ready" : "todo");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setFilter(activeTool === "shots" || activeTool === "background" ? "ready" : "todo");
    setSearch("");
  }, [activeTool]);

  const tools = useMemo(() => [
    {
      id: "landing" as const,
      icon: PanelsTopLeft,
      label: "Landing Pages",
      description: fr ? "Créez une page produit riche à partir du catalogue." : "Create a rich product page from catalog data.",
      action: fr ? "Créer les pages" : "Create pages",
      href: "/products/title-description?view=landing",
    },
    {
      id: "shots" as const,
      icon: Camera,
      label: "Product Shot AI",
      description: fr ? "Générez rapidement de nouvelles vues produit." : "Quickly generate new product views.",
      action: fr ? "Créer des photos" : "Create photos",
      href: "/studio?mode=shots",
    },
    {
      id: "catalog" as const,
      icon: Database,
      label: fr ? "Catalogue" : "Catalog",
      description: fr ? "Complétez titres, descriptions et données catalogue." : "Complete titles, descriptions and catalog data.",
      action: fr ? "Optimiser le catalogue" : "Optimize catalog",
      href: "/products/title-description?view=content",
    },
    {
      id: "background" as const,
      icon: Wand2,
      label: "Background",
      description: fr ? "Fond blanc ou ambiance en gardant le produit fidèle." : "White or lifestyle background while preserving the product.",
      action: fr ? "Changer les fonds" : "Change backgrounds",
      href: "/studio?mode=backgrounds",
    },
  ], [fr]);

  const currentTool = tools.find((tool) => tool.id === activeTool) || tools[0];

  const { data: products = [], isLoading } = useQuery<ProductRow[]>({
    queryKey: ["product-optimization-quick", selectedStore?.id],
    enabled: !!selectedStore?.id,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedStore?.id) return [];

      const { data, error } = await supabase
        .from("shopify_products")
        .select("id, title, seo_title, seo_description, landing_page, body_html, image_url, product_type, category, tags")
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("imported_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ProductRow[];
    },
  });

  const rows = useMemo<ScoredProduct[]>(() => products.map((product) => {
    const richDescription = Boolean(product.landing_page) || (product.body_html?.length || 0) > 300;
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
      landingReady: Boolean(product.landing_page) || (product.body_html?.length || 0) > 500,
      catalogReady: catalogScore === 100,
      imageReady: Boolean(product.image_url),
      catalogScore,
    };
  }), [products]);

  const readyForTool = (product: ScoredProduct) => {
    if (activeTool === "landing") return product.landingReady;
    if (activeTool === "catalog") return product.catalogReady;
    return product.imageReady;
  };

  const readyCount = useMemo(() => rows.filter(readyForTool).length, [rows, activeTool]);
  const needsCount = rows.length - readyCount;
  const preferredFilter: FilterId = activeTool === "shots" || activeTool === "background" ? "ready" : "todo";

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

  const visibleRows = filteredRows.slice(0, 80);
  const CurrentIcon = currentTool.icon;

  const selectTool = (tool: ToolId) => {
    setSearchParams({ tool });
  };

  const filterLabel = (id: FilterId) => {
    if (id === "all") return fr ? "Tous" : "All";
    if (id === "ready") return activeTool === "shots" || activeTool === "background"
      ? (fr ? "Avec image" : "With image")
      : (fr ? "Prêts" : "Ready");
    if (activeTool === "shots" || activeTool === "background") return fr ? "Sans image" : "Missing image";
    return fr ? "À faire" : "To do";
  };

  const productStatus = (product: ScoredProduct) => {
    if (activeTool === "landing") return product.landingReady ? (fr ? "Page prête" : "Page ready") : (fr ? "À créer" : "Create");
    if (activeTool === "catalog") return product.catalogReady ? (fr ? "Complet" : "Complete") : `${product.catalogScore}%`;
    return product.imageReady ? (fr ? "Image prête" : "Image ready") : (fr ? "Image manquante" : "Image missing");
  };

  const rowAction = (product: ScoredProduct) => {
    if (activeTool === "landing" && product.landingReady) {
      return { label: fr ? "Voir" : "Preview", href: `/product-landing/${product.id}` };
    }
    return { label: currentTool.action, href: currentTool.href };
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <WorkspacePageHeader
        section={fr ? "Contenu" : "Content"}
        page="Product Optimization"
        count={products.length}
        title="Product Optimization"
        description={fr
          ? "Choisissez un objectif, voyez uniquement ce qui mérite une action, puis lancez l’outil."
          : "Choose a goal, see only what needs action, then launch the tool."}
      />

      <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:grid-cols-4" aria-label="Product optimization tools">
        {tools.map(({ id, icon: Icon, label }) => {
          const active = activeTool === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectTool(id)}
              className={`flex min-h-12 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium transition ${
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

      <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700">
              <CurrentIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-slate-950">{currentTool.label}</h2>
                <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-600">{rows.length}</Badge>
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
            {([preferredFilter, preferredFilter === "ready" ? "todo" : "ready", "all"] as FilterId[]).map((id) => (
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
          <div className="grid min-h-40 place-items-center text-sm text-slate-500">{fr ? "Chargement…" : "Loading…"}</div>
        ) : visibleRows.length === 0 ? (
          <div className="grid min-h-44 place-items-center p-6 text-center">
            <div>
              <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" />
              <p className="mt-2 text-sm font-semibold text-slate-900">{fr ? "Rien à traiter ici" : "Nothing to process here"}</p>
              <p className="mt-1 text-xs text-slate-500">{fr ? "Changez de filtre ou passez à l’outil suivant." : "Change the filter or move to the next tool."}</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleRows.map((product) => {
              const ready = readyForTool(product);
              const action = rowAction(product);
              return (
                <div key={product.id} className="flex flex-col gap-3 p-3 transition hover:bg-slate-50/60 sm:flex-row sm:items-center">
                  <Link to={`/products/${product.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{product.title || (fr ? "Produit sans titre" : "Untitled product")}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{product.category || product.product_type || (fr ? "Catégorie à compléter" : "Category missing")}</p>
                    </div>
                  </Link>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <Badge
                      variant="outline"
                      className={`rounded-full ${
                        ready
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-orange-200 bg-orange-50 text-orange-700"
                      }`}
                    >
                      {productStatus(product)}
                    </Badge>
                    <Button asChild variant={ready ? "outline" : "default"} size="sm" className="min-w-24 rounded-xl">
                      <Link to={action.href}>{action.label}</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredRows.length > visibleRows.length && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-center text-xs text-slate-500">
            {fr
              ? `${visibleRows.length} affichés sur ${filteredRows.length}. Utilisez la recherche pour aller plus vite.`
              : `${visibleRows.length} shown out of ${filteredRows.length}. Use search to move faster.`}
          </div>
        )}
      </Card>
    </div>
  );
}
