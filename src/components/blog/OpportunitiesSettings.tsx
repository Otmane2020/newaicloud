import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings, Save } from 'lucide-react';
import { useTranslation } from '@/lib/language';

export function OpportunitiesSettings() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t.navigation.settings}
          </CardTitle>
          <CardDescription>{t.blog.submenu.settingsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-generate">{t.common.settings}</Label>
              <p className="text-sm text-muted-foreground">{t.blog.submenu.settingsDesc}</p>
            </div>
            <Switch id="auto-generate" />
          </div>

          <div>
            <Label htmlFor="frequency">{t.common.settings}</Label>
            <Select defaultValue="daily">
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t.integration.daily}</SelectItem>
                <SelectItem value="weekly">{t.integration.weekly}</SelectItem>
                <SelectItem value="monthly">{t.onboarding.monthly}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {t.common.save}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}