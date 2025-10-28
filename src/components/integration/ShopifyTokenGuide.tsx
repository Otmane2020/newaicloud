import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export function ShopifyTokenGuide() {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyToClipboard = (text: string, step: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(step);
    toast.success("Copié !");
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <Card className="p-4 sm:p-6 bg-muted/50 border-primary/20">
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <Badge className="bg-primary shrink-0">Guide</Badge>
          <h3 className="font-semibold text-sm sm:text-base">Comment créer un token d'API Shopify</h3>
        </div>

        <div className="space-y-4 text-xs sm:text-sm">
          {/* Étape 1 */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">1</Badge>
              <p className="font-medium">Accédez à l'admin Shopify</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto text-xs"
              onClick={() => window.open('https://admin.shopify.com', '_blank')}
            >
              <ExternalLink className="w-3 h-3 mr-2" />
              Ouvrir l'admin Shopify
            </Button>
          </div>

          {/* Étape 2 */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">2</Badge>
              <p className="font-medium">Créez une application privée</p>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-8 text-xs">
              <li>Allez dans <strong>Paramètres → Applications et canaux de vente</strong></li>
              <li>Cliquez sur <strong>Développer des applications</strong></li>
              <li>Cliquez sur <strong>Créer une application</strong></li>
              <li>Donnez un nom à votre application (ex: "NewAI SEO")</li>
            </ol>
          </div>

          {/* Étape 3 */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">3</Badge>
              <p className="font-medium">Configurez les permissions</p>
            </div>
            <div className="space-y-2 pl-8">
              <p className="text-muted-foreground text-xs">Cliquez sur <strong>Configurer les étendues de l'API Admin</strong> et activez :</p>
              <div className="space-y-2">
                {[
                  { scope: "read_products, write_products", desc: "Gestion des produits" },
                  { scope: "read_content, write_content", desc: "Pages et articles" },
                  { scope: "read_themes, write_themes", desc: "Thèmes et fichiers" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-background rounded border">
                    <div className="flex-1 min-w-0">
                      <code className="text-xs font-mono break-all">{item.scope}</code>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => copyToClipboard(item.scope, idx)}
                    >
                      {copiedStep === idx ? (
                        <CheckCircle2 className="w-3 h-3 text-success" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Étape 4 */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">4</Badge>
              <p className="font-medium">Installez l'application</p>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-8 text-xs">
              <li>Cliquez sur <strong>Enregistrer</strong></li>
              <li>Cliquez sur <strong>Installer l'application</strong></li>
              <li>Confirmez l'installation</li>
            </ol>
          </div>

          {/* Étape 5 */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">5</Badge>
              <p className="font-medium">Récupérez votre token</p>
            </div>
            <div className="space-y-2 pl-8">
              <p className="text-muted-foreground text-xs">
                Votre <strong>Admin API access token</strong> s'affiche une seule fois. Copiez-le immédiatement !
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-900 dark:text-amber-200">
                  ⚠️ <strong>Important :</strong> Le token commence par <code>shpat_</code> et fait environ 32 caractères.
                </p>
              </div>
            </div>
          </div>

          {/* Étape 6 */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">6</Badge>
              <p className="font-medium">Collez le token ci-dessus</p>
            </div>
            <p className="text-muted-foreground pl-8 text-xs">
              Utilisez ce token dans le formulaire de connexion OAuth ci-dessus pour connecter votre boutique à NewAI.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Besoin d'aide ?</strong> Consultez la{" "}
            <Button
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={() => window.open('https://help.shopify.com/en/manual/apps/app-types/custom-apps', '_blank')}
            >
              documentation officielle Shopify
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </p>
        </div>
      </div>
    </Card>
  );
}
