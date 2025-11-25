import { Shield, Users, Mail, LogOut, BarChart3, Home, FileText, TrendingUp, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/language";

interface SuperAdminNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SuperAdminNavigation({ activeTab, onTabChange }: SuperAdminNavigationProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

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

  const navItems = [
    {
      icon: Home,
      label: t.superAdmin.navigation.dashboard,
      id: "dashboard"
    },
    {
      icon: Users,
      label: t.superAdmin.navigation.users,
      id: "users"
    },
    {
      icon: Mail,
      label: t.superAdmin.navigation.emails,
      id: "emails"
    },
    {
      icon: FileText,
      label: t.superAdmin.navigation.templates,
      id: "templates"
    },
    {
      icon: TrendingUp,
      label: t.superAdmin.navigation.emailStats,
      id: "email-stats"
    },
    {
      icon: BarChart3,
      label: t.superAdmin.navigation.analytics,
      id: "analytics"
    },
    {
      icon: Activity,
      label: t.superAdmin.navigation.systemStatus,
      id: "system-status"
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
          <ul className="space-y-2 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 w-full",
                      "hover:bg-accent hover:text-accent-foreground font-semibold",
                      isActive && "bg-accent text-accent-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="hidden md:block">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
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
