import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';

export default function Products() {
  return (
    <div className="min-h-screen bg-gradient-subtle pt-24 pb-12">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Gestion des Produits</h1>
            <p className="text-muted-foreground">
              Gérez vos produits Shopify avec génération GTIN automatique
            </p>
          </div>
          <Button size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Nouveau Produit
          </Button>
        </div>

        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Aucun produit pour le moment
          </p>
          <Button>
            <Plus className="w-5 h-5 mr-2" />
            Créer votre premier produit
          </Button>
        </Card>
      </div>
    </div>
  );
}