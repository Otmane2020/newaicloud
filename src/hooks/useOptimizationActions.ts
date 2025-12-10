import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUsageLimits } from './useUsageLimits';
import { useOptimizationNotifications } from './useOptimizationNotifications';

export type OptimizationAction = 'products' | 'collections' | 'alt_texts' | 'articles' | 'pages';

export interface OptimizationProgress {
  current: number;
  total: number;
  action: OptimizationAction | null;
}

export interface OptimizationResult {
  success: boolean;
  action: OptimizationAction;
  processedCount: number;
  errorMessage?: string;
  syncStatus?: {
    synced: number;
    failed: number;
    errors?: string[];
  };
}

export const useOptimizationActions = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState<OptimizationProgress>({ current: 0, total: 0, action: null });
  const { limits, refresh: refreshLimits } = useUsageLimits();
  const { sendOptimizationNotification } = useOptimizationNotifications();

  const optimizeProducts = async (productIds?: string[]): Promise<OptimizationResult> => {
    try {
      setProgress({ current: 0, total: 0, action: 'products' });

      // Check limits
      if (!limits?.canUseOptimizations) {
        return {
          success: false,
          action: 'products',
          processedCount: 0,
          errorMessage: 'Limite d\'optimisation atteinte'
        };
      }

      // Get products to optimize
      let query = supabase
        .from('shopify_products')
        .select('id, title, vendor, tags, image_url');

      if (productIds && productIds.length > 0) {
        query = query.in('id', productIds);
      } else {
        query = query.neq('enrichment_status', 'enriched');
      }

      const { data: products, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      if (!products || products.length === 0) {
        return { success: true, action: 'products', processedCount: 0 };
      }

      setProgress({ current: 0, total: products.length, action: 'products' });

      // Process products in batches
      const batchSize = 5;
      let processedCount = 0;

      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (product) => {
            try {
              const { error } = await supabase.functions.invoke('enrich-product', {
                body: { productId: product.id }
              });
              if (error) throw error;
              processedCount++;
              setProgress({ current: processedCount, total: products.length, action: 'products' });
            } catch (err) {
              console.error('Error enriching product:', product.id, err);
            }
          })
        );
      }

      await refreshLimits();
      
      // Send notification for completed optimizations
      if (processedCount > 0) {
        await sendOptimizationNotification(processedCount);
      }
      
      return { success: true, action: 'products', processedCount };
    } catch (error) {
      console.error('Error optimizing products:', error);
      return {
        success: false,
        action: 'products',
        processedCount: 0,
        errorMessage: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  };

  const optimizeCollections = async (collectionIds?: string[]): Promise<OptimizationResult> => {
    try {
      setProgress({ current: 0, total: 0, action: 'collections' });

      if (!limits?.canUseOptimizations) {
        return {
          success: false,
          action: 'collections',
          processedCount: 0,
          errorMessage: 'Limite d\'optimisation atteinte'
        };
      }

      let query = supabase
        .from('shopify_collections')
        .select('id, title, body_html, handle');

      if (collectionIds && collectionIds.length > 0) {
        query = query.in('id', collectionIds);
      } else {
        query = query.or('seo_title.is.null,seo_description.is.null');
      }

      const { data: collections, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      if (!collections || collections.length === 0) {
        return { success: true, action: 'collections', processedCount: 0 };
      }

      setProgress({ current: 0, total: collections.length, action: 'collections' });

      let processedCount = 0;
      const optimizedCollectionIds: string[] = [];
      
      for (const collection of collections) {
        try {
          const { error } = await supabase.functions.invoke('generate-collection-seo', {
            body: {
              collectionId: collection.id,
              title: collection.title,
              description: collection.body_html,
              handle: collection.handle
            }
          });
          if (error) throw error;
          processedCount++;
          optimizedCollectionIds.push(collection.id);
          setProgress({ current: processedCount, total: collections.length, action: 'collections' });
        } catch (err) {
          console.error('Error optimizing collection:', collection.id, err);
        }
      }

      // Note: Auto-sync to Shopify is now handled automatically by the generate-collection-seo edge function
      console.log(`✅ ${optimizedCollectionIds.length} collections optimized - auto-sync handled by edge function`);

      await refreshLimits();
      
      // Send notification for completed optimizations
      if (processedCount > 0) {
        await sendOptimizationNotification(processedCount);
      }
      
      return { success: true, action: 'collections', processedCount };
    } catch (error) {
      console.error('Error optimizing collections:', error);
      return {
        success: false,
        action: 'collections',
        processedCount: 0,
        errorMessage: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  };

  const generateAltTexts = async (imageIds?: string[]): Promise<OptimizationResult> => {
    try {
      setProgress({ current: 0, total: 0, action: 'alt_texts' });

      if (!limits?.canUseOptimizations) {
        return {
          success: false,
          action: 'alt_texts',
          processedCount: 0,
          errorMessage: "Limite d'optimisation atteinte",
        };
      }

      let query = supabase
        .from('product_images')
        .select('id, src, product_id, shopify_products!inner(title)');

      if (imageIds && imageIds.length > 0) {
        query = query.in('id', imageIds);
      } else {
        // Images sans alt_text (null ou vide)
        query = query.or('alt_text.is.null,alt_text.eq.');
      }

      const { data: images, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      if (!images || images.length === 0) {
        return { success: true, action: 'alt_texts', processedCount: 0 };
      }

      setProgress({ current: 0, total: images.length, action: 'alt_texts' });

      let processedCount = 0;
      let errorCount = 0;
      const batchSize = 5;

      for (let i = 0; i < images.length; i += batchSize) {
        // Check limits DURING batch processing to stop if quota runs out
        if (i > 0) { // Skip first check since we already checked before starting
          await refreshLimits();
          if (!limits?.canUseOptimizations || limits?.limitReached.optimizations) {
            console.log(`⛔ Arrêt de l'auto-optimisation: quota épuisé après ${processedCount} images`);
            break;
          }
        }

        const batch = images.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (img: any) => {
            try {
              const { error } = await supabase.functions.invoke('generate-alt-texts-vision', {
                body: {
                  image_id: img.id,
                  imageType: img.image_type || 'product',
                },
              });

              if (error) {
                console.error('Error generating ALT text (auto-optimization):', img.id, error);
                errorCount++;
              } else {
                processedCount++;
              }

              setProgress({
                current: processedCount + errorCount,
                total: images.length,
                action: 'alt_texts',
              });
            } catch (err) {
              console.error('Error generating ALT text (auto-optimization):', img.id, err);
              errorCount++;
              setProgress({
                current: processedCount + errorCount,
                total: images.length,
                action: 'alt_texts',
              });
            }
          })
        );
      }

      // Note: Auto-sync to Shopify is now handled automatically by the generate-alt-texts edge function
      console.log(`✅ ${processedCount} ALT texts generated - auto-sync handled by edge function`);

      await refreshLimits();

      if (processedCount > 0) {
        await sendOptimizationNotification(processedCount);
      }

      return { success: errorCount === 0, action: 'alt_texts', processedCount };
    } catch (error) {
      console.error('Error generating alt texts:', error);
      return {
        success: false,
        action: 'alt_texts',
        processedCount: 0,
        errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  };

  const optimizeArticles = async (articleIds?: string[]): Promise<OptimizationResult> => {
    try {
      setProgress({ current: 0, total: 0, action: 'articles' });

      if (!limits?.canUseArticles) {
        return {
          success: false,
          action: 'articles',
          processedCount: 0,
          errorMessage: 'Limite d\'articles atteinte'
        };
      }

      let query = supabase
        .from('blog_articles')
        .select('id, title, content');

      if (articleIds && articleIds.length > 0) {
        query = query.in('id', articleIds);
      } else {
        query = query.or('seo_title.is.null,seo_description.is.null');
      }

      const { data: articles, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      if (!articles || articles.length === 0) {
        return { success: true, action: 'articles', processedCount: 0 };
      }

      setProgress({ current: 0, total: articles.length, action: 'articles' });

      let processedCount = 0;
      const optimizedArticleIds: string[] = [];
      
      // Track sync status
      let syncedCount = 0;
      let syncFailedCount = 0;
      const syncErrors: string[] = [];
      
      for (const article of articles) {
        try {
          console.log('[OptimizeArticles] Optimizing article:', article.id, article.title);
          // NOTE: generate-article-seo expects article_ids array, not articleId
          const { data, error } = await supabase.functions.invoke('generate-article-seo', {
            body: {
              article_ids: [article.id]
            }
          });
          console.log('[OptimizeArticles] Result for', article.id, ':', { data, error });
          if (error) throw error;
          if (data?.error_count > 0) {
            console.warn('[OptimizeArticles] Article had errors:', data.results);
          }
          processedCount++;
          optimizedArticleIds.push(article.id);
          
          // Track sync status from results array
          if (data?.results && data.results.length > 0) {
            const result = data.results[0];
            if (result.shopifySynced === true) {
              syncedCount++;
            } else if (result.syncError) {
              syncFailedCount++;
              if (syncErrors.length < 3) {
                syncErrors.push(`${article.title}: ${result.syncError}`);
              }
            } else {
              syncFailedCount++;
            }
          }
          
          setProgress({ current: processedCount, total: articles.length, action: 'articles' });
        } catch (err) {
          console.error('[OptimizeArticles] Error optimizing article:', article.id, err);
        }
      }

      console.log(`✅ ${optimizedArticleIds.length} articles optimized - Sync: ${syncedCount} success, ${syncFailedCount} failed`);

      await refreshLimits();
      
      // Send notification for completed optimizations
      if (processedCount > 0) {
        await sendOptimizationNotification(processedCount);
      }
      
      return { 
        success: true, 
        action: 'articles', 
        processedCount,
        syncStatus: {
          synced: syncedCount,
          failed: syncFailedCount,
          errors: syncErrors
        }
      };
    } catch (error) {
      console.error('Error optimizing articles:', error);
      return {
        success: false,
        action: 'articles',
        processedCount: 0,
        errorMessage: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  };

  const optimizePages = async (pageIds?: string[]): Promise<OptimizationResult> => {
    try {
      setProgress({ current: 0, total: 0, action: 'pages' });

      if (!limits?.canUseOptimizations) {
        return {
          success: false,
          action: 'pages',
          processedCount: 0,
          errorMessage: 'Limite d\'optimisation atteinte'
        };
      }

      let query = supabase
        .from('shopify_pages')
        .select('id, title, body_html, handle');

      if (pageIds && pageIds.length > 0) {
        query = query.in('id', pageIds);
      } else {
        query = query.or('seo_title.is.null,seo_description.is.null');
      }

      const { data: pages, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      if (!pages || pages.length === 0) {
        return { success: true, action: 'pages', processedCount: 0 };
      }

      setProgress({ current: 0, total: pages.length, action: 'pages' });

      let processedCount = 0;
      const optimizedPageIds: string[] = [];
      
      // Track sync status
      let syncedCount = 0;
      let syncFailedCount = 0;
      const syncErrors: string[] = [];
      
      for (const page of pages) {
        try {
          console.log('[OptimizePages] Optimizing page:', page.id, page.title);
          const { data, error } = await supabase.functions.invoke('generate-page-seo', {
            body: {
              pageId: page.id,
              title: page.title,
              content: page.body_html,
              handle: page.handle
            }
          });
          console.log('[OptimizePages] Result for', page.id, ':', { data, error });
          if (error) throw error;
          processedCount++;
          optimizedPageIds.push(page.id);
          
          // Track sync status from response
          if (data?.shopifySynced === true) {
            syncedCount++;
          } else if (data?.syncError) {
            syncFailedCount++;
            if (syncErrors.length < 3) {
              syncErrors.push(`${page.title}: ${data.syncError}`);
            }
          } else {
            // No shopify_page_id or sync not attempted
            syncFailedCount++;
          }
          
          setProgress({ current: processedCount, total: pages.length, action: 'pages' });
        } catch (err) {
          console.error('[OptimizePages] Error optimizing page:', page.id, err);
        }
      }

      console.log(`✅ ${optimizedPageIds.length} pages optimized - Sync: ${syncedCount} success, ${syncFailedCount} failed`);

      await refreshLimits();
      
      // Send notification for completed optimizations
      if (processedCount > 0) {
        await sendOptimizationNotification(processedCount);
      }
      
      return { 
        success: true, 
        action: 'pages', 
        processedCount,
        syncStatus: {
          synced: syncedCount,
          failed: syncFailedCount,
          errors: syncErrors
        }
      };
    } catch (error) {
      console.error('Error optimizing pages:', error);
      return {
        success: false,
        action: 'pages',
        processedCount: 0,
        errorMessage: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  };

  const syncToShopify = async (type: 'products' | 'collections' | 'articles' | 'pages', ids?: string[]): Promise<boolean> => {
    try {
      let functionName = '';
      let bodyKey = '';

      switch (type) {
        case 'products':
          functionName = 'sync-seo-to-shopify';
          bodyKey = 'productIds';
          break;
        case 'collections':
          functionName = 'sync-collection-image-to-shopify';
          bodyKey = 'collectionIds';
          break;
        case 'articles':
          functionName = 'sync-blog-to-shopify';
          bodyKey = 'articleIds';
          break;
        case 'pages':
          functionName = 'sync-page-to-shopify';
          bodyKey = 'pageIds';
          break;
      }

      const { error } = await supabase.functions.invoke(functionName, {
        body: { [bodyKey]: ids }
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error syncing to Shopify:', error);
      toast.error('Erreur lors de la synchronisation');
      return false;
    }
  };

  return {
    isOptimizing,
    progress,
    optimizeProducts,
    optimizeCollections,
    generateAltTexts,
    optimizeArticles,
    optimizePages,
    syncToShopify,
    setIsOptimizing
  };
};
