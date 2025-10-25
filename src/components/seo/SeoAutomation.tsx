import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Settings,
  Sparkles,
  Tag,
  Image as ImageIcon,
  Clock,
  Zap,
  Save,
  CheckCircle,
  AlertCircle,
  Calendar,
  TrendingUp,
  Target
} from 'lucide-react';
import { toast } from 'sonner';

interface AutomationSettings {
  seo_auto_enabled: boolean;
  seo_auto_frequency: 'hourly' | 'daily' | 'weekly';
  seo_auto_schedule_hour: number;
  tag_auto_enabled: boolean;
  tag_auto_frequency: 'hourly' | 'daily' | 'weekly';
  tag_auto_schedule_hour: number;
  alt_auto_enabled: boolean;
  alt_auto_frequency: 'hourly' | 'daily' | 'weekly';
  alt_auto_schedule_hour: number;
  sync_auto_enabled: boolean;
  sync_after_optimization: boolean;
}

export function SeoAutomation() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AutomationSettings>({
    seo_auto_enabled: false,
    seo_auto_frequency: 'daily',
    seo_auto_schedule_hour: 9,
    tag_auto_enabled: false,
    tag_auto_frequency: 'daily',
    tag_auto_schedule_hour: 9,
    alt_auto_enabled: false,
    alt_auto_frequency: 'daily',
    alt_auto_schedule_hour: 9,
    sync_auto_enabled: false,
    sync_after_optimization: true,
  });

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        // Extract and validate only the settings properties we need
        const validatedSettings: AutomationSettings = {
          seo_auto_enabled: data.seo_auto_enabled || false,
          seo_auto_frequency: (data.seo_auto_frequency as 'hourly' | 'daily' | 'weekly') || 'daily',
          seo_auto_schedule_hour: data.seo_auto_schedule_hour || 9,
          tag_auto_enabled: data.tag_auto_enabled || false,
          tag_auto_frequency: (data.tag_auto_frequency as 'hourly' | 'daily' | 'weekly') || 'daily',
          tag_auto_schedule_hour: data.tag_auto_schedule_hour || 9,
          alt_auto_enabled: data.alt_auto_enabled || false,
          alt_auto_frequency: (data.alt_auto_frequency as 'hourly' | 'daily' | 'weekly') || 'daily',
          alt_auto_schedule_hour: data.alt_auto_schedule_hour || 9,
          sync_auto_enabled: data.sync_auto_enabled || false,
          sync_after_optimization: data.sync_after_optimization !== false,
        };
        setSettings(validatedSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('automation_settings')
        .upsert({
          ...settings,
          user_id: user?.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success('Paramètres sauvegardés avec succès');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <Card className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950 dark:via-blue-950 dark:to-indigo-950 border-2 border-purple-200 p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="w-6 h-6 text-purple-600" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Automatisation SEO
              </h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Configurez l'optimisation et la synchronisation automatique de vos produits
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-yellow-600" />
                <span className="font-medium">Optimisation automatique</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Planification flexible</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-medium">Gain de temps</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 items-center">
            <Button
              size="lg"
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 gap-2 shadow-lg"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Sauvegarder
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SEO Title/Description Automation */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
              <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">SEO Title & Description</h3>
              <p className="text-sm text-muted-foreground">Optimisation automatique des métadonnées</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Activer l'optimisation auto</p>
                <p className="text-xs text-muted-foreground">Les produits seront optimisés automatiquement</p>
              </div>
              <Switch
                checked={settings.seo_auto_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, seo_auto_enabled: checked })
                }
              />
            </div>

            {settings.seo_auto_enabled && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Fréquence</label>
                  <select
                    value={settings.seo_auto_frequency}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        seo_auto_frequency: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="hourly">Toutes les heures</option>
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Heure d'exécution</label>
                  <select
                    value={settings.seo_auto_schedule_hour}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        seo_auto_schedule_hour: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Tag Optimization Automation */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-xl">
              <Tag className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Optimisation des Tags</h3>
              <p className="text-sm text-muted-foreground">Ajout automatique de tags pertinents</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Activer l'optimisation auto</p>
                <p className="text-xs text-muted-foreground">Tags générés automatiquement par IA</p>
              </div>
              <Switch
                checked={settings.tag_auto_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, tag_auto_enabled: checked })
                }
              />
            </div>

            {settings.tag_auto_enabled && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Fréquence</label>
                  <select
                    value={settings.tag_auto_frequency}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        tag_auto_frequency: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="hourly">Toutes les heures</option>
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Heure d'exécution</label>
                  <select
                    value={settings.tag_auto_schedule_hour}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        tag_auto_schedule_hour: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* ALT Image Automation */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
              <ImageIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">ALT Image</h3>
              <p className="text-sm text-muted-foreground">Génération automatique des textes ALT</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Activer l'optimisation auto</p>
                <p className="text-xs text-muted-foreground">Textes ALT générés par IA</p>
              </div>
              <Switch
                checked={settings.alt_auto_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, alt_auto_enabled: checked })
                }
              />
            </div>

            {settings.alt_auto_enabled && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Fréquence</label>
                  <select
                    value={settings.alt_auto_frequency}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        alt_auto_frequency: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="hourly">Toutes les heures</option>
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Heure d'exécution</label>
                  <select
                    value={settings.alt_auto_schedule_hour}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        alt_auto_schedule_hour: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Sync Automation */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
              <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Synchronisation Shopify</h3>
              <p className="text-sm text-muted-foreground">Mise à jour automatique vers Shopify</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Activer la synchro auto</p>
                <p className="text-xs text-muted-foreground">Synchroniser automatiquement vers Shopify</p>
              </div>
              <Switch
                checked={settings.sync_auto_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, sync_auto_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Synchro après optimisation</p>
                <p className="text-xs text-muted-foreground">Synchroniser automatiquement après chaque optimisation</p>
              </div>
              <Switch
                checked={settings.sync_after_optimization}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, sync_after_optimization: checked })
                }
              />
            </div>

            {(settings.seo_auto_enabled || settings.tag_auto_enabled || settings.alt_auto_enabled) && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Automatisation activée</p>
                    <p className="text-blue-700 mt-1">
                      Les optimisations seront effectuées selon votre planning et synchronisées automatiquement
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Status Summary */}
      <Card className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-lg">Résumé de l'automatisation</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-muted-foreground">SEO Title/Description</p>
            <p className="font-bold text-lg mt-1">
              {settings.seo_auto_enabled ? (
                <span className="text-green-600">Actif</span>
              ) : (
                <span className="text-gray-500">Inactif</span>
              )}
            </p>
            {settings.seo_auto_enabled && (
              <p className="text-xs text-muted-foreground mt-1">
                {settings.seo_auto_frequency === 'hourly' && 'Toutes les heures'}
                {settings.seo_auto_frequency === 'daily' && `Quotidien à ${settings.seo_auto_schedule_hour}h`}
                {settings.seo_auto_frequency === 'weekly' && `Hebdomadaire à ${settings.seo_auto_schedule_hour}h`}
              </p>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-muted-foreground">Optimisation Tags</p>
            <p className="font-bold text-lg mt-1">
              {settings.tag_auto_enabled ? (
                <span className="text-green-600">Actif</span>
              ) : (
                <span className="text-gray-500">Inactif</span>
              )}
            </p>
            {settings.tag_auto_enabled && (
              <p className="text-xs text-muted-foreground mt-1">
                {settings.tag_auto_frequency === 'hourly' && 'Toutes les heures'}
                {settings.tag_auto_frequency === 'daily' && `Quotidien à ${settings.tag_auto_schedule_hour}h`}
                {settings.tag_auto_frequency === 'weekly' && `Hebdomadaire à ${settings.tag_auto_schedule_hour}h`}
              </p>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-muted-foreground">ALT Image</p>
            <p className="font-bold text-lg mt-1">
              {settings.alt_auto_enabled ? (
                <span className="text-green-600">Actif</span>
              ) : (
                <span className="text-gray-500">Inactif</span>
              )}
            </p>
            {settings.alt_auto_enabled && (
              <p className="text-xs text-muted-foreground mt-1">
                {settings.alt_auto_frequency === 'hourly' && 'Toutes les heures'}
                {settings.alt_auto_frequency === 'daily' && `Quotidien à ${settings.alt_auto_schedule_hour}h`}
                {settings.alt_auto_frequency === 'weekly' && `Hebdomadaire à ${settings.alt_auto_schedule_hour}h`}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}