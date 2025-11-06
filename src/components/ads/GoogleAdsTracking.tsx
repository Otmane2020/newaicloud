import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Code, CheckCircle2 } from 'lucide-react';

export function GoogleAdsTracking() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Configuration du suivi des conversions</h3>
        
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Suivi des achats</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Suivez automatiquement les conversions d'achat sur votre site
                </p>
                <Button variant="outline" size="sm">
                  Configurer
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Code className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Tag Google Ads</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Installez le tag de conversion Google Ads sur votre site
                </p>
                <Button variant="outline" size="sm">
                  Obtenir le code
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Événements personnalisés</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Créez des conversions personnalisées pour vos objectifs spécifiques
                </p>
                <Button variant="outline" size="sm">
                  Créer un événement
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
        <h3 className="font-semibold mb-3">Fonctionnalités de tracking</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Tracking automatique des conversions e-commerce
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Attribution multi-touch avec IA
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Analyses cross-device
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Rapports de conversion en temps réel
          </li>
        </ul>
      </Card>
    </div>
  );
}
