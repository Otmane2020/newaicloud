import { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, Layers3, Database, FileSpreadsheet, FileText,
  Tags, Sparkles, Image, Images, History, BadgeDollarSign, Store,
  ShoppingCart, RefreshCw, Settings, User, CreditCard, Key, Code,
  ChevronDown, LogOut, FlaskConical, Bot, Megaphone, Search, Newspaper,
  WandSparkles, Activity
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StoreSelector } from "@/components/StoreSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/language";
import { CatalogOptimizeLogo } from "@/components/CatalogOptimizeLogo";

type NavItem = { label: string; href: string; icon: typeof Package; badge?: string };
type NavSection = { label: string; icon: typeof Package; items: NavItem[] };

export function CatalogOptimizeSidebar() {
  const { state, isMobile, openMobile, toggleSidebar } = useSidebar();
  const { pathname, search } = useLocation();
  const { signOut } = useAuth();
  const { language } = useTranslation();
  const fr = language === "fr";

  const sections: NavSection[] = useMemo(() => [
    {
      label: fr ? "Catalogue" : "Catalog",
      icon: Package,
      items: [
        { label: fr ? "Produits" : "Products", href: "/products", icon: Package },
        { label: fr ? "Collections" : "Collections", href: "/collections", icon: Layers3 },
        { label: fr ? "Sources produits" : "Product Sources", href: "/product-source", icon: Database },
        { label: fr ? "Importer & synchroniser" : "Import & Sync", href: "/products?panel=import", icon: RefreshCw },
      ],
    },
    {
      label: fr ? "Contenu" : "Content",
      icon: FileText,
      items: [
        { label: fr ? "Titres & descriptions" : "Titles & Descriptions", href: "/products/title-description", icon: FileText },
        { label: fr ? "Landing pages produit" : "Product Landing Pages", href: "/products/title-description?view=landing", icon: FileSpreadsheet },
        { label: fr ? "Catégories & tags" : "Categories & Tags", href: "/seo?tab=tags", icon: Tags },
        { label: fr ? "Optimisation en masse" : "Bulk Optimization", href: "/products/title-description?view=bulk", icon: Sparkles },
      ],
    },
    {
      label: fr ? "Médias" : "Media",
      icon: Images,
      items: [
        { label: fr ? "Galeries produit" : "Product Galleries", href: "/products/title-description?view=gallery", icon: Images },
        { label: "AI Image Studio", href: "/products/title-description?view=images", icon: WandSparkles },
        { label: "ALT Text", href: "/seo?tab=alt", icon: Image },
        { label: fr ? "Historique médias" : "Media History", href: "/products/media-history", icon: History },
      ],
    },
    {
      label: fr ? "Tarification" : "Pricing",
      icon: BadgeDollarSign,
      items: [
        { label: fr ? "Coûts & marges" : "Costs & Margins", href: "/pricing?tab=costs", icon: BadgeDollarSign },
        { label: fr ? "Prix concurrents" : "Competitor Prices", href: "/pricing?tab=competitors", icon: Search },
        { label: fr ? "Recommandations" : "Recommendations", href: "/pricing?tab=recommendations", icon: Sparkles },
      ],
    },
    {
      label: fr ? "Canaux" : "Channels",
      icon: Store,
      items: [
        { label: fr ? "Assistant vendeur IA" : "AI Sales Assistant", href: "/storefront-assistant", icon: Bot, badge: "AI" },
        { label: "Shopify", href: "/account?tab=integrations", icon: Store },
        { label: "Google Shopping", href: "/shopping", icon: ShoppingCart },
        { label: "Merchant Center", href: "/merchant?tab=integration", icon: Store },
        { label: fr ? "Flux produits" : "Product Feed", href: "/merchant?tab=feed", icon: FileSpreadsheet },
      ],
    },
    {
      label: fr ? "Automatisation" : "Automation",
      icon: RefreshCw,
      items: [
        { label: fr ? "Règles d'optimisation" : "Optimization Rules", href: "/seo?tab=automation", icon: Settings },
        { label: fr ? "Synchronisation" : "Sync Settings", href: "/merchant?tab=sync", icon: RefreshCw },
        { label: fr ? "Tâches & historique" : "Jobs & History", href: "/cron-monitoring", icon: Activity },
      ],
    },
    {
      label: fr ? "Paramètres" : "Settings",
      icon: Settings,
      items: [
        { label: fr ? "Boutiques & intégrations" : "Stores & Integrations", href: "/account?tab=integrations", icon: Store },
        { label: fr ? "Profil" : "Profile", href: "/account?tab=profile", icon: User },
        { label: fr ? "Abonnement" : "Subscription", href: "/subscription", icon: CreditCard },
        { label: fr ? "Utilisation" : "Usage", href: "/account?tab=usage", icon: Activity },
        { label: "API", href: "/api-keys", icon: Key },
      ],
    },
  ], [fr]);

  const labs: NavItem[] = [
    { label: "AEO & AI Answers", href: "/aeo-chatgpt", icon: Sparkles },
    { label: fr ? "Blog & campagnes" : "Blog & Campaigns", href: "/blog", icon: Newspaper },
    { label: fr ? "Réseaux sociaux" : "Social Media", href: "/social-media", icon: Megaphone },
    { label: "Google Ads", href: "/google-ads", icon: Megaphone },
    { label: fr ? "Assistant commercial" : "Commerce Assistant", href: "/chat", icon: Bot },
    { label: fr ? "Modèles boutique" : "Store Templates", href: "/store-templates", icon: Code },
  ];

  const closeMobile = () => {
    if (isMobile && openMobile) toggleSidebar();
  };
  const active = (href: string) => {
    const [path, query] = href.split("?");
    if (pathname !== path) return false;
    if (!query) return true;
    return new URLSearchParams(search).toString().includes(query);
  };

  const navItem = (item: NavItem) => (
    <SidebarMenuSubItem key={item.href}>
      <SidebarMenuSubButton asChild isActive={active(item.href)}>
        <NavLink to={item.href} onClick={closeMobile}>
          <item.icon className="h-4 w-4" />
          <span>{item.label}</span>
          {item.badge && <Badge variant="secondary" className="ml-auto text-[10px]">{item.badge}</Badge>}
        </NavLink>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );

  return (
    <Sidebar className="border-r border-slate-200 shadow-[8px_0_30px_rgba(15,23,42,0.04)]">
      <SidebarContent className="bg-gradient-to-b from-white via-white to-violet-50/40">
        <div className="border-b border-slate-200 bg-white px-3 py-4">
          <CatalogOptimizeLogo compact={state !== "expanded"} />
          {state === "expanded" && (
            <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/70 p-2">
              <StoreSelector />
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard" || pathname === "/dashboard-light"}>
                  <NavLink to="/dashboard" onClick={closeMobile}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{fr ? "Tableau de bord" : "Dashboard"}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {sections.map((section) => (
                <Collapsible key={section.label} defaultOpen={section.items.some((item) => active(item.href))}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <section.icon className="h-4 w-4" />
                        <span>{section.label}</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>{section.items.map(navItem)}</SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}

              <Collapsible defaultOpen={labs.some((item) => active(item.href))}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <FlaskConical className="h-4 w-4" />
                      <span>{fr ? "Labs & croissance" : "Labs & Growth"}</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>{labs.map(navItem)}</SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200 bg-white">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button variant="ghost" className="w-full justify-start" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" />
                {state === "expanded" && <span>{fr ? "Déconnexion" : "Log out"}</span>}
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
