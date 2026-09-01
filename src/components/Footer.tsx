import { useTranslation } from "@/lib/language";
import { CatalogOptimizeLogo } from "@/components/CatalogOptimizeLogo";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="space-y-4">
            <CatalogOptimizeLogo />
            <p className="text-sm text-muted-foreground">
              {t.footer.tagline}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t.footer.product}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/#features" className="hover:text-primary transition-colors">{t.footer.features}</a></li>
              <li><a href="/#pricing" className="hover:text-primary transition-colors">{t.footer.pricing}</a></li>
              <li><a href="/demo" className="hover:text-primary transition-colors">{t.footer.demo}</a></li>
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
              <li><a href="/privacy#cookies" className="hover:text-primary transition-colors">{t.footer.cookiePolicy}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t.footer.company}</h4>
            <address className="not-italic text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">CatalogueOptimize AI Ltd</p>
              <p>Suite 4, Piccadilly House</p>
              <p>Manchester</p>
              <p>M1 1AB</p>
              <p>United Kingdom</p>
            </address>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            © 2026 CatalogueOptimize AI. {t.footer.allRightsReserved}
          </p>
        </div>
      </div>
    </footer>
  );
}
