import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShoppingBag, Link as LinkIcon, Download } from 'lucide-react';
import { shopifyConnectionSchema } from '@/lib/validationSchemas';

export function ShopifyConnection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState('');
  const [store, setStore] = useState<any>(null);
  const [storeName, setStoreName] = useState('');
  const [apiToken, setApiToken] = useState('');
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
        setStore(data);
        // Extract store name from store_url (remove .myshopify.com)
        const storeName = data.store_url?.replace('.myshopify.com', '') || '';
        setStoreName(storeName);
      }
    } catch (error) {
      console.error('Error loading store:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);

    try {
      // Validate inputs
      const validationResult = shopifyConnectionSchema.safeParse({
        storeName,
        apiToken
      });

      if (!validationResult.success) {
        const validationErrors: { [key: string]: string } = {};
        validationResult.error.errors.forEach((err) => {
          validationErrors[err.path[0]] = err.message;
        });
        setErrors(validationErrors);
        toast.error('Veuillez corriger les erreurs dans le formulaire');
        setSaving(false);
        return;
      }

      const storeUrl = `${storeName}.myshopify.com`;
      
      if (store) {
        // Update existing
        const { error } = await supabase
          .from('shopify_connections')
          .update({
            store_url: storeUrl,
            access_token: apiToken,
            updated_at: new Date().toISOString()
          })
          .eq('id', store.id);

        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('shopify_connections')
          .insert({
            store_url: storeUrl,
            access_token: apiToken,
            user_id: user?.id,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;
        
        // Update local state with the new store
        if (data) {
          setStore(data);
        }
      }

      toast.success('Connexion Shopify enregistrée avec succès');
      await loadStore();
    } catch (error) {
      console.error('Error saving connection:', error);
      toast.error('Erreur lors de l\'enregistrement de la connexion');
    } finally {
      setSaving(false);
      setApiToken('');
    }
  };

  const handleImportProducts = async () => {
    if (!store || !store.id) {
      toast.error('Veuillez d\'abord connecter votre boutique');
      return;
    }

    try {
      setImporting(true);
      setImportProgress(0);
      setImportStatus('Démarrage de l\'import...');
      
      // Extract store name from store_url
      const shopName = store.store_url?.replace('.myshopify.com', '') || '';
      
      const { data, error } = await supabase.functions.invoke('import-products', {
        body: {
          shopName: shopName,
          apiToken: store.access_token,
          storeId: store.id
        }
      });

      if (error) throw error;

      setImportProgress(100);
      setImportStatus(`Import terminé : ${data.count || 0} produits importés`);
      
      toast.success(`${data.count || 0} produits importés avec succès !`, {
        description: 'Redirection vers la page des produits...'
      });

      // Redirect to products page after 1.5 seconds
      setTimeout(() => {
        navigate('/products');
      }, 1500);
    } catch (error: any) {
      console.error('Import error:', error);
      setImportProgress(0);
      setImportStatus('');
      toast.error(error.message || 'Erreur lors de l\'import des produits');
    } finally {
      setImporting(false);
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
            <Label htmlFor="apiToken" className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Token API (Storefront Access Token)
            </Label>
            <Input
              id="apiToken"
              type="password"
              value={apiToken}
              onChange={(e) => {
                setApiToken(e.target.value);
                if (errors.apiToken) setErrors({ ...errors, apiToken: '' });
              }}
              placeholder="Entrez votre token API"
              className={errors.apiToken ? 'border-destructive' : ''}
            />
            {errors.apiToken && (
              <p className="text-sm text-destructive">{errors.apiToken}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Vous pouvez obtenir votre token dans les paramètres de votre boutique Shopify
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
            <Badge variant={store.is_active ? "default" : "destructive"} className={store.is_active ? "bg-green-500 hover:bg-green-600" : ""}>
              {store.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="space-y-2 mb-6">
            <p className="text-sm">
              <span className="font-medium">Boutique:</span> {store.store_url}
            </p>
            <p className="text-sm text-muted-foreground">
              Connectée le: {new Date(store.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>

          {importing && (
            <div className="space-y-3 mb-4">
              <Progress value={importProgress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                {importStatus}
              </p>
            </div>
          )}

          <Button 
            onClick={handleImportProducts}
            disabled={importing}
            className="w-full"
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
        </Card>
      )}
    </div>
  );
}
