import {
  LayoutDashboard,
  ShoppingBag,
  FileText,
  Search,
  User,
  LogOut,
  Sparkles,
  Tags,
  Image,
  Settings,
  ShoppingCart,
  MessageSquare,
  Zap,
  Lightbulb,
  Package,
  Database,
  History,
  CreditCard,
  Receipt,
  Link,
  Bot,
  CalendarClock,
  ChevronRight,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
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
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const mainMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Produits", url: "/products", icon: ShoppingBag },
];

const seoSubItems = [
  { title: "SEO Optimisation", url: "/seo?tab=optimization", icon: Sparkles },
  { title: "Tag Optimisation", url: "/seo?tab=tags", icon: Tags },
  { title: "Pages", url: "/seo?tab=pages", icon: FileText },
  { title: "ALT Image", url: "/seo?tab=alt", icon: Image },
  { title: "Automatisation", url: "/seo?tab=automation", icon: Settings },
];

const blogSubItems = [
  { title: "Gestion Articles", url: "/blog/management", icon: FileText },
  { title: "Articles IA", url: "/blog?tab=articles", icon: Sparkles },
  { title: "Campagnes IA", url: "/blog?tab=campaigns", icon: CalendarClock },
];

const blogOpportunitiesSubItems = [
  { title: "Netlinking", url: "/blog?tab=opportunities&view=netlinking", icon: Link },
  { title: "Paramètres", url: "/blog?tab=opportunities&view=settings", icon: Settings },
];

const bottomMenuItems = [
  { title: "Recherche IA", url: "/search", icon: Search },
  { title: "Google Shopping", url: "/shopping", icon: ShoppingCart },
  { title: "Google Merchant", url: "/merchant", icon: Package },
];

const chatSubItems = [
  { title: "Chat Assistant", url: "/chat", icon: MessageSquare },
  { title: "Robot AI", url: "/chat-robot", icon: Bot },
  { title: "Historique", url: "/chat-history", icon: History },
  { title: "Source Produits", url: "/product-source", icon: Database },
  { title: "Paramètres", url: "/chat-settings", icon: Settings },
];

const accountSubItems = [
  { title: "Mon Profil", url: "/account?tab=profile", icon: User },
  { title: "Intégrations", url: "/account?tab=integrations", icon: Package },
  { title: "Abonnement", url: "/account?tab=subscription", icon: CreditCard },
  { title: "Facturation", url: "/account?tab=billing", icon: Receipt },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const currentPath = location.pathname;
  const currentSearch = location.search;
  const [userPlan, setUserPlan] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserPlan = async () => {
      console.log("🔍 Fetching user plan for:", user?.id);

      if (!user?.id) {
        console.log("❌ No user ID");
        return;
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("current_plan_id")
          .eq("id", user.id)
          .single();

        console.log("📊 Profile data:", profile);
        console.log("❌ Profile error:", profileError);

        if (profile?.current_plan_id) {
          const { data: plan, error: planError } = await supabase
            .from("subscription_plans")
            .select("name")
            .eq("id", profile.current_plan_id)
            .single();

          console.log("📋 Plan data:", plan);
          console.log("❌ Plan error:", planError);
          console.log("✅ Setting userPlan to:", plan?.name);

          setUserPlan(plan?.name || null);
        } else {
          console.log("⚠️ No current_plan_id in profile");
        }
      } catch (error) {
        console.error("💥 Error fetching user plan:", error);
      }
    };

    fetchUserPlan();
  }, [user?.id]);

  const isActive = (path: string) => {
    if (path.includes("?")) {
      const [pathPart, searchPart] = path.split("?");
      return currentPath === pathPart && currentSearch.includes(searchPart);
    }
    return currentPath === path;
  };

  const isChatActive =
    currentPath.startsWith("/chat") ||
    currentPath === "/product-source" ||
    chatSubItems.some((item) => isActive(item.url));
  const isSeoActive = currentPath === "/seo" || seoSubItems.some((item) => isActive(item.url));
  const isBlogActive = currentPath === "/blog" || blogSubItems.some((item) => isActive(item.url));
  const isAccountActive = currentPath === "/account" || accountSubItems.some((item) => isActive(item.url));
  const isOpportunitiesActive = currentSearch.includes("tab=opportunities");

  return (
    <Sidebar collapsible="icon">
      {/* Logo Header */}
      <div className="border-b p-4">
        <NavLink to="/dashboard" className="flex items-center gap-2 group transition-transform hover:scale-105">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          {state === "expanded" && (
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              NewAI
            </span>
          )}
        </NavLink>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

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

              {/* Blog Menu with Nested Submenu */}
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

                      {/* Opportunités with nested sub-menu */}
                      <Collapsible defaultOpen={isOpportunitiesActive} className="group/collapsible-nested">
                        <SidebarMenuSubItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuSubButton isActive={isActive("/blog?tab=opportunities")}>
                              <Lightbulb className="h-4 w-4" />
                              <span>Opportunités</span>
                              <ChevronRight className="ml-auto h-3 w-3 transition-transform duration-200 group-data-[state=open]/collapsible-nested:rotate-90" />
                            </SidebarMenuSubButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="ml-4 border-l border-border pl-2 space-y-1 mt-1">
                              {blogOpportunitiesSubItems.map((item) => (
                                <SidebarMenuSubButton
                                  key={item.title}
                                  asChild
                                  isActive={isActive(item.url)}
                                  className="text-xs"
                                >
                                  <NavLink to={item.url}>
                                    <item.icon className="h-3 w-3" />
                                    <span>{item.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </SidebarMenuSubItem>
                      </Collapsible>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Bottom Menu Items */}
              {bottomMenuItems.map((item) => (
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

              {/* Account Menu with Submenu */}
              <Collapsible defaultOpen={isAccountActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isAccountActive}>
                      <User className="h-4 w-4" />
                      <span>Compte</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {accountSubItems.map((subItem) => (
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
              <div className="flex flex-col gap-1 px-2 py-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {state === "expanded" && <span className="text-sm truncate">{user?.email}</span>}
                </div>
                {state === "expanded" && (
                  <Badge variant="secondary" className="w-fit text-xs mt-1">
                    {userPlan || "Chargement..."}
                  </Badge>
                )}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
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
