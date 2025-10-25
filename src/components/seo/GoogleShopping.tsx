import { ShoppingBag, TrendingUp, Package, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function GoogleShopping() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <ShoppingBag className="w-8 h-8 text-primary" />
          Google Shopping
        </h2>
        <p className="text-muted-foreground">
          Gérez et optimisez votre flux de produits Google Shopping
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Produits</h3>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold">0</p>
          <p className="text-sm text-muted-foreground mt-1">Prêts pour Google Shopping</p>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Optimisés</h3>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold">0</p>
          <p className="text-sm text-muted-foreground mt-1">Données produits complètes</p>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Attention Requise</h3>
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold">0</p>
          <p className="text-sm text-muted-foreground mt-1">Champs manquants</p>
        </Card>
      </div>

      <Card className="p-8">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Intégration Google Shopping
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            Optimisez vos produits pour Google Shopping avec des améliorations alimentées par l'IA.
            Assurez-vous que tous les champs requis sont remplis et que vos produits sont prêts pour Google Merchant Center.
          </p>
          <Button asChild size="lg">
            <a
              href="https://merchants.google.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ouvrir Google Merchant Center
            </a>
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold mb-3">
          Exigences Google Shopping
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">Champs Obligatoires :</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Titre du produit</li>
              <li>Description du produit</li>
              <li>Lien produit</li>
              <li>Lien image</li>
              <li>Prix</li>
              <li>Disponibilité</li>
              <li>GTIN ou Marque + MPN</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Champs Recommandés :</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Catégorie de produit</li>
              <li>Type de produit</li>
              <li>Catégorie Google</li>
              <li>État</li>
              <li>Groupe d'âge</li>
              <li>Genre</li>
              <li>Couleur</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}