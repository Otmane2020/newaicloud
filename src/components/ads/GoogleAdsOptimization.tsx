import { Card } from '@/components/ui/card';
import { TrendingUp, DollarSign, Target, Zap } from 'lucide-react';
import { useTranslation } from '@/lib/language';

export function GoogleAdsOptimization() {
  const { t } = useTranslation();
  const metrics = [
    {
      label: t.googleAds.optimization.metrics.currentROAS,
      value: '-',
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      label: t.googleAds.optimization.metrics.conversionRate,
      value: '-',
      icon: Target,
      color: 'text-blue-600',
    },
    {
      label: t.googleAds.optimization.metrics.avgCPC,
      value: '-',
      icon: TrendingUp,
      color: 'text-purple-600',
    },
    {
      label: t.googleAds.optimization.metrics.qualityScore,
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
        <h3 className="text-lg font-semibold mb-4">{t.googleAds.optimization.roasTitle}</h3>
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t.googleAds.optimization.optimizeAuto}</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t.googleAds.optimization.optimizeAutoDesc}
          </p>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
        <h3 className="font-semibold mb-3">{t.googleAds.optimization.automaticOptimizations.title}</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.optimization.automaticOptimizations.feature1}
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.optimization.automaticOptimizations.feature2}
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.optimization.automaticOptimizations.feature3}
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.optimization.automaticOptimizations.feature4}
          </li>
        </ul>
      </Card>
    </div>
  );
}
