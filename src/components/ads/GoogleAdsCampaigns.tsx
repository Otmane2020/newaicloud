import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/language';

export function GoogleAdsCampaigns() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">{t.googleAds.campaigns.title}</h3>
            <p className="text-sm text-muted-foreground">{t.googleAds.campaigns.subtitle}</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {t.googleAds.campaigns.newCampaign}
          </Button>
        </div>

        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t.googleAds.campaigns.firstCampaign}</h3>
          <p className="text-muted-foreground mb-4">
            {t.googleAds.campaigns.firstCampaignDesc}
          </p>
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            {t.googleAds.campaigns.createWithAI}
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <h3 className="font-semibold mb-3">{t.googleAds.campaigns.upcomingFeatures.title}</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.campaigns.upcomingFeatures.feature1}
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.campaigns.upcomingFeatures.feature2}
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.campaigns.upcomingFeatures.feature3}
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.campaigns.upcomingFeatures.feature4}
          </li>
        </ul>
      </Card>
    </div>
  );
}
