import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings, Save } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export function OpportunitiesSettings() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t('blog.opportunities_settings_title')}
          </CardTitle>
          <CardDescription>Configurez la génération automatique d'opportunités de contenu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-generate">Génération automatique</Label>
              <p className="text-sm text-muted-foreground">Générer automatiquement des opportunités chaque jour</p>
            </div>
            <Switch id="auto-generate" />
          </div>

          <div>
            <Label htmlFor="frequency">Fréquence de génération</Label>
            <Select defaultValue="daily">
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Quotidienne</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuelle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="max-opportunities">Nombre maximum d'opportunités</Label>
            <Select defaultValue="10">
              <SelectTrigger id="max-opportunities">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 opportunités</SelectItem>
                <SelectItem value="10">10 opportunités</SelectItem>
                <SelectItem value="20">20 opportunités</SelectItem>
                <SelectItem value="50">50 opportunités</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="seo-score">Filtrer par score SEO minimum</Label>
              <p className="text-sm text-muted-foreground">Ne conserver que les opportunités avec un score supérieur à 70</p>
            </div>
            <Switch id="seo-score" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="netlinking">{t('blog.netlinking_include')}</Label>
              <p className="text-sm text-muted-foreground">Proposer des opportunités de liens internes</p>
            </div>
            <Switch id="netlinking" defaultChecked />
          </div>

          <div className="pt-4">
            <Button className="w-full" size="lg">
              <Save className="w-5 h-5 mr-2" />
              {t('blog.save_settings')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
