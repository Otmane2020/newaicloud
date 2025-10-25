import { ShopifyConnection } from '@/components/dashboard/ShopifyConnection';

export default function Integration() {
  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Intégration Shopify
          </h1>
          <p className="text-muted-foreground text-lg">
            Connectez et gérez votre boutique Shopify
          </p>
        </div>

        <ShopifyConnection />
      </div>
    </div>
  );
}
