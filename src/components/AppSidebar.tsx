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
  BarChart3,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
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
import { useIsMobile } from "@/hooks/use-mobile";

const mainMenuItems = [
  { titleKey: "sidebar.dashboard", url: "/dashboard", icon: LayoutDashboard },
  { titleKey: "sidebar.products", url: "/products", icon: ShoppingBag },
];

const seoSubItems = [
  { titleKey: "sidebar.seo_optimization", url: "/seo?tab=optimization", icon: Sparkles },
  { titleKey: "sidebar.tag_optimization", url: "/seo?tab=tags", icon: Tags },
  { titleKey: "sidebar.pages", url: "/seo?tab=pages", icon: FileText },
  { titleKey: "sidebar.alt_image", url: "/seo?tab=alt", icon: Image },
  { titleKey: "sidebar.automation", url: "/seo?tab=automation", icon: Settings },
  { titleKey: "sidebar.kpis_audit", url: "/seo?tab=kpis", icon: BarChart3 },
];

const blogSubItems = [
  { titleKey: "sidebar.articles_management", url: "/blog?subtab=articles", icon: FileText },
  { titleKey: "sidebar.ai_articles", url: "/blog?subtab=create-article", icon: Sparkles },
  { titleKey: "sidebar.ai_campaigns", url: "/blog?subtab=campaigns", icon: CalendarClock },
  { titleKey: "sidebar.opportunities", url: "/blog?subtab=opportunities", icon: Lightbulb },
  { titleKey: "sidebar.netlinking", url: "/blog?subtab=netlinking", icon: Link },
  { titleKey: "sidebar.settings", url: "/blog?subtab=settings", icon: Settings },
];

const bottomMenuItems = [
  { titleKey: "sidebar.ai_search", url: "/search", icon: Search },
  { titleKey: "sidebar.google_shopping", url: "/shopping", icon: ShoppingCart },
  { titleKey: "sidebar.google_merchant", url: "/merchant", icon: Package },
];

const chatSubItems = [
  { titleKey: "sidebar.chat_assistant", url: "/chat", icon: MessageSquare },
  { titleKey: "sidebar.ai_robot", url: "/chat-robot", icon: Bot },
  { titleKey: "sidebar.history", url: "/chat-history", icon: History },
  { titleKey: "sidebar.product_source", url: "/product-source", icon: Database },
  { titleKey: "sidebar.chat_settings", url: "/chat-settings", icon: Settings },
];

const accountSubItems = [
  { titleKey: "sidebar.my_profile", url: "/account?tab=profile", icon: User },
  { titleKey: "sidebar.integrations", url: "/account?tab=integrations", icon: Package },
  { titleKey: "sidebar.subscription", url: "/account?tab=subscription", icon: CreditCard },
  { titleKey: "sidebar.billing", url: "/account?tab=billing", icon: Receipt },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const currentPath = location.pathname;
  const currentSearch = location.search;
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const isMobile = useIsMobile();

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

          // Fallback pour Trial si le plan n'est pas trouvé
          const displayName = plan?.name || (profile.current_plan_id === 'trial' ? 'Trial' : 'Gratuit');
          setUserPlan(displayName);
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

  return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "icon"}>
      {/* Logo Header */}
      <div className="border-b p-3 sm:p-4">
        <NavLink to="/dashboard" className="flex items-center gap-2 group transition-transform hover:scale-105">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
          </div>
          {state === "expanded" && (
            <span className="font-bold text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              NewAI
            </span>
          )}
        </NavLink>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('sidebar.navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                <SidebarMenuButton asChild isActive={isActive(item.url)}>
                  <NavLink to={item.url}>
                    <item.icon className="h-4 w-4" />
                    <span>{t(item.titleKey)}</span>
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
                      <span>{t('sidebar.seo')}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {seoSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.titleKey}>
                          <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                            <NavLink to={subItem.url}>
                              <subItem.icon className="h-4 w-4" />
                              <span>{t(subItem.titleKey)}</span>
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
                      <span>{t('sidebar.blog')}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {blogSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.titleKey}>
                          <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                            <NavLink to={subItem.url}>
                              <subItem.icon className="h-4 w-4" />
                              <span>{t(subItem.titleKey)}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Bottom Menu Items */}
              {bottomMenuItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.titleKey)}</span>
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
                      <span>{t('sidebar.chat')}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {chatSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.titleKey}>
                          <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                            <NavLink to={subItem.url}>
                              <subItem.icon className="h-4 w-4" />
                              <span>{t(subItem.titleKey)}</span>
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
                      <span>{t('sidebar.account')}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {accountSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.titleKey}>
                          <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                            <NavLink to={subItem.url}>
                              <subItem.icon className="h-4 w-4" />
                              <span>{t(subItem.titleKey)}</span>
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
              <div className="flex flex-col gap-2 px-2 py-2 sm:py-3">
                {state === "expanded" ? (
                  <>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 shrink-0" />
                      <span className="text-xs sm:text-sm truncate">{user?.email}</span>
                    </div>
                    <Badge variant="default" className="w-fit text-xs font-semibold">
                      {userPlan || t('sidebar.loading')}
                    </Badge>
                  </>
                ) : (
                  <div className="flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button variant="ghost" className="w-full justify-start text-xs sm:text-sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                {state === "expanded" && <span>{t('sidebar.logout')}</span>}
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
