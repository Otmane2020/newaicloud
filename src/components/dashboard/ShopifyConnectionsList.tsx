import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Store, Trash2, Download, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ShopifyConnection {
  id: string;
  store_url: string;
  is_active: boolean;
  created_at: string;
  access_token: string;
}

export function ShopifyConnectionsList() {
  const [connections, setConnections] = useState<ShopifyConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('shopify_connections')
        .select('id, store_url, is_active, created_at, access_token')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error: any) {
      console.error('Error loading connections:', error);
      toast.error('Erreur lors du chargement des connexions');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (store: ShopifyConnection) => {
    try {
      setImporting(store.id);

      // Clean the shop name by removing protocol, domain suffix, and trailing slashes
      let cleanShopName = (store.store_url || '')
        .replace(/^https?:\/\//, '') // Remove http:// or https://
        .replace(/\.myshopify\.com.*$/, '') // Remove .myshopify.com and anything after
        .replace(/\/$/, ''); // Remove trailing slash

      const { data, error } = await supabase.functions.invoke('import-products', {
        body: {
          shopName: cleanShopName,
          apiToken: store.access_token,
          storeId: store.id
        }
      });

      if (error) throw error;

      toast.success(`Import démarré ! ${data.count || 0} produits en cours d'importation...`);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Erreur lors de l\'import');
    } finally {
      setImporting(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('shopify_connections')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast.success('Connexion supprimée');
      loadConnections();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (connections.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-3">
            <Store className="w-12 h-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold">Aucune boutique connectée</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez votre première boutique pour commencer
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connections.map((connection) => (
          <Card key={connection.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Store className="w-5 h-5 flex-shrink-0 text-primary" />
                  <CardTitle className="text-base truncate">{connection.store_url}</CardTitle>
                </div>
                <Badge variant={connection.is_active ? "default" : "secondary"} className="flex-shrink-0">
                  {connection.is_active ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Actif
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      Inactif
                    </>
                  )}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Connecté le {new Date(connection.created_at).toLocaleDateString('fr-FR')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={() => handleImport(connection)}
                disabled={importing === connection.id}
                className="w-full"
                size="sm"
              >
                {importing === connection.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Importer les produits
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setDeleteId(connection.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette connexion ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
