import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAutoSyncProgress } from '@/contexts/AutoSyncContext';

/**
 * Hook qui écoute les nouvelles connexions Shopify et déclenche automatiquement
 * la synchronisation pour tous les flux (OAuth et API)
 */
export const useAutoSync = (userId: string | undefined) => {
  const { startSync, updateType, endSync } = useAutoSyncProgress();
  const syncCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;

    console.log('🔄 [AutoSync] Monitoring new Shopify connections for user:', userId);

    // Check if there's a pending sync from onboarding page
    const pendingSync = sessionStorage.getItem('pending_sync');
    if (pendingSync && window.location.pathname === '/dashboard') {
      console.log('✅ [AutoSync] Found pending sync, showing dialog on dashboard:', pendingSync);
      sessionStorage.removeItem('pending_sync');
      startSync(pendingSync);
      
      // Poll sync_history to check when import is complete
      const checkSyncStatus = async () => {
        const { data: latestSync } = await supabase
          .from('sync_history')
          .select('status, items_synced')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (latestSync && (latestSync.status === 'success' || latestSync.status === 'failed')) {
          console.log('✅ [AutoSync] Import completed:', latestSync);
          if (syncCheckIntervalRef.current) {
            clearInterval(syncCheckIntervalRef.current);
            syncCheckIntervalRef.current = null;
          }
          endSync();
          
          if (latestSync.status === 'success') {
            toast.success('Synchronisation terminée', {
              description: `${latestSync.items_synced || 0} éléments importés avec succès`,
            });
          }
        }
      };
      
      // Check immediately then every 3 seconds
      checkSyncStatus();
      syncCheckIntervalRef.current = setInterval(checkSyncStatus, 3000);
      
      // Failsafe: close after 2 minutes maximum
      setTimeout(() => {
        if (syncCheckIntervalRef.current) {
          clearInterval(syncCheckIntervalRef.current);
          syncCheckIntervalRef.current = null;
        }
        endSync();
      }, 120000);
    }

    // Écouter les insertions ET updates dans shopify_connections
    const channel = supabase
      .channel('shopify-connection-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Écouter INSERT et UPDATE
          schema: 'public',
          table: 'shopify_connections',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('🆕 [AutoSync] Shopify connection event:', payload.eventType, payload.new);
          
          const connection = payload.new as any;
          
          // Ne déclencher que si c'est une vraie nouvelle connexion (INSERT) 
          // ou un UPDATE qui vient juste d'être connecté
          const isNewConnection = payload.eventType === 'INSERT';
          const isJustConnected = payload.eventType === 'UPDATE' && 
                                 connection.connected_at && 
                                 new Date(connection.connected_at).getTime() > Date.now() - 5000;
          
          if (!isNewConnection && !isJustConnected) {
            console.log('⏭️ [AutoSync] Skipping - not a new connection');
            return;
          }

          // ✅ For OAuth connections, show progress dialog on dashboard
          // Backend handles actual import via trigger-auto-sync
          if (connection.connection_type === 'oauth') {
            console.log('⏭️ [AutoSync] OAuth connection detected - backend will handle import');
            
            const storeName = connection.store_name || connection.store_url;
            
            // Si on est sur /onboarding, stocker pour afficher après redirection
            if (window.location.pathname.startsWith('/onboarding')) {
              console.log('⏭️ [AutoSync] On onboarding page, storing sync for dashboard display');
              sessionStorage.setItem('pending_sync', storeName);
              return;
            }
            
            // Si on est déjà sur dashboard, afficher immédiatement et surveiller l'état
            console.log('✅ [AutoSync] On dashboard, showing sync dialog and monitoring import');
            startSync(storeName);
            
            // Poll sync_history to check when import is complete
            const checkSyncStatus = async () => {
              const { data: latestSync } = await supabase
                .from('sync_history')
                .select('status, items_synced')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
              
              if (latestSync && (latestSync.status === 'success' || latestSync.status === 'failed')) {
                console.log('✅ [AutoSync] Import completed:', latestSync);
                if (syncCheckIntervalRef.current) {
                  clearInterval(syncCheckIntervalRef.current);
                  syncCheckIntervalRef.current = null;
                }
                endSync();
                
                if (latestSync.status === 'success') {
                  toast.success('Synchronisation terminée', {
                    description: `${latestSync.items_synced || 0} éléments importés avec succès`,
                  });
                }
              }
            };
            
            // Check immediately then every 3 seconds
            checkSyncStatus();
            syncCheckIntervalRef.current = setInterval(checkSyncStatus, 3000);
            
            // Failsafe: close after 2 minutes maximum
            setTimeout(() => {
              if (syncCheckIntervalRef.current) {
                clearInterval(syncCheckIntervalRef.current);
                syncCheckIntervalRef.current = null;
              }
              endSync();
            }, 120000);
            
            return;
          }
          
          // ✅ For API connections, verify subscription status before importing
          // (OAuth connections are handled by backend trigger-auto-sync)
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_status, onboarding_completed')
            .eq('id', userId)
            .single();
          
          if (!profile?.subscription_status || 
              !['active', 'trialing'].includes(profile.subscription_status)) {
            console.log('⏸️ [AutoSync] User has no active subscription, skipping auto-sync');
            toast.info('Plan requis', {
              description: 'Veuillez sélectionner un plan pour synchroniser vos produits.',
            });
            return;
          }
          
          console.log('✅ [AutoSync] User has active subscription, proceeding with sync');
          
          // Attendre que la connexion soit complètement établie
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const storeName = connection.store_name || connection.store_url;
          console.log('🚀 [AutoSync] Starting automatic sync for:', storeName);
          
          // Afficher le dialog de progression
          startSync(storeName);
          
          try {
            // Extraire le shop name
            const shopName = connection.store_url
              .replace(/^https?:\/\//, '')
              .replace(/\.myshopify\.com.*$/, '');

            // Récupérer l'access token
            const { data: storeData } = await supabase
              .from('shopify_connections')
              .select('access_token, available_scopes')
              .eq('id', connection.id)
              .single();

            if (!storeData?.access_token) {
              throw new Error('Access token not found');
            }

            const typesToImport = ['products', 'collections', 'pages', 'articles', 'images'];
            
            // Importer chaque type
            for (const type of typesToImport) {
              updateType(type);
              console.log(`📦 [AutoSync] Importing ${type}...`);
              
              // Appeler la fonction d'import appropriée
              const functionName = type === 'articles' ? 'import-shopify-articles' :
                                 type === 'images' ? 'import-content-images' :
                                 `import-shopify-${type}`;
              
              try {
                await supabase.functions.invoke(functionName, {
                  body: {
                    shopName,
                    authToken: storeData.access_token,
                    userId,
                    storeId: connection.id,
                  },
                });
              } catch (error) {
                console.error(`❌ [AutoSync] Error importing ${type}:`, error);
              }
              
              // Petit délai entre chaque type
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            console.log('✅ [AutoSync] Automatic sync completed for:', storeName);
            toast.success(`Synchronisation terminée pour ${storeName}`, {
              description: 'Vos données Shopify sont maintenant à jour',
            });
            
          } catch (error) {
            console.error('❌ [AutoSync] Error during automatic sync:', error);
            toast.error('Erreur lors de la synchronisation automatique', {
              description: error instanceof Error ? error.message : 'Une erreur est survenue',
            });
          } finally {
            endSync();
          }
        }
      )
      .subscribe((status) => {
        console.log('🔴 [AutoSync] Subscription status:', status);
      });

    return () => {
      console.log('⏹️ [AutoSync] Unsubscribing from connection changes');
      supabase.removeChannel(channel);
      if (syncCheckIntervalRef.current) {
        clearInterval(syncCheckIntervalRef.current);
        syncCheckIntervalRef.current = null;
      }
    };
  }, [userId, startSync, updateType, endSync]);
};
