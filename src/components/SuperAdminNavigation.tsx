import { Shield, Users, Mail, Settings, LogOut, BarChart3 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function SuperAdminNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
      navigate("/auth");
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Erreur",
        description: "Impossible de se déconnecter",
        variant: "destructive",
      });
    }
  };

  const navItems = [
    {
      icon: Shield,
      label: "Dashboard",
      path: "/superadmin",
      id: "dashboard"
    },
    {
      icon: Users,
      label: "Utilisateurs",
      path: "/superadmin",
      id: "users"
    },
    {
      icon: Mail,
      label: "Messages",
      path: "/superadmin",
      id: "messages"
    },
    {
      icon: BarChart3,
      label: "Analytics",
      path: "/superadmin",
      id: "analytics"
    },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-16 md:w-64 bg-card border-r transition-all duration-300">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-center md:justify-start gap-3 p-4 border-b">
          <Shield className="w-8 h-8 text-orange-600 flex-shrink-0" />
          <span className="hidden md:block text-xl font-bold text-orange-600">
            Super Admin
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-2 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <li key={item.id}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive && "bg-accent text-accent-foreground font-medium"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="hidden md:block">{item.label}</span>
                  </Link>
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
            <span className="hidden md:block">Déconnexion</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
