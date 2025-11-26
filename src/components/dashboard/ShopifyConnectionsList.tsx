import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Trash2, RefreshCw, CheckCircle, XCircle, AlertCircle, AlertTriangle, Package, FileText, Settings, Edit, Infinity } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShopifySyncSettings } from '@/components/integration/ShopifySyncSettings';
import { SimpleSyncProgress } from '@/components/integration/SyncProgressDialog';
import { SyncResultDialog } from '@/components/integration/SyncResultDialog';
import { useTranslation } from '@/lib/language';

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

export default function ShopifyConnectionsList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [connections, setConnections] = useState<ShopifyConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingStoreId, setImportingStoreId] = useState<string | null>(null);
  const [syncingStoreId, setSyncingStoreId] = useState<string | null>(null);
  
  // Sync settings dialog state
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [selectedStore, setSelectedStore] = useState<ShopifyConnection | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentSyncType, setCurrentSyncType] = useState<string>('products');
  
  // Sync result dialog state
  const [showSyncResult, setShowSyncResult] = useState(false);
  const [syncStats, setSyncStats] = useState<any>({
    products: { before: 0, after: 0, imported: 0 },
    collections: { before: 0, after: 0, imported: 0 },
    pages: { before: 0, after: 0, imported: 0 },
    articles: { before: 0, after: 0, imported: 0 },
    images: { before: 0, after: 0, imported: 0 },
  });
  const [totalSyncImported, setTotalSyncImported] = useState(0);
  
  // Edit store name dialog state
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [storeToEdit, setStoreToEdit] = useState<ShopifyConnection | null>(null);
  const [editedStoreName, setEditedStoreName] = useState("");

  useEffect(() => {
    loadConnections();
    updateStoreNames();
  }, []);
  
  
  const updateStoreNames = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get ALL connections (not just null store_name)
      const { data: connections } = await supabase
        .from('shopify_connections')
        .select('id, store_url, store_name, access_token')
        .eq('user_id', user.id);

      if (!connections || connections.length === 0) return;

      console.log('🔍 Checking store names for', connections.length, 'stores');

      for (const conn of connections) {
        try {
          // Extract technical name from URL (e.g., "HBxv99-2F" from "HBxv99-2F.myshopify.com")
          const technicalName = conn.store_url
            .replace(/^https?:\/\//, '')
            .replace(/\.myshopify\.com.*$/, '');

          // Only update if store_name is null, matches the technical name, OR contains .myshopify.com (URL stored as name)
          const needsUpdate = !conn.store_name || 
                              conn.store_name === technicalName || 
                              conn.store_name.includes('.myshopify.com');
          
          console.log(`📦 Store ${conn.id}:`, {
            current_name: conn.store_name,
            technical_name: technicalName,
            needs_update: needsUpdate
          });

          if (!needsUpdate) continue;

          const response = await fetch(`https://${conn.store_url}/admin/api/2025-07/shop.json`, {
            headers: {
              'X-Shopify-Access-Token': conn.access_token,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const shopData = await response.json();
            console.log('✅ Got shop data:', shopData.shop?.name);
            
            if (shopData.shop?.name) {
              await supabase
                .from('shopify_connections')
                .update({ store_name: shopData.shop.name })
                .eq('id', conn.id);
              
              console.log(`✅ Updated store name to: ${shopData.shop.name}`);
            }
          } else {
            console.error('❌ API error:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('❌ Error fetching shop name:', error);
        }
      }
      
      loadConnections();
    } catch (error) {
      console.error('❌ Error updating store names:', error);
    }
  };
  
  // Removed manual import logic - now handled by useAutoSync

  // Removed checkUsageLimits - not needed with new auto-sync system

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
      toast.error(t.common.error);
    } finally {
      setLoading(false);
    }
  };

  // Removed delete functions - not needed in connections list

  const openEditNameDialog = (store: ShopifyConnection) => {
    setStoreToEdit(store);
    setEditedStoreName(store.store_name || '');
    setShowEditNameDialog(true);
  };

  const handleManualSync = async (storeToSync: ShopifyConnection) => {
    if (!storeToSync) {
      toast.error("Aucun magasin sélectionné");
      return;
    }

    setSyncingStoreId(storeToSync.id);
    setIsSyncing(true);
    let historyEntry: any = null;
    let historyId: string | null = null;
    const startTime = Date.now();
    let user: any = null;
    
    try {
      console.log('🔄 [SYNC START] Initiating manual sync for store:', storeToSync.id);
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.error('❌ [SYNC ERROR] User not authenticated');
        throw new Error("Non authentifié");
      }
      user = authUser;
      console.log('✅ [SYNC AUTH] User authenticated:', user.id);

      // Extract shop name from store_url
      const shopName = storeToSync.store_url
        .replace(/^https?:\/\//, '')
        .replace(/\.myshopify\.com.*$/, '');
      console.log('🏪 [SYNC SHOP] Shop name extracted:', shopName);

      // Get access token
      const { data: storeData, error: storeError } = await supabase
        .from('shopify_connections')
        .select('access_token')
        .eq('id', storeToSync.id)
        .single();

      if (storeError || !storeData) {
        console.error('❌ [SYNC ERROR] Failed to fetch store data:', storeError);
        throw new Error("Store not found");
      }
      console.log('✅ [SYNC TOKEN] Access token retrieved');

      // CRITICAL: Create sync history entry with explicit error handling
      console.log('📝 [SYNC HISTORY] Creating sync history entry...');
      try {
        const { data: entry, error: historyError } = await supabase
          .from('sync_history')
          .insert({
            user_id: user.id,
            store_id: storeToSync.id,
            sync_type: 'import',
            content_types: ['products', 'collections', 'pages', 'articles', 'images'],
            status: 'running',
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (historyError) {
          console.error('❌ [SYNC HISTORY ERROR] Failed to create history entry:', historyError);
          console.error('❌ [SYNC HISTORY ERROR] Details:', {
            code: historyError.code,
            message: historyError.message,
            details: historyError.details,
            hint: historyError.hint
          });
        } else if (entry) {
          historyEntry = entry;
          historyId = entry.id;
          console.log('✅ [SYNC HISTORY] History entry created:', historyId);
        } else {
          console.warn('⚠️ [SYNC HISTORY] No entry returned but no error');
        }
      } catch (historyCreateError) {
        console.error('❌ [SYNC HISTORY EXCEPTION] Exception during history creation:', historyCreateError);
      }

      // Get counts before import
      console.log('📊 [SYNC COUNTS] Fetching counts before import...');
      const { count: productsBefore } = await supabase
        .from('shopify_products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeToSync.id);

      const { count: collectionsBefore } = await supabase
        .from('shopify_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: pagesBefore } = await supabase
        .from('shopify_pages')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeToSync.id);

      const { count: articlesBefore } = await supabase
        .from('blog_articles')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeToSync.id);

      const { count: imagesBefore } = await supabase
        .from('content_images')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeToSync.id);

      console.log('📊 [SYNC COUNTS] Before:', { productsBefore, collectionsBefore, pagesBefore, articlesBefore, imagesBefore });

      // Trigger import for all content types
      const types = ['products', 'collections', 'pages', 'articles', 'images'];
      const importResults: Record<string, number> = {};
      const errorMessages: string[] = [];
      
      console.log('🚀 [SYNC IMPORT] Starting import for all content types...');
      
      for (const type of types) {
        setCurrentSyncType(type);
        console.log(`📦 [SYNC ${type.toUpperCase()}] Starting import...`);
        
        try {
          let result;
          const timeoutMs = 180000; // 3 minutes timeout (consistent with useShopifySync)
          
          const executeWithTimeout = async (promise: Promise<any>) => {
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Function timeout after 30s')), timeoutMs)
            );
            return Promise.race([promise, timeoutPromise]);
          };

          switch (type) {
            case 'products':
              result = await executeWithTimeout(
                supabase.functions.invoke('import-products', {
                  body: { 
                    shopName, 
                    apiSecret: storeData.access_token, 
                    storeId: storeToSync.id,
                    syncMode: 'smart'
                  }
                })
              );
              break;
            case 'collections':
              result = await executeWithTimeout(
                supabase.functions.invoke('import-shopify-collections', {
                  body: { 
                    shopName, 
                    apiSecret: storeData.access_token, 
                    storeId: storeToSync.id 
                  }
                })
              );
              break;
            case 'pages':
              result = await executeWithTimeout(
                supabase.functions.invoke('import-shopify-pages', {
                  body: { 
                    shopName, 
                    apiSecret: storeData.access_token, 
                    storeId: storeToSync.id 
                  }
                })
              );
              break;
            case 'articles':
              result = await executeWithTimeout(
                supabase.functions.invoke('import-shopify-articles', {
                  body: { 
                    shopName, 
                    authToken: storeData.access_token, 
                    storeId: storeToSync.id 
                  }
                })
              );
              break;
            case 'images':
              result = await executeWithTimeout(
                supabase.functions.invoke('import-content-images', {
                  body: { 
                    storeId: storeToSync.id,
                    types: ['collections', 'pages', 'articles', 'homepage'] 
                  }
                })
              );
              break;
          }

          if (result?.error) {
            console.error(`❌ [SYNC ${type.toUpperCase()} ERROR]`, result.error);
            errorMessages.push(`${type}: ${result.error.message || 'Unknown error'}`);
            importResults[type] = 0;
          } else {
            const imported = result?.data?.totalImported || result?.data?.count || result?.data?.imported || 0;
            importResults[type] = imported;
            console.log(`✅ [SYNC ${type.toUpperCase()}] Imported:`, imported);
          }
        } catch (error) {
          console.error(`❌ [SYNC ${type.toUpperCase()} EXCEPTION]`, error);
          errorMessages.push(`${type}: ${error.message}`);
          importResults[type] = 0;
        }
      }

      // Get counts after import
      console.log('📊 [SYNC COUNTS] Fetching counts after import...');
      const { count: productsAfter } = await supabase
        .from('shopify_products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeToSync.id);

      const { count: collectionsAfter } = await supabase
        .from('shopify_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: pagesAfter } = await supabase
        .from('shopify_pages')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeToSync.id);

      const { count: articlesAfter } = await supabase
        .from('blog_articles')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeToSync.id);

      const { count: imagesAfter } = await supabase
        .from('content_images')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeToSync.id);

      console.log('📊 [SYNC COUNTS] After:', { productsAfter, collectionsAfter, pagesAfter, articlesAfter, imagesAfter });

      // Calculate stats
      const stats = {
        products: {
          before: productsBefore || 0,
          after: productsAfter || 0,
          imported: importResults.products || 0,
        },
        collections: {
          before: collectionsBefore || 0,
          after: collectionsAfter || 0,
          imported: importResults.collections || 0,
        },
        pages: {
          before: pagesBefore || 0,
          after: pagesAfter || 0,
          imported: importResults.pages || 0,
        },
        articles: {
          before: articlesBefore || 0,
          after: articlesAfter || 0,
          imported: importResults.articles || 0,
        },
        images: {
          before: imagesBefore || 0,
          after: imagesAfter || 0,
          imported: importResults.images || 0,
        },
      };

      const totalImported = Object.values(importResults).reduce((sum, val) => sum + val, 0);
      const duration = Date.now() - startTime;

      console.log('📊 [SYNC STATS] Total imported:', totalImported, 'Duration:', duration, 'ms');
      console.log('📊 [SYNC STATS] Errors:', errorMessages.length > 0 ? errorMessages : 'None');

      // CRITICAL: Update history entry with robust error handling
      if (historyId) {
        console.log('📝 [SYNC HISTORY] Updating history entry:', historyId);
        try {
          const { error: updateError } = await supabase
            .from('sync_history')
            .update({
              status: errorMessages.length > 0 ? 'failed' : 'success',
              items_synced: totalImported,
              duration_ms: duration,
              completed_at: new Date().toISOString(),
              error_message: errorMessages.length > 0 ? errorMessages.join('; ') : null,
            })
            .eq('id', historyId);

          if (updateError) {
            console.error('❌ [SYNC HISTORY UPDATE ERROR]', updateError);
          } else {
            console.log('✅ [SYNC HISTORY] History entry updated successfully');
          }
        } catch (historyUpdateError) {
          console.error('❌ [SYNC HISTORY UPDATE EXCEPTION]', historyUpdateError);
        }
      } else {
        console.warn('⚠️ [SYNC HISTORY] No history ID available for update');
      }

      setSyncStats(stats);
      setTotalSyncImported(totalImported);
      setIsSyncing(false);
      setShowSyncResult(true);

      if (errorMessages.length > 0) {
        toast.warning(`Synchronisation terminée avec des erreurs: ${totalImported} éléments importés`);
      } else {
        toast.success(`Synchronisation réussie: ${totalImported} éléments importés`);
      }
    } catch (error) {
      console.error("❌ [SYNC FATAL ERROR]", error);
      
      // CRITICAL: Update history as failed with robust error handling
      if (historyId) {
        console.log('📝 [SYNC HISTORY] Marking sync as failed:', historyId);
        try {
          await supabase
            .from('sync_history')
            .update({
              status: 'failed',
              error_message: error.message || 'Unknown error',
              duration_ms: Date.now() - startTime,
              completed_at: new Date().toISOString(),
            })
            .eq('id', historyId);
          console.log('✅ [SYNC HISTORY] History marked as failed');
        } catch (historyUpdateError) {
          console.error('❌ [SYNC HISTORY UPDATE ERROR] Failed to update history on error:', historyUpdateError);
        }
      }

      toast.error(`Erreur: ${error.message}`);
    } finally {
      // CRITICAL: ALWAYS update timestamps, regardless of success or failure
      console.log('🔄 [SYNC FINALLY] Updating timestamps...');
      
      if (user && selectedStore) {
        // Update last_sync_at in shopify_connections
        try {
          console.log('📅 [SYNC TIMESTAMP] Updating last_sync_at for store:', selectedStore.id);
          console.log('📅 [SYNC TIMESTAMP] Current user:', user.id);
          console.log('📅 [SYNC TIMESTAMP] Update payload:', { last_sync_at: new Date().toISOString() });
          
          const { data: updateResult, error: syncError } = await supabase
            .from('shopify_connections')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', selectedStore.id)
            .select();

          if (syncError) {
            console.error('❌ [SYNC TIMESTAMP ERROR] Failed to update last_sync_at:', syncError);
          } else {
            console.log('✅ [SYNC TIMESTAMP] last_sync_at updated successfully');
            console.log('✅ [SYNC TIMESTAMP] Update result:', updateResult);
          }
        } catch (syncTimestampError) {
          console.error('❌ [SYNC TIMESTAMP EXCEPTION]', syncTimestampError);
        }

        // Update last_import_at in shopify_sync_settings
        try {
          console.log('📅 [SYNC TIMESTAMP] Updating last_import_at for user:', user.id);
          const { error: importError } = await supabase
            .from('shopify_sync_settings')
            .update({ last_import_at: new Date().toISOString() })
            .eq('user_id', user.id);

          if (importError) {
            console.error('❌ [SYNC TIMESTAMP ERROR] Failed to update last_import_at:', importError);
          } else {
            console.log('✅ [SYNC TIMESTAMP] last_import_at updated successfully');
          }
        } catch (importTimestampError) {
          console.error('❌ [SYNC TIMESTAMP EXCEPTION]', importTimestampError);
        }

        // Reload connections to show updated date
        try {
          console.log('🔄 [SYNC REFRESH] Reloading connections...');
          await loadConnections();
          console.log('✅ [SYNC REFRESH] Connections reloaded');
        } catch (reloadError) {
          console.error('❌ [SYNC REFRESH ERROR]', reloadError);
        }
      }
      
      console.log('✅ [SYNC COMPLETE] Manual sync process completed');
      setIsSyncing(false);
      setSyncingStoreId(null);
    }
  };

  const startManualSync = async (store: ShopifyConnection) => {
    await handleManualSync(store);
  };

  const updateStoreName = async () => {
    if (!storeToEdit || !editedStoreName.trim()) return;

    try {
      const { error } = await supabase
        .from('shopify_connections')
        .update({ store_name: editedStoreName.trim() })
        .eq('id', storeToEdit.id);

      if (error) throw error;

      toast.success('Nom commercial mis à jour');
      loadConnections();
      setShowEditNameDialog(false);
      setStoreToEdit(null);
      setEditedStoreName('');
    } catch (error) {
      console.error('Error updating store name:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Removed manual import polling - now handled by useAutoSync

  // Removed handleUpgradeFromImport and handleUpgradeComplete - not needed with auto-sync

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
                    <div className="flex items-center gap-2 mb-3">
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
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        {/* Product count removed - not needed */}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2 truncate">
                      {store.store_url}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {store.connected_at && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Connecté:</span>
                          <span>{format(new Date(store.connected_at), 'PP', { locale: fr })}</span>
                        </div>
                      )}
                      {store.last_sync_at && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Dernière synchro:</span>
                          <span>{format(new Date(store.last_sync_at), 'PPp', { locale: fr })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                   <Button
                    size="sm"
                    variant="default"
                    onClick={() => startManualSync(store)}
                    disabled={syncingStoreId === store.id}
                    className="gap-2"
                  >
                    {syncingStoreId === store.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Synchronisation...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Synchroniser
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditNameDialog(store)}
                    className="gap-2"
                    title="Modifier le nom"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedStore(store);
                      setShowSyncSettings(true);
                    }}
                    className="gap-2"
                    title="Paramètres de synchronisation"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  {/* Delete button removed */}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showSyncSettings} onOpenChange={setShowSyncSettings}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Synchronisation automatique</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configurez la synchronisation entre Shopify et votre plateforme
                  </p>
                </div>
              </div>
              <Button
                onClick={() => selectedStore && handleManualSync(selectedStore)}
                disabled={isSyncing || !selectedStore}
                size="lg"
                className="shrink-0"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Synchronisation...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Synchroniser maintenant
                  </>
                )}
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <ShopifySyncSettings onSyncTrigger={setIsSyncing} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditNameDialog} onOpenChange={setShowEditNameDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Modifier le nom commercial
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">Nom commercial</Label>
              <Input
                id="store-name"
                placeholder="Ex: Movala, Decora Home..."
                value={editedStoreName}
                onChange={(e) => setEditedStoreName(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Ce nom apparaîtra dans votre interface
              </p>
            </div>
            {storeToEdit && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Code technique</Label>
                <p className="text-sm font-mono bg-muted px-3 py-2 rounded">
                  {storeToEdit.store_url.replace(/^https?:\/\//, '').replace(/\.myshopify\.com.*$/, '')}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEditNameDialog(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={updateStoreName}
              disabled={!editedStoreName.trim()}
              className="flex-1"
            >
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SimpleSyncProgress
        open={isSyncing}
        currentType={currentSyncType}
      />

      <SyncResultDialog
        open={showSyncResult}
        onOpenChange={setShowSyncResult}
        stats={syncStats}
        totalImported={totalSyncImported}
      />

      {/* Delete dialog removed - managed in settings */}
    </>
  );
}
