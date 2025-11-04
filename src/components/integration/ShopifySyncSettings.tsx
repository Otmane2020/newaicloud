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
import { RefreshCw, Clock, Calendar, Download, Upload, CheckCircle2, XCircle, Loader2, Shield, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SimpleSyncProgress } from './SyncProgressDialog';
import { SyncResultDialog } from './SyncResultDialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Timezone {
  value: string;
  label: string;
  utc: string[];
}

const TIMEZONES: Timezone[] = [
  {
    value: "America/Los_Angeles",
    label: "Los Angeles",
    utc: ["UTC-8"]
  },
  {
    value: "America/New_York",
    label: "New York",
    utc: ["UTC-5"]
  },
  {
    value: "Europe/London",
    label: "London",
    utc: ["UTC+0"]
  },
  {
    value: "Europe/Paris",
    label: "Paris",
    utc: ["UTC+1"]
  },
  {
    value: "Asia/Tokyo",
    label: "Tokyo",
    utc: ["UTC+9"]
  },
  {
    value: "Australia/Sydney",
    label: "Sydney",
    utc: ["UTC+10"]
  }
];

const SCHEDULE_HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00`,
}));

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
  store_id?: string;
  timezone?: string;
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

interface SyncStats {
  products: { before: number; after: number; imported: number; error?: string };
  collections: { before: number; after: number; imported: number; error?: string };
  pages: { before: number; after: number; imported: number; error?: string };
  articles: { before: number; after: number; imported: number; error?: string };
  images: { before: number; after: number; imported: number; error?: string };
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMode, setSyncMode] = useState<'full' | 'smart'>('smart');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['products', 'collections', 'pages', 'articles', 'images']);
  
  // Progress dialog state
  const [showProgress, setShowProgress] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [currentType, setCurrentType] = useState('');
  const [syncResults, setSyncResults] = useState<SyncStats>({
    products: { before: 0, after: 0, imported: 0 },
    collections: { before: 0, after: 0, imported: 0 },
    pages: { before: 0, after: 0, imported: 0 },
    articles: { before: 0, after: 0, imported: 0 },
    images: { before: 0, after: 0, imported: 0 },
  });
  const [totalImported, setTotalImported] = useState(0);

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
        if (data.import_types) {
          setSelectedTypes(data.import_types);
        }
      } else {
        // Create default settings
        const defaultSettings: Partial<SyncSettings> = {
          import_frequency: 'manual',
          import_schedule_hour: 9,
          import_schedule_day: 1,
          import_types: ['products', 'collections', 'pages', 'articles', 'images'],
          export_auto_enabled: false,
          export_after_optimization: true,
        };

        const { data: newSettings } = await supabase
          .from('shopify_sync_settings')
          .insert({ ...defaultSettings, user_id: user.id })
          .select()
          .single();

        if (newSettings) {
          setSettings(newSettings as SyncSettings);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Clean up stuck syncs
      await supabase
        .from('sync_history')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: 'Sync stuck in running state'
        })
        .eq('user_id', user.id)
        .eq('status', 'running')
        .lt('started_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

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
        .update({ ...settings, import_types: selectedTypes })
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
    if (!settings) {
      toast.error('Veuillez configurer vos paramètres de synchronisation');
      return;
    }

    let historyEntry: any = null;

    try {
      setIsSyncing(true);
      setShowProgress(true);
      
      console.log('🔄 Starting sync process...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch store connection details
      console.log('🔍 Fetching store connection...');
      const { data: connection, error: connectionError } = await supabase
        .from('shopify_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (connectionError || !connection) {
        throw new Error('Aucune connexion Shopify active trouvée');
      }

      console.log('✅ Store connection found:', connection.store_name);

      // Count before sync
      const countsBefore: Record<string, number> = {};
      for (const type of selectedTypes) {
        const table = type === 'products' ? 'shopify_products' 
                    : type === 'collections' ? 'shopify_collections'
                    : type === 'pages' ? 'shopify_pages'
                    : type === 'articles' ? 'blog_articles'
                    : type === 'images' ? 'content_images'
                    : null;
        
        if (table) {
          const { count } = await supabase
            .from(table as any)
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          countsBefore[type] = count || 0;
          console.log(`📊 ${type} before: ${count}`);
        }
      }

      // Create sync history entry
      console.log('📝 Creating sync history entry...');
      const { data: historyData, error: historyError } = await supabase
        .from('sync_history')
        .insert({
          user_id: user.id,
          store_id: settings.store_id,
          sync_type: 'import',
          content_types: selectedTypes,
          status: 'running',
          details: { sync_mode: syncMode }
        })
        .select()
        .single();

      if (historyError) {
        console.error('❌ Error creating sync history:', historyError);
        throw historyError;
      }

      historyEntry = historyData;
      console.log('✅ Sync history created:', historyEntry.id);

      const results: Record<string, any> = {};

      // Import products
      if (selectedTypes.includes('products')) {
        setCurrentType('products');
        console.log('📦 Importing products...');
        
        // Extract shop name from store_url (remove .myshopify.com)
        const shopName = connection.store_url.replace('.myshopify.com', '');
        
        const { data: productsResult, error: productsError } = await supabase.functions.invoke('import-products', {
          body: { 
            shopName: shopName,
            apiKey: connection.api_key || undefined,
            apiSecret: connection.access_token,
            storeId: connection.id,
            maxProducts: 250,
            syncMode: syncMode
          }
        });

        if (productsError) {
          console.error('❌ Products import error:', productsError);
          throw productsError;
        }
        
        results.products = productsResult;
        console.log('✅ Products imported:', productsResult);

        // Update sync history with product details
        if (historyEntry) {
          await supabase
            .from('sync_history')
            .update({
              items_synced: productsResult.count || 0,
              details: {
                sync_mode: syncMode,
                products: productsResult.stats || { 
                  total: productsResult.count || 0,
                  new: 0,
                  updated: productsResult.count || 0,
                  protected: 0
                }
              }
            })
            .eq('id', historyEntry.id);
          console.log('✅ Sync history updated for products');
        }
      }

      // Import collections
      if (selectedTypes.includes('collections')) {
        setCurrentType('collections');
        console.log('📂 Importing collections...');
        const { data: collectionsResult, error: collectionsError } = await supabase.functions.invoke('import-shopify-collections', {
          body: {
            shopName: connection.store_url.replace('.myshopify.com', ''),
            authToken: connection.access_token,
            storeId: connection.id
          }
        });

        if (collectionsError) {
          console.error('❌ Collections import error:', collectionsError);
          throw collectionsError;
        }
        
        results.collections = collectionsResult;
        console.log('✅ Collections imported:', collectionsResult);

        // Update sync history
        if (historyEntry) {
          const { data: currentData } = await supabase.from('sync_history').select('details').eq('id', historyEntry.id).single();
          const currentDetails = currentData?.details as any || {};
          await supabase
            .from('sync_history')
            .update({
              items_synced: (historyEntry.items_synced || 0) + (collectionsResult.count || 0),
              details: {
                ...currentDetails,
                collections: {
                  total: collectionsResult.count || 0,
                  new: collectionsResult.newCount || 0,
                  updated: (collectionsResult.count || 0) - (collectionsResult.newCount || 0)
                }
              }
            })
            .eq('id', historyEntry.id);
          console.log('✅ Sync history updated for collections');
        }
      }

      // Import pages
      if (selectedTypes.includes('pages')) {
        setCurrentType('pages');
        console.log('📄 Importing pages...');
        const { data: pagesResult, error: pagesError } = await supabase.functions.invoke('import-shopify-pages', {
          body: {
            shopName: connection.store_url.replace('.myshopify.com', ''),
            authToken: connection.access_token,
            storeId: connection.id
          }
        });

        if (pagesError) {
          console.error('❌ Pages import error:', pagesError);
          throw pagesError;
        }
        
        results.pages = pagesResult;
        console.log('✅ Pages imported:', pagesResult);

        // Update sync history
        if (historyEntry) {
          const { data: currentData } = await supabase.from('sync_history').select('details').eq('id', historyEntry.id).single();
          const currentDetails = currentData?.details as any || {};
          await supabase
            .from('sync_history')
            .update({
              items_synced: (historyEntry.items_synced || 0) + (pagesResult.count || 0),
              details: {
                ...currentDetails,
                pages: {
                  total: pagesResult.count || 0,
                  new: pagesResult.newCount || 0,
                  updated: (pagesResult.count || 0) - (pagesResult.newCount || 0)
                }
              }
            })
            .eq('id', historyEntry.id);
          console.log('✅ Sync history updated for pages');
        }
      }

      // Import articles
      if (selectedTypes.includes('articles')) {
        setCurrentType('articles');
        console.log('📰 Importing articles...');
        const { data: articlesResult, error: articlesError } = await supabase.functions.invoke('import-shopify-articles', {
          body: {
            shopName: connection.store_url.replace('.myshopify.com', ''),
            authToken: connection.access_token,
            storeId: connection.id
          }
        });

        if (articlesError) {
          console.error('❌ Articles import error:', articlesError);
          throw articlesError;
        }
        
        results.articles = articlesResult;
        console.log('✅ Articles imported:', articlesResult);

        // Update sync history
        if (historyEntry) {
          const { data: currentData } = await supabase.from('sync_history').select('details').eq('id', historyEntry.id).single();
          const currentDetails = currentData?.details as any || {};
          await supabase
            .from('sync_history')
            .update({
              items_synced: (historyEntry.items_synced || 0) + (articlesResult.count || 0),
              details: {
                ...currentDetails,
                articles: {
                  total: articlesResult.count || 0,
                  new: articlesResult.newCount || 0,
                  updated: (articlesResult.count || 0) - (articlesResult.newCount || 0)
                }
              }
            })
            .eq('id', historyEntry.id);
          console.log('✅ Sync history updated for articles');
        }
      }

      // Import images
      if (selectedTypes.includes('images')) {
        setCurrentType('images');
        console.log('🖼️ Importing images...');
        const { data: imagesResult, error: imagesError } = await supabase.functions.invoke('import-content-images', {
          body: { storeId: settings.store_id }
        });

        if (imagesError) {
          console.error('❌ Images import error:', imagesError);
          throw imagesError;
        }
        
        results.images = imagesResult;
        console.log('✅ Images imported:', imagesResult);

        // Update sync history
        if (historyEntry) {
          const { data: currentData } = await supabase.from('sync_history').select('details').eq('id', historyEntry.id).single();
          const currentDetails = currentData?.details as any || {};
          await supabase
            .from('sync_history')
            .update({
              items_synced: (historyEntry.items_synced || 0) + (imagesResult.count || 0),
              details: {
                ...currentDetails,
                images: {
                  total: imagesResult.count || 0,
                  new: imagesResult.newCount || 0,
                  updated: (imagesResult.count || 0) - (imagesResult.newCount || 0)
                }
              }
            })
            .eq('id', historyEntry.id);
          console.log('✅ Sync history updated for images');
        }
      }

      // Count after sync
      console.log('📊 Counting after sync...');
      const countsAfter: Record<string, number> = {};
      for (const type of selectedTypes) {
        const table = type === 'products' ? 'shopify_products' 
                    : type === 'collections' ? 'shopify_collections'
                    : type === 'pages' ? 'shopify_pages'
                    : type === 'articles' ? 'blog_articles'
                    : type === 'images' ? 'content_images'
                    : null;
        
        if (table) {
          const { count } = await supabase
            .from(table as any)
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          countsAfter[type] = count || 0;
          console.log(`📊 ${type} after: ${count}`);
        }
      }

      // Calculate stats
      const stats: SyncStats = {
        products: {
          before: countsBefore.products || 0,
          after: countsAfter.products || 0,
          imported: (countsAfter.products || 0) - (countsBefore.products || 0)
        },
        collections: {
          before: countsBefore.collections || 0,
          after: countsAfter.collections || 0,
          imported: (countsAfter.collections || 0) - (countsBefore.collections || 0)
        },
        pages: {
          before: countsBefore.pages || 0,
          after: countsAfter.pages || 0,
          imported: (countsAfter.pages || 0) - (countsBefore.pages || 0)
        },
        articles: {
          before: countsBefore.articles || 0,
          after: countsAfter.articles || 0,
          imported: (countsAfter.articles || 0) - (countsBefore.articles || 0)
        },
        images: {
          before: countsBefore.images || 0,
          after: countsAfter.images || 0,
          imported: (countsAfter.images || 0) - (countsBefore.images || 0)
        }
      };

      const totalImported = Object.values(stats).reduce((sum, stat) => sum + stat.imported, 0);

      console.log('📊 Final stats:', stats);
      console.log('📊 Total imported:', totalImported);

      // Update sync history to success
      if (historyEntry) {
        console.log('✅ Marking sync as success in history...');
        await supabase
          .from('sync_history')
          .update({
            status: 'success',
            completed_at: new Date().toISOString(),
            items_synced: totalImported
          })
          .eq('id', historyEntry.id);
        console.log('✅ Sync history marked as success');
      }

      // Update last_import_at
      await supabase
        .from('shopify_sync_settings')
        .update({ last_import_at: new Date().toISOString() })
        .eq('user_id', user.id);

      setShowProgress(false);
      setSyncResults(stats);
      setTotalImported(totalImported);
      setShowResultDialog(true);
      
      toast.success('Synchronisation terminée !');
      await loadHistory();
    } catch (error) {
      console.error('❌ Error during sync:', error);
      
      // Mark sync as failed in history
      if (historyEntry) {
        console.log('❌ Marking sync as failed in history...');
        await supabase
          .from('sync_history')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', historyEntry.id);
      }
      
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setIsSyncing(false);
      setCurrentType('');
      setShowProgress(false);
      console.log('🏁 Sync process completed');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Sync Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Mode de synchronisation</CardTitle>
          <CardDescription>Choisissez comment gérer le contenu optimisé par l'IA</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={syncMode} onValueChange={(v) => setSyncMode(v as 'full' | 'smart')}>
            <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="smart" id="smart" />
              <Label htmlFor="smart" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="font-semibold">Smart (Recommandé)</span>
                  <Badge variant="secondary" className="ml-auto">Par défaut</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Protège le contenu optimisé par l'IA (titres, descriptions SEO). Seuls les prix, stocks et nouveaux produits sont synchronisés.
                </p>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="full" id="full" />
              <Label htmlFor="full" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold">Full</span>
                  <Badge variant="outline" className="ml-auto">Avancé</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Écrase TOUT le contenu avec les données Shopify, y compris le contenu optimisé par l'IA. À utiliser avec précaution.
                </p>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Import Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Paramètres d'importation
          </CardTitle>
          <CardDescription>Configurez comment importer vos données depuis Shopify</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Content Type Selection */}
          <div>
            <Label className="mb-3 block">Types de contenu à synchroniser</Label>
            <div className="space-y-2">
              {IMPORT_TYPES.map(type => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={type.id}
                    checked={selectedTypes.includes(type.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTypes([...selectedTypes, type.id]);
                      } else {
                        setSelectedTypes(selectedTypes.filter(t => t !== type.id));
                      }
                    }}
                  />
                  <Label htmlFor={type.id} className="cursor-pointer">{type.label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Import Frequency */}
          <div className="space-y-3 pt-6 border-t">
            <Label htmlFor="import_frequency">Fréquence d'importation</Label>
            <Select
              value={settings?.import_frequency || 'manual'}
              onValueChange={(value) => setSettings(prev => prev ? {...prev, import_frequency: value as any} : null)}
            >
              <SelectTrigger id="import_frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manuel</SelectItem>
                <SelectItem value="hourly">Toutes les heures</SelectItem>
                <SelectItem value="daily">Quotidien</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schedule Settings (only if not manual) */}
          {settings?.import_frequency && settings.import_frequency !== 'manual' && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <Label className="text-sm font-semibold">Horaire de synchronisation</Label>
              
              {/* Hour Selection */}
              {['daily', 'weekly', 'monthly'].includes(settings.import_frequency) && (
                <div className="space-y-2">
                  <Label htmlFor="schedule_hour" className="text-sm">Heure de synchronisation</Label>
                  <Select
                    value={settings.import_schedule_hour?.toString() || '2'}
                    onValueChange={(value) => setSettings(prev => prev ? {...prev, import_schedule_hour: parseInt(value)} : null)}
                  >
                    <SelectTrigger id="schedule_hour">
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

              {/* Day of Week Selection (weekly) */}
              {settings.import_frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label htmlFor="schedule_day" className="text-sm">Jour de la semaine</Label>
                  <Select
                    value={settings.import_schedule_day?.toString() || '1'}
                    onValueChange={(value) => setSettings(prev => prev ? {...prev, import_schedule_day: parseInt(value)} : null)}
                  >
                    <SelectTrigger id="schedule_day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Lundi</SelectItem>
                      <SelectItem value="2">Mardi</SelectItem>
                      <SelectItem value="3">Mercredi</SelectItem>
                      <SelectItem value="4">Jeudi</SelectItem>
                      <SelectItem value="5">Vendredi</SelectItem>
                      <SelectItem value="6">Samedi</SelectItem>
                      <SelectItem value="0">Dimanche</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Day of Month Selection (monthly) */}
              {settings.import_frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label htmlFor="schedule_day" className="text-sm">Jour du mois</Label>
                  <Select
                    value={settings.import_schedule_day?.toString() || '1'}
                    onValueChange={(value) => setSettings(prev => prev ? {...prev, import_schedule_day: parseInt(value)} : null)}
                  >
                    <SelectTrigger id="schedule_day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-sm">Fuseau horaire</Label>
                <Select
                  value={settings.timezone || 'Europe/Paris'}
                  onValueChange={(value) => setSettings(prev => prev ? {...prev, timezone: value} : null)}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                    <SelectItem value="Australia/Sydney">Australia/Sydney (AEST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Next Sync Display */}
          {settings?.next_import_at && settings.import_frequency !== 'manual' && (
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Prochaine synchronisation</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(settings.next_import_at), 'PPp', { locale: fr })}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                Planifiée
              </Badge>
            </div>
          )}

          {/* Auto Export Settings */}
          <div className="space-y-4 pt-6 border-t">
            <Label className="text-base font-semibold">Export automatique</Label>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="export_auto" className="cursor-pointer font-medium">
                  Activer l'export automatique
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Exporter automatiquement les données après chaque synchronisation
                </p>
              </div>
              <Switch
                id="export_auto"
                checked={settings?.export_auto_enabled || false}
                onCheckedChange={(checked) => setSettings(prev => prev ? {...prev, export_auto_enabled: checked} : null)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="export_after_opt" className="cursor-pointer font-medium">
                  Exporter après optimisation
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Exporter automatiquement vers Shopify après optimisation IA
                </p>
              </div>
              <Switch
                id="export_after_opt"
                checked={settings?.export_after_optimization || false}
                onCheckedChange={(checked) => setSettings(prev => prev ? {...prev, export_after_optimization: checked} : null)}
              />
            </div>
          </div>

          {/* Sync Now Button */}
          <Button
            onClick={handleSyncNow}
            disabled={isSyncing || selectedTypes.length === 0}
            className="w-full"
            size="lg"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Synchronisation en cours...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Synchroniser maintenant
              </>
            )}
          </Button>

          {/* Save Settings Button */}
          <Button
            onClick={saveSettings}
            disabled={saving}
            variant="outline"
            className="w-full"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </Button>
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Historique de synchronisation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Aucune synchronisation récente</p>
          ) : (
            <div className="space-y-2">
              {history.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {entry.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {entry.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                    {entry.status === 'running' && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
                    <div>
                      <p className="font-medium capitalize">{entry.sync_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.items_synced} éléments • {format(new Date(entry.started_at), 'Pp', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={entry.status === 'success' ? 'default' : entry.status === 'failed' ? 'destructive' : 'secondary'}>
                    {entry.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Dialog */}
      <SimpleSyncProgress open={showProgress} currentType={currentType} />

      {/* Result Dialog */}
      <SyncResultDialog
        open={showResultDialog}
        onOpenChange={setShowResultDialog}
        stats={syncResults}
        totalImported={totalImported}
      />
    </div>
  );
}
