import { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, Layers3, Database, FileText,
  Sparkles, BadgeDollarSign, Store, ShoppingCart, RefreshCw, Settings,
  User, CreditCard, Key, Code, ChevronDown, LogOut, FlaskConical, Bot,
  Megaphone, Search, Newspaper, WandSparkles, Activity
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub,
  SidebarMenuSubButton, SidebarMenuSubItem, useSidebar
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StoreSelector } from "@/components/StoreSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/language";
import { CatalogOptimizeLogo } from "@/components/CatalogOptimizeLogo";

type NavItem = { label: string; href: string; icon: typeof Package; badge?: string; aliases?: string[] };
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
        { label: fr ? "Données enrichies" : "Enriched Data", href: "/product-source", icon: Database },
      ],
    },
    {
      label: fr ? "Contenu" : "Content",
      icon: FileText,
      items: [
        {
          label: fr ? "Contenu produit" : "Product content",
          href: "/products/title-description",
          icon: FileText,
          aliases: ["/products/title-description", "/seo?tab=products", "/seo?tab=tags", "/seo?tab=alt"],
        },
        {
          label: fr ? "Collections & pages" : "Collections & pages",
          href: "/seo?tab=collections",
          icon: Layers3,
          aliases: ["/seo?tab=collections", "/seo?tab=pages"],
        },
        {
          label: "Blog",
          href: "/blog/management",
          icon: Newspaper,
          aliases: ["/blog/management", "/blog-monitoring", "/cron-monitoring"],
        },
        {
          label: "Studio",
          href: "/ai-creative-studio",
          icon: WandSparkles,
          badge: "AI",
          aliases: [
            "/ai-creative-studio",
            "/products/title-description?view=images",
            "/products/media-history",
            "/social-media",
          ],
        },
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
        { label: "Google Shopping", href: "/shopping", icon: ShoppingCart },
        { label: "Merchant Center", href: "/merchant?tab=feed", icon: Store },
      ],
    },
    {
      label: fr ? "Automatisation" : "Automation",
      icon: RefreshCw,
      items: [
        { label: fr ? "Règles" : "Rules", href: "/seo?tab=automation", icon: Settings },
        { label: fr ? "Tâches" : "Jobs", href: "/cron-monitoring", icon: Activity },
      ],
    },
    {
      label: fr ? "Paramètres" : "Settings",
      icon: Settings,
      items: [
        { label: fr ? "Boutiques & intégrations" : "Stores & Integrations", href: "/account?tab=integrations", icon: Store },
        { label: fr ? "Compte & utilisation" : "Account & Usage", href: "/account?tab=profile", icon: User },
        { label: fr ? "Abonnement" : "Subscription", href: "/subscription", icon: CreditCard },
        { label: "API", href: "/api-keys", icon: Key },
      ],
    },
  ], [fr]);

  const labs: NavItem[] = [
    { label: "AEO & AI Answers", href: "/aeo-chatgpt", icon: Sparkles },
    { label: "Google Ads", href: "/google-ads", icon: Megaphone },
    { label: fr ? "Assistant commercial" : "Commerce Assistant", href: "/chat", icon: Bot },
    { label: fr ? "Modèles boutique" : "Store Templates", href: "/store-templates", icon: Code },
  ];

  const closeMobile = () => {
    if (isMobile && openMobile) toggleSidebar();
  };

  const activeHref = (href: string) => {
    const [path, query] = href.split("?");
    if (pathname !== path) return false;
    if (!query) return true;
    const current = new URLSearchParams(search);
    const expected = new URLSearchParams(query);
    return Array.from(expected.entries()).every(([key, value]) => current.get(key) === value);
  };

  const active = (item: NavItem) => activeHref(item.href) || (item.aliases || []).some(activeHref);

  const navItem = (item: NavItem) => (
    <SidebarMenuSubItem key={item.href}>
      <SidebarMenuSubButton asChild isActive={active(item)}>
        <NavLink to={item.href} onClick={closeMobile}>
          <item.icon className="h-4 w-4" />
          <span>{item.label}</span>
          {item.badge && <Badge variant="secondary" className="ml-auto px-1.5 text-[9px]">{item.badge}</Badge>}
        </NavLink>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );

  return (
    <Sidebar className="border-r border-slate-200 shadow-[8px_0_30px_rgba(15,23,42,0.03)]">
      <SidebarContent className="bg-white">
        <div className="border-b border-slate-200 bg-white px-3 py-4">
          <CatalogOptimizeLogo compact={state !== "expanded"} />
          {state === "expanded" && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
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
                <Collapsible key={section.label} defaultOpen={section.items.some(active)}>
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

              <Collapsible defaultOpen={labs.some(active)}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <FlaskConical className="h-4 w-4" />
                      <span>{fr ? "Labs" : "Labs"}</span>
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
