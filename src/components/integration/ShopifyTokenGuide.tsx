import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ExternalLink, Copy, Check, Key, Shield, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copié !`);
};

const requiredScopes = [
  { scope: "read_products, write_products", description: "Gestion des produits" },
  { scope: "read_content, write_content", description: "Pages et articles de blog" },
  { scope: "read_script_tags, write_script_tags", description: "Balises de script JavaScript" },
  { scope: "read_customer_events", description: "Comportement de navigation des clients" },
  { scope: "read_locations, write_locations", description: "Emplacements géographiques" },
  { scope: "read_shipping, write_shipping", description: "Services d'expédition" },
  { scope: "read_product_listings, write_product_listings", description: "Fiches de produits" },
  { scope: "read_files, write_files", description: "Fichiers de la boutique" },
  { scope: "read_product_feeds, write_product_feeds", description: "Flux de produits" },
  { scope: "read_online_store_pages, write_online_store_pages", description: "Pages de la boutique" },
  { scope: "read_reports, write_reports", description: "Rapports analytiques" },
  { scope: "read_inventory, write_inventory", description: "Stock et inventaire" },
  { scope: "read_inventory_shipments, write_inventory_shipments", description: "Expéditions d'inventaire" },
  { scope: "read_inventory_transfers, write_inventory_transfers", description: "Transferts d'inventaire" },
];

export function ShopifyTokenGuide() {
  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Info className="w-4 h-4 text-primary" />
          </div>
          <CardTitle className="text-lg">📖 Guide : Créer vos clés API Shopify</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Suivez ces 6 étapes pour obtenir vos identifiants de connexion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info boutique */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs space-y-2">
            <p>
              <strong>Nom de votre boutique :</strong> <code className="bg-muted px-1.5 py-0.5 rounded text-xs">HBxv99-2F</code>.myshopify.com
            </p>
            <p>
              Trouvez le nom dans l'URL :{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs break-all">
                admin.shopify.com/store/<strong>HBxv99-2F</strong>
              </code>
            </p>
          </AlertDescription>
        </Alert>

        {/* Étape 1 */}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-1">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <h4 className="font-semibold text-sm">Étape 1 : Accédez à l'admin Shopify</h4>
            <p className="text-xs text-muted-foreground">
              Allez dans <strong>Paramètres</strong> → <strong>Apps et canaux de vente</strong> → <strong>Développer des applications</strong>
            </p>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
              <a href="https://admin.shopify.com/settings/apps/development" target="_blank" rel="noopener noreferrer">
                Ouvrir l'admin Shopify <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>

        {/* Étape 2 */}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-1">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <h4 className="font-semibold text-sm">Étape 2 : Créez une application personnalisée</h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
              <li>Cliquez sur <strong>Créer une application</strong></li>
              <li>Donnez un nom à votre application (ex: "NewAI SEO Integration")</li>
              <li>Cliquez sur <strong>Créer une application</strong> pour confirmer</li>
            </ul>
          </div>
        </div>

        {/* Étape 3 */}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-1">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <h4 className="font-semibold text-sm">Étape 3 : Configurez les permissions (API scopes)</h4>
            <p className="text-xs text-muted-foreground">
              Cliquez sur <strong>Configurer les étendues de l'API Admin</strong> et activez les permissions nécessaires
            </p>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="scopes" className="border rounded-lg px-3">
                <AccordionTrigger className="text-xs hover:no-underline py-3">
                  <span className="flex items-center gap-2">
                    📋 Liste complète des permissions nécessaires ({requiredScopes.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {requiredScopes.map((item, index) => (
                      <div key={index} className="flex items-start justify-between gap-2 p-2 bg-muted/50 rounded-md">
                        <div className="flex-1 min-w-0">
                          <code className="text-xs font-mono block break-all">{item.scope}</code>
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={() => copyToClipboard(item.scope, "Permission")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Étape 4 */}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-1">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <h4 className="font-semibold text-sm">Étape 4 : Installez l'application</h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
              <li>Cliquez sur <strong>Enregistrer</strong> pour sauvegarder les permissions</li>
              <li>Cliquez sur <strong>Installer l'application</strong></li>
              <li>Confirmez l'installation</li>
            </ul>
          </div>
        </div>

        {/* Étape 5 */}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-1">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 space-y-3">
            <h4 className="font-semibold text-sm">Étape 5 : Récupérez vos 2 clés</h4>
            
            {/* API Key */}
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">1️⃣ API Key</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Cette clé publique identifie votre application
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background p-2 rounded text-xs font-mono block overflow-x-auto">
                  abc123def456ghi789jkl012mno345pq
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => copyToClipboard("abc123def456ghi789jkl012mno345pq", "Exemple API Key")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>✓ Format : 32 caractères hexadécimaux</p>
                <p>✓ Localisation : Onglet <strong>"API credentials"</strong></p>
              </div>
            </div>

            {/* Admin API Access Token */}
            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="font-semibold text-sm">2️⃣ Admin API Access Token</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ce token secret donne accès à votre boutique
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background p-2 rounded text-xs font-mono block overflow-x-auto">
                  shpat_xx11yy22zz33aa44bb55cc66dd77ee88
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => copyToClipboard("shpat_xx11yy22zz33aa44bb55cc66dd77ee88", "Exemple Token")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <Alert className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-xs text-red-900 dark:text-red-200">
                  <strong>⚠️ Important :</strong> Ce token ne s'affiche qu'une seule fois ! Copiez-le immédiatement.
                </AlertDescription>
              </Alert>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>✓ Format : Commence par <code className="bg-background px-1.5 py-0.5 rounded font-mono">shpat_</code></p>
                <p>✓ Localisation : Onglet <strong>"API credentials"</strong> → Bouton <strong>"Reveal token once"</strong></p>
              </div>
            </div>
          </div>
        </div>

        {/* Étape 6 */}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-1">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <h4 className="font-semibold text-sm">Étape 6 : Collez vos clés dans le formulaire</h4>
            <p className="text-xs text-muted-foreground">
              Utilisez les deux clés ci-dessus dans le formulaire de connexion pour connecter votre boutique à NewAI.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t space-y-2">
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            <span>💡</span>
            <span>
              <strong>Besoin d'aide ?</strong> Consultez la{" "}
              <Button variant="link" className="h-auto p-0 text-xs inline" asChild>
                <a href="https://help.shopify.com/en/manual/apps/app-types/custom-apps" target="_blank" rel="noopener noreferrer">
                  documentation officielle Shopify <ExternalLink className="ml-1 h-3 w-3 inline" />
                </a>
              </Button>
            </span>
          </p>
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            <span>🔒</span>
            <span>
              <strong>Sécurité :</strong> Ces clés donnent un accès complet à votre boutique. Ne les partagez jamais et ne les exposez pas publiquement.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
