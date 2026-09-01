import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  Database,
  FileText,
  Image as ImageIcon,
  PanelsTopLeft,
  Search,
  Star,
  Wand2,
} from "lucide-react";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";

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

type ScoreTone = "good" | "medium" | "bad";

function scoreTone(score: number): ScoreTone {
  if (score >= 80) return "good";
  if (score >= 50) return "medium";
  return "bad";
}

function QualityStar({ tone }: { tone: ScoreTone }) {
  const className = tone === "good"
    ? "fill-emerald-500 text-emerald-500"
    : tone === "medium"
      ? "fill-orange-500 text-orange-500"
      : "fill-red-500 text-red-500";

  return <Star className={`h-4 w-4 ${className}`} />;
}

function ScorePill({ score }: { score: number }) {
  const tone = scoreTone(score);
  const className = tone === "good"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : tone === "medium"
      ? "border-orange-200 bg-orange-50 text-orange-700"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <span className={`inline-flex min-w-[58px] items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      <QualityStar tone={tone} />
      {score}
    </span>
  );
}

export default function ContentWorkspace() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const [search, setSearch] = useState("");
  const fr = language === "fr";

  const { data: products = [], isLoading } = useQuery<ProductRow[]>({
    queryKey: ["product-optimization-overview", selectedStore?.id],
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

  const rows = useMemo(() => products.map((product) => {
    const richDescription = Boolean(product.landing_page) || (product.body_html?.length || 0) > 300;
    const contentChecks = [Boolean(product.seo_title), Boolean(product.seo_description), richDescription];
    const contentDone = contentChecks.filter(Boolean).length;
    const contentScore = Math.round((contentDone / contentChecks.length) * 100);

    const landingReady = Boolean(product.landing_page) || (product.body_html?.length || 0) > 500;

    const catalogChecks = [Boolean(product.category), Boolean(product.product_type), Boolean(product.tags)];
    const catalogDone = catalogChecks.filter(Boolean).length;
    const catalogScore = Math.round((catalogDone / catalogChecks.length) * 100);

    const overallScore = Math.round(
      contentScore * 0.45 +
      (landingReady ? 100 : 0) * 0.3 +
      catalogScore * 0.25,
    );

    return {
      ...product,
      contentDone,
      contentScore,
      landingReady,
      catalogDone,
      catalogScore,
      overallScore,
    };
  }), [products]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((product) => [
      product.title,
      product.category,
      product.product_type,
    ].some((value) => value?.toLowerCase().includes(q)));
  }, [rows, search]);

  const summary = useMemo(() => rows.reduce((acc, product) => {
    const tone = scoreTone(product.overallScore);
    acc[tone] += 1;
    if (!product.landingReady) acc.missingLanding += 1;
    return acc;
  }, { good: 0, medium: 0, bad: 0, missingLanding: 0 }), [rows]);

  const actionItems = [
    {
      label: fr ? "Contenu catalogue" : "Catalog content",
      href: "/products/title-description?view=content",
      icon: Database,
    },
    {
      label: "Landing Page",
      href: "/products/title-description?view=landing",
      icon: PanelsTopLeft,
    },
    {
      label: "Product Shot AI",
      href: "/studio?mode=shots",
      icon: Camera,
    },
    {
      label: "Background",
      href: "/studio?mode=backgrounds",
      icon: Wand2,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <div className="rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-50/60 via-white to-sky-50/50 p-1">
        <WorkspacePageHeader
          section={fr ? "Contenu" : "Content"}
          page="Product Optimization"
          count={products.length}
          title="Product Optimization"
          description={fr
            ? "Vue synthétique de l’optimisation de chaque produit. Les actions ouvrent les outils existants sans dupliquer Studio."
            : "A compact view of every product optimization. Action icons open the existing tools without duplicating Studio."}
        />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{fr ? "Produits" : "Products"}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{rows.length}</div>
          <div className="mt-1 text-xs text-slate-500">{fr ? "dans le catalogue actif" : "in the active catalog"}</div>
        </Card>
        <Card className="rounded-2xl border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-600">{fr ? "Optimisés" : "Optimized"}</div>
              <div className="mt-2 text-2xl font-semibold text-emerald-950">{summary.good}</div>
            </div>
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
        </Card>
        <Card className="rounded-2xl border-orange-200 bg-gradient-to-br from-orange-50 to-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-orange-600">{fr ? "À améliorer" : "Needs work"}</div>
          <div className="mt-2 text-2xl font-semibold text-orange-950">{summary.medium + summary.bad}</div>
          <div className="mt-1 text-xs text-orange-700/70">{fr ? "contenu ou données incomplètes" : "content or data incomplete"}</div>
        </Card>
        <Card className="rounded-2xl border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-violet-600">Landing pages</div>
          <div className="mt-2 text-2xl font-semibold text-violet-950">{summary.missingLanding}</div>
          <div className="mt-1 text-xs text-violet-700/70">{fr ? "à créer ou enrichir" : "to create or enrich"}</div>
        </Card>
      </section>

      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">{fr ? "Synthèse par produit" : "Product summary"}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {fr ? "Score, complétude et accès direct aux 4 outils d’optimisation." : "Score, completeness and direct access to the 4 optimization tools."}
            </p>
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

        <TooltipProvider delayDuration={150}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-white hover:bg-white">
                  <TableHead className="min-w-[280px]">{fr ? "Produit" : "Product"}</TableHead>
                  <TableHead className="w-[90px] text-center">Score</TableHead>
                  <TableHead className="min-w-[150px]">Content</TableHead>
                  <TableHead className="min-w-[130px]">Landing</TableHead>
                  <TableHead className="min-w-[150px]">Catalog</TableHead>
                  <TableHead className="min-w-[210px] text-right">{fr ? "Actions" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-sm text-slate-500">
                      {fr ? "Chargement du catalogue…" : "Loading catalog…"}
                    </TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-sm text-slate-500">
                      {fr ? "Aucun produit trouvé." : "No products found."}
                    </TableCell>
                  </TableRow>
                ) : filteredRows.map((product) => (
                  <TableRow key={product.id} className="group border-slate-100 hover:bg-slate-50/70">
                    <TableCell>
                      <Link to={`/products/${product.id}`} className="flex min-w-0 items-center gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {product.image_url ? (
                            <img src={product.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900 group-hover:text-violet-700">
                            {product.title || (fr ? "Produit sans titre" : "Untitled product")}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-slate-500">
                            {product.category || product.product_type || (fr ? "Catégorie à compléter" : "Category missing")}
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      <ScorePill score={product.overallScore} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{product.contentDone}/3</span>
                        <span className="text-xs text-slate-500">{product.contentScore}%</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">SEO title · description · rich content</div>
                    </TableCell>
                    <TableCell>
                      {product.landingReady ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {fr ? "Prête" : "Ready"}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
                          {fr ? "À générer" : "Generate"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{product.catalogDone}/3</span>
                        <span className="text-xs text-slate-500">{product.catalogScore}%</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">Category · type · tags</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        {actionItems.map(({ label, href, icon: Icon }) => (
                          <Tooltip key={label}>
                            <TooltipTrigger asChild>
                              <Button
                                asChild
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-xl border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                              >
                                <Link to={href} aria-label={label}>
                                  <Icon className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">{label}</TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TooltipProvider>
      </Card>
    </div>
  );
}
