import { Card } from '@/components/ui/card';
import { Package, TrendingUp, AlertCircle } from 'lucide-react';

interface GoogleSearchConsoleProductsProps {
  selectedDomain: string;
}

export function GoogleSearchConsoleProducts({ selectedDomain }: GoogleSearchConsoleProductsProps) {
  return (
    <div className="space-y-6">
      <Card className="p-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Package className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Analyse des Produits</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Analysez les performances de vos produits dans la Console Google Search
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3 mt-8 text-left">
            <Card className="p-4 bg-accent/50">
              <TrendingUp className="h-6 w-6 mb-2 text-primary" />
              <h4 className="font-semibold mb-1">Suivi des performances</h4>
              <p className="text-sm text-muted-foreground">
                Suivez les clics, impressions et CTR de chaque produit
              </p>
            </Card>
            <Card className="p-4 bg-accent/50">
              <Package className="h-6 w-6 mb-2 text-primary" />
              <h4 className="font-semibold mb-1">Optimisations suggérées</h4>
              <p className="text-sm text-muted-foreground">
                Identifiez les produits à optimiser en priorité
              </p>
            </Card>
            <Card className="p-4 bg-accent/50">
              <AlertCircle className="h-6 w-6 mb-2 text-primary" />
              <h4 className="font-semibold mb-1">Alertes automatiques</h4>
              <p className="text-sm text-muted-foreground">
                Recevez des alertes en cas de baisse significative
              </p>
            </Card>
          </div>
          <div className="pt-6 text-sm text-muted-foreground">
            <p>🚧 Fonctionnalité en développement</p>
            <p>Cette section sera bientôt disponible pour analyser vos produits</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
