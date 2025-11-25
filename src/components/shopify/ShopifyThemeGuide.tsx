import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Check, ExternalLink, AlertTriangle, Code, Settings } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ShopifyThemeGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const SHOPIFY_CSS = `.product__info-wrapper,
.product__description,
.product__description * {
    width: 100% !important;
    max-width: 100% !important;
}

.product__info-container {
    display: block !important;
}

.product__media-wrapper,
.product__media {
    width: 100% !important;
    max-width: 100% !important;
}

@media(min-width: 768px) {
  .product--large .product__outer {
      grid-template-columns: 1fr !important;
  }
}`;

export function ShopifyThemeGuide({ open, onOpenChange, onConfirm }: ShopifyThemeGuideProps) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SHOPIFY_CSS);
      setCopied(true);
      toast.success("CSS copié dans le presse-papier");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Erreur lors de la copie");
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Save preference that user has added the CSS
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            shopify_theme_css_added: true,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (error) throw error;
      }
      onConfirm();
      onOpenChange(false);
      toast.success("Configuration enregistrée");
    } catch (error) {
      console.error("Error saving preference:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-6 w-6 text-primary" />
            Configuration du thème Shopify requise
          </DialogTitle>
          <DialogDescription>
            Pour afficher vos landing pages en pleine largeur sur Shopify, vous devez ajouter un CSS personnalisé à votre thème.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Important:</strong> Shopify bloque les balises <code>&lt;style&gt;</code> dans les descriptions de produits. 
              Sans cette modification, vos landing pages s'afficheront dans une colonne étroite à droite.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              Instructions étape par étape
            </h3>

            <div className="space-y-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2">Ouvrir l'éditeur de thème Shopify</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Accédez à votre boutique Shopify puis cliquez sur le bouton ci-dessous:
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open("https://admin.shopify.com/store/settings/themes", "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ouvrir l'éditeur de thème
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2">Trouver le fichier CSS de base</h4>
                      <p className="text-sm text-muted-foreground">
                        Dans l'éditeur de thème, cliquez sur <strong>"Modifier le code"</strong> puis recherchez:
                      </p>
                      <ul className="text-sm text-muted-foreground mt-2 ml-4 list-disc space-y-1">
                        <li><code>Assets/base.css</code> ou</li>
                        <li><code>Assets/theme.css</code> ou</li>
                        <li><code>Assets/custom.css</code></li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2">Copier et coller le CSS</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Ajoutez ce CSS à la fin du fichier choisi:
                      </p>
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto border">
                          <code>{SHOPIFY_CSS}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2"
                          onClick={handleCopy}
                        >
                          {copied ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Copié!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1" />
                              Copier
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      4
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2">Enregistrer et vérifier</h4>
                      <p className="text-sm text-muted-foreground">
                        Cliquez sur <strong>"Enregistrer"</strong> dans Shopify. Vos landing pages s'afficheront maintenant en pleine largeur!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Alert className="border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>C'est tout!</strong> Une fois le CSS ajouté, vous n'aurez plus besoin de faire cette manipulation. 
              Toutes vos futures landing pages s'afficheront correctement.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Plus tard
            </Button>
            <Button onClick={handleConfirm} disabled={saving}>
              {saving ? "Enregistrement..." : "J'ai ajouté le CSS"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
