import { Sparkles } from "lucide-react";

export function Footer() {
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
              Optimisez votre boutique Shopify avec l'intelligence artificielle
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4">Produit</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/#features" className="hover:text-primary transition-colors">Fonctionnalités</a></li>
              <li><a href="/#pricing" className="hover:text-primary transition-colors">Tarifs</a></li>
              <li><a href="/auth" className="hover:text-primary transition-colors">Démo</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4">Ressources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/documentation" className="hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="/blog" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="mailto:support@newai.com" className="hover:text-primary transition-colors">Support</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Légal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/privacy" className="hover:text-primary transition-colors">Confidentialité</a></li>
              <li><a href="/terms" className="hover:text-primary transition-colors">CGU</a></li>
              <li><a href="/privacy#cookies" className="hover:text-primary transition-colors">Cookies</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© 2025 NewAI. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}