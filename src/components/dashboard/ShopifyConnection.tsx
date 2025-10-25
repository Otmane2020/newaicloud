import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, ShoppingBag, Link as LinkIcon, Download } from 'lucide-react';

export function ShopifyConnection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [store, setStore] = useState<any>(null);
  const [storeName, setStoreName] = useState('');
  const [apiToken, setApiToken] = useState('');

  useEffect(() => {
    loadStore();
  }, [user]);

  const loadStore = async () => {
    try {
      const { data } = await (supabase as any)
        .from('shopify_stores')
        .select('*')
        .eq('seller_id', user?.id)
        .maybeSingle();

      if (data) {
        setStore(data);
        setStoreName(data.store_name || '');
      }
    } catch (error) {
      console.error('Error loading store:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!storeName || !apiToken) {
        toast.error('Veuillez remplir tous les champs');
        return;
      }

      const storeUrl = `${storeName}.myshopify.com`;
      
      if (store) {
        // Update existing
        const { error } = await (supabase as any)
          .from('shopify_stores')
          .update({
            store_name: storeName,
            store_url: storeUrl,
            api_token: apiToken,
            updated_at: new Date().toISOString()
          })
          .eq('id', store.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await (supabase as any)
          .from('shopify_stores')
          .insert({
            store_name: storeName,
            store_url: storeUrl,
            api_token: apiToken,
            seller_id: user?.id,
            is_active: true
          });

        if (error) throw error;
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
    if (!store) {
      toast.error('Veuillez d\'abord connecter votre boutique');
      return;
    }

    setImporting(true);
    try {
      // This would call an edge function to import products
      toast.success('Import des produits démarré');
      
      // Update last sync time
      await (supabase as any)
        .from('shopify_stores')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', store.id);

      await loadStore();
    } catch (error) {
      console.error('Error importing products:', error);
      toast.error('Erreur lors de l\'import des produits');
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
            <div className="flex items-center gap-2">
              <Input
                id="storeName"
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="mon-magasin"
                className="flex-1"
              />
              <span className="text-muted-foreground">.myshopify.com</span>
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
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Entrez votre token API"
            />
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
              <span className="font-medium">Boutique:</span> {store.store_name}.myshopify.com
            </p>
            {store.last_sync_at && (
              <p className="text-sm text-muted-foreground">
                Dernière synchronisation: {new Date(store.last_sync_at).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>

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
