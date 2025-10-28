import { ShopifyIntegrationTabs } from '@/components/integration/ShopifyIntegrationTabs';

export default function Integration() {

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
            Intégrations Shopify
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
            Connectez et gérez vos boutiques Shopify
          </p>
        </div>

        <ShopifyIntegrationTabs />
      </div>
    </div>
  );
}
