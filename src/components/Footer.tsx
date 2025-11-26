import { Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/language";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function Footer() {
  const { t, language, setLanguage } = useTranslation();
  
  const toggleLanguage = () => {
    setLanguage(language === 'fr' ? 'en' : 'fr');
  };
  
  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {t.footer.brand}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {t.footer.tagline}
              </p>
              <img 
                src="/shopify-logo.svg" 
                alt="Shopify" 
                className="h-5 w-auto opacity-70 hover:opacity-100 transition-opacity"
              />
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t.footer.product}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/#features" className="hover:text-primary transition-colors">{t.footer.features}</a></li>
              <li><a href="/#pricing" className="hover:text-primary transition-colors">{t.footer.pricing}</a></li>
              <li><a href="/auth" className="hover:text-primary transition-colors">Demo</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t.footer.resources}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/documentation" className="hover:text-primary transition-colors">{t.footer.documentation}</a></li>
              <li><a href="/blog-NewAI" className="hover:text-primary transition-colors">{t.footer.blog}</a></li>
              <li><a href="mailto:support@newai.com" className="hover:text-primary transition-colors">{t.footer.support}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t.footer.legal}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/privacy" className="hover:text-primary transition-colors">{t.footer.privacy}</a></li>
              <li><a href="/terms" className="hover:text-primary transition-colors">{t.footer.terms}</a></li>
              <li><a href="/privacy#cookies" className="hover:text-primary transition-colors">Cookie Policy</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t.footer.company}</h4>
            <address className="not-italic text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">NewAI Ltd</p>
              <p>Suite 4, Piccadilly House</p>
              <p>Manchester</p>
              <p>M1 1AB</p>
              <p>United Kingdom</p>
            </address>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center sm:text-left">
              © 2024 NewAI. {t.footer.allRightsReserved}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="gap-2"
            >
              <Globe className="h-4 w-4" />
              {language === 'fr' ? 'English' : 'Français'}
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}