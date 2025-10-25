import { LayoutDashboard, ShoppingBag, FileText, Search, User, LogOut, Sparkles, Tags, Image, Settings, ShoppingCart, MessageSquare, Zap, Lightbulb, Package } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
  useSidebar,
  SidebarMenuAction,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Produits", url: "/products", icon: ShoppingBag },
  { title: "Google Merchant", url: "/merchant", icon: ShoppingBag },
  { title: "Google Shopping", url: "/shopping", icon: ShoppingCart },
  { title: "Recherche IA", url: "/search", icon: Search },
];

const chatSubItems = [
  { title: "Chat Assistant", url: "/chat", icon: MessageSquare },
  { title: "Produit Enrichi", url: "/product-enrichment", icon: Zap },
];

const seoSubItems = [
  { title: "SEO Optimisation", url: "/seo?tab=optimization", icon: Sparkles },
  { title: "Tag Optimisation", url: "/seo?tab=tags", icon: Tags },
  { title: "ALT Image", url: "/seo?tab=alt", icon: Image },
  { title: "Automatisation", url: "/seo?tab=automation", icon: Settings },
];

const blogSubItems = [
  { title: "Articles", url: "/blog?tab=articles", icon: FileText },
  { title: "Opportunités", url: "/blog?tab=opportunities", icon: Lightbulb },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const currentPath = location.pathname;
  const currentSearch = location.search;

  const isActive = (path: string) => {
    if (path.includes('?')) {
      const [pathPart, searchPart] = path.split('?');
      return currentPath === pathPart && currentSearch.includes(searchPart);
    }
    return currentPath === path;
  };

  const isChatActive = currentPath === '/chat' || currentPath === '/product-enrichment' || chatSubItems.some(item => isActive(item.url));
  const isSeoActive = currentPath === '/seo' || seoSubItems.some(item => isActive(item.url));
  const isBlogActive = currentPath === '/blog' || blogSubItems.some(item => isActive(item.url));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Chat Menu with Submenu */}
              <Collapsible defaultOpen={isChatActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isChatActive}>
                      <MessageSquare className="h-4 w-4" />
                      <span>Chat</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {chatSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                            <NavLink to={subItem.url}>
                              <subItem.icon className="h-4 w-4" />
                              <span>{subItem.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* SEO Menu with Submenu */}
              <Collapsible defaultOpen={isSeoActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isSeoActive}>
                      <Sparkles className="h-4 w-4" />
                      <span>SEO</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {seoSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                            <NavLink to={subItem.url}>
                              <subItem.icon className="h-4 w-4" />
                              <span>{subItem.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Blog Menu with Submenu */}
              <Collapsible defaultOpen={isBlogActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isBlogActive}>
                      <FileText className="h-4 w-4" />
                      <span>Blog SEO</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {blogSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                            <NavLink to={subItem.url}>
                              <subItem.icon className="h-4 w-4" />
                              <span>{subItem.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <div className="flex items-center gap-2 px-2">
                <User className="h-4 w-4" />
                {state === "expanded" && (
                  <span className="text-sm truncate">{user?.email}</span>
                )}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
                {state === "expanded" && <span>Déconnexion</span>}
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
