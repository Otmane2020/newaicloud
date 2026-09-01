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

export default function SEO() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => normalizeTab(searchParams.get("tab")));
  const [tabScores, setTabScores] = useState<TabScores>(EMPTY_SCORES);

  useEffect(() => {
    setActiveTab(normalizeTab(searchParams.get("tab")));
  }, [searchParams]);

  const loadTabScores = useCallback(async () => {
    if (!selectedStore?.id) {
      setTabScores(EMPTY_SCORES);
      return;
    }

    try {
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
    }
  }, [selectedStore?.id]);

  useEffect(() => {
    void loadTabScores();
  }, [activeTab, loadTabScores]);

  const tabs = [
    { id: "collections" as const, label: "Collections", icon: Layers3 },
    { id: "pages" as const, label: "Pages", icon: FileText },
    { id: "articles" as const, label: fr ? "Articles" : "Articles", icon: Newspaper },
    { id: "tags" as const, label: "Tags", icon: Tags },
    { id: "alt" as const, label: fr ? "ALT images" : "Image ALT", icon: Images },
    { id: "homepage" as const, label: fr ? "Accueil" : "Homepage", icon: Home },
  ];

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
                {tabScore === null ? "—" : `${tabScore}%`}
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
