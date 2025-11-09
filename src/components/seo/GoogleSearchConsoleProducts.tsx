import { Card } from '@/components/ui/card';
import { Package, TrendingUp, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface GoogleSearchConsoleProductsProps {
  selectedDomain: string;
}

export function GoogleSearchConsoleProducts({ selectedDomain }: GoogleSearchConsoleProductsProps) {
  const { t } = useTranslation();
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
            <h2 className="text-2xl font-bold">{t.searchConsole.products.title}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t.searchConsole.products.description}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3 mt-8 text-left">
            <Card className="p-4 bg-accent/50">
              <TrendingUp className="h-6 w-6 mb-2 text-primary" />
              <h4 className="font-semibold mb-1">{t.searchConsole.products.performanceTracking.title}</h4>
              <p className="text-sm text-muted-foreground">
                {t.searchConsole.products.performanceTracking.description}
              </p>
            </Card>
            <Card className="p-4 bg-accent/50">
              <Package className="h-6 w-6 mb-2 text-primary" />
              <h4 className="font-semibold mb-1">{t.searchConsole.products.suggestedOptimizations.title}</h4>
              <p className="text-sm text-muted-foreground">
                {t.searchConsole.products.suggestedOptimizations.description}
              </p>
            </Card>
            <Card className="p-4 bg-accent/50">
              <AlertCircle className="h-6 w-6 mb-2 text-primary" />
              <h4 className="font-semibold mb-1">{t.searchConsole.products.automaticAlerts.title}</h4>
              <p className="text-sm text-muted-foreground">
                {t.searchConsole.products.automaticAlerts.description}
              </p>
            </Card>
          </div>
          <div className="pt-6 text-sm text-muted-foreground">
            <p>🚧 {t.searchConsole.products.underDevelopment}</p>
            <p>{t.searchConsole.products.underDevelopmentDesc}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
