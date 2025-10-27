import { ShopifyIntegrationTabs } from '@/components/integration/ShopifyIntegrationTabs';

export default function Integration() {

  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Intégrations Shopify
          </h1>
          <p className="text-muted-foreground text-lg">
            Connectez et gérez vos boutiques Shopify
          </p>
        </div>

        <ShopifyIntegrationTabs />
      </div>
    </div>
  );
}
