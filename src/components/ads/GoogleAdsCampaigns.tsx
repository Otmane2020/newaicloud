import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';

export function GoogleAdsCampaigns() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Vos Campagnes Google Ads</h3>
            <p className="text-sm text-muted-foreground">Créez et gérez vos campagnes automatiquement</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle campagne
          </Button>
        </div>

        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Créez votre première campagne</h3>
          <p className="text-muted-foreground mb-4">
            L'IA vous aidera à créer des campagnes optimisées automatiquement
          </p>
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Créer avec l'IA
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <h3 className="font-semibold mb-3">Fonctionnalités à venir</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Création automatique de campagnes basée sur vos produits
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Optimisation des enchères par l'IA
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Génération automatique d'annonces
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Gestion des budgets intelligente
          </li>
        </ul>
      </Card>
    </div>
  );
}
