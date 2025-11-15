import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useShopifyArticlesImport() {
  const [importing, setImporting] = useState(false);

  const importArticles = async (storeId: string) => {
    try {
      setImporting(true);
      console.log('📰 Starting Shopify articles import for store:', storeId);

      const { data, error } = await supabase.functions.invoke('import-shopify-articles', {
        body: { storeId }
      });

      if (error) {
        console.error('❌ Error importing articles:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Import failed');
      }

      console.log('✅ Articles imported successfully:', data);
      toast.success(`${data.articlesImported || 0} article(s) importé(s) avec succès`);
      
      return data;
    } catch (error: any) {
      console.error('❌ Error importing articles:', error);
      toast.error(error.message || 'Erreur lors de l\'importation des articles');
      throw error;
    } finally {
      setImporting(false);
    }
  };

  return { importArticles, importing };
}
