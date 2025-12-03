import { Shield, Users, Mail, LogOut, BarChart3, Home, FileText, TrendingUp, Activity, Brain, FileWarning, Wrench, Search, Target, Globe, Languages, ScanSearch, Video, Share2, ChevronDown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/language";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SuperAdminNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface NavCategory {
  id: string;
  label: string;
  icon: any;
  items: NavItem[];
}

interface NavItem {
  icon: any;
  label: string;
  id: string;
}

export function SuperAdminNavigation({ activeTab, onTabChange }: SuperAdminNavigationProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [openCategories, setOpenCategories] = useState<string[]>(["general", "marketing", "system"]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: t.superAdmin.toasts.logoutSuccess.title,
        description: t.superAdmin.toasts.logoutSuccess.description,
      });
      navigate("/auth");
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: t.superAdmin.toasts.logoutError.title,
        description: t.superAdmin.toasts.logoutError.description,
        variant: "destructive",
      });
    }
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const navCategories: NavCategory[] = [
    {
      id: "general",
      label: "Général",
      icon: Home,
      items: [
        { icon: Home, label: t.superAdmin.navigation.dashboard, id: "dashboard" },
        { icon: Users, label: t.superAdmin.navigation.users, id: "users" },
        { icon: Brain, label: t.superAdmin.navigation.insights, id: "insights" },
      ]
    },
    {
      id: "communication",
      label: "Communication",
      icon: Mail,
      items: [
        { icon: Mail, label: t.superAdmin.navigation.emails, id: "emails" },
        { icon: FileText, label: t.superAdmin.navigation.templates, id: "templates" },
        { icon: TrendingUp, label: t.superAdmin.navigation.emailStats, id: "email-stats" },
      ]
    },
    {
      id: "marketing",
      label: "Marketing",
      icon: Target,
      items: [
        { icon: Target, label: t.superAdmin.navigation.googleAds || "Google Ads", id: "google-ads" },
        { icon: Globe, label: t.superAdmin.navigation.blogSeo || "Blog SEO", id: "blog-seo" },
        { icon: Globe, label: t.superAdmin.navigation.googleSearchConsole || "Google Search Console", id: "google-search-console" },
        { icon: Share2, label: t.superAdmin.navigation.socialMedia || "Social Media", id: "social-media" },
        { icon: Video, label: t.superAdmin.navigation.videoAds || "Video Ads", id: "video-ads" },
      ]
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      items: [
        { icon: BarChart3, label: t.superAdmin.navigation.analytics, id: "analytics" },
      ]
    },
    {
      id: "system",
      label: "Système",
      icon: Activity,
      items: [
        { icon: Activity, label: t.superAdmin.navigation.systemStatus, id: "system-status" },
        { icon: FileWarning, label: t.superAdmin.navigation.logs, id: "logs" },
        { icon: Wrench, label: t.superAdmin.navigation.toolbox, id: "toolbox" },
      ]
    },
    {
      id: "tools",
      label: "Outils",
      icon: Search,
      items: [
        { icon: Search, label: t.superAdmin.navigation.search, id: "search" },
        { icon: Languages, label: t.superAdmin.navigation.translationAnalyzer, id: "translation-analyzer" },
        { icon: ScanSearch, label: t.superAdmin.navigation.autoTranslationScanner, id: "auto-translation-scanner" },
      ]
    },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-16 md:w-64 bg-card border-r transition-all duration-300">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-center md:justify-start gap-3 p-4 border-b">
          <Shield className="w-8 h-8 text-orange-600 flex-shrink-0" />
          <span className="hidden md:block text-xl font-bold text-orange-600">
            {t.superAdmin.navigation.title}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-2">
            {navCategories.map((category) => {
              const CategoryIcon = category.icon;
              const isOpen = openCategories.includes(category.id);
              const hasActiveItem = category.items.some(item => activeTab === item.id);

              return (
                <Collapsible 
                  key={category.id} 
                  open={isOpen} 
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 w-full",
                        "hover:bg-accent/50 text-muted-foreground",
                        hasActiveItem && "text-foreground bg-accent/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <CategoryIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden md:block text-sm font-semibold">{category.label}</span>
                      </div>
                      <div className="hidden md:block">
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-2 md:pl-4 space-y-1 mt-1">
                    {category.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => onTabChange(item.id)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 w-full",
                            "hover:bg-accent hover:text-accent-foreground text-sm",
                            isActive && "bg-accent text-accent-foreground font-medium"
                          )}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="hidden md:block">{item.label}</span>
                        </button>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-lg w-full transition-all duration-200",
              "hover:bg-destructive hover:text-destructive-foreground"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="hidden md:block">{t.superAdmin.navigation.logout}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
