import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ExternalLink, Copy, Check, Key, Shield, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

export function ShopifyTokenGuide() {
  const { t } = useTranslation();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t.shopifyApiGuide.toasts.copied.replace("{{label}}", label));
  };

  const requiredScopes = [
    { scope: "read_products, write_products", descKey: "products" },
    { scope: "read_content, write_content", descKey: "content" },
    { scope: "read_script_tags, write_script_tags", descKey: "scriptTags" },
    { scope: "read_customer_events", descKey: "customerEvents" },
    { scope: "read_locations, write_locations", descKey: "locations" },
    { scope: "read_shipping, write_shipping", descKey: "shipping" },
    { scope: "read_product_listings, write_product_listings", descKey: "productListings" },
    { scope: "read_files, write_files", descKey: "files" },
    { scope: "read_product_feeds, write_product_feeds", descKey: "productFeeds" },
    { scope: "read_online_store_pages, write_online_store_pages", descKey: "pages" },
    { scope: "read_reports, write_reports", descKey: "reports" },
    { scope: "read_inventory, write_inventory", descKey: "inventory" },
    { scope: "read_inventory_shipments, write_inventory_shipments", descKey: "inventoryShipments" },
    { scope: "read_inventory_transfers, write_inventory_transfers", descKey: "inventoryTransfers" },
  ];

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Info className="w-4 h-4 text-primary" />
          </div>
          <CardTitle className="text-lg">{t.shopifyApiGuide.title}</CardTitle>
        </div>
        <CardDescription className="text-xs">
          {t.shopifyApiGuide.subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Store Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs space-y-2">
            <p>
              <strong>{t.shopifyApiGuide.storeInfo.storeName}</strong> <code className="bg-muted px-1.5 py-0.5 rounded text-xs">HBxv99-2F</code>.myshopify.com
            </p>
            <p>
              {t.shopifyApiGuide.storeInfo.findInUrl}{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs break-all">
                admin.shopify.com/store/<strong>HBxv99-2F</strong>
              </code>
            </p>
          </AlertDescription>
        </Alert>

        {/* Step 1 */}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-1">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <h4 className="font-semibold text-sm">{t.shopifyApiGuide.steps.step1.title}</h4>
            <p className="text-xs text-muted-foreground">
              {t.shopifyApiGuide.steps.step1.description}
            </p>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
              <a href="https://admin.shopify.com/settings/apps/development" target="_blank" rel="noopener noreferrer">
                {t.shopifyApiGuide.steps.step1.link} <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-1">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <h4 className="font-semibold text-sm">{t.shopifyApiGuide.steps.step2.title}</h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
              {t.shopifyApiGuide.steps.step2.items.map((item, index) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: item.replace(/"([^"]+)"/g, '<strong>"$1"</strong>') }} />
              ))}
            </ul>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-1">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <h4 className="font-semibold text-sm">{t.shopifyApiGuide.steps.step3.title}</h4>
            <p className="text-xs text-muted-foreground">
              {t.shopifyApiGuide.steps.step3.description}
            </p>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="scopes" className="border rounded-lg px-3">
                <AccordionTrigger className="text-xs hover:no-underline py-3">
                  <span className="flex items-center gap-2">
                    📋 {t.shopifyApiGuide.steps.step3.scopesTitle} ({requiredScopes.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {requiredScopes.map((item, index) => (
                      <div key={index} className="flex items-start justify-between gap-2 p-2 bg-muted/50 rounded-md">
                        <div className="flex-1 min-w-0">
                          <code className="text-xs font-mono block break-all">{item.scope}</code>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t.shopifyApiGuide.scopes[item.descKey as keyof typeof t.shopifyApiGuide.scopes]}
                          </p>
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

        {/* Step 4 */}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-1">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <h4 className="font-semibold text-sm">{t.shopifyApiGuide.steps.step4.title}</h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
              {t.shopifyApiGuide.steps.step4.items.map((item, index) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: item.replace(/"([^"]+)"/g, '<strong>"$1"</strong>') }} />
              ))}
            </ul>
          </div>
        </div>

        {/* Step 5 */}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-1">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 space-y-3">
            <h4 className="font-semibold text-sm">{t.shopifyApiGuide.steps.step5.title}</h4>
            
            {/* API Key */}
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">{t.shopifyApiGuide.steps.step5.apiKey.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.shopifyApiGuide.steps.step5.apiKey.description}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background p-2 rounded text-xs font-mono block overflow-x-auto">
                  abc123def456ghi789jkl012mno345pq
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => copyToClipboard("abc123def456ghi789jkl012mno345pq", "API Key")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>✓ {t.shopifyApiGuide.steps.step5.apiKey.format}</p>
                <p>✓ {t.shopifyApiGuide.steps.step5.apiKey.location}</p>
              </div>
            </div>

            {/* Admin API Access Token */}
            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="font-semibold text-sm">{t.shopifyApiGuide.steps.step5.accessToken.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.shopifyApiGuide.steps.step5.accessToken.description}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background p-2 rounded text-xs font-mono block overflow-x-auto">
                  shpat_xx11yy22zz33aa44bb55cc66dd77ee88
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => copyToClipboard("shpat_xx11yy22zz33aa44bb55cc66dd77ee88", "Token")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <Alert className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-xs text-red-900 dark:text-red-200">
                  <strong>{t.shopifyApiGuide.steps.step5.accessToken.warning}</strong>
                </AlertDescription>
              </Alert>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>✓ {t.shopifyApiGuide.steps.step5.accessToken.format} <code className="bg-background px-1.5 py-0.5 rounded font-mono">shpat_</code></p>
                <p>✓ {t.shopifyApiGuide.steps.step5.accessToken.location}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 6 */}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-1">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <h4 className="font-semibold text-sm">{t.shopifyApiGuide.steps.step6.title}</h4>
            <p className="text-xs text-muted-foreground">
              {t.shopifyApiGuide.steps.step6.description}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t space-y-2">
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            <span>💡</span>
            <span>
              <strong>{t.shopifyApiGuide.footer.help}</strong>{" "}
              <Button variant="link" className="h-auto p-0 text-xs inline" asChild>
                <a href="https://help.shopify.com/en/manual/apps/app-types/custom-apps" target="_blank" rel="noopener noreferrer">
                  {t.shopifyApiGuide.footer.helpLink} <ExternalLink className="ml-1 h-3 w-3 inline" />
                </a>
              </Button>
            </span>
          </p>
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            <span>🔒</span>
            <span>
              <strong>{t.shopifyApiGuide.footer.security}</strong> {t.shopifyApiGuide.footer.securityWarning}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
