import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, Trash2, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ShopifyConnection {
  id: string;
  store_name: string | null;
  store_url: string;
  is_active: boolean;
  last_sync_at: string | null;
  connected_at: string | null;
  connection_type: string | null;
}

export function ShopifyConnectionsList() {
  const [connections, setConnections] = useState<ShopifyConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingStoreId, setImportingStoreId] = useState<string | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('shopify_connections')
        .select('*')
        .order('connected_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error loading connections:', error);
      toast.error('Erreur lors du chargement des connexions');
    } finally {
      setLoading(false);
    }
  };

  const deleteConnection = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette connexion ?')) return;

    try {
      const { error } = await supabase
        .from('shopify_connections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Connexion supprimée');
      loadConnections();
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const importProducts = async (store: ShopifyConnection) => {
    try {
      setImportingStoreId(store.id);
      toast.loading('Import en cours...', { id: 'import' });

      // 🔄 Load full store data including credentials
      console.log('🔄 Loading store credentials before import...');
      const { data: fullStore, error: loadError } = await supabase
        .from('shopify_connections')
        .select('*')
        .eq('id', store.id)
        .single();

      if (loadError || !fullStore) {
        throw new Error('Impossible de charger les credentials de la boutique');
      }

      console.log('📦 Store data loaded:', {
        hasApiKey: !!fullStore.api_key,
        hasAccessToken: !!fullStore.access_token,
        connectionType: fullStore.connection_type
      });

      // Clean the shop name by removing protocol, domain suffix, and trailing slashes
      let cleanShopName = (fullStore.store_url || '')
        .replace(/^https?:\/\//, '') // Remove http:// or https://
        .replace(/\.myshopify\.com.*$/, '') // Remove .myshopify.com and anything after
        .replace(/\/$/, ''); // Remove trailing slash

      // Prepare request body with credentials
      const requestBody: any = {
        storeId: fullStore.id,
        shopName: cleanShopName,
        apiSecret: fullStore.access_token,
      };

      // Add API key for manual connections
      if (fullStore.connection_type === 'manual' && fullStore.api_key) {
        requestBody.apiKey = fullStore.api_key;
      }

      console.log('📤 Sending to import-products:', {
        shopName: requestBody.shopName,
        hasApiKey: !!requestBody.apiKey,
        hasApiSecret: !!requestBody.apiSecret,
        apiSecretLength: requestBody.apiSecret?.length,
        storeId: requestBody.storeId
      });

      const { error } = await supabase.functions.invoke('import-products', {
        body: requestBody
      });

      if (error) throw error;
      
      toast.success('Import terminé !', { id: 'import' });
      loadConnections();
    } catch (error: any) {
      console.error('Error importing products:', error);
      toast.error(error.message || 'Erreur lors de l\'import', { id: 'import' });
    } finally {
      setImportingStoreId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Aucune boutique connectée</p>
          <p className="text-sm text-muted-foreground mt-2">
            Cliquez sur "Ajouter une boutique" pour commencer
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {connections.map((store) => (
        <Card key={store.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Store className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg truncate">
                      {store.store_name || 'Boutique Shopify'}
                    </h3>
                    <Badge variant={store.is_active ? 'default' : 'secondary'}>
                      {store.is_active ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-1 truncate">
                    {store.store_url}
                  </p>
                  
                  {store.last_sync_at && (
                    <p className="text-xs text-muted-foreground">
                      Dernière synchro : {format(new Date(store.last_sync_at), 'PPp', { locale: fr })}
                    </p>
                  )}
                  
                  {store.connected_at && (
                    <p className="text-xs text-muted-foreground">
                      Connectée le : {format(new Date(store.connected_at), 'PP', { locale: fr })}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => importProducts(store)}
                  disabled={importingStoreId === store.id}
                >
                  {importingStoreId === store.id ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Import...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Importer
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteConnection(store.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
