import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Home, Images, Layers3, Tags } from "lucide-react";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { Button } from "@/components/ui/button";
import {
  MinimalAltWorkspace,
  MinimalCollectionsWorkspace,
  MinimalPagesWorkspace,
  MinimalTagsWorkspace,
} from "@/components/seo/MinimalMetadataWorkspaces";
import { HomePageSeo } from "@/components/seo/HomePageSeo";
import { useTranslation } from "@/lib/language";

type WorkspaceTab = "collections" | "pages" | "tags" | "alt" | "homepage";

const normalizeTab = (tab: string | null): WorkspaceTab => {
  if (tab === "pages" || tab === "tags" || tab === "alt" || tab === "homepage") return tab;
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
    { id: "tags" as const, label: "Tags", icon: Tags },
    { id: "alt" as const, label: fr ? "ALT images" : "Image ALT", icon: Images },
    { id: "homepage" as const, label: fr ? "Accueil" : "Homepage", icon: Home },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <WorkspacePageHeader
        section={fr ? "Contenu" : "Content"}
        page={fr ? "Collections & pages" : "Collections & pages"}
        title={fr ? "Collections & pages" : "Collections & pages"}
        description={fr
          ? "Collections, pages, tags et ALT dans un espace simple et cohérent."
          : "Collections, pages, tags, and ALT in one simple workspace."}
      />

      <nav className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5" aria-label={fr ? "Outils SEO" : "SEO tools"}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={activeTab === id ? "secondary" : "ghost"}
            className="h-8 gap-1.5"
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
        {activeTab === "tags" && <MinimalTagsWorkspace />}
        {activeTab === "alt" && <MinimalAltWorkspace />}
        {activeTab === "homepage" && <HomePageSeo />}
      </section>
    </div>
  );
}