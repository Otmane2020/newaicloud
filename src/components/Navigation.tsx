import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles, Menu, X } from "lucide-react";
import { useState } from "react";

export function Navigation() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              NewAI
            </span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <Button
                  variant={isActive('/dashboard') ? 'default' : 'ghost'}
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
                </Button>
                <Button
                  variant={isActive('/products') ? 'default' : 'ghost'}
                  onClick={() => navigate('/products')}
                >
                  Produits
                </Button>
                <Button
                  variant={isActive('/blog') ? 'default' : 'ghost'}
                  onClick={() => navigate('/blog')}
                >
                  Blog SEO
                </Button>
                <Button
                  variant={isActive('/seo') ? 'default' : 'ghost'}
                  onClick={() => navigate('/seo')}
                >
                  Optimisation
                </Button>
                <Button variant="outline" onClick={signOut}>
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
                <Button
                  variant={isActive('/dashboard') ? 'default' : 'ghost'}
                  className="w-full"
                  onClick={() => {
                    navigate('/dashboard');
                    setMobileMenuOpen(false);
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  variant={isActive('/products') ? 'default' : 'ghost'}
                  className="w-full"
                  onClick={() => {
                    navigate('/products');
                    setMobileMenuOpen(false);
                  }}
                >
                  Produits
                </Button>
                <Button
                  variant={isActive('/blog') ? 'default' : 'ghost'}
                  className="w-full"
                  onClick={() => {
                    navigate('/blog');
                    setMobileMenuOpen(false);
                  }}
                >
                  Blog SEO
                </Button>
                <Button
                  variant={isActive('/seo') ? 'default' : 'ghost'}
                  className="w-full"
                  onClick={() => {
                    navigate('/seo');
                    setMobileMenuOpen(false);
                  }}
                >
                  Optimisation
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                >
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
