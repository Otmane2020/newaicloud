import { Card } from '@/components/ui/card';
import { TrendingUp, DollarSign, Target, Zap } from 'lucide-react';

export function GoogleAdsOptimization() {
  const metrics = [
    {
      label: 'ROAS Actuel',
      value: '-',
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      label: 'Taux de Conversion',
      value: '-',
      icon: Target,
      color: 'text-blue-600',
    },
    {
      label: 'CPC Moyen',
      value: '-',
      icon: TrendingUp,
      color: 'text-purple-600',
    },
    {
      label: 'Score de Qualité',
      value: '-',
      icon: Zap,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="text-2xl font-bold mt-1">{metric.value}</p>
              </div>
              <metric.icon className={`h-8 w-8 ${metric.color}`} />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Optimisation ROAS par IA</h3>
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Optimisez automatiquement vos campagnes</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            L'IA analysera vos performances et optimisera automatiquement vos enchères, 
            budgets et ciblages pour maximiser votre retour sur investissement
          </p>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
        <h3 className="font-semibold mb-3">Optimisations automatiques</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Ajustement automatique des enchères selon les performances
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Réallocation du budget vers les campagnes performantes
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Suggestions de mots-clés négatifs
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Optimisation des annonces sous-performantes
          </li>
        </ul>
      </Card>
    </div>
  );
}
