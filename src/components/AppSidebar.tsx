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
  Home,
  Crown,
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
import { useIsMobile } from "@/hooks/use-mobile";

const mainMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Products", url: "/products", icon: ShoppingBag },
];

const seoSubItems = [
  { title: "SEO Optimization", url: "/seo?tab=optimization", icon: Sparkles },
  { title: "Tag Optimization", url: "/seo?tab=tags", icon: Tags },
  { title: "Pages", url: "/seo?tab=pages", icon: FileText },
  { title: "Articles SEO", url: "/seo?tab=articles", icon: FileText },
  { title: "Homepage", url: "/seo?tab=homepage", icon: Home },
  { title: "Audit", url: "/seo?tab=audit", icon: BarChart3 },
  { title: "ALT Image", url: "/seo?tab=alt", icon: Image },
  { title: "Automation", url: "/seo?tab=automation", icon: Settings },
  { title: "KPIs Audit", url: "/seo?tab=kpis", icon: BarChart3 },
];

const blogSubItems = [
  { title: "AI Articles", url: "/blog?subtab=create-article", icon: Sparkles },
  { title: "AI Campaigns", url: "/blog?subtab=campaigns", icon: CalendarClock },
  { title: "Opportunities", url: "/blog?subtab=opportunities", icon: Lightbulb },
  { title: "Netlinking", url: "/blog?subtab=netlinking", icon: Link },
  { title: "Settings", url: "/blog?subtab=settings", icon: Settings },
];

const bottomMenuItems = [
  { title: "AI Search", url: "/search", icon: Search },
  { title: "Google Shopping", url: "/shopping", icon: ShoppingCart },
  { title: "Google Merchant", url: "/merchant", icon: Package },
];

const chatSubItems = [
  { title: "Chat Assistant", url: "/chat", icon: MessageSquare },
  { title: "AI Robot", url: "/chat-robot", icon: Bot },
  { title: "History", url: "/chat-history", icon: History },
  { title: "Product Source", url: "/product-source", icon: Database },
  { title: "Chat Settings", url: "/chat-settings", icon: Settings },
];

const accountSubItems = [
  { title: "My Profile", url: "/account?tab=profile", icon: User },
  { title: "Integrations", url: "/account?tab=integrations", icon: Package },
  { title: "Subscription", url: "/account?tab=subscription", icon: CreditCard },
  { title: "Billing", url: "/account?tab=billing", icon: Receipt },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
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

          // Fallback for Trial if plan not found
          const displayName = plan?.name || (profile.current_plan_id === 'trial' ? 'Trial' : 'Free');
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

              {/* Blog Menu with Submenu */}
              <Collapsible defaultOpen={isBlogActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isBlogActive}>
                      <FileText className="h-4 w-4" />
                      <span>Blog</span>
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
                      <span>Account</span>
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
            <div className="flex flex-col gap-2 px-4 py-3 w-full">
              {state === "expanded" ? (
                <>
                  <NavLink 
                    to="/account?tab=subscription"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer group w-fit"
                  >
                    <Crown className="h-3.5 w-3.5 text-white shrink-0 group-hover:rotate-12 transition-transform" />
                    <span className="text-xs font-bold text-white uppercase tracking-wide">
                      {userPlan || "Loading..."}
                    </span>
                    <span className="text-xs text-white/90 font-medium">
                      (Upgrade)
                    </span>
                  </NavLink>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs truncate">{user?.email}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-sm opacity-50" />
                  <User className="h-4 w-4 relative z-10" />
                </div>
              )}
            </div>
          </SidebarMenuItem>
          
          <div className="h-px bg-border mx-2 my-1" />
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button variant="ghost" className="w-full justify-start text-xs sm:text-sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                {state === "expanded" && <span>Logout</span>}
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}