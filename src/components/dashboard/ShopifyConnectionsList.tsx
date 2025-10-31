import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, Trash2, RefreshCw, CheckCircle, XCircle, AlertCircle, AlertTriangle, Package, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ImportProgressDialog } from './ImportProgressDialog';
import { TrialUpgradeDialog } from '@/components/TrialUpgradeDialog';
import { ImportConfirmDialog } from '@/components/integration/ImportConfirmDialog';
import { useNavigate } from 'react-router-dom';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const navigate = useNavigate();
  const [connections, setConnections] = useState<ShopifyConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingStoreId, setImportingStoreId] = useState<string | null>(null);
  
  // Progress dialog state
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [importPhase, setImportPhase] = useState<'products' | 'pages' | 'complete'>('products');
  const [importProgress, setImportProgress] = useState({
    percentage: 0,
    currentPage: 0,
    totalPages: 0,
    productsProcessed: 0,
  });
  const [productsImported, setProductsImported] = useState(0);
  const [pagesImported, setPagesImported] = useState(0);
  const [articlesImported, setArticlesImported] = useState(0);
  const [importedItems, setImportedItems] = useState<any[]>([]);
  const [limitReached, setLimitReached] = useState(false);
  const [maxProducts, setMaxProducts] = useState(0);
  
  // Upgrade dialog state
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [usageLimits, setUsageLimits] = useState<any>(null);
  
  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<string | null>(null);
  
  // Import confirmation dialog state
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [storeToImport, setStoreToImport] = useState<ShopifyConnection | null>(null);

  useEffect(() => {
    loadConnections();
    checkUsageLimits();
  }, []);
  
  // Check if just connected a store and show import dialog
  useEffect(() => {
    const justConnected = localStorage.getItem('shopify_just_connected');
    const storeName = localStorage.getItem('shopify_store_name');
    
    if (justConnected === 'true' && storeName && connections.length > 0) {
      // Find the newly connected store
      const newStore = connections.find(c => c.store_name === storeName);
      if (newStore) {
        setStoreToImport(newStore);
        setShowImportConfirm(true);
        
        // Clear flags
        localStorage.removeItem('shopify_just_connected');
        localStorage.removeItem('shopify_store_name');
      }
    }
  }, [connections]);

  const checkUsageLimits = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-usage-limits');
      if (!error && data) {
        setUsageLimits(data);
      }
    } catch (error) {
      console.error('Error checking usage limits:', error);
    }
  };

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

  const openDeleteDialog = (id: string) => {
    setStoreToDelete(id);
    setShowDeleteDialog(true);
  };

  const deleteConnection = async () => {
    if (!storeToDelete) return;

    try {
      const { error } = await supabase
        .from('shopify_connections')
        .delete()
        .eq('id', storeToDelete);

      if (error) throw error;
      
      // Also delete all associated products and update usage tracking
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Count products being deleted
        const { count } = await supabase
          .from('shopify_products')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', storeToDelete);
        
        // Delete products
        await supabase
          .from('shopify_products')
          .delete()
          .eq('store_id', storeToDelete);
        
        // Update usage tracking
        if (count && count > 0) {
          const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
          const { data: usage } = await supabase
            .from('usage_tracking')
            .select('*')
            .eq('seller_id', user.id)
            .eq('month', currentMonth)
            .single();
          
          if (usage) {
            await supabase
              .from('usage_tracking')
              .update({ 
                products_count: Math.max(0, (usage.products_count || 0) - count),
                shopify_stores_count: Math.max(0, (usage.shopify_stores_count || 0) - 1)
              })
              .eq('id', usage.id);
          }
        }
      }
      
      toast.success('Connection deleted');
      loadConnections();
      setShowDeleteDialog(false);
      setStoreToDelete(null);
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast.error('Error deleting connection');
    }
  };

  // Poll import job status
  useEffect(() => {
    if (!importJobId || !showProgressDialog) return;
    
    const pollInterval = setInterval(async () => {
      const { data: job } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', importJobId)
        .single();
      
      if (job) {
        const progress = Math.min(
          ((job.current_page || 0) / Math.max(job.total_pages || 1, 1)) * 100,
          100
        );
        
        setImportProgress({
          percentage: progress,
          currentPage: job.current_page || 0,
          totalPages: job.total_pages || 0,
          productsProcessed: job.products_processed || 0,
        });
        
        setProductsImported(job.products_processed || 0);
        
        // ✅ Récupérer le nombre de pages importées depuis la DB
        if (job.store_id) {
          const { count } = await supabase
            .from('shopify_pages')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', job.store_id);
          
          if (count !== null) {
            setPagesImported(count);
          }
        }
        
        // Check if completed or quota reached
        if (job.status === 'completed') {
          setImportPhase('complete');
          clearInterval(pollInterval);
          toast.success('Import completed!');
          loadConnections();
        } else if (job.status === 'quota_reached') {
          setLimitReached(true);
          setImportPhase('complete');
          clearInterval(pollInterval);
        } else if (job.status === 'failed') {
          clearInterval(pollInterval);
          setShowProgressDialog(false);
          toast.error(job.error_message || 'Error during import');
        }
      }
    }, 500);
    
    return () => clearInterval(pollInterval);
  }, [importJobId, showProgressDialog]);

  const importProducts = async (store: ShopifyConnection) => {
    try {
      setImportingStoreId(store.id);
      
      // Check usage limits first
      const { data: limitsData, error: limitsError } = await supabase.functions.invoke(
        'check-usage-limits'
      );
      
      if (limitsError) {
        toast.error('Error checking usage limits');
        return;
      }
      
      setUsageLimits(limitsData);
      const currentProducts = limitsData?.usage?.products_count || 0;
      const maxProductsAllowed = limitsData?.limits?.max_products || 10;
      const availableSlots = Math.max(0, maxProductsAllowed - currentProducts);
      
      setMaxProducts(maxProductsAllowed);
      
      // If no slots available, show upgrade dialog
      if (availableSlots === 0) {
        setShowUpgradeDialog(true);
        setImportingStoreId(null);
        return;
      }
      
      // Show warning if close to limit
      if (availableSlots <= 10) {
        toast.warning(`Only ${availableSlots} products left to import`);
      }

      // 🔄 Load full store data including credentials
      const { data: fullStore, error: loadError } = await supabase
        .from('shopify_connections')
        .select('*')
        .eq('id', store.id)
        .single();

      if (loadError || !fullStore) {
        throw new Error('Unable to load store credentials');
      }

      // Clean the shop name
      let cleanShopName = (fullStore.store_url || '')
        .replace(/^https?:\/\//, '')
        .replace(/\.myshopify\.com.*$/, '')
        .replace(/\/$/, '');

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

      // Reset progress state
      setImportProgress({ percentage: 0, currentPage: 0, totalPages: 0, productsProcessed: 0 });
      setProductsImported(0);
      setPagesImported(0);
      setArticlesImported(0);
      setImportedItems([]);
      setImportPhase('products');
      setLimitReached(false);
      setShowProgressDialog(true);

      const { data: importData, error } = await supabase.functions.invoke('import-products', {
        body: requestBody
      });

      if (error) throw error;
      
      // Set job ID to start polling
      if (importData?.jobId) {
        setImportJobId(importData.jobId);
      }
      
      // Import articles in parallel
      console.log('🚀 Starting articles import...');
      try {
        const { data: articlesData, error: articlesError } = await supabase.functions.invoke('import-shopify-articles', {
          body: { 
            storeId: fullStore.id,
            shopName: cleanShopName,
            authToken: fullStore.access_token
          }
        });
        
        if (articlesError) {
          console.error('❌ Articles import error:', articlesError);
        } else if (articlesData) {
          console.log('✅ Articles import response:', articlesData);
          const count = articlesData.count || 0;
          setArticlesImported(count);
          console.log(`📊 Total articles imported: ${count}`);
          
          if (count > 0) {
            toast.success(`${count} articles successfully imported!`);
          }
        }
      } catch (articleError) {
        console.error('❌ Error importing articles:', articleError);
        // Don't fail the whole import if articles fail
      }
      
    } catch (error: any) {
      console.error('Error importing products:', error);
      toast.error(error.message || 'Error during import');
      setShowProgressDialog(false);
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
          <p className="text-muted-foreground">No stores connected</p>
          <p className="text-sm text-muted-foreground mt-2">
            Connect your Shopify store to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
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
                        {store.store_name || 'Shopify Store'}
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
                      {usageLimits && (
                        <Badge variant="outline" className="text-xs">
                          {usageLimits.usage?.products_count || 0}/{usageLimits.limits?.max_products || 0} products
                        </Badge>
                      )}
                    </div>
                    
              <p className="text-sm text-muted-foreground mb-1 truncate">
                {store.store_url}
              </p>
              
              {store.last_sync_at && (
                <p className="text-xs text-muted-foreground">
                  Last sync: {format(new Date(store.last_sync_at), 'PPp', { locale: fr })}
                </p>
              )}
              
              {store.connected_at && (
                <p className="text-xs text-muted-foreground">
                  Connected: {format(new Date(store.connected_at), 'PP', { locale: fr })}
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
                    className="gap-2"
                  >
                    {importingStoreId === store.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Import Products & Pages & Articles
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openDeleteDialog(store.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ImportConfirmDialog
        open={showImportConfirm}
        onOpenChange={setShowImportConfirm}
        onConfirm={() => {
          if (storeToImport) {
            importProducts(storeToImport);
          }
          setShowImportConfirm(false);
        }}
        storeName={storeToImport?.store_name || ''}
      />

      <ImportProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        phase={importPhase}
        progress={importProgress}
        productsImported={productsImported}
        pagesImported={pagesImported}
        articlesImported={articlesImported}
        importedItems={importedItems}
        limitReached={limitReached}
        maxProducts={maxProducts}
      />

      <TrialUpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        reason="limit_reached"
        limitType="products"
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl">Delete Connection</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-4 pt-2">
              <p className="text-base">
                Are you sure you want to delete this Shopify connection?
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="font-medium text-foreground text-sm">The following will be deleted:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span>All imported products</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span>All Shopify pages</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-muted-foreground" />
                    <span>All associated data</span>
                  </div>
                </div>
              </div>

              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm font-medium text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  This action is irreversible
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteConnection} 
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
