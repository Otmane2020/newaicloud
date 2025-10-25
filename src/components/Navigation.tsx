import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles, Menu, X, LayoutDashboard, ShoppingBag, FileText, Zap, LogOut } from "lucide-react";
import { useState } from "react";

export function Navigation() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/products', label: 'Produits', icon: ShoppingBag },
    { path: '/blog', label: 'Blog SEO', icon: FileText },
    { path: '/seo', label: 'Optimisation', icon: Zap },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 group transition-transform hover:scale-105"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-elegant">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              NewAI
            </span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Button
                      key={item.path}
                      variant={active ? 'default' : 'ghost'}
                      onClick={() => navigate(item.path)}
                      className="gap-2"
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  );
                })}
                <div className="w-px h-6 bg-border mx-2" />
                <Button 
                  variant="outline" 
                  onClick={signOut}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/auth')}>
                  Connexion
                </Button>
                <Button onClick={() => navigate('/auth?mode=signup')}>
                  Commencer Gratuitement
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-border">
            {user ? (
              <>
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Button
                      key={item.path}
                      variant={active ? 'default' : 'ghost'}
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        navigate(item.path);
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    navigate('/auth');
                    setMobileMenuOpen(false);
                  }}
                >
                  Connexion
                </Button>
                <Button
                  className="w-full"
                  onClick={() => {
                    navigate('/auth?mode=signup');
                    setMobileMenuOpen(false);
                  }}
                >
                  Commencer Gratuitement
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
