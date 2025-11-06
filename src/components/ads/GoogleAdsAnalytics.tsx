import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Globe } from 'lucide-react';
import { useTranslation } from '@/lib/language';

export function GoogleAdsAnalytics() {
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState(false);

  if (!isConnected) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <BarChart3 className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{t.googleAds.analytics.connect}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t.googleAds.analytics.description}
            </p>
          </div>
          <Button size="lg" className="gap-2">
            <Globe className="h-5 w-5" />
            {t.googleAds.analytics.connect}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t.googleAds.analytics.overview}</h3>
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t.googleAds.analytics.dashboards}</h3>
          <p className="text-muted-foreground">
            {t.googleAds.analytics.dashboardsDesc}
          </p>
        </div>
      </Card>
    </div>
  );
}
