import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Trash2, RefreshCw, CheckCircle, XCircle, AlertCircle, AlertTriangle, Package, FileText, Settings, Edit } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ImportProgressDialog } from './ImportProgressDialog';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { ImportConfirmDialog } from '@/components/integration/ImportConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShopifySyncSettings } from '@/components/integration/ShopifySyncSettings';
import { SimpleSyncProgress } from '@/components/integration/SyncProgressDialog';
import { SyncResultDialog } from '@/components/integration/SyncResultDialog';

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
  const [connections, setConnections] = useState<ShopifyConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingStoreId, setImportingStoreId] = useState<string | null>(null);
  const [syncingStoreId, setSyncingStoreId] = useState<string | null>(null);
  
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
  const [totalShopifyProducts, setTotalShopifyProducts] = useState(0);
  
  // Upgrade dialog state
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [usageLimits, setUsageLimits] = useState<any>(null);
  const [pendingImportStore, setPendingImportStore] = useState<ShopifyConnection | null>(null);
  
  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<string | null>(null);
  
  // Import confirmation dialog state
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [storeToImport, setStoreToImport] = useState<ShopifyConnection | null>(null);
  
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
    checkUsageLimits();
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

          // Only update if store_name is null OR matches the technical name
          const needsUpdate = !conn.store_name || conn.store_name === technicalName;
          
          console.log(`📦 Store ${conn.id}:`, {
            current_name: conn.store_name,
            technical_name: technicalName,
            needs_update: needsUpdate
          });

          if (!needsUpdate) continue;

          const response = await fetch(`https://${conn.store_url}/admin/api/2025-10/shop.json`, {
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

  // Poll import_jobs table for real-time progress updates
  useEffect(() => {
    if (!importJobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data: job, error } = await supabase
          .from('import_jobs')
          .select('*')
          .eq('id', importJobId)
          .single();

        if (error) {
          console.error('Error polling job:', error);
          return;
        }

        if (job) {
          // Update progress
          const totalPages = job.total_pages || 1;
          const currentPage = job.current_page || 0;
          const productsProcessed = job.products_processed || 0;
          const percentage = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

          setImportProgress({
            currentPage,
            totalPages,
            productsProcessed,
            percentage
          });

          // Check if job is complete
          if (job.status === 'completed' || job.status === 'failed' || job.status === 'quota_reached') {
            clearInterval(pollInterval);
            setImportingStoreId(null);
            
            if (job.status === 'completed') {
              setImportPhase('complete');
              setProductsImported(job.products_processed || 0);
              toast.success('Import terminé !', {
                description: `${job.products_processed} produits importés avec succès`
              });
            } else if (job.status === 'quota_reached') {
              setLimitReached(true);
              setProductsImported(job.products_processed || 0);
              toast.warning('Quota atteint', {
                description: 'Certains produits n\'ont pas été importés. Upgradez pour continuer.'
              });
            } else if (job.status === 'failed') {
              toast.error('Erreur d\'import', {
                description: job.error_message || 'Une erreur est survenue'
              });
              setShowProgressDialog(false);
            }
            
            setImportJobId(null);
            checkUsageLimits(); // Refresh usage limits
          }
        }
      } catch (error) {
        console.error('Error in polling:', error);
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, [importJobId]);

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
        
        // Update usage tracking - ALWAYS decrement shopify_stores_count
        const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
        const { data: usage } = await supabase
          .from('usage_tracking')
          .select('*')
          .eq('seller_id', user.id)
          .eq('month', currentMonth)
          .maybeSingle();
        
        if (usage) {
          await supabase
            .from('usage_tracking')
            .update({ 
              products_count: Math.max(0, (usage.products_count || 0) - (count || 0)),
              shopify_stores_count: Math.max(0, (usage.shopify_stores_count || 0) - 1)
            })
            .eq('id', usage.id);
        }

        // Refresh usage limits after deletion
        await checkUsageLimits();
      }
      
      toast.success('Boutique déconnectée avec succès');
      loadConnections();
      setShowDeleteDialog(false);
      setStoreToDelete(null);
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

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
          const timeoutMs = 30000; // 30 seconds timeout
          
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
          // Save the store for resuming after upgrade
          if (job.store_id) {
            const store = connections.find(c => c.id === job.store_id);
            if (store) {
              setPendingImportStore(store);
            }
          }
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

  const handleUpgradeFromImport = () => {
    setShowProgressDialog(false);
    setShowUpgradeDialog(true);
  };

  const handleUpgradeComplete = async () => {
    setShowUpgradeDialog(false);
    
    // Wait a bit for the subscription to be fully updated
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Refresh limits
    await checkUsageLimits();
    
    toast.success('Plan upgraded! Resuming import...', {
      description: 'Importing remaining products from your store'
    });
    
    // Resume import with the pending store
    if (pendingImportStore) {
      await importAllContent(pendingImportStore);
      setPendingImportStore(null);
    }
  };

  const importAllContent = async (store: ShopifyConnection) => {
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
        setPendingImportStore(store);
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
      setTotalShopifyProducts(0);
      setShowProgressDialog(true);

      const globalToastId = toast.loading('Import global en cours...');

      // 1. Import Products
      const { data: importData, error } = await supabase.functions.invoke('import-products', {
        body: requestBody
      });

      if (error) throw error;
      
      // Set total products count from Shopify
      if (importData?.totalShopifyProducts) {
        setTotalShopifyProducts(importData.totalShopifyProducts);
      }
      
      // Set job ID to start polling
      if (importData?.jobId) {
        setImportJobId(importData.jobId);
      }
      
      // 2. Import Articles
      try {
        const { data: articlesData, error: articlesError } = await supabase.functions.invoke('import-shopify-articles', {
          body: { 
            storeId: fullStore.id,
            shopName: cleanShopName,
            authToken: fullStore.access_token
          }
        });
        
        if (!articlesError && articlesData) {
          const count = articlesData.count || 0;
          setArticlesImported(count);
        }
      } catch (articleError) {
        console.error('❌ Error importing articles:', articleError);
      }

      // 3. Import Pages
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: pagesData } = await supabase.functions.invoke('import-shopify-pages', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: {
              storeId: fullStore.id,
              shopName: cleanShopName,
              apiSecret: fullStore.access_token,
            },
          });
          
          if (pagesData) {
            setPagesImported(pagesData.imported || 0);
          }
        }
      } catch (pageError) {
        console.error('❌ Error importing pages:', pageError);
      }

      // 4. Import Collections
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.functions.invoke('import-shopify-collections', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: {
              storeId: fullStore.id,
              shopName: cleanShopName,
              apiSecret: fullStore.access_token,
            },
          });
        }
      } catch (collectionError) {
        console.error('❌ Error importing collections:', collectionError);
      }

      toast.success('Import global terminé !', { id: globalToastId });
      
    } catch (error: any) {
      console.error('Error importing content:', error);
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
                      {usageLimits && (
                        <Badge variant="outline" className="text-xs">
                          {usageLimits.usage?.products_count || 0}/{usageLimits.limits?.max_products || 0} produits
                        </Badge>
                      )}
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
                    onClick={() => importAllContent(store)}
                    disabled={importingStoreId === store.id}
                    className="gap-2"
                    title="Importer les contenus"
                  >
                    {importingStoreId === store.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Import...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Importer
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openDeleteDialog(store.id)}
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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

      <ImportConfirmDialog
        open={showImportConfirm}
        onOpenChange={setShowImportConfirm}
        onConfirm={() => {
          if (storeToImport) {
            importAllContent(storeToImport);
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
        collectionsImported={0}
        imagesImported={0}
        importedItems={importedItems}
        limitReached={limitReached}
        maxProducts={maxProducts}
        totalShopifyProducts={totalShopifyProducts}
        onUpgrade={handleUpgradeFromImport}
      />

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType="optimizations"
        usage={usageLimits?.usage?.products_count}
        limit={usageLimits?.limits?.max_products}
        currentPlan={usageLimits?.plan_name}
        onUpgradeComplete={handleUpgradeComplete}
      />

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
