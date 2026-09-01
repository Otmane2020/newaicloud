import { useEffect, useState } from "react";
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
import { useTranslation } from "@/lib/language";

type WorkspaceTab = "collections" | "pages" | "articles" | "tags" | "alt" | "homepage";

const normalizeTab = (tab: string | null): WorkspaceTab => {
  if (tab === "pages" || tab === "articles" || tab === "tags" || tab === "alt" || tab === "homepage") return tab;
  return "collections";
};

export default function SEO() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => normalizeTab(searchParams.get("tab")));

  useEffect(() => {
    setActiveTab(normalizeTab(searchParams.get("tab")));
  }, [searchParams]);

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
        {tabs.map(({ id, label, icon: Icon }) => (
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
          </Button>
        ))}
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
