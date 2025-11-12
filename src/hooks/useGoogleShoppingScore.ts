import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GoogleShoppingScoreData {
  score: number;
  totalProducts: number;
  optimizedProducts: number;
  loading: boolean;
}

export function useGoogleShoppingScore(userId: string | undefined, storeId: string | undefined) {
  const [data, setData] = useState<GoogleShoppingScoreData>({
    score: 0,
    totalProducts: 0,
    optimizedProducts: 0,
    loading: true,
  });

  useEffect(() => {
    if (!userId || !storeId) {
      setData({ score: 0, totalProducts: 0, optimizedProducts: 0, loading: false });
      return;
    }

    const fetchScore = async () => {
      try {
        const { data: products, error } = await supabase
          .from('shopify_products')
          .select('id, google_product_category, google_gtin, google_white_background')
          .eq('seller_id', userId)
          .eq('store_id', storeId);

        if (error) throw error;

        const totalProducts = products?.length || 0;
        const optimizedProducts = products?.filter(p => 
          p.google_product_category && p.google_gtin && p.google_white_background
        ).length || 0;

        const score = totalProducts > 0 
          ? Math.round((optimizedProducts / totalProducts) * 100) 
          : 0;

        setData({
          score,
          totalProducts,
          optimizedProducts,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching Google Shopping score:', error);
        setData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchScore();

    // Refresh every 30 seconds
    const interval = setInterval(fetchScore, 30000);
    return () => clearInterval(interval);
  }, [userId, storeId]);

  return data;
}
