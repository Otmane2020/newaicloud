import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ShopifyConnection {
  id: string;
  store_url: string;
  store_name: string;
}

interface PermissionScopes {
  products?: boolean;
  collections?: boolean;
  pages?: boolean;
  articles?: boolean;
  images?: boolean;
}

export const useShopifySync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentSyncType, setCurrentSyncType] = useState<string>('');

  const syncShopifyStore = async (storeToSync: ShopifyConnection) => {
    if (!storeToSync) {
      toast.error("Aucun magasin sélectionné");
      return;
    }

    setIsSyncing(true);
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

      // Get access token and permissions
      const { data: storeData, error: storeError } = await supabase
        .from('shopify_connections')
        .select('access_token, available_scopes')
        .eq('id', storeToSync.id)
        .single();

      if (storeError || !storeData) {
        console.error('❌ [SYNC ERROR] Failed to fetch store data:', storeError);
        throw new Error("Store not found");
      }
      console.log('✅ [SYNC TOKEN] Access token retrieved');

      const permissions = (storeData.available_scopes as PermissionScopes) || {
        products: true,
        collections: true,
        pages: true,
        articles: true,
        images: true
      };
      console.log('🔐 [SYNC PERMISSIONS] Available permissions:', permissions);

      // Create sync history entry
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
        } else if (entry) {
          historyId = entry.id;
          console.log('✅ [SYNC HISTORY] History entry created:', historyId);
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

      // Build content types array based on permissions
      const types: string[] = [];
      if (permissions.products) {
        types.push('products', 'costs');
      }
      if (permissions.collections) {
        types.push('collections');
      }
      if (permissions.pages) {
        types.push('pages');
      }
      if (permissions.articles) {
        types.push('articles');
      }
      if (permissions.images && permissions.products) {
        types.push('images');
      }

      console.log('📋 [SYNC CONTENT TYPES] Will sync these types:', types);

      if (types.length === 0) {
        throw new Error('Aucune permission API disponible pour la synchronisation');
      }

      const importResults: Record<string, number> = {};
      const errorMessages: string[] = [];
      
      console.log('🚀 [SYNC IMPORT] Starting import for all content types...');
      
      for (const type of types) {
        setCurrentSyncType(type);
        console.log(`📦 [SYNC ${type.toUpperCase()}] Starting import...`);
        
        try {
          let result;
          const timeoutMs = 180000; // 3 minutes timeout for large imports
          
          const executeWithTimeout = async (promise: Promise<any>) => {
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Function timeout after 3 minutes')), timeoutMs)
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
            case 'costs':
              result = await executeWithTimeout(
                supabase.functions.invoke('import-costs-from-shopify', {
                  body: { 
                    shopName, 
                    apiSecret: storeData.access_token, 
                    storeId: storeToSync.id 
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
              console.log('📰 [SYNC ARTICLES] Starting article import...');
              result = await executeWithTimeout(
                supabase.functions.invoke('import-shopify-articles', {
                  body: { 
                    shopName, 
                    authToken: storeData.access_token, 
                    storeId: storeToSync.id 
                  }
                })
              );
              console.log('📰 [SYNC ARTICLES] Article import result:', result);
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
            // Check if this is a scope error (permission not granted)
            if (result?.data?.scopeError) {
              console.log(`⚠️ [SYNC ${type.toUpperCase()}] Skipped due to missing permissions:`, result.data.message);
              importResults[type] = 0;
              // Don't add to error messages, this is expected behavior
            } else {
              const imported = result?.data?.totalImported || result?.data?.count || result?.data?.imported || 0;
              importResults[type] = imported;
              console.log(`✅ [SYNC ${type.toUpperCase()}] Imported:`, imported);
            }
          }
        } catch (error: any) {
          console.error(`❌ [SYNC ${type.toUpperCase()} EXCEPTION]`, error);
          
          // Better error messaging
          let errorMsg = `${type}: `;
          if (error.message?.includes('FunctionsRelayError')) {
            errorMsg += 'Edge function non disponible ou non déployée';
          } else if (error.message?.includes('timeout')) {
            errorMsg += 'Timeout après 3 minutes';
          } else if (error.message?.includes('Failed to send')) {
            errorMsg += `Impossible d'invoquer la fonction - ${error.message}`;
          } else {
            errorMsg += error.message || 'Erreur inconnue';
          }
          
          errorMessages.push(errorMsg);
          importResults[type] = 0;
        }
      }

      const totalImported = Object.values(importResults).reduce((sum, val) => sum + val, 0);
      const duration = Date.now() - startTime;

      console.log('📊 [SYNC STATS] Total imported:', totalImported, 'Duration:', duration, 'ms');

      // Update history entry
      if (historyId) {
        console.log('📝 [SYNC HISTORY] Updating history entry:', historyId);
        try {
          await supabase
            .from('sync_history')
            .update({
              status: errorMessages.length > 0 ? 'failed' : 'success',
              items_synced: totalImported,
              duration_ms: duration,
              completed_at: new Date().toISOString(),
              error_message: errorMessages.length > 0 ? errorMessages.join('; ') : null,
            })
            .eq('id', historyId);
        } catch (historyUpdateError) {
          console.error('❌ [SYNC HISTORY UPDATE EXCEPTION]', historyUpdateError);
        }
      }

      // Note: product-collection links are now synced automatically by import-products edge function

      if (errorMessages.length > 0) {
        toast.warning(`Synchronisation terminée avec des erreurs: ${totalImported} éléments importés`);
      } else {
        toast.success(`Synchronisation réussie: ${totalImported} éléments importés`);
      }

    } catch (error: any) {
      console.error("❌ [SYNC FATAL ERROR]", error);
      
      // Update history as failed
      if (historyId) {
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
        } catch (historyUpdateError) {
          console.error('❌ [SYNC HISTORY UPDATE ERROR]', historyUpdateError);
        }
      }

      toast.error(`Erreur: ${error.message}`);
    } finally {
      // Update timestamps
      if (user && storeToSync) {
        try {
          await supabase
            .from('shopify_connections')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', storeToSync.id);

          await supabase
            .from('shopify_sync_settings')
            .update({ last_import_at: new Date().toISOString() })
            .eq('user_id', user.id);
        } catch (timestampError) {
          console.error('❌ [SYNC TIMESTAMP ERROR]', timestampError);
        }
      }
      
      setIsSyncing(false);
      setCurrentSyncType('');
    }
  };

  return {
    isSyncing,
    currentSyncType,
    syncShopifyStore,
  };
};
