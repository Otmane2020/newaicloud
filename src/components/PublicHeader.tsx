import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu, X, Sparkles } from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";
import { useTranslation } from "@/hooks/useTranslation";

export const PublicHeader = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header
      className="sticky top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollToSection("hero")}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-foreground leading-tight">
                  NewAI
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Smarter AI Sales
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("hero")}
              className="font-medium text-foreground transition-colors hover:text-primary"
            >
              {t('nav.home')}
            </button>
            <button
              onClick={() => scrollToSection("features")}
              className="font-medium text-foreground transition-colors hover:text-primary"
            >
              {t('nav.features')}
            </button>
            <button
              onClick={() => scrollToSection("benefits")}
              className="font-medium text-foreground transition-colors hover:text-primary"
            >
              {t('nav.benefits')}
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="font-medium text-foreground transition-colors hover:text-primary"
            >
              {t('nav.pricing')}
            </button>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSelector />
            <Button
              variant="ghost"
              onClick={() => navigate("/auth?mode=login")}
            >
              {t('auth.login')}
            </Button>
            <Button onClick={() => navigate("/auth?mode=signup")}>
              {t('auth.signup')}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t bg-background/95 backdrop-blur-md">
            <nav className="flex flex-col gap-4">
              <button
                onClick={() => scrollToSection("hero")}
                className="text-left font-medium hover:text-primary transition-colors"
              >
                {t('nav.home')}
              </button>
              <button
                onClick={() => scrollToSection("features")}
                className="text-left font-medium hover:text-primary transition-colors"
              >
                {t('nav.features')}
              </button>
              <button
                onClick={() => scrollToSection("benefits")}
                className="text-left font-medium hover:text-primary transition-colors"
              >
                {t('nav.benefits')}
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="text-left font-medium hover:text-primary transition-colors"
              >
                {t('nav.pricing')}
              </button>
              <div className="flex flex-col gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => navigate("/auth?mode=login")}
                  className="w-full"
                >
                  {t('auth.login')}
                </Button>
                <Button onClick={() => navigate("/auth?mode=signup")} className="w-full">
                  {t('auth.signup')}
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
