import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StoreDataCheckResult {
  hasData: boolean;
  loading: boolean;
  error: Error | null;
}

export function useStoreDataCheck(storeId: string | null | undefined): StoreDataCheckResult {
  const [hasData, setHasData] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      setHasData(true);
      return;
    }

    const checkStoreData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check multiple tables in parallel
        const [productsCheck, collectionsCheck, articlesCheck, pagesCheck] = await Promise.all([
          supabase
            .from('shopify_products')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', storeId),
          supabase
            .from('shopify_collections')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', storeId),
          supabase
            .from('blog_articles')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', storeId),
          supabase
            .from('shopify_pages')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', storeId),
        ]);

        // Calculate total count
        const totalCount = 
          (productsCheck.count || 0) +
          (collectionsCheck.count || 0) +
          (articlesCheck.count || 0) +
          (pagesCheck.count || 0);

        setHasData(totalCount > 0);
      } catch (err) {
        console.error('Error checking store data:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setHasData(true); // Default to true on error to avoid showing popup
      } finally {
        setLoading(false);
      }
    };

    checkStoreData();
  }, [storeId]);

  return { hasData, loading, error };
}
