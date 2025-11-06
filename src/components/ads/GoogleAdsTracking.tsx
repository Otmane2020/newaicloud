import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Code, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/language';

export function GoogleAdsTracking() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t.googleAds.tracking.title}</h3>
        
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">{t.googleAds.tracking.purchaseTracking.title}</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {t.googleAds.tracking.purchaseTracking.description}
                </p>
                <Button variant="outline" size="sm">
                  {t.googleAds.tracking.purchaseTracking.action}
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
                <h4 className="font-semibold mb-1">{t.googleAds.tracking.googleTag.title}</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {t.googleAds.tracking.googleTag.description}
                </p>
                <Button variant="outline" size="sm">
                  {t.googleAds.tracking.googleTag.action}
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
                <h4 className="font-semibold mb-1">{t.googleAds.tracking.customEvents.title}</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {t.googleAds.tracking.customEvents.description}
                </p>
                <Button variant="outline" size="sm">
                  {t.googleAds.tracking.customEvents.action}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
        <h3 className="font-semibold mb-3">{t.googleAds.tracking.trackingFeatures.title}</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.tracking.trackingFeatures.feature1}
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.tracking.trackingFeatures.feature2}
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.tracking.trackingFeatures.feature3}
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.tracking.trackingFeatures.feature4}
          </li>
        </ul>
      </Card>
    </div>
  );
}
