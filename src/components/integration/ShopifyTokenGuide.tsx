import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ExternalLink, Copy, Key, Shield, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

const DEV_DASHBOARD_URL = "https://dev.shopify.com/dashboard";
const SHOPIFY_GUIDE_URL = "https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard";

export function ShopifyTokenGuide() {
  const { language } = useTranslation();
  const fr = language === "fr";

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(fr ? `${label} copié` : `${label} copied`);
  };

  const scopes = [
    "read_products", "write_products",
    "read_inventory", "write_inventory",
    "read_content", "write_content",
    "read_files", "write_files",
    "read_online_store_pages", "write_online_store_pages",
  ];

  const scopeValue = scopes.join(",");
  const steps = fr
    ? [
        ["Créer l’application", "Dans le Dev Dashboard, cliquez sur Create app → Start from Dev Dashboard. Nommez-la « Decora Home API »."],
        ["Créer une version", "Ouvrez Versions, indiquez l’URL de l’application, choisissez la version d’API la plus récente et ajoutez les permissions ci-dessous."],
        ["Publier la configuration", "Cliquez sur Release. Les changements de permissions ne sont actifs qu’après publication de la version."],
        ["Installer sur Decora Home", "Dans Home → Install app, sélectionnez votre boutique Decora Home puis confirmez l’installation."],
        ["Récupérer les identifiants", "Dans Settings, copiez le Client ID et le Client secret. CatalogueOptimize AI les utilisera côté serveur pour obtenir automatiquement un token valable 24 heures."],
        ["Connecter dans CatalogueOptimize AI", "Saisissez le domaine myshopify.com, le Client ID et le Client secret. Ne partagez jamais le Client secret par e-mail ou dans une conversation."],
      ]
    : [
        ["Create the app", "In the Dev Dashboard, click Create app → Start from Dev Dashboard. Name it “Decora Home API”."],
        ["Create a version", "Open Versions, set the app URL, select the latest API version and add the scopes listed below."],
        ["Release the configuration", "Click Release. Scope changes only become active after the version is released."],
        ["Install on Decora Home", "From Home → Install app, select your Decora Home store and confirm installation."],
        ["Get the credentials", "In Settings, copy the Client ID and Client secret. CatalogueOptimize AI uses them server-side to obtain a 24-hour access token automatically."],
        ["Connect in CatalogueOptimize AI", "Enter the myshopify.com domain, Client ID and Client secret. Never share the Client secret by email or chat."],
      ];

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Info className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-lg">
            {fr ? "Connecter une nouvelle application Shopify (Dev Dashboard)" : "Connect a new Shopify app (Dev Dashboard)"}
          </CardTitle>
        </div>
        <CardDescription>
          {fr
            ? "Guide à jour pour les applications créées depuis le 1er janvier 2026."
            : "Current flow for apps created from January 1, 2026."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {fr
              ? "Shopify ne fournit plus de token Admin permanent à copier pour une nouvelle application. Le Client ID et le Client secret servent à générer automatiquement un token qui expire après 24 heures."
              : "Shopify no longer provides a permanent Admin token to copy for new apps. The Client ID and Client secret are used to generate an access token that expires after 24 hours."}
          </AlertDescription>
        </Alert>

        <Button variant="outline" size="sm" asChild>
          <a href={DEV_DASHBOARD_URL} target="_blank" rel="noopener noreferrer">
            {fr ? "Ouvrir le Dev Dashboard" : "Open Dev Dashboard"}
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>

        <div className="space-y-5">
          {steps.map(([title, description], index) => (
            <div className="flex items-start gap-3" key={title}>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {index + 1}
              </div>
              <div>
                <h4 className="text-sm font-semibold">{title}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="scopes" className="rounded-lg border px-3">
            <AccordionTrigger className="text-xs hover:no-underline">
              {fr ? "Permissions recommandées pour CatalogueOptimize AI" : "Recommended CatalogueOptimize AI scopes"}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                <code className="block break-all rounded-md bg-muted p-3 text-xs">{scopeValue}</code>
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(scopeValue, fr ? "Permissions" : "Scopes")}>
                  <Copy className="mr-2 h-3 w-3" />
                  {fr ? "Copier les permissions" : "Copy scopes"}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              <strong className="text-sm">Client ID</strong>
            </div>
            <p className="text-xs text-muted-foreground">
              {fr ? "Identifiant public disponible dans Settings." : "Public identifier available in Settings."}
            </p>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/20">
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-600" />
              <strong className="text-sm">Client secret</strong>
            </div>
            <p className="text-xs text-muted-foreground">
              {fr ? "Secret confidentiel utilisé uniquement côté serveur." : "Confidential secret used only server-side."}
            </p>
          </div>
        </div>

        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-xs text-red-900 dark:text-red-200">
            {fr
              ? "Les anciennes connexions utilisant un token shpat_ continuent de fonctionner. Ne les supprimez pas uniquement pour suivre ce nouveau guide."
              : "Existing connections using a shpat_ token continue to work. Do not remove them only to follow this new guide."}
          </AlertDescription>
        </Alert>

        <Button variant="link" className="h-auto p-0 text-xs" asChild>
          <a href={SHOPIFY_GUIDE_URL} target="_blank" rel="noopener noreferrer">
            {fr ? "Documentation officielle Shopify" : "Official Shopify documentation"}
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
