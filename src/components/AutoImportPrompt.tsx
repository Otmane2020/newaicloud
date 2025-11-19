import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { useStoreDataCheck } from '@/hooks/useStoreDataCheck';
import { ImportConfirmDialog } from '@/components/integration/ImportConfirmDialog';
import { SimpleSyncProgress } from '@/components/integration/SyncProgressDialog';
import { SyncResultDialog } from '@/components/integration/SyncResultDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function AutoImportPrompt() {
  const navigate = useNavigate();
  const { selectedStore } = useStore();
  const { hasData, loading } = useStoreDataCheck(selectedStore?.id);
  const [showDialog, setShowDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [currentType, setCurrentType] = useState('products');
  const [showResults, setShowResults] = useState(false);
  const [syncStats, setSyncStats] = useState<any>(null);

  useEffect(() => {
    if (loading || !selectedStore) {
      setShowDialog(false);
      return;
    }

    // Show dialog immediately if no data found
    setShowDialog(!hasData);
  }, [hasData, loading, selectedStore]);

  const handleConfirm = async () => {
    setShowDialog(false);
    setIsImporting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedStore) {
        toast.error("Erreur d'authentification");
        setIsImporting(false);
        return;
      }

      // Get Shopify connection
      const { data: connection } = await supabase
        .from('shopify_connections')
        .select('store_url, access_token')
        .eq('id', selectedStore.id)
        .single();

      if (!connection) {
        toast.error("Connexion Shopify introuvable");
        setIsImporting(false);
        return;
      }

      // Extract shop name
      const shopName = connection.store_url
        .replace(/^https?:\/\//, '')
        .replace(/\.myshopify\.com.*$/, '');

      const typesToImport = ['products', 'collections', 'pages', 'articles', 'images'];
      
      // Count before
      const beforeCounts: Record<string, number> = {};
      for (const type of typesToImport) {
        setCurrentType(type);
        
        let count = 0;
        switch (type) {
          case 'products':
            const { count: prodCount } = await supabase
              .from('shopify_products')
              .select('*', { count: 'exact', head: true })
              .eq('seller_id', user.id);
            count = prodCount || 0;
            break;
          case 'collections':
            const { count: collCount } = await supabase
              .from('shopify_collections')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id);
            count = collCount || 0;
            break;
          case 'pages':
            const { count: pageCount } = await supabase
              .from('shopify_pages')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id);
            count = pageCount || 0;
            break;
          case 'articles':
            const { count: artCount } = await supabase
              .from('blog_articles')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id);
            count = artCount || 0;
            break;
          case 'images':
            const { data: userProducts } = await supabase
              .from('shopify_products')
              .select('id')
              .eq('seller_id', user.id);
            
            const productIds = userProducts?.map(p => p.id) || [];
            
            const { count: prodImgCount } = await supabase
              .from('product_images')
              .select('*', { count: 'exact', head: true })
              .in('product_id', productIds);
            
            const { count: contentImgCount } = await supabase
              .from('content_images')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id);
            
            count = (prodImgCount || 0) + (contentImgCount || 0);
            break;
        }
        beforeCounts[type] = count;
      }

      // Call edge function
      setCurrentType('products');
      const { data: result, error } = await supabase.functions.invoke('shopify-import', {
        body: {
          shopName,
          authToken: connection.access_token,
          userId: user.id,
          storeId: selectedStore.id,
          types: typesToImport,
        },
      });

      if (error) throw error;

      // Count after
      const afterCounts: Record<string, number> = {};
      for (const type of typesToImport) {
        let count = 0;
        switch (type) {
          case 'products':
            const { count: prodCount } = await supabase
              .from('shopify_products')
              .select('*', { count: 'exact', head: true })
              .eq('seller_id', user.id);
            count = prodCount || 0;
            break;
          case 'collections':
            const { count: collCount } = await supabase
              .from('shopify_collections')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id);
            count = collCount || 0;
            break;
          case 'pages':
            const { count: pageCount } = await supabase
              .from('shopify_pages')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id);
            count = pageCount || 0;
            break;
          case 'articles':
            const { count: artCount } = await supabase
              .from('blog_articles')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id);
            count = artCount || 0;
            break;
          case 'images':
            const { data: userProducts } = await supabase
              .from('shopify_products')
              .select('id')
              .eq('seller_id', user.id);
            
            const productIds = userProducts?.map(p => p.id) || [];
            
            const { count: prodImgCount } = await supabase
              .from('product_images')
              .select('*', { count: 'exact', head: true })
              .in('product_id', productIds);
            
            const { count: contentImgCount } = await supabase
              .from('content_images')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id);
            
            count = (prodImgCount || 0) + (contentImgCount || 0);
            break;
        }
        afterCounts[type] = count;
      }

      // Calculate stats
      const stats: any = {};
      typesToImport.forEach(type => {
        stats[type] = {
          before: beforeCounts[type],
          after: afterCounts[type],
          imported: afterCounts[type] - beforeCounts[type],
        };
      });

      const totalImported = Object.values(stats).reduce(
        (sum, stat: any) => sum + stat.imported, 
        0
      );

      setSyncStats({ stats, totalImported });
      setIsImporting(false);
      setShowResults(true);
      toast.success("Import terminé avec succès !");
      
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || "Erreur lors de l'import");
      setIsImporting(false);
    }
  };

  if (!selectedStore) {
    return null;
  }

  return (
    <>
      <ImportConfirmDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onConfirm={handleConfirm}
        storeName={selectedStore.store_name}
      />
      
      <SimpleSyncProgress
        open={isImporting}
        currentType={currentType}
      />
      
      {syncStats && (
        <SyncResultDialog
          open={showResults}
          onOpenChange={setShowResults}
          stats={syncStats.stats}
          totalImported={syncStats.totalImported}
        />
      )}
    </>
  );
}
