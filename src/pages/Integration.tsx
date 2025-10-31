import { ShopifyIntegrationTabs } from '@/components/integration/ShopifyIntegrationTabs';
import { CollectionImportSelector } from '@/components/integration/CollectionImportSelector';

export default function Integration() {

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                Shopify Integrations
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
                Connect and manage your Shopify stores
              </p>
            </div>
            <CollectionImportSelector />
          </div>
        </div>

        <ShopifyIntegrationTabs />
      </div>
    </div>
  );
}
