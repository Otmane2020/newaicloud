import { Sparkles } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export function Footer() {
  const { t } = useTranslation();
  
  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                NewAI
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('footer.description')}
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4">{t('footer.product.title')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/#features" className="hover:text-primary transition-colors">{t('footer.product.features')}</a></li>
              <li><a href="/#pricing" className="hover:text-primary transition-colors">{t('footer.product.pricing')}</a></li>
              <li><a href="/auth" className="hover:text-primary transition-colors">{t('footer.product.demo')}</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4">{t('footer.resources.title')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/documentation" className="hover:text-primary transition-colors">{t('footer.resources.documentation')}</a></li>
              <li><a href="/blog" className="hover:text-primary transition-colors">{t('footer.resources.blog')}</a></li>
              <li><a href="mailto:support@newai.com" className="hover:text-primary transition-colors">{t('footer.resources.support')}</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">{t('footer.legal.title')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/privacy" className="hover:text-primary transition-colors">{t('footer.legal.privacy')}</a></li>
              <li><a href="/terms" className="hover:text-primary transition-colors">{t('footer.legal.terms')}</a></li>
              <li><a href="/privacy#cookies" className="hover:text-primary transition-colors">{t('footer.legal.cookies')}</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
