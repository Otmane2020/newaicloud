import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Clock, Calendar, Download, Upload, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SyncSettings {
  import_frequency: 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  import_schedule_hour: number;
  import_schedule_day: number;
  import_types: string[];
  export_auto_enabled: boolean;
  export_after_optimization: boolean;
  last_import_at: string | null;
  last_export_at: string | null;
  next_import_at: string | null;
}

interface SyncHistory {
  id: string;
  sync_type: 'import' | 'export';
  content_types: string[];
  status: 'running' | 'success' | 'failed';
  items_synced: number;
  duration_ms: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

const IMPORT_TYPES = [
  { id: 'products', label: 'Produits' },
  { id: 'collections', label: 'Collections' },
  { id: 'pages', label: 'Pages' },
  { id: 'articles', label: 'Articles' },
  { id: 'images', label: 'Images' },
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

export function ShopifySyncSettings() {
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [history, setHistory] = useState<SyncHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSettings();
    loadHistory();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('shopify_sync_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings(data as SyncSettings);
      } else {
        // Create default settings
        const defaultSettings = {
          user_id: user.id,
          import_frequency: 'manual' as const,
          import_schedule_hour: 9,
          import_schedule_day: 1,
          import_types: ['products', 'collections', 'pages', 'articles', 'images'],
          export_auto_enabled: false,
          export_after_optimization: true,
        };

        const { data: newSettings, error: createError } = await supabase
          .from('shopify_sync_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings as SyncSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sync_history')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory((data || []) as SyncHistory[]);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('shopify_sync_settings')
        .update(settings)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Paramètres enregistrés');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    if (!settings) return;

    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get active Shopify connection
      const { data: connection, error: connectionError } = await supabase
        .from('shopify_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (connectionError || !connection) {
        toast.error('Aucune connexion Shopify active trouvée');
        return;
      }

      // Clean the shop name
      let cleanShopName = (connection.store_url || '')
        .replace(/^https?:\/\//, '')
        .replace(/\.myshopify\.com.*$/, '')
        .replace(/\/$/, '');

      // Create sync history entry
      const { data: historyEntry, error: historyError } = await supabase
        .from('sync_history')
        .insert({
          user_id: user.id,
          sync_type: 'import',
          content_types: settings.import_types,
          status: 'running',
        })
        .select()
        .single();

      if (historyError) throw historyError;

      const startTime = Date.now();
      let totalImported = 0;

      // Import based on selected types
      for (const type of settings.import_types) {
        try {
          let result;
          switch (type) {
            case 'products':
              result = await supabase.functions.invoke('import-products', {
                body: {
                  storeId: connection.id,
                  shopName: cleanShopName,
                  apiSecret: connection.access_token,
                }
              });
              break;
            case 'collections':
              result = await supabase.functions.invoke('import-shopify-collections');
              break;
            case 'pages':
              result = await supabase.functions.invoke('import-shopify-pages');
              break;
            case 'articles':
              result = await supabase.functions.invoke('import-shopify-articles', {
                body: {
                  storeId: connection.id,
                  shopName: cleanShopName,
                  authToken: connection.access_token,
                }
              });
              break;
            case 'images':
              result = await supabase.functions.invoke('import-content-images', {
                body: {
                  storeId: connection.id,
                  types: ['collections', 'pages', 'articles', 'homepage']
                }
              });
              break;
          }

          if (result?.data?.totalImported) {
            totalImported += result.data.totalImported;
          } else if (result?.data?.imported) {
            totalImported += result.data.imported;
          } else if (result?.data?.count) {
            totalImported += result.data.count;
          }
        } catch (error) {
          console.error(`Error importing ${type}:`, error);
        }
      }

      const duration = Date.now() - startTime;

      // Update history
      await supabase
        .from('sync_history')
        .update({
          status: 'success',
          items_synced: totalImported,
          duration_ms: duration,
          completed_at: new Date().toISOString(),
        })
        .eq('id', historyEntry.id);

      // Update last import timestamp
      await supabase
        .from('shopify_sync_settings')
        .update({ last_import_at: new Date().toISOString() })
        .eq('user_id', user.id);

      toast.success(`Synchronisation terminée : ${totalImported} éléments importés`);
      loadSettings();
      loadHistory();
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Import Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Import depuis Shopify
              </CardTitle>
              <CardDescription>
                Configuration de l'import automatique des données Shopify
              </CardDescription>
            </div>
            <Button onClick={handleSyncNow} disabled={syncing}>
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Synchroniser maintenant
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Frequency */}
          <div className="space-y-2">
            <Label>Fréquence de synchronisation</Label>
            <Select
              value={settings.import_frequency}
              onValueChange={(value: any) =>
                setSettings({ ...settings, import_frequency: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manuel uniquement</SelectItem>
                <SelectItem value="hourly">Toutes les heures</SelectItem>
                <SelectItem value="daily">Quotidien</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schedule */}
          {settings.import_frequency !== 'manual' && settings.import_frequency !== 'hourly' && (
            <div className="grid gap-4 sm:grid-cols-2">
              {(settings.import_frequency === 'daily' || settings.import_frequency === 'weekly' || settings.import_frequency === 'monthly') && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Heure de synchronisation
                  </Label>
                  <Select
                    value={settings.import_schedule_hour.toString()}
                    onValueChange={(value) =>
                      setSettings({ ...settings, import_schedule_hour: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {settings.import_frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Jour de la semaine
                  </Label>
                  <Select
                    value={settings.import_schedule_day.toString()}
                    onValueChange={(value) =>
                      setSettings({ ...settings, import_schedule_day: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Import Types */}
          <div className="space-y-3">
            <Label>Types de contenu à importer</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {IMPORT_TYPES.map((type) => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={type.id}
                    checked={settings.import_types.includes(type.id)}
                    onCheckedChange={(checked) => {
                      const newTypes = checked
                        ? [...settings.import_types, type.id]
                        : settings.import_types.filter((t) => t !== type.id);
                      setSettings({ ...settings, import_types: newTypes });
                    }}
                  />
                  <label
                    htmlFor={type.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {type.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Last Sync */}
          {settings.last_import_at && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                Dernière synchronisation :{' '}
                <span className="font-medium text-foreground">
                  {format(new Date(settings.last_import_at), "d MMMM yyyy 'à' HH:mm", {
                    locale: fr,
                  })}
                </span>
              </p>
            </div>
          )}

          <Button onClick={saveSettings} disabled={saving} className="w-full">
            {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </Button>
        </CardContent>
      </Card>

      {/* Export Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Export vers Shopify
          </CardTitle>
          <CardDescription>
            Configuration de l'export automatique des optimisations SEO
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Synchronisation automatique</Label>
              <p className="text-sm text-muted-foreground">
                Synchroniser automatiquement après chaque optimisation
              </p>
            </div>
            <Switch
              checked={settings.export_after_optimization}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, export_after_optimization: checked })
              }
            />
          </div>

          {settings.last_export_at && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                Dernier export :{' '}
                <span className="font-medium text-foreground">
                  {format(new Date(settings.last_export_at), "d MMMM yyyy 'à' HH:mm", {
                    locale: fr,
                  })}
                </span>
              </p>
            </div>
          )}

          <Button onClick={saveSettings} disabled={saving} className="w-full">
            {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </Button>
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des synchronisations</CardTitle>
          <CardDescription>Les 10 dernières synchronisations</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune synchronisation enregistrée
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    {entry.status === 'success' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {entry.status === 'failed' && (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    {entry.status === 'running' && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {entry.sync_type === 'import' ? 'Import' : 'Export'} -{' '}
                        {entry.content_types.join(', ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.started_at), "d MMM yyyy 'à' HH:mm", {
                          locale: fr,
                        })}
                        {entry.duration_ms && ` · ${Math.round(entry.duration_ms / 1000)}s`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={entry.status === 'success' ? 'default' : 'destructive'}>
                      {entry.items_synced} éléments
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
