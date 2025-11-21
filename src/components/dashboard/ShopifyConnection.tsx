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
import { Loader2, ShoppingBag, Link as LinkIcon, Trash2, AlertCircle } from 'lucide-react';
import { shopifyConnectionSchema } from '@/lib/validationSchemas';
import { useTranslation } from '@/lib/language';

export function ShopifyConnection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, tf, language } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState<any>(null);
  const [storeName, setStoreName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  

  useEffect(() => {
    loadStore();
  }, [user]);

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

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);

    try {
      // Simple validation
      if (!storeName || !apiKey || !apiSecret) {
        toast.error(t.shopify.connection.allFieldsRequired);
        setSaving(false);
        return;
      }

      if (!apiSecret.startsWith('shpss_') && !apiSecret.startsWith('shpat_')) {
        toast.error(t.shopify.connection.secretKeyInvalid);
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

      toast.success(t.shopify.connection.connectionSaved);
      
      // Wait for DB sync then reload
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadStore();

      // Trigger auto-sync (comme pour OAuth)
      try {
        console.log('🚀 [Admin API] Triggering auto-sync...');
        
        const { error: syncError } = await supabase.functions.invoke('trigger-auto-sync', {
          body: { user_id: user?.id }
        });
        
        if (syncError) {
          console.error('❌ [Admin API] Auto-sync trigger failed:', syncError);
          toast.error('Erreur lors du déclenchement de la synchronisation');
        } else {
          console.log('✅ [Admin API] Auto-sync triggered successfully');
          toast.info('Synchronisation automatique de vos produits en cours...', { duration: 5000 });
        }
      } catch (err) {
        console.error('❌ [Admin API] Error triggering auto-sync:', err);
      }
      
    } catch (error) {
      console.error('Error saving connection:', error);
      toast.error(t.shopify.connection.errorSaving);
    } finally {
      setSaving(false);
      setApiKey('');
      setApiSecret('');
    }
  };

  const handleDeleteConnection = async () => {
    if (!store) return;
    
    if (!confirm(t.shopify.connection.confirmDelete)) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('shopify_connections')
        .delete()
        .eq('id', store.id);

      if (error) throw error;

      toast.success(t.shopify.connection.connectionDeleted);
      setStore(null);
      setStoreName('');
      setApiKey('');
      setApiSecret('');
    } catch (error: any) {
      console.error('Error deleting connection:', error);
      toast.error(error.message || t.shopify.connection.errorDeleting);
    } finally {
      setLoading(false);
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
              Admin API Access Token
            </Label>
            <Input
              id="apiSecret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="shpat_xxxxxxxxxxxxxxxx"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Commence par shpat_ (trouvé dans Shopify Admin → Apps → Develop apps)
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

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button 
              onClick={handleDeleteConnection}
              variant="destructive"
              className="sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}