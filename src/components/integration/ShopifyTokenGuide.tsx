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

  const requiredScopes = [
    { scope: "read_products, write_products", desc: "Gestion des produits" },
    { scope: "read_content, write_content", desc: "Pages et articles de blog" },
    { scope: "read_script_tags, write_script_tags", desc: "Balises de script JavaScript" },
    { scope: "read_customer_events", desc: "Comportement de navigation des clients" },
    { scope: "read_locations, write_locations", desc: "Emplacements géographiques" },
    { scope: "read_shipping, write_shipping", desc: "Services d'expédition" },
    { scope: "read_product_listings, write_product_listings", desc: "Fiches de produits" },
    { scope: "read_files, write_files", desc: "Fichiers de la boutique" },
    { scope: "read_product_feeds, write_product_feeds", desc: "Flux de produits" },
    { scope: "read_online_store_pages, write_online_store_pages", desc: "Pages de la boutique" },
    { scope: "read_reports, write_reports", desc: "Rapports analytiques" },
    { scope: "read_inventory, write_inventory", desc: "Stock et inventaire" },
    { scope: "read_inventory_shipments, write_inventory_shipments", desc: "Expéditions d'inventaire" },
    { scope: "read_inventory_transfers, write_inventory_transfers", desc: "Transferts d'inventaire" }
  ];

  return (
    <Card className="p-4 sm:p-6 bg-muted/50 border-primary/20">
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <Badge className="bg-primary shrink-0">Guide</Badge>
          <h3 className="font-semibold text-sm sm:text-base">Comment créer des clés API Shopify</h3>
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
              <p className="font-medium">Créez une application personnalisée</p>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-8 text-xs">
              <li>Allez dans <strong>Paramètres → Applications et canaux de vente</strong></li>
              <li>Cliquez sur <strong>Développer des applications</strong></li>
              <li>Cliquez sur <strong>Créer une application</strong></li>
              <li>Donnez un nom à votre application (ex: "NewAI SEO Integration")</li>
            </ol>
          </div>

          {/* Étape 3 */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">3</Badge>
              <p className="font-medium">Configurez les permissions (API scopes)</p>
            </div>
            <div className="space-y-2 pl-8">
              <p className="text-muted-foreground text-xs">
                Cliquez sur <strong>Configurer les étendues de l'API Admin</strong> et activez toutes ces permissions :
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {requiredScopes.map((item, idx) => (
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
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg mt-2">
                <p className="text-xs text-blue-900 dark:text-blue-200">
                  💡 <strong>Astuce :</strong> Utilisez le bouton de copie pour chaque permission et collez-la directement dans Shopify.
                </p>
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
              <li>Confirmez l'installation en cliquant sur <strong>Installer</strong></li>
            </ol>
          </div>

          {/* Étape 5 */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">5</Badge>
              <p className="font-medium">Récupérez vos clés API</p>
            </div>
            <div className="space-y-2 pl-8">
              <p className="text-muted-foreground text-xs">
                Après l'installation, vous verrez deux clés importantes :
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-background border rounded-lg">
                  <p className="text-xs font-semibold mb-1">🔑 Clé API (API key)</p>
                  <p className="text-xs text-muted-foreground">
                    Format : <code className="bg-muted px-1 py-0.5 rounded">da237524e4e1252a740b204af962acdf</code>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Environ 32 caractères hexadécimaux
                  </p>
                </div>
                <div className="p-3 bg-background border rounded-lg">
                  <p className="text-xs font-semibold mb-1">🔐 Clé secrète d'API (API secret key)</p>
                  <p className="text-xs text-muted-foreground">
                    Format : <code className="bg-muted px-1 py-0.5 rounded">shpss_xxxxxxxxxxxxxxxx</code>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Commence par <code>shpss_</code> ou <code>shpat_</code>
                  </p>
                </div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-900 dark:text-amber-200">
                  ⚠️ <strong>Important :</strong> La clé secrète ne s'affiche qu'une seule fois ! Copiez-la immédiatement et conservez-la en lieu sûr.
                </p>
              </div>
            </div>
          </div>

          {/* Étape 6 */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">6</Badge>
              <p className="font-medium">Collez vos clés dans le formulaire</p>
            </div>
            <p className="text-muted-foreground pl-8 text-xs">
              Utilisez la <strong>Clé API</strong> et la <strong>Clé secrète d'API</strong> dans le formulaire de connexion ci-dessus pour connecter votre boutique à NewAI.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="space-y-2">
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
            <p className="text-xs text-muted-foreground">
              🔒 <strong>Sécurité :</strong> Ces clés donnent un accès complet à votre boutique. Ne les partagez jamais et ne les exposez pas publiquement.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}