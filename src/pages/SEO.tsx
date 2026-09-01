import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Home, Images, Layers3, Newspaper, Tags } from "lucide-react";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { Button } from "@/components/ui/button";
import {
  MinimalAltWorkspace,
  MinimalCollectionsWorkspace,
  MinimalPagesWorkspace,
  MinimalTagsWorkspace,
} from "@/components/seo/MinimalMetadataWorkspaces";
import { ArticleSeoWorkspace } from "@/components/seo/ArticleSeoWorkspace";
import { HomePageSeo } from "@/components/seo/HomePageSeo";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";
import {
  calculateArticlesSeoScore,
  calculateCollectionsSeoScore,
  calculateHomepageSeoScore,
  calculateImagesSeoScore,
  calculatePagesSeoScore,
  calculateTagsSeoScore,
} from "@/lib/seoQuality";

type WorkspaceTab = "collections" | "pages" | "articles" | "tags" | "alt" | "homepage";
type TabScores = Record<WorkspaceTab, number | null>;

const EMPTY_SCORES: TabScores = {
  collections: null,
  pages: null,
  articles: null,
  tags: null,
  alt: null,
  homepage: null,
};

const normalizeTab = (tab: string | null): WorkspaceTab => {
  if (tab === "pages" || tab === "articles" || tab === "tags" || tab === "alt" || tab === "homepage") return tab;
  return "collections";
};

const scoreClassName = (score: number | null) => {
  if (score === null) return "border-slate-200 bg-white/70 text-slate-400";
  if (score >= 80) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (score >= 60) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-600";
};

