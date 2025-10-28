import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Settings, Shield, Key, Copy, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function TokenApiGuide() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papier");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-muted-foreground" />
          <CardTitle>Guide Token API</CardTitle>
          <Badge variant="outline">Avancé</Badge>
        </div>
        <CardDescription>
          Suivez ces étapes pour obtenir votre token API Shopify
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="step1">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Badge className="rounded-full w-7 h-7 flex items-center justify-center">1</Badge>
                <span className="font-semibold">Créer une Custom App</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <ol className="space-y-2 mt-2">
                    <li className="flex gap-2">
                      <span className="font-medium">1.</span>
                      <span>Accédez à votre <strong>Admin Shopify</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">2.</span>
                      <span>Cliquez sur <code className="bg-muted px-1.5 py-0.5 rounded">Settings</code> (en bas à gauche)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">3.</span>
                      <span>Sélectionnez <code className="bg-muted px-1.5 py-0.5 rounded">Apps and sales channels</code></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">4.</span>
                      <span>Cliquez sur <strong>Develop apps</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">5.</span>
                      <span>Cliquez sur <strong>Create an app</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">6.</span>
                      <span>Nommez votre app : <strong>"NewAI Integration"</strong></span>
                    </li>
                  </ol>
                </AlertDescription>
              </Alert>
              
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <Info className="w-4 h-4 inline mr-1" />
                  Cette app permettra à NewAI d'accéder à vos produits Shopify
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step2">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Badge className="rounded-full w-7 h-7 flex items-center justify-center">2</Badge>
                <span className="font-semibold">Configurer les permissions</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <p className="mb-3">Configurez les permissions de la <strong>Storefront API</strong> :</p>
                  <ol className="space-y-2">
                    <li className="flex gap-2">
                      <span className="font-medium">1.</span>
                      <span>Cliquez sur <strong>Configuration</strong> dans votre app</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">2.</span>
                      <span>Descendez jusqu'à <strong>Storefront API scopes</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">3.</span>
                      <span>Cliquez sur <strong>Configure</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">4.</span>
                      <span>Activez les permissions suivantes :</span>
                    </li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-semibold mb-3">Permissions requises :</p>
                <div className="space-y-2">
                  {[
                    'unauthenticated_read_product_listings',
                    'unauthenticated_read_product_inventory',
                    'unauthenticated_write_checkouts',
                    'unauthenticated_read_content'
                  ].map((perm) => (
                    <div key={perm} className="flex items-center justify-between p-2 bg-background rounded">
                      <code className="text-sm">{perm}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(perm)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <Info className="w-4 h-4 inline mr-1" />
                  Ces permissions permettent à NewAI de lire vos produits et contenus
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step3">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Badge className="rounded-full w-7 h-7 flex items-center justify-center">3</Badge>
                <span className="font-semibold">Obtenir le token</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  <ol className="space-y-2 mt-2">
                    <li className="flex gap-2">
                      <span className="font-medium">1.</span>
                      <span>Après avoir configuré les permissions, cliquez sur <strong>Save</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">2.</span>
                      <span>Cliquez sur <strong>Install app</strong> en haut à droite</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">3.</span>
                      <span>Confirmez l'installation en cliquant sur <strong>Install</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">4.</span>
                      <span>Allez dans l'onglet <strong>API credentials</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">5.</span>
                      <span>Trouvez <strong>Storefront API access token</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">6.</span>
                      <span>Cliquez sur le bouton pour <strong>révéler le token</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">7.</span>
                      <span>Copiez le token (commence par <code className="bg-muted px-1.5 py-0.5 rounded">shpat_...</code>)</span>
                    </li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
                <p className="font-semibold text-amber-600 dark:text-amber-400 mb-2">
                  ⚠️ Sécurité du token
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Ne partagez jamais votre token API</li>
                  <li>• Conservez-le en lieu sûr</li>
                  <li>• Vous pouvez le révoquer à tout moment depuis Shopify</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Badge className="rounded-full w-7 h-7 flex items-center justify-center">4</Badge>
                <span className="font-semibold">Connecter à NewAI</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <ol className="space-y-2 mt-2">
                    <li className="flex gap-2">
                      <span className="font-medium">1.</span>
                      <span>Cliquez sur <strong>"Ajouter une boutique"</strong> ci-dessous</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">2.</span>
                      <span>Entrez le nom de votre boutique (sans <code>.myshopify.com</code>)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">3.</span>
                      <span>Collez votre <strong>Storefront API access token</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">4.</span>
                      <span>Cliquez sur <strong>Connecter la boutique</strong></span>
                    </li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                <p className="font-semibold text-green-600 dark:text-green-400 mb-2">
                  ✅ C'est fait !
                </p>
                <p className="text-sm text-muted-foreground">
                  Une fois connecté, vous pourrez importer tous vos produits Shopify et commencer à les optimiser avec l'IA
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
