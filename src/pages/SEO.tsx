import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Zap } from 'lucide-react';

export default function SEO() {
  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Optimisation SEO</h1>
            <p className="text-muted-foreground">
              Optimisez automatiquement vos meta tags, descriptions et keywords
            </p>
          </div>
          <Button size="lg">
            <Zap className="w-5 h-5 mr-2" />
            Lancer Optimisation
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Score SEO Moyen</p>
            <p className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              0%
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Produits Optimisés</p>
            <p className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              0/0
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Articles Optimisés</p>
            <p className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              0/0
            </p>
          </Card>
        </div>

        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Aucune optimisation en cours
          </p>
          <Button>
            <Zap className="w-5 h-5 mr-2" />
            Démarrer l'optimisation AI
          </Button>
        </Card>
      </div>
    </div>
  );
}