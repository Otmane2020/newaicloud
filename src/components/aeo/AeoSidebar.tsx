import {
  LayoutDashboard,
  Lightbulb,
  Sparkles,
  Link,
  Settings,
  User,
  LogOut,
  CreditCard,
  ChevronRight,
  Zap,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "@/lib/language";

export function AeoSidebar() {
  const { state, isMobile: sidebarIsMobile, openMobile, toggleSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t, language } = useTranslation();
  const currentPath = location.pathname;
  const currentSearch = location.search;
  const isMobile = useIsMobile();

  // AEO specific menu items
  const mainMenuItems = [
    { 
      title: language === 'fr' ? "Tableau de bord" : "Dashboard", 
      url: "/dashboard", 
      icon: LayoutDashboard 
    },
  ];

  const aeoMenuItems = [
    { 
      title: language === 'fr' ? "Assistant" : "Wizard", 
      url: "/assistant", 
      icon: Lightbulb,
      description: language === 'fr' ? "Générer des opportunités AEO" : "Generate AEO opportunities"
    },
    { 
      title: language === 'fr' ? "Opportunités" : "Opportunities", 
      url: "/opportunities", 
      icon: Sparkles,
      description: language === 'fr' ? "Voir et gérer vos opportunités" : "View and manage opportunities"
    },
    { 
      title: language === 'fr' ? "Intégrations" : "Integrations", 
      url: "/integrations", 
      icon: Link,
      description: language === 'fr' ? "Connecter vos plateformes" : "Connect your platforms"
    },
    { 
      title: language === 'fr' ? "Paramètres" : "Settings", 
      url: "/settings", 
      icon: Settings,
      description: language === 'fr' ? "LLMs.txt et préférences" : "LLMs.txt and preferences"
    },
  ];

  const accountMenuItems = [
    { 
      title: language === 'fr' ? "Mon compte" : "My account", 
      url: "/account", 
      icon: User 
    },
    { 
      title: language === 'fr' ? "Abonnement" : "Subscription", 
      url: "/subscription", 
      icon: CreditCard 
    },
  ];

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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "icon"}>
      {/* Logo Header - Premium Design */}
      <div className="border-b border-violet-500/20 p-4">
        <NavLink 
          to="/dashboard" 
          onClick={handleNavClick} 
          className="flex items-center gap-3 group transition-all duration-300 hover:scale-105"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          {state === "expanded" && (
            <div className="flex flex-col">
              <span className="font-bold text-xl bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
                Aeoreply
              </span>
              <span className="text-[10px] text-muted-foreground -mt-0.5">
                Answer Engine Optimization
              </span>
            </div>
          )}
        </NavLink>
      </div>

      <SidebarContent className="px-2">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-violet-400/80 uppercase text-xs tracking-wider">
            {language === 'fr' ? "Principal" : "Main"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className="hover:bg-violet-500/10 data-[active=true]:bg-gradient-to-r data-[active=true]:from-violet-500/20 data-[active=true]:to-blue-500/20 data-[active=true]:border-l-2 data-[active=true]:border-violet-500"
                  >
                    <NavLink to={item.url} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* AEO Features */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-violet-400/80 uppercase text-xs tracking-wider">
            AEO Engine
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aeoMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className="hover:bg-violet-500/10 data-[active=true]:bg-gradient-to-r data-[active=true]:from-violet-500/20 data-[active=true]:to-blue-500/20 data-[active=true]:border-l-2 data-[active=true]:border-violet-500"
                  >
                    <NavLink to={item.url} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-violet-400/80 uppercase text-xs tracking-wider">
            {language === 'fr' ? "Compte" : "Account"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className="hover:bg-violet-500/10 data-[active=true]:bg-gradient-to-r data-[active=true]:from-violet-500/20 data-[active=true]:to-blue-500/20"
                  >
                    <NavLink to={item.url} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-violet-500/20 p-4">
        {state === "expanded" && user && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {language === 'fr' ? "Déconnexion" : "Sign out"}
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
