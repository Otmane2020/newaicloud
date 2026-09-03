import { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  Bot,
  Camera,
  ChevronDown,
  CreditCard,
  DollarSign,
  FileText,
  History,
  LayoutDashboard,
  Layers3,
  LogOut,
  Megaphone,
  Newspaper,
  Package,
  PanelsTopLeft,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  User,
  Wand2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StoreSelector } from "@/components/StoreSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/language";
import { CatalogOptimizeLogo } from "@/components/CatalogOptimizeLogo";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Package;
  badge?: string;
  aliases?: string[];
};

type NavSection = {
  label: string;
  icon: typeof Package;
  items: NavItem[];
};

export function CatalogOptimizeSidebar() {
  const { state, isMobile, openMobile, toggleSidebar } = useSidebar();
  const { pathname, search } = useLocation();
  const { signOut } = useAuth();
  const { language } = useTranslation();
  const fr = language === "fr";

  const sections: NavSection[] = useMemo(
    () => [
      {
        label: fr ? "Catalogue" : "Catalog",
        icon: Package,
        items: [
          {
            label: "Product Optimizer",
            href: "/products/title-description?view=content",
            icon: Wand2,
            badge: "AI",
            aliases: ["/content?tool=catalog"],
          },
          { label: "Collections", href: "/collections", icon: Layers3 },
          {
            label: "Smart Pricing",
            href: "/products/media-history?view=smart-pricing",
            icon: DollarSign,
            badge: "AI",
          },
        ],
      },
      {
        label: "Studio",
        icon: Sparkles,
        items: [
          {
            label: "Landing Pages",
            href: "/content?tool=landing",
            icon: PanelsTopLeft,
          },
          {
            label: "Background",
            href: "/studio?mode=backgrounds",
            icon: Wand2,
            aliases: ["/content?tool=background"],
          },
          {
            label: "Product Shot",
            href: "/studio?mode=shots",
            icon: Camera,
            badge: "AI",
            aliases: ["/content?tool=shots"],
          },
          {
            label: "Ads creatives",
            href: "/studio?mode=creative",
            icon: Megaphone,
            aliases: ["/ai-creative-studio"],
          },
          {
            label: fr ? "Historique média" : "Media History",
            href: "/products/media-history?view=history",
            icon: History,
          },
        ],
      },
      {
        label: "SEO",
        icon: Sparkles,
        items: [
          {
            label: "SEO Workspace",
            href: "/seo?tab=collections",
            icon: Sparkles,
            aliases: [
              "/seo?tab=pages",
              "/seo?tab=articles",
              "/seo?tab=tags",
              "/seo?tab=alt",
              "/seo?tab=homepage",
            ],
          },
          {
            label: "Blog",
            href: "/blog/management",
            icon: Newspaper,
            aliases: ["/blog-monitoring"],
          },
          {
            label: "Add GEO Articles",
            href: "/blog/management?new=1",
            icon: Sparkles,
            badge: "GEO",
          },
        ],
      },
      {
        label: "GEO & AI Search",
        icon: Bot,
        items: [
          {
            label: fr ? "Plan 30 jours" : "30-day plan",
            href: "/aeo?tab=planning",
            icon: Activity,
          },
          {
            label: "Publications",
            href: "/aeo?tab=history",
            icon: FileText,
          },
          {
            label: "Product Enrich",
            href: "/product-source",
            icon: Sparkles,
            aliases: ["/product-enrichment"],
          },
        ],
      },
      {
        label: "AI Chat",
        icon: Bot,
        items: [
          {
            label: fr ? "Assistant vendeur" : "Sales Assistant",
            href: "/storefront-assistant",
            icon: Bot,
            badge: "AI",
            aliases: ["/chat"],
          },
        ],
      },
      {
        label: fr ? "Vente & canaux" : "Sales & Channels",
        icon: Store,
        items: [
          {
            label: "Google Shopping",
            href: "/shopping",
            icon: ShoppingCart,
          },
          {
            label: "Merchant Center",
            href: "/merchant?tab=feed",
            icon: Store,
          },
        ],
      },
      {
        label: fr ? "Paramètres" : "Settings",
        icon: Settings,
        items: [
          {
            label: fr ? "Boutiques & intégrations" : "Stores & Integrations",
            href: "/account?tab=integrations",
            icon: Store,
          },
          {
            label: fr ? "Compte & utilisation" : "Account & Usage",
            href: "/account?tab=profile",
            icon: User,
          },
          {
            label: fr ? "Abonnement" : "Subscription",
            href: "/subscription",
            icon: CreditCard,
          },
        ],
      },
    ],
    [fr],
  );

  const closeMobile = () => {
    if (isMobile && openMobile) toggleSidebar();
  };

  const activeHref = (href: string) => {
    const [path, query] = href.split("?");
    if (pathname !== path) return false;

    const current = new URLSearchParams(search);
    if (!query) {
      // Keep the Blog list and Add GEO Articles as two distinct submenu states.
      if (path === "/blog/management" && current.get("new") === "1") return false;
      return true;
    }

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
          {item.badge && (
            <Badge variant="secondary" className="ml-auto rounded-md px-1.5 text-[9px]">
              {item.badge}
            </Badge>
          )}
        </NavLink>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );

  return (
    <Sidebar className="border-r border-slate-200 shadow-[8px_0_30px_rgba(15,23,42,0.03)]">
      <SidebarContent className="bg-white">
        <div className="border-b border-slate-200 bg-white px-3 py-4">
          <CatalogOptimizeLogo compact={state !== "expanded"} size="sm" />
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
