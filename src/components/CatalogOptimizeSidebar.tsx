import { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, Layers3, Database, FileText,
  Sparkles, Store, ShoppingCart, Settings,
  User, CreditCard, ChevronDown, LogOut, Bot,
  Newspaper, Activity, Camera, Tags, Images, Home,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar,
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
        { label: "Collections", href: "/collections", icon: Layers3 },
        { label: fr ? "Données enrichies" : "Enriched Data", href: "/product-source", icon: Database },
      ],
    },
    {
      label: fr ? "Contenu" : "Content",
      icon: FileText,
      items: [
        {
          label: fr ? "Optimisation produit" : "Product Optimization",
          href: "/content",
          icon: FileText,
          aliases: [
            "/products/title-description",
            "/products/title-description?view=content",
            "/products/title-description?view=landing",
            "/products/title-description?view=bulk",
          ],
        },
        {
          label: "Studio",
          href: "/studio",
          icon: Camera,
          badge: "AI",
          aliases: ["/ai-creative-studio", "/products/media-history"],
        },
      ],
    },
    {
      label: "SEO",
      icon: Sparkles,
      items: [
        {
          label: "Blog",
          href: "/blog/management",
          icon: Newspaper,
          aliases: ["/blog-monitoring"],
        },
        { label: fr ? "Nouvel article" : "New article", href: "/blog/management?new=1", icon: Newspaper },
        {
          label: fr ? "Collections & pages" : "Collections & pages",
          href: "/seo?tab=collections",
          icon: Layers3,
          aliases: ["/seo?tab=pages"],
        },
        { label: "Tags", href: "/seo?tab=tags", icon: Tags },
        { label: fr ? "ALT Images" : "Image ALT", href: "/seo?tab=alt", icon: Images },
        { label: fr ? "SEO accueil" : "Homepage SEO", href: "/seo?tab=homepage", icon: Home },
      ],
    },
    {
      label: "GEO & AI Search",
      icon: Bot,
      items: [
        {
          label: fr ? "Opportunités GEO" : "GEO Opportunities",
          href: "/aeo?tab=opportunities",
          icon: Sparkles,
          aliases: ["/aeo"],
        },
        {
          label: fr ? "Assistant GEO" : "GEO Assistant",
          href: "/aeo?tab=wizard",
          icon: Bot,
        },
        {
          label: "ChatGPT",
          href: "/aeo-chatgpt",
          icon: Bot,
          badge: "AI",
        },
        {
          label: "Gemini",
          href: "/aeo-gemini",
          icon: Sparkles,
          badge: "AI",
        },
        {
          label: "Copilot",
          href: "/aeo-copilot",
          icon: Bot,
          badge: "AI",
        },
        {
          label: fr ? "Calendrier AEO" : "AEO Calendar",
          href: "/aeo-calendar",
          icon: Activity,
        },
        {
          label: fr ? "Connexions GEO" : "GEO Connections",
          href: "/aeo?tab=integrations",
          icon: Settings,
        },
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
      label: fr ? "Paramètres" : "Settings",
      icon: Settings,
      items: [
        { label: fr ? "Boutiques & intégrations" : "Stores & Integrations", href: "/account?tab=integrations", icon: Store },
        { label: fr ? "Compte & utilisation" : "Account & Usage", href: "/account?tab=profile", icon: User },
        { label: fr ? "Tâches" : "Jobs", href: "/cron-monitoring", icon: Activity },
        { label: fr ? "Abonnement" : "Subscription", href: "/subscription", icon: CreditCard },
      ],
    },
  ], [fr]);

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
