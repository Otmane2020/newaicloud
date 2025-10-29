import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShoppingBag, Link as LinkIcon, Download, Package, FileText, AlertCircle, Trash2 } from 'lucide-react';
import { shopifyConnectionSchema } from '@/lib/validationSchemas';
import { ImportProgressDialog } from './ImportProgressDialog';
import { useUsageLimits } from '@/hooks/useUsageLimits';

export function ShopifyConnection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [importPhase, setImportPhase] = useState<'products' | 'pages' | 'complete'>('products');
  const [productsImported, setProductsImported] = useState(0);
  const [pagesImported, setPagesImported] = useState(0);
  const [importedItems, setImportedItems] = useState<Array<{type: 'product' | 'page'; title: string; image?: string; handle?: string}>>([]);
  const [progress, setProgress] = useState({
    currentPage: 0,
    totalPages: 0,
    productsProcessed: 0,
    percentage: 0
  });
  const [limitReached, setLimitReached] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [shouldAutoImport, setShouldAutoImport] = useState(false);
  const { limits } = useUsageLimits();
  const [store, setStore] = useState<any>(null);
  const [storeName, setStoreName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadStore();
  }, [user]);

  // Poll import job progress
  useEffect(() => {
    if (!importJobId || !importing) return;

    const interval = setInterval(async () => {
      const { data: job } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', importJobId)
        .single();

      if (job) {
        const percentage = job.total_pages > 0 
          ? Math.round((job.current_page / job.total_pages) * 100)
          : 0;

        setProgress({
          currentPage: job.current_page,
          totalPages: job.total_pages,
          productsProcessed: job.products_processed,
          percentage
        });

        if (job.status === 'completed') {
          clearInterval(interval);
          setImporting(false);
          setImportDialogOpen(false);
          setProductsImported(job.products_processed);
          toast.success(`${job.products_processed} produits importés avec succès !`);
          setTimeout(() => {
            navigate('/products');
          }, 1500);
        }

        if (job.status === 'quota_reached') {
          clearInterval(interval);
          setImporting(false);
          setLimitReached(true);
          setProductsImported(job.products_processed);
          // Keep dialog open to show upgrade message
        }

        if (job.status === 'failed') {
          clearInterval(interval);
          setImporting(false);
          setImportDialogOpen(false);
          toast.error(job.error_message || 'Erreur lors de l\'import');
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [importJobId, importing, navigate]);

  const loadStore = async () => {
    try {
      const { data } = await supabase
        .from('shopify_connections')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (data) {
        console.log('📥 Store data loaded:', {
          storeId: data.id,
          hasApiKey: !!data.api_key,
          hasAccessToken: !!data.access_token,
          apiKeyPreview: data.api_key ? `${data.api_key.substring(0, 10)}...` : 'NULL',
          accessTokenPreview: data.access_token ? `${data.access_token.substring(0, 10)}...` : 'NULL'
        });
        
        setStore(data);
        const storeName = data.store_url?.replace('.myshopify.com', '') || '';
        setStoreName(storeName);
        
        // Auto-trigger import for newly connected stores
        const justConnected = localStorage.getItem('shopify_just_connected');
        if (justConnected === 'true' && data.connected_at) {
          const connectedTime = new Date(data.connected_at).getTime();
          const now = Date.now();
          // If connected less than 10 seconds ago, set flag for auto-import
          if (now - connectedTime < 10000) {
            console.log('🚀 Setting auto-import flag for newly connected store');
            localStorage.removeItem('shopify_just_connected');
            setShouldAutoImport(true);
          }
        }
        
        return data; // Return the loaded data
      }
      return null;
    } catch (error) {
      console.error('Error loading store:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Auto-trigger import when flag is set
  useEffect(() => {
    if (shouldAutoImport && store) {
      setShouldAutoImport(false);
      
      // ✅ Validation BEFORE auto-import
      const hasValidCredentials = store.access_token && 
        store.access_token.trim() !== '' && 
        (store.connection_type === 'oauth' || store.api_key);
      
      if (!hasValidCredentials) {
        console.error('❌ Cannot auto-import: Missing credentials', {
          hasAccessToken: !!store.access_token,
          hasApiKey: !!store.api_key,
          connectionType: store.connection_type
        });
        toast.error('Credentials manquants', {
          description: 'Votre connexion doit être recréée avec vos identifiants API. Utilisez le bouton "Supprimer" puis reconnectez votre boutique.'
        });
        return;
      }
      
      setTimeout(() => {
        handleImportProducts();
      }, 500);
    }
  }, [shouldAutoImport, store]);

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);

    try {
      // Simple validation
      if (!storeName || !apiKey || !apiSecret) {
        toast.error('Tous les champs sont requis');
        setSaving(false);
        return;
      }

      if (!apiSecret.startsWith('shpss_') && !apiSecret.startsWith('shpat_')) {
        toast.error('La clé secrète doit commencer par shpss_ ou shpat_');
        setSaving(false);
        return;
      }

      const storeUrl = `${storeName}.myshopify.com`;
      const now = new Date().toISOString();
      
      console.log('💾 Saving connection with credentials:', {
        apiKeyPreview: `${apiKey.substring(0, 10)}...`,
        apiSecretPreview: `${apiSecret.substring(0, 10)}...`
      });
      
      if (store) {
        const { error } = await supabase
          .from('shopify_connections')
          .update({
            store_url: storeUrl,
            api_key: apiKey,
            access_token: apiSecret,
            connection_type: 'manual',
            connected_at: now,
            updated_at: now
          })
          .eq('id', store.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('shopify_connections')
          .insert({
            store_url: storeUrl,
            api_key: apiKey,
            access_token: apiSecret,
            connection_type: 'manual',
            user_id: user?.id,
            is_active: true,
            connected_at: now
          })
          .select()
          .single();

        if (error) throw error;
        
        if (data) {
          setStore(data);
        }
      }

      console.log('✅ Connection saved, setting auto-import flag');
      localStorage.setItem('shopify_just_connected', 'true');
      
      toast.success('Connexion Shopify enregistrée avec succès');
      
      // Wait for DB sync then reload
      await new Promise(resolve => setTimeout(resolve, 500));
      const reloadedStore = await loadStore();
      
      console.log('🔄 Store reloaded after save:', {
        hasStore: !!reloadedStore,
        hasApiKey: !!reloadedStore?.api_key,
        hasAccessToken: !!reloadedStore?.access_token
      });
      
    } catch (error) {
      console.error('Error saving connection:', error);
      toast.error('Erreur lors de l\'enregistrement de la connexion');
    } finally {
      setSaving(false);
      setApiKey('');
      setApiSecret('');
    }
  };

  const handleDeleteConnection = async () => {
    if (!store) return;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette connexion ? Vous devrez la recréer pour importer des produits.')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('shopify_connections')
        .delete()
        .eq('id', store.id);

      if (error) throw error;

      toast.success('Connexion supprimée avec succès');
      setStore(null);
      setStoreName('');
      setApiKey('');
      setApiSecret('');
    } catch (error: any) {
      console.error('Error deleting connection:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleImportProducts = async () => {
    if (!store || !store.id) {
      toast.error('Veuillez d\'abord connecter votre boutique');
      return;
    }

    // ✅ Vérifier que les credentials existent
    console.log('🔍 Checking credentials:', {
      storeId: store.id,
      connectionType: store.connection_type,
      hasApiKey: !!store.api_key,
      hasAccessToken: !!store.access_token,
      apiKeyValue: store.api_key ? `${store.api_key.substring(0, 10)}...` : 'NULL',
      accessTokenValue: store.access_token ? `${store.access_token.substring(0, 10)}...` : 'NULL'
    });

    if (!store.access_token || store.access_token.trim() === '') {
      toast.error('Credentials manquants', {
        description: 'Votre connexion Shopify doit être mise à jour. Veuillez supprimer cette connexion et la recréer avec vos identifiants API.'
      });
      console.error('❌ Access token is missing. Store needs to be reconnected:', { 
        storeId: store?.id,
        connectionType: store?.connection_type,
        hasAccessToken: !!store?.access_token,
        hasApiKey: !!store?.api_key
      });
      return;
    }

    // Pour les connexions manuelles, vérifier que l'API Key existe aussi
    if (store.connection_type === 'manual' && (!store.api_key || store.api_key.trim() === '')) {
      toast.error('API Key manquante', {
        description: 'Votre connexion doit être mise à jour. Veuillez la recréer avec vos identifiants API complets.'
      });
      console.error('❌ API Key is missing for manual connection:', { 
        storeId: store?.id,
        hasApiKey: !!store?.api_key
      });
      return;
    }

    console.log('✅ Starting import with valid credentials:', {
      storeId: store.id,
      storeName: store.store_url,
      connectionType: store.connection_type,
      credentialsPresent: true
    });

    try {
      setImporting(true);
      setImportDialogOpen(true);
      setImportPhase('products');
      setLimitReached(false);
      setProgress({
        currentPage: 0,
        totalPages: 0,
        productsProcessed: 0,
        percentage: 0
      });
      setProductsImported(0);
      setPagesImported(0);
      setImportedItems([]);
      
      const shopName = store.store_url?.replace('.myshopify.com', '') || '';
      
      // Préparer le body selon le type de connexion
      const requestBody: any = {
        shopName: shopName,
        apiSecret: store.access_token, // Toujours requis (OAuth token ou API Secret)
        storeId: store.id
      };

      // Ajouter apiKey seulement si c'est une connexion manuelle
      if (store.connection_type === 'manual' && store.api_key) {
        requestBody.apiKey = store.api_key;
      }

      console.log('📤 Sending to Edge Function:', {
        shopName: requestBody.shopName,
        hasApiKey: !!requestBody.apiKey,
        hasApiSecret: !!requestBody.apiSecret,
        storeId: requestBody.storeId
      });

      const { data, error } = await supabase.functions.invoke('import-products', {
        body: requestBody
      });

      if (error) throw error;

      if (data?.jobId) {
        setImportJobId(data.jobId);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      setImporting(false);
      setImportDialogOpen(false);
      
      if (error.message?.includes('API token') || error.message?.includes('apiToken')) {
        toast.error('Token API invalide ou manquant. Veuillez reconnecter votre boutique Shopify.');
      } else if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
        toast.error('Erreur d\'authentification. Veuillez vérifier votre token API.');
      } else {
        toast.error(error.message || 'Erreur lors de l\'import des produits');
      }
    }
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Connexion Shopify</h2>
        
        <form onSubmit={handleSaveConnection} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="storeName" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Nom de la boutique
            </Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  id="storeName"
                  type="text"
                  value={storeName}
                  onChange={(e) => {
                    setStoreName(e.target.value);
                    if (errors.storeName) setErrors({ ...errors, storeName: '' });
                  }}
                  placeholder="mon-magasin"
                  className={`flex-1 ${errors.storeName ? 'border-destructive' : ''}`}
                />
                <span className="text-muted-foreground">.myshopify.com</span>
              </div>
              {errors.storeName && (
                <p className="text-sm text-destructive">{errors.storeName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey" className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Clé API (API Key)
            </Label>
            <Input
              id="apiKey"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="da237524e4e1252a740b204af962acdf"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              32 caractères hexadécimaux
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiSecret" className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Clé secrète d'API (API Secret)
            </Label>
            <Input
              id="apiSecret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="shpss_xxxxxxxxxxxxxxxx"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Commence par shpss_ ou shpat_
            </p>
          </div>

          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {store ? 'Mettre à jour' : 'Connecter'} la boutique
          </Button>
        </form>
      </Card>

      {store && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Boutique connectée</h3>
            <div className="flex items-center gap-2">
              <Badge variant={store.is_active ? "success" : "destructive"}>
                {store.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          {/* Alert for missing credentials */}
          {(!store.access_token || (store.connection_type === 'manual' && !store.api_key)) && (
            <Alert className="mb-4 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-900 dark:text-orange-100">
                Credentials manquants
              </AlertTitle>
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <p className="mb-2">
                  Votre connexion Shopify ne contient pas les identifiants API nécessaires. 
                  Cela se produit car elle a été créée avant notre mise à jour.
                </p>
                <p className="font-semibold">
                  Solution : Supprimez cette connexion et recréez-la avec vos identifiants API complets.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 mb-6">
            <p className="text-sm">
              <span className="font-medium">Boutique:</span> {store.store_url}
            </p>
            <p className="text-sm">
              <span className="font-medium">Type:</span>{' '}
              <Badge variant="outline">
                {store.connection_type === 'oauth' ? 'OAuth' : 'API Key'}
              </Badge>
            </p>
            <p className="text-sm">
              <span className="font-medium">API Key:</span>{' '}
              <Badge variant={store.api_key ? "success" : "destructive"}>
                {store.api_key ? '✓ Présente' : '✗ Manquante'}
              </Badge>
            </p>
            <p className="text-sm">
              <span className="font-medium">API Secret:</span>{' '}
              <Badge variant={store.access_token ? "success" : "destructive"}>
                {store.access_token ? '✓ Présente' : '✗ Manquante'}
              </Badge>
            </p>
            <p className="text-sm text-muted-foreground">
              Connectée le: {new Date(store.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>

          {importing && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm font-medium">Import en cours...</span>
              </div>

              <Progress value={progress.percentage} className="h-3" />

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{progress.percentage}%</div>
                  <div className="text-xs text-muted-foreground mt-1">Progression</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
                    <FileText className="w-5 h-5" />
                    {progress.currentPage}/{progress.totalPages || '?'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Pages</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
                    <Package className="w-5 h-5" />
                    {progress.productsProcessed}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Produits</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button 
              onClick={handleImportProducts}
              disabled={importing || !store.access_token || (store.connection_type === 'manual' && !store.api_key)}
              className="flex-1"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Importer les produits
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleDeleteConnection}
              disabled={importing}
              variant="destructive"
              className="sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </Card>
      )}

      <ImportProgressDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        phase={importPhase}
        progress={progress}
        productsImported={productsImported}
        pagesImported={pagesImported}
        importedItems={importedItems}
        limitReached={limitReached}
        maxProducts={limits?.limits?.max_products || 50}
      />
    </div>
  );
}