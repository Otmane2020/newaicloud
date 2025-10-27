import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShoppingBag, Link as LinkIcon, Download, Package, FileText, Trash2, Plus } from 'lucide-react';
import { shopifyConnectionSchema } from '@/lib/validationSchemas';
import { useUsageLimits } from '@/hooks/useUsageLimits';

interface Store {
  id: string;
  store_url: string;
  is_active: boolean;
  created_at: string;
  access_token: string;
}

export function ShopifyConnectionsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { limits, loading: limitsLoading } = useUsageLimits();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState({
    currentPage: 0,
    totalPages: 0,
    productsProcessed: 0,
    percentage: 0
  });
  const [stores, setStores] = useState<Store[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [deleteStore, setDeleteStore] = useState<Store | null>(null);

  useEffect(() => {
    loadStores();
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
          toast.success(`${job.products_processed} produits importés avec succès !`);
          setTimeout(() => {
            navigate('/products');
          }, 1500);
        }

        if (job.status === 'failed') {
          clearInterval(interval);
          setImporting(false);
          toast.error(job.error_message || 'Erreur lors de l\'import');
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [importJobId, importing, navigate]);

  const loadStores = async () => {
    try {
      const { data } = await supabase
        .from('shopify_connections')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      setStores(data || []);
    } catch (error) {
      console.error('Error loading stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const canAddStore = () => {
    if (limitsLoading) return false;
    const maxStores = limits?.limits?.max_shopify_stores || 1;
    return stores.length < maxStores;
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!canAddStore()) {
      toast.error(`Vous avez atteint la limite de ${limits?.limits?.max_shopify_stores || 1} boutique(s) pour votre plan`);
      return;
    }

    setSaving(true);

    try {
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

      toast.success('Connexion Shopify enregistrée avec succès');
      setStoreName('');
      setApiToken('');
      setShowAddForm(false);
      await loadStores();
    } catch (error) {
      console.error('Error saving connection:', error);
      toast.error('Erreur lors de l\'enregistrement de la connexion');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStore = async () => {
    if (!deleteStore) return;

    try {
      // 1. Delete all product images associated with products from this store
      const { data: storeProducts } = await supabase
        .from('shopify_products')
        .select('id')
        .eq('store_id', deleteStore.id);

      if (storeProducts && storeProducts.length > 0) {
        const productIds = storeProducts.map(p => p.id);
        
        // Delete product images
        await supabase
          .from('product_images')
          .delete()
          .in('product_id', productIds);
      }

      // 2. Delete all products from this store
      await supabase
        .from('shopify_products')
        .delete()
        .eq('store_id', deleteStore.id);

      // 3. Delete all Shopify pages from this store
      await supabase
        .from('shopify_pages')
        .delete()
        .eq('store_id', deleteStore.id);

      // 4. Delete sync logs for this store
      await supabase
        .from('sync_logs')
        .delete()
        .eq('store_id', deleteStore.id);

      // 5. Delete import jobs for this store
      await supabase
        .from('import_jobs')
        .delete()
        .eq('store_id', deleteStore.id);

      // 6. Finally delete the store connection
      const { error } = await supabase
        .from('shopify_connections')
        .delete()
        .eq('id', deleteStore.id);

      if (error) throw error;

      toast.success('Boutique et toutes ses données supprimées avec succès');
      setDeleteStore(null);
      await loadStores();
    } catch (error) {
      console.error('Error deleting store:', error);
      toast.error('Erreur lors de la suppression de la boutique');
    }
  };

  const handleImportProducts = async (store: Store) => {
    try {
      setImporting(true);
      setProgress({
        currentPage: 0,
        totalPages: 0,
        productsProcessed: 0,
        percentage: 0
      });
      
      const shopName = store.store_url?.replace('.myshopify.com', '') || '';
      
      const { data, error } = await supabase.functions.invoke('import-products', {
        body: {
          shopName: shopName,
          apiToken: store.access_token,
          storeId: store.id
        }
      });

      if (error) throw error;

      if (data?.jobId) {
        setImportJobId(data.jobId);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      setImporting(false);
      toast.error(error.message || 'Erreur lors de l\'import des produits');
    }
  };

  if (loading || limitsLoading) {
    return (
      <Card className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Boutiques Shopify</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {stores.length} / {limits?.limits?.max_shopify_stores || 1} boutique(s) connectée(s)
          </p>
        </div>
        {canAddStore() && !showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une boutique
          </Button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Nouvelle boutique</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
              Annuler
            </Button>
          </div>
          
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
            </div>

            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connecter la boutique
            </Button>
          </form>
        </Card>
      )}

      {/* Stores List */}
      {stores.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Aucune boutique connectée</h3>
          <p className="text-muted-foreground mb-6">
            Commencez par connecter votre première boutique Shopify
          </p>
          {canAddStore() && (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une boutique
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-6">
          {stores.map((store) => (
            <Card key={store.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-8 h-8 text-primary" />
                  <div>
                    <h3 className="text-xl font-bold">{store.store_url}</h3>
                    <p className="text-sm text-muted-foreground">
                      Connectée le: {new Date(store.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={store.is_active ? "default" : "secondary"}>
                    {store.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteStore(store)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
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
                      <div className="text-2xl font-bold">{progress.percentage}%</div>
                      <div className="text-xs text-muted-foreground mt-1">Progression</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold flex items-center justify-center gap-1">
                        <FileText className="w-5 h-5" />
                        {progress.currentPage}/{progress.totalPages || '?'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Pages</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold flex items-center justify-center gap-1">
                        <Package className="w-5 h-5" />
                        {progress.productsProcessed}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Produits</div>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={() => handleImportProducts(store)}
                disabled={importing}
                className="w-full mt-6"
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
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteStore} onOpenChange={(open) => !open && setDeleteStore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Supprimer la boutique ?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Êtes-vous sûr de vouloir supprimer la connexion à <strong>{deleteStore?.store_url}</strong> ?
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="font-semibold text-destructive mb-2">⚠️ Attention : Cette action est irréversible</p>
                <p className="text-sm text-muted-foreground">
                  Tous les éléments suivants seront <strong className="text-destructive">définitivement supprimés</strong> :
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                  <li>Tous les produits importés de cette boutique</li>
                  <li>Toutes les images de produits</li>
                  <li>Toutes les optimisations SEO (titres, descriptions, tags)</li>
                  <li>Tous les textes ALT des images</li>
                  <li>Toutes les pages Shopify importées</li>
                  <li>Toutes les données de synchronisation</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStore} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Oui, tout supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
