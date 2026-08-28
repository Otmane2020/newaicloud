import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "@/lib/language";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bot,
  FileText,
  Gauge,
  Globe2,
  Home,
  Image,
  Layers3,
  Newspaper,
  Package,
  Settings,
  Sparkles,
  Tags,
} from "lucide-react";
import { ProductOptimizationTabs } from "@/components/seo/ProductOptimizationTabs";
import { TagOptimization } from "@/components/seo/TagOptimization";
import { SeoAltImage } from "@/components/seo/SeoAltImage";
import { SmartTitle } from "@/components/seo/SmartTitle";
import { SeoAutomation } from "@/components/seo/SeoAutomation";
import { PageOptimization } from "@/components/seo/PageOptimization";
import { HomePageSeo } from "@/components/seo/HomePageSeo";
import { SeoAuditReports } from "@/components/seo/SeoAuditReports";
import { CollectionOptimization } from "@/components/seo/CollectionOptimization";
import { SeoAuditDashboard } from "@/components/seo/SeoAuditDashboard";
import { GoogleSearchConsole } from "@/components/seo/GoogleSearchConsole";
import ArticleManagement from "@/pages/ArticleManagement";

type MainSection = "products" | "resources" | "blog" | "more";

type TabDefinition = {
  id: string;
  section: MainSection;
  fr: string;
  en: string;
  icon: typeof Package;
};

const TABS: TabDefinition[] = [
  { id: "products", section: "products", fr: "SEO produit", en: "Product SEO", icon: Package },
  { id: "smart-title", section: "products", fr: "Titres IA", en: "AI titles", icon: Sparkles },
  { id: "tags", section: "products", fr: "Tags", en: "Tags", icon: Tags },
  { id: "alt", section: "products", fr: "ALT images", en: "Image ALT", icon: Image },

  { id: "collections", section: "resources", fr: "Collections", en: "Collections", icon: Layers3 },
  { id: "pages", section: "resources", fr: "Pages", en: "Pages", icon: FileText },
  { id: "homepage", section: "resources", fr: "Accueil", en: "Homepage", icon: Home },

  { id: "articles", section: "blog", fr: "Articles", en: "Articles", icon: Newspaper },

  { id: "automation", section: "more", fr: "Automatisation", en: "Automation", icon: Settings },
  { id: "audit-dashboard", section: "more", fr: "Score", en: "Score", icon: Gauge },
  { id: "audit", section: "more", fr: "Audits", en: "Audits", icon: BarChart3 },
  { id: "google-console", section: "more", fr: "Search Console", en: "Search Console", icon: Globe2 },
];

const SECTION_META = {
  products: { fr: "Produits", en: "Products", icon: Package, defaultTab: "products" },
  resources: { fr: "Collections & pages", en: "Collections & pages", icon: Layers3, defaultTab: "collections" },
  blog: { fr: "Blog", en: "Blog", icon: Newspaper, defaultTab: "articles" },
  more: { fr: "Plus", en: "More", icon: Bot, defaultTab: "automation" },
} satisfies Record<MainSection, { fr: string; en: string; icon: typeof Package; defaultTab: string }>;

function normalizeTab(value: string | null) {
  if (value === "optimization") return "products";
  return TABS.some((tab) => tab.id === value) ? String(value) : "products";
}

export default function ContentSeoHub() {
  const { language } = useTranslation();
  const fr = language === "fr";
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = normalizeTab(searchParams.get("tab"));
  const activeDefinition = TABS.find((tab) => tab.id === activeTab) || TABS[0];
  const activeSection = activeDefinition.section;

  const secondaryTabs = useMemo(
    () => TABS.filter((tab) => tab.section === activeSection),
    [activeSection],
  );

  const changeTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "smart-title": return <SmartTitle />;
      case "tags": return <TagOptimization />;
      case "alt": return <SeoAltImage />;
      case "collections": return <CollectionOptimization />;
      case "pages": return <PageOptimization />;
      case "homepage": return <HomePageSeo />;
      case "articles": return <ArticleManagement />;
      case "automation": return <SeoAutomation />;
      case "audit-dashboard": return <SeoAuditDashboard />;
      case "audit": return <SeoAuditReports />;
      case "google-console": return <GoogleSearchConsole />;
      case "products":
      default:
        return <ProductOptimizationTabs />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950">{fr ? "Contenu" : "Content"}</h1>
          <p className="text-xs text-slate-500">SEO · metadata · pages</p>
        </div>

        <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-1">
          {(Object.keys(SECTION_META) as MainSection[]).map((section) => {
            const meta = SECTION_META[section];
            const Icon = meta.icon;
            return (
              <button
                type="button"
                key={section}
                onClick={() => changeTab(meta.defaultTab)}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                  activeSection === section ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {fr ? meta.fr : meta.en}
              </button>
            );
          })}
        </div>
      </div>

      <nav className="flex max-w-full gap-1 overflow-x-auto pb-1" aria-label={fr ? "Outils contenu" : "Content tools"}>
        {secondaryTabs.map(({ id, fr: labelFr, en: labelEn, icon: Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => changeTab(id)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors",
              activeTab === id
                ? "border-slate-300 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {fr ? labelFr : labelEn}
          </button>
        ))}
      </nav>

      <div className="min-w-0">{renderContent()}</div>
    </div>
  );
}
