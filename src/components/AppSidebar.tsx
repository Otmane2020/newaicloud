import {
  LayoutDashboard, Package, FileText, Image, CreditCard, Store,
  Zap, FlaskConical, Settings, LogOut, ChevronRight, ShoppingCart,
  MessageSquare, RefreshCw, Database, Tags, History, Bot, User, Key
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem,
  SidebarMenuSubButton, SidebarFooter
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { StoreSelector } from "@/components/StoreSelector";

type NavItem = { label: string; to: string; icon: typeof Package };
type NavGroup = { label: string; icon: typeof Package; items: NavItem[] };

const groups: NavGroup[] = [
  { label: "Catalog", icon: Package, items: [
    { label: "Products", to: "/products", icon: Package },
    { label: "Collections", to: "/collections", icon: Database },
    { label: "Enriched data", to: "/product-source", icon: Database },
  ]},
  { label: "Content", icon: FileText, items: [
    { label: "Product content", to: "/products/title-description", icon: FileText },
    { label: "Landing pages", to: "/products/title-description?view=landing", icon: FileText },
    { label: "Categories & tags", to: "/seo?tab=tags", icon: Tags },
  ]},
  { label: "Media", icon: Image, items: [
    { label: "Image Studio", to: "/products/title-description?view=images", icon: Image },
  ]},
  { label: "Pricing", icon: CreditCard, items: [
    { label: "Costs & margins", to: "/pricing?tab=costs", icon: CreditCard },
    { label: "Market prices", to: "/pricing?tab=competitors", icon: CreditCard },
    { label: "Recommendations", to: "/pricing?tab=recommendations", icon: Zap },
  ]},
  { label: "Channels", icon: Store, items: [
    { label: "Google Shopping", to: "/shopping", icon: ShoppingCart },
    { label: "Merchant Center", to: "/merchant?tab=integration", icon: Store },
    { label: "Sales Assistant", to: "/storefront-assistant", icon: MessageSquare },
  ]},
  { label: "Automation", icon: Zap, items: [
    { label: "Rules", to: "/seo?tab=automation", icon: Zap },
    { label: "Sync", to: "/merchant?tab=sync", icon: RefreshCw },
    { label: "Tasks & history", to: "/cron-monitoring", icon: History },
  ]},
  { label: "Labs", icon: FlaskConical, items: [
    { label: "AEO & AI answers", to: "/aeo-chatgpt", icon: Bot },
    { label: "Blog & campaigns", to: "/blog", icon: FileText },
    { label: "Growth tools", to: "/social-media", icon: FlaskConical },
  ]},
];

const settings: NavItem[] = [
  { label: "Stores & integrations", to: "/account?tab=integrations", icon: Store },
  { label: "Account", to: "/account?tab=profile", icon: User },
  { label: "Plan & billing", to: "/subscription", icon: CreditCard },
  { label: "Usage", to: "/account?tab=usage", icon: Zap },
  { label: "API", to: "/api-keys", icon: Key },
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const active = (to: string) => {
    const [path, query] = to.split("?");
    if (location.pathname !== path) return false;
    return !query || new URLSearchParams(location.search).get("tab") === new URLSearchParams(query).get("tab");
  };

  const groupActive = (group: NavGroup) => group.items.some((item) => active(item.to));

  const renderItem = (item: NavItem) => (
    <SidebarMenuSubItem key={item.to}>
      <SidebarMenuSubButton asChild isActive={active(item.to)} className="h-9 rounded-lg">
        <NavLink to={item.to}>
          <item.icon className="h-4 w-4" />
          <span>{item.label}</span>
        </NavLink>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );

  return (
    <Sidebar className="border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <NavLink to="/dashboard" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-sm font-bold text-white">C</span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-tight text-slate-950">CatalogOptimize <span className="text-violet-600">AI</span></p>
            <p className="text-[10px] font-medium uppercase tracking-[.16em] text-slate-500">Product operations</p>
          </div>
        </NavLink>
        <div className="mt-4"><StoreSelector /></div>
      </div>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={active("/dashboard")} className="h-10 rounded-lg">
                  <NavLink to="/dashboard"><LayoutDashboard className="h-4 w-4" /><span>Overview</span></NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {groups.map((group) => (
                <Collapsible key={group.label} open={open[group.label] ?? groupActive(group)} onOpenChange={(value) => setOpen((current) => ({ ...current, [group.label]: value }))}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton isActive={groupActive(group)} className="h-10 rounded-lg">
                        <group.icon className="h-4 w-4" />
                        <span>{group.label}</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform data-[state=open]:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="mx-3 border-l border-slate-200 px-2 py-1">
                        {group.items.map(renderItem)}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}

              <Collapsible open={open.Settings ?? settings.some((item) => active(item.to))} onOpenChange={(value) => setOpen((current) => ({ ...current, Settings: value }))}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={settings.some((item) => active(item.to))} className="h-10 rounded-lg">
                      <Settings className="h-4 w-4" /><span>Settings</span><ChevronRight className="ml-auto h-4 w-4" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent><SidebarMenuSub className="mx-3 border-l border-slate-200 px-2 py-1">{settings.map(renderItem)}</SidebarMenuSub></CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200 p-2">
        <SidebarMenu><SidebarMenuItem><SidebarMenuButton onClick={signOut} className="h-10 rounded-lg"><LogOut className="h-4 w-4" /><span>Log out</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