const globalScoreTone = (score: number | null) => {
  if (score === null) return {
    label: "—",
    ring: "border-slate-200 bg-slate-50 text-slate-400",
    badge: "border-slate-200 bg-slate-50 text-slate-500",
  };
  if (score >= 90) return {
    label: "Excellent",
    ring: "border-emerald-200 bg-emerald-50 text-emerald-700",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  if (score >= 75) return {
    label: "Good",
    ring: "border-green-200 bg-green-50 text-green-700",
    badge: "border-green-200 bg-green-50 text-green-700",
  };
  if (score >= 50) return {
    label: "Needs improvement",
    ring: "border-amber-200 bg-amber-50 text-amber-700",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return {
    label: "Poor",
    ring: "border-red-200 bg-red-50 text-red-600",
    badge: "border-red-200 bg-red-50 text-red-600",
  };
};

export default function SEO() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => normalizeTab(searchParams.get("tab")));
  const [tabScores, setTabScores] = useState<TabScores>(EMPTY_SCORES);
  const [scoresLoading, setScoresLoading] = useState(false);

  useEffect(() => {
    setActiveTab(normalizeTab(searchParams.get("tab")));
  }, [searchParams]);

  const loadTabScores = useCallback(async () => {
    if (!selectedStore?.id) {
      setTabScores(EMPTY_SCORES);
      setScoresLoading(false);
      return;
    }

    try {
      setScoresLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTabScores(EMPTY_SCORES);
        return;
      }

      const [
        collectionsResult,
        pagesResult,
        articlesResult,
        productsResult,
        productImagesResult,
        contentImagesResult,
        homepageResult,
      ] = await Promise.all([
        supabase
          .from("shopify_collections")
          .select("id,title,image_url,seo_title,seo_description,body_html,optimization_count")
          .eq("user_id", user.id)
          .eq("store_id", selectedStore.id),
        supabase
          .from("shopify_pages")
          .select("id,title,handle,body_html,seo_title,seo_description,optimization_count")
          .eq("user_id", user.id)
          .eq("store_id", selectedStore.id),
        supabase
          .from("blog_articles")
          .select("id,title,seo_title,meta_description,keywords,featured_image,status,optimization_count")
          .eq("store_id", selectedStore.id),
        supabase
          .from("shopify_products")
          .select("id,tags")
          .eq("seller_id", user.id)
          .eq("store_id", selectedStore.id),
        supabase
          .from("product_images")
          .select("id,alt_text,optimization_count,product:shopify_products!inner(store_id)")
          .eq("product.store_id", selectedStore.id),
        supabase
          .from("content_images")
          .select("id,alt_text,optimization_count")
          .eq("store_id", selectedStore.id),
        supabase
          .from("homepage_seo")
          .select("seo_title,seo_description")
          .eq("user_id", user.id)
          .eq("store_id", selectedStore.id)
          .maybeSingle(),
      ]);

      setTabScores({
        collections: collectionsResult.error ? null : calculateCollectionsSeoScore(collectionsResult.data || []),
        pages: pagesResult.error ? null : calculatePagesSeoScore(pagesResult.data || []),
        articles: articlesResult.error ? null : calculateArticlesSeoScore(articlesResult.data || []),
        tags: productsResult.error ? null : calculateTagsSeoScore(productsResult.data || []),
        alt: productImagesResult.error || contentImagesResult.error
          ? null
          : calculateImagesSeoScore([...(productImagesResult.data || []), ...(contentImagesResult.data || [])]),
        homepage: homepageResult.error ? null : calculateHomepageSeoScore(homepageResult.data),
      });
    } catch (error) {
      console.error("Could not load SEO tab scores", error);
      setTabScores(EMPTY_SCORES);
    } finally {
      setScoresLoading(false);
    }
  }, [selectedStore?.id]);

  useEffect(() => {
    void loadTabScores();
  }, [activeTab, loadTabScores]);

  const tabs = [
    { id: "collections" as const, label: "Collections", icon: Layers3 },
    { id: "pages" as const, label: "Pages", icon: FileText },
    { id: "articles" as const, label: "Articles", icon: Newspaper },
    { id: "tags" as const, label: "Tags", icon: Tags },
    { id: "alt" as const, label: fr ? "ALT images" : "Image ALT", icon: Images },
    { id: "homepage" as const, label: fr ? "Accueil" : "Homepage", icon: Home },
  ];

  const availableScores = Object.values(tabScores).filter((score): score is number => typeof score === "number");
  const globalSeoScore = availableScores.length > 0
    ? Math.round(availableScores.reduce((sum, score) => sum + score, 0) / availableScores.length)
    : null;
  const globalTone = globalScoreTone(globalSeoScore);
  const globalStatusLabel = globalSeoScore === null
    ? (fr ? "Indisponible" : "Unavailable")
    : globalSeoScore >= 90
      ? "Excellent"
      : globalSeoScore >= 75
        ? (fr ? "Bon" : "Good")
        : globalSeoScore >= 50
          ? (fr ? "À améliorer" : "Needs improvement")
          : (fr ? "Faible" : "Poor");

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <WorkspacePageHeader
        section="SEO"
        page="SEO"
        title="SEO"
        description={fr
          ? "Optimisez collections, pages, articles, tags, images ALT et page d’accueil depuis un seul espace."
          : "Optimize collections, pages, articles, tags, image ALT, and homepage SEO from one workspace."}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5" aria-label={fr ? "Score SEO global" : "Global SEO score"}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-8 ${globalTone.ring}`}>
              <span className="text-3xl font-bold leading-none">
                {scoresLoading ? "…" : globalSeoScore ?? "—"}
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide">/ 100</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-950">
                  {fr ? "Score SEO global" : "Global SEO Score"}
                </h2>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${globalTone.badge}`}>
                  {scoresLoading ? (fr ? "Calcul…" : "Calculating…") : globalStatusLabel}
                </span>
              </div>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                {fr
                  ? "Moyenne automatique de Collections, Pages, Articles, Tags, ALT images et SEO de la page d’accueil."
                  : "Automatic average of Collections, Pages, Articles, Tags, Image ALT, and Homepage SEO."}
              </p>
              {!selectedStore?.id && (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  {fr ? "Sélectionnez une boutique pour calculer le score." : "Select a store to calculate the score."}
                </p>
              )}
            </div>
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:max-w-2xl lg:grid-cols-6">
            {tabs.map(({ id, label }) => {
              const score = tabScores[id];
              return (
                <button
                  key={`score-${id}`}
                  type="button"
                  onClick={() => {
                    setActiveTab(id);
                    setSearchParams({ tab: id });
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-left transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span className="block truncate text-[11px] font-medium text-slate-500">{label}</span>
                  <span className="mt-1 block text-lg font-bold text-slate-900">
                    {scoresLoading ? "…" : score === null ? "—" : `${score}%`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <nav className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5" aria-label={fr ? "Outils SEO" : "SEO tools"}>
        {tabs.map(({ id, label, icon: Icon }) => {
          const tabScore = tabScores[id];
          return (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={activeTab === id ? "secondary" : "ghost"}
              className="h-8 gap-1.5 rounded-xl"
              onClick={() => {
                setActiveTab(id);
                setSearchParams({ tab: id });
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              <span
                className={`ml-0.5 inline-flex min-w-8 items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${scoreClassName(tabScore)}`}
                aria-label={`${label} SEO score ${tabScore === null ? "unavailable" : `${tabScore} percent`}`}
              >
                {scoresLoading ? "…" : tabScore === null ? "—" : `${tabScore}%`}
              </span>
            </Button>
          );
        })}
      </nav>

      <section className="min-w-0">
        {activeTab === "collections" && <MinimalCollectionsWorkspace />}
        {activeTab === "pages" && <MinimalPagesWorkspace />}
        {activeTab === "articles" && <ArticleSeoWorkspace />}
        {activeTab === "tags" && <MinimalTagsWorkspace />}
        {activeTab === "alt" && <MinimalAltWorkspace />}
        {activeTab === "homepage" && <HomePageSeo />}
      </section>
    </div>
  );
}
