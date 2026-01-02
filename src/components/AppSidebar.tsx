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
  Brain,
  CalendarClock,
  ChevronRight,
  BarChart3,
  Home,
  Crown,
  Megaphone,
  FileSearch,
  Clock,
  RefreshCw,
  AlertCircle,
  Target,
  List,
  TrendingUp,
  Globe,
  Activity,
  Map,
  Edit3,
  Key,
  Code,
  Share2,
  Palette,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useShopifyBilling } from "@/hooks/useShopifyBilling";
import logoChatgpt from "@/assets/logo-chatgpt.png";
import logoGemini from "@/assets/logo-gemini.png";
import logoCopilot from "@/assets/logo-copilot.png";
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
import { useTranslation } from "@/lib/language";
import { StoreSelector } from "@/components/StoreSelector";

// Removed - now defined with seoSubItems

export function AppSidebar() {
  const { state, isMobile: sidebarIsMobile, openMobile, toggleSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t, language } = useTranslation();
  const currentPath = location.pathname;
  const currentSearch = location.search;
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [isEnterprise, setIsEnterprise] = useState(false);
  const isMobile = useIsMobile();
  
  // Shopify billing detection
  const { isShopifyUser, billingProvider } = useShopifyBilling();
  
  // Check if user is the test account
  const isTestAccount = user?.email === "sweet.deco.meubles@gmail.com";
  
  // Email with full access to all features
  const FULL_ACCESS_EMAIL = 'oben.rockman@gmail.com';
  const hasFullAccess = user?.email === FULL_ACCESS_EMAIL;
  
  console.log('🔐 [AppSidebar] userEmail:', user?.email, '| hasFullAccess:', hasFullAccess);

  const seoSubItems = [
    { title: t.seo.submenu.products, url: "/seo?tab=products", icon: ShoppingBag, key: "products" },
    { title: t.seo.submenu.collections, url: "/seo?tab=collections", icon: Package, key: "collections" },
    // Pages - restricted to oben.rockman only
    ...(hasFullAccess ? [{ title: t.seo.submenu.pages, url: "/seo?tab=pages", icon: FileText, key: "pages" }] : []),
    // Articles - restricted to oben.rockman only
    ...(hasFullAccess ? [{ title: t.seo.submenu.articles, url: "/seo?tab=articles", icon: FileText, key: "articles" }] : []),
    { title: t.seo.submenu.altimage, url: "/seo?tab=alt", icon: Image, key: "altimage" },
    ...(hasFullAccess ? [{ title: t.seo.submenu.homepage, url: "/seo?tab=homepage", icon: Home, key: "homepage" }] : []),
    { title: t.seo.submenu.tags, url: "/seo?tab=tags", icon: Tags, key: "tags" },
    ...(hasFullAccess ? [{ title: t.seo.submenu.automation, url: "/seo?tab=automation", icon: Settings, key: "automation" }] : []),
  ];


  const auditSubItems = [
    { title: t.seo.audit.subtabs.overview, url: "/seo?tab=audit-dashboard&subtab=overview", icon: BarChart3, translationKey: "overview" },
    { title: t.seo.audit.subtabs.homepage, url: "/seo?tab=audit-dashboard&subtab=homepage", icon: Home, translationKey: "homepage" },
    { title: t.seo.audit.subtabs.issues, url: "/seo?tab=audit-dashboard&subtab=issues", icon: AlertCircle, translationKey: "issues" },
    { title: t.seo.audit.subtabs.actions, url: "/seo?tab=audit-dashboard&subtab=actions", icon: Target, translationKey: "actions" },
    { title: t.seo.audit.subtabs.reports, url: "/seo?tab=audit", icon: List, translationKey: "reports" },
  ];

  // Main menu items - Dashboard only for hasFullAccess, otherwise show DashboardLight
  const mainMenuItems = hasFullAccess 
    ? [{ title: t.navigation.dashboard, url: "/dashboard", icon: LayoutDashboard, key: "dashboard" }]
    : [{ title: t.navigation.dashboard, url: "/dashboard-light", icon: LayoutDashboard, key: "dashboard" }];

  const productOptimizationSubItems = [
    { title: t.navigation.products, url: "/products", icon: ShoppingBag, key: "products" },
    { title: t.navigation.titleDescription, url: "/products/title-description", icon: Sparkles, key: "titleDescription" },
    { title: t.mediaHistory, url: "/products/media-history", icon: History, key: "mediaHistory" },
  ];

  // Blog sub items - available to all users
  const blogSubItems = [
    { title: t.blog.submenu.aiArticles, url: "/blog?subtab=create-article", icon: Sparkles, key: "aiArticles" },
    { title: t.blog.submenu.campaigns, url: "/blog?subtab=campaigns", icon: CalendarClock, key: "campaigns" },
    { title: t.blog.submenu.netlinking, url: "/blog?subtab=netlinking", icon: Link, key: "netlinking" },
    { title: t.blog.submenu.settings, url: "/blog?subtab=settings", icon: Settings, key: "settings" },
  ];

  // AEO (Aeoreply) sub items - main navigation
  const aeoSubItems = [
    { title: language === 'fr' ? "Assistant" : "Wizard", url: "/aeo?tab=wizard", icon: Lightbulb, key: "wizard" },
    { title: language === 'fr' ? "Opportunités" : "Opportunities", url: "/aeo?tab=opportunities", icon: Sparkles, key: "opportunities" },
    { title: language === 'fr' ? "Intégrations" : "Integrations", url: "/aeo?tab=integrations", icon: Link, key: "integrations" },
    { title: language === 'fr' ? "Paramètres" : "Settings", url: "/aeo?tab=settings", icon: Settings, key: "settings" },
  ];

  // Social Media - Onglet principal séparé (restricted)
  const socialMediaSubItems = [
    { title: t.navigation.socialMediaSubmenu?.studio || "Studio", url: "/ai-creative-studio", icon: Sparkles, key: "studio" },
    { title: t.navigation.socialMediaSubmenu?.creativeHistory || "Historique", url: "/ai-creative-studio?tab=history", icon: History, key: "creativeHistory" },
  ];

  const socialMediaMainItems = [
    { title: t.navigation.socialMediaSubmenu?.creative || "Créatif", url: "/social-media?tab=creative", icon: Edit3, key: "creative", hasSubItems: true },
    { title: t.navigation.socialMediaSubmenu?.campaigns || "Campagnes", url: "/social-media?tab=campaigns", icon: CalendarClock, key: "campaigns" },
    { title: t.navigation.socialMediaSubmenu?.posts || "Posts", url: "/social-media?tab=posts", icon: FileText, key: "posts" },
    { title: t.navigation.socialMediaSubmenu?.settings || "Paramètres & Connexions", url: "/social-media?tab=settings", icon: Settings, key: "settings" },
  ];

  const merchantSubItems = [
    ...(isTestAccount ? [{ title: t.merchantIntegration, url: "/merchant?tab=integration", icon: Globe, key: "integration" }] : []),
    { title: t.merchant.submenu.feed, url: "/merchant?tab=feed", icon: FileText, key: "feed" },
    { title: t.merchant.submenu.settings, url: "/merchant?tab=settings", icon: Settings, key: "settings" },
    { title: t.merchant.submenu.sync, url: "/merchant?tab=sync", icon: RefreshCw, key: "sync" },
  ];

  const googleAdsSubItems = [
    { title: t.googleAds.integration.title, url: "/google-ads?tab=integration", icon: Globe, key: "integration" },
    { title: t.googleAds.campaigns.title, url: "/google-ads?tab=campaigns", icon: Target, key: "campaigns" },
    { title: t.googleAds.optimization.title, url: "/google-ads?tab=optimization", icon: TrendingUp, key: "optimization" },
    { title: t.googleAds.analytics.title, url: "/google-ads?tab=analytics", icon: BarChart3, key: "analytics" },
    { title: t.googleAds.tracking.title, url: "/google-ads?tab=tracking", icon: Activity, key: "tracking" },
  ];

  const bottomMenuItems = [
    ...(isTestAccount ? [{ title: t.navigation.aiSearch, url: "/search", icon: Search, key: "aiSearch" }] : []),
    ...(isTestAccount ? [{ title: language === 'fr' ? 'Templates Boutique' : 'Store Templates', url: "/store-templates", icon: Palette, key: "storeTemplates" }] : []),
    // Google Shopping - restricted
    ...(hasFullAccess ? [{ title: t.navigation.googleShopping, url: "/shopping", icon: ShoppingCart, key: "googleShopping" }] : []),
  ];

  const chatSubItems = [
    { title: t.chat.submenu.assistant, url: "/chat", icon: MessageSquare, key: "assistant" },
    { title: t.chat.submenu.robot, url: "/chat-robot", icon: Bot, key: "robot" },
    { title: t.chat.submenu.orders, url: "/chat-orders", icon: Package, key: "orders" },
    { title: t.chat.submenu.learning, url: "/chat-learning", icon: Brain, key: "learning" },
    { title: t.chat.submenu.history, url: "/chat-history", icon: History, key: "history" },
    { title: t.chat.submenu.productSource, url: "/product-source", icon: Database, key: "productSource" },
    { title: t.chat.submenu.settings, url: "/chat-settings", icon: Settings, key: "settings" },
  ];

  // Build account items dynamically based on user plan and access
  const accountSubItems = [
    // Profile - restricted
    ...(hasFullAccess ? [{ title: t.account.submenu.profile, url: "/account?tab=profile", icon: User, key: "profile" }] : []),
    // Integrations - visible to all users
    { title: t.account.submenu.integrations, url: "/account?tab=integrations", icon: Package, key: "integrations" },
    // Subscription - visible to all users
    { title: t.account.submenu.subscription, url: "/subscription", icon: CreditCard, key: "subscription" },
    ...(hasFullAccess ? [{ title: t.usageLimits, url: "/account?tab=usage", icon: BarChart3, key: "usage" }] : []),
    // Billing - restricted
    ...(hasFullAccess ? [{ title: t.account.submenu.billing, url: "/account?tab=billing", icon: Receipt, key: "billing" }] : []),
    // Developer tools - Test account only
    ...(isTestAccount ? [
      { title: t.adminSidebar.cronMonitoring, url: "/cron-monitoring", icon: Clock, key: "cron-monitoring" },
      { title: t.adminSidebar.apiKeys, url: "/api-keys", icon: Key, key: "api-keys" },
      { title: t.adminSidebar.apiDocs, url: "/api-docs", icon: Code, key: "api-docs" },
      { title: t.adminSidebar.apiAnalytics, url: "/api-analytics", icon: Activity, key: "api-analytics" },
    ] : []),
  ];

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
          .select("current_plan_id, subscription_status")
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

          // Check if user is Enterprise
          const isEnterpriseUser = profile.current_plan_id?.includes('enterprise');
          setIsEnterprise(!!isEnterpriseUser);
          console.log("🏢 Is Enterprise:", isEnterpriseUser);

          // Check if user is in trial
          const isTrialing = profile.subscription_status === 'trialing' || profile.current_plan_id === 'trial';
          
          // Get plan name and translate it
          const planName = plan?.name || 'Free';
          const translatedPlanName = (t.planNames as any)[planName] || planName;
          
          // Display trial name if in trial, otherwise display translated plan name
          const displayName = isTrialing ? t.trial.title : translatedPlanName;
          
          console.log("✅ Setting userPlan to:", displayName);
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

  const handleNavClick = () => {
    if ((sidebarIsMobile || isMobile) && openMobile) {
      toggleSidebar();
    }
  };

  const isChatActive =
    currentPath.startsWith("/chat") ||
    currentPath === "/product-source" ||
    chatSubItems.some((item) => isActive(item.url));
  const isSeoActive = currentPath === "/seo" || seoSubItems.some((item) => isActive(item.url)) || auditSubItems.some((item) => isActive(item.url)) || isActive('/seo?tab=google-console');
  const isAuditActive = auditSubItems.some((item) => isActive(item.url));
  const isGoogleConsoleActive = isActive('/seo?tab=google-console');
  const isBlogActive = currentPath === "/blog" || blogSubItems.some((item) => isActive(item.url));
  const isAeoActive = currentPath === "/aeo" || aeoSubItems.some((item) => isActive(item.url));
  const isAeoAnswersActive = currentPath === '/aeo-chatgpt' || currentPath === '/aeo-gemini' || currentPath === '/aeo-copilot';
  const isSocialMediaActive = currentPath === "/social-media" || socialMediaMainItems.some((item) => isActive(item.url)) || socialMediaSubItems.some((item) => isActive(item.url));
  const isSocialMediaCreativeActive = socialMediaSubItems.some((item) => isActive(item.url)) || isActive("/social-media?tab=creative");
  const isMerchantActive = currentPath === "/merchant" || merchantSubItems.some((item) => isActive(item.url));
  const isGoogleAdsActive = currentPath === "/google-ads" || googleAdsSubItems.some((item) => isActive(item.url));
  const isPricingActive = currentPath === "/pricing";
  const isAccountActive = currentPath === "/account" || accountSubItems.some((item) => isActive(item.url));
  const isProductOptimizationActive = currentPath.startsWith("/products") || productOptimizationSubItems.some((item) => isActive(item.url));

  return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "icon"}>
      {/* Logo Header */}
      <div className="border-b p-3 sm:p-4 space-y-3">
        <NavLink to="/dashboard" onClick={handleNavClick} className="flex items-center gap-2 group transition-transform hover:scale-105">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
          </div>
          {state === "expanded" && (
            <span className="font-bold text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              NewAI
            </span>
          )}
        </NavLink>
        {state === "expanded" && <StoreSelector />}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t.navigation.main}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* AEO AI Answers - Main tab with always visible sub-tabs */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isAeoAnswersActive}>
                  <NavLink to="/aeo-chatgpt" onClick={handleNavClick}>
                    <MessageSquare className="h-4 w-4" />
                    <span>{language === 'fr' ? "AEO Réponses IA" : "AEO AI Answers"}</span>
                  </NavLink>
                </SidebarMenuButton>
                {/* Sub-tabs always visible */}
                <SidebarMenuSub className="mt-1">
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={currentPath === '/aeo-chatgpt'}>
                      <NavLink to="/aeo-chatgpt" onClick={handleNavClick}>
                        <img src={logoChatgpt} alt="ChatGPT" className="h-4 w-4 rounded" />
                        <span>ChatGPT</span>
                      </NavLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={currentPath === '/aeo-gemini'}>
                      <NavLink to="/aeo-gemini" onClick={handleNavClick}>
                        <img src={logoGemini} alt="Gemini" className="h-4 w-4" />
                        <span>Gemini</span>
                      </NavLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={currentPath === '/aeo-copilot'}>
                      <NavLink to="/aeo-copilot" onClick={handleNavClick}>
                        <img src={logoCopilot} alt="Copilot" className="h-4 w-4" />
                        <span>Copilot</span>
                      </NavLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={currentPath === '/aeo-calendar'}>
                      <NavLink to="/aeo-calendar" onClick={handleNavClick}>
                        <CalendarClock className="h-4 w-4" />
                        <span>{language === 'fr' ? 'Calendrier' : 'Calendar'}</span>
                      </NavLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>

              {/* Product Optimization Menu with Submenu - restricted */}
              {hasFullAccess && (
              <Collapsible defaultOpen={isProductOptimizationActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isProductOptimizationActive}>
                      <ShoppingBag className="h-4 w-4" />
                      <span>{t.navigation.productOptimization}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {productOptimizationSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                          <NavLink to={subItem.url} onClick={handleNavClick}>
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
              )}

              {/* SEO Menu with Submenu */}
              <Collapsible defaultOpen={isSeoActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isSeoActive}>
                      <Sparkles className="h-4 w-4" />
                      <span>{t.navigation.seoOptimization}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {seoSubItems.filter(subItem => subItem.key !== "automation" || isTestAccount).map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                            <NavLink to={subItem.url} onClick={handleNavClick}>
                              <subItem.icon className="h-4 w-4" />
                              <span>{subItem.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}

                      {/* Nested Audit SEO submenu - restricted */}
                      {hasFullAccess && (
                      <Collapsible defaultOpen={isAuditActive} className="group/audit">
                        <SidebarMenuSubItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuSubButton isActive={isAuditActive}>
                              <FileSearch className="h-4 w-4" />
                              <span>{t.seo.submenu.auditSeo}</span>
                              <ChevronRight className="ml-auto h-3 w-3 transition-transform duration-200 group-data-[state=open]/audit:rotate-90" />
                            </SidebarMenuSubButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="ml-4 border-l-2 border-border pl-2 space-y-1">
                              {auditSubItems.map((auditItem) => (
                                <SidebarMenuSubButton key={auditItem.title} asChild isActive={isActive(auditItem.url)} className="pl-2">
                                  <NavLink to={auditItem.url} onClick={handleNavClick}>
                                    <auditItem.icon className="h-3 w-3" />
                                    <span>{auditItem.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </SidebarMenuSubItem>
                      </Collapsible>
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Google Search Console Menu - visible to all users */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/seo?tab=google-console')}>
                  <NavLink to="/seo?tab=google-console">
                    <TrendingUp className="h-4 w-4" />
                    <span>{t.adminSidebar.googleSearchConsole}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Blog Menu with Submenu */}
              <Collapsible defaultOpen={isBlogActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isBlogActive}>
                      <FileText className="h-4 w-4" />
                      <span>{t.navigation.blog}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {blogSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                            <NavLink to={subItem.url} onClick={handleNavClick}>
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

              {/* AEO (Answer Engine Optimization) Menu with settings - restricted to oben.rockman only */}
              {hasFullAccess && (
              <Collapsible defaultOpen={isAeoActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isAeoActive}>
                      <Sparkles className="h-4 w-4" />
                      <span>Aeoreply</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {aeoSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                            <NavLink to={subItem.url} onClick={handleNavClick}>
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
              )}

              {/* Social Media - Onglet principal séparé - restricted */}
              {hasFullAccess && (
              <Collapsible defaultOpen={isSocialMediaActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isSocialMediaActive}>
                      <Share2 className="h-4 w-4" />
                      <span>{t.navigation.socialMedia || "Social Media"}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {/* Creative avec sous-sous-menu */}
                      <Collapsible defaultOpen={isSocialMediaCreativeActive} className="group/creative">
                        <SidebarMenuSubItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuSubButton isActive={isSocialMediaCreativeActive}>
                              <Edit3 className="h-4 w-4" />
                              <span>{t.navigation.socialMediaSubmenu?.creative || "Créatif"}</span>
                              <ChevronRight className="ml-auto h-3 w-3 transition-transform duration-200 group-data-[state=open]/creative:rotate-90" />
                            </SidebarMenuSubButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="ml-4 border-l-2 border-border pl-2 space-y-1">
                              {socialMediaSubItems.map((subItem) => (
                                <SidebarMenuSubButton key={subItem.key} asChild isActive={isActive(subItem.url)} className="pl-2">
                                  <NavLink to={subItem.url} onClick={handleNavClick}>
                                    <subItem.icon className="h-3 w-3" />
                                    <span>{subItem.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </SidebarMenuSubItem>
                      </Collapsible>
                      
                      {/* Autres sous-menus Social Media */}
                      {socialMediaMainItems.filter(item => !item.hasSubItems).map((subItem) => (
                        <SidebarMenuSubItem key={subItem.key}>
                          <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                            <NavLink to={subItem.url} onClick={handleNavClick}>
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
              )}

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

              {/* Google Merchant Menu with Submenu - restricted */}
              {hasFullAccess && (
              <Collapsible defaultOpen={isMerchantActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isMerchantActive}>
                      <Package className="h-4 w-4" />
                      <span>{t.navigation.googleMerchant}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {merchantSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                            <NavLink to={subItem.url} onClick={handleNavClick}>
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
              )}

              {/* Google Ads Menu with Submenu */}
              {isTestAccount && (
                <Collapsible defaultOpen={isGoogleAdsActive} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton isActive={isGoogleAdsActive}>
                        <Megaphone className="h-4 w-4" />
                        <span>Google Ads</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {googleAdsSubItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                              <NavLink to={subItem.url} onClick={handleNavClick}>
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
              )}

              {/* Chat Menu with Submenu */}
              {isTestAccount && (
                <Collapsible defaultOpen={isChatActive} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton isActive={isChatActive}>
                        <MessageSquare className="h-4 w-4" />
                        <span>{t.navigation.chat}</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {chatSubItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                              <NavLink to={subItem.url} onClick={handleNavClick}>
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
              )}

              {/* Smart Pricing AI - Main Menu Item - restricted */}
              {hasFullAccess && (
              <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isPricingActive}>
          <NavLink to="/pricing" className="relative" onClick={handleNavClick}>
                    <CreditCard className="h-4 w-4" />
                    <span>Smart Pricing AI</span>
                    <Badge className="ml-auto bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] px-1.5 py-0 h-4 animate-pulse">
                      NEW
                    </Badge>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}

              {/* Account Menu with Submenu */}
              <Collapsible defaultOpen={isAccountActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isAccountActive}>
                      <User className="h-4 w-4" />
                      <span>{t.navigation.account}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                        {accountSubItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                              <NavLink to={subItem.url} onClick={handleNavClick}>
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
                  <button 
                    onClick={() => {
                      handleNavClick();
                      // Shopify users go to /subscription (which shows ShopifyPricingPlans)
                      // Stripe users also go to /subscription (which shows Stripe plans)
                      navigate('/subscription');
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer group w-fit"
                  >
                    <Crown className="h-3.5 w-3.5 text-white shrink-0 group-hover:rotate-12 transition-transform" />
                    <span className="text-white text-xs uppercase tracking-wide font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {userPlan || t.common.loading}
                    </span>
                    <span className="text-white/90 text-xs font-normal" style={{ fontFamily: "'Inter', sans-serif" }}>
                      ({t.common.upgrade})
                    </span>
                  </button>
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
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  if ((sidebarIsMobile || isMobile) && openMobile) {
                    toggleSidebar();
                  }
                  signOut();
                }}
              >
                <LogOut className="h-4 w-4" />
                {state === "expanded" && <span>{t.navigation.logout}</span>}
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}