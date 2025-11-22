import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';

export function useShopifyArticlesImport() {
  const [importing, setImporting] = useState(false);
  const { t } = useTranslation();

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
      toast.success(t.blog.management.messages.importSuccess
        .replace('{{totalArticles}}', String(data.articlesImported || 0))
        .replace('{{totalImages}}', '0'));
      
      return data;
    } catch (error: any) {
      console.error('❌ Error importing articles:', error);
      toast.error(t.blog.management.messages.importError);
      throw error;
    } finally {
      setImporting(false);
    }
  };

  return { importArticles, importing };
}
