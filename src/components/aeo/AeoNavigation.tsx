import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  MessageSquare, 
  FileText, 
  Lightbulb,
  Settings,
  Link as LinkIcon,
  Search,
  Globe,
  Wand2,
} from "lucide-react";
import { useTranslation } from "@/lib/language";
import { cn } from "@/lib/utils";

export default function AeoNavigation() {
  const location = useLocation();
  const { language } = useTranslation();

  const navItems = [
    {
      href: "/dashboard",
      label: language === 'fr' ? "Tableau de bord" : "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/wizard",
      label: language === 'fr' ? "Assistant AEO" : "AEO Wizard",
      icon: Wand2,
    },
    {
      href: "/opportunities",
      label: language === 'fr' ? "Opportunités" : "Opportunities",
      icon: Lightbulb,
    },
    {
      href: "/answers",
      label: language === 'fr' ? "Réponses" : "Answers",
      icon: MessageSquare,
    },
    {
      href: "/articles",
      label: language === 'fr' ? "Articles" : "Articles",
      icon: FileText,
    },
    {
      href: "/tracking/keywords",
      label: language === 'fr' ? "Keywords" : "Keywords",
      icon: Search,
    },
    {
      href: "/tracking/urls",
      label: language === 'fr' ? "URLs" : "URLs",
      icon: Globe,
    },
    {
      href: "/integrations",
      label: language === 'fr' ? "Intégrations" : "Integrations",
      icon: LinkIcon,
    },
    {
      href: "/settings",
      label: language === 'fr' ? "Paramètres" : "Settings",
      icon: Settings,
    },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-lg hidden sm:block">AEOReply</span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                  className={cn(
                    "gap-2 whitespace-nowrap",
                    isActive && "bg-primary/10 text-primary"
                  )}
                >
                  <Link to={item.href}>
                    <item.icon className="w-4 h-4" />
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
