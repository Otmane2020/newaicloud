import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from './useNotifications';

/**
 * Hook to monitor business opportunities and send actionable notifications
 * - Checks SEO opportunities every 5 minutes
 * - Sends business-oriented notifications about optimization opportunities
 * - Prevents duplicate notifications using database tracking
 */
export function useQuotaMonitoring() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const checkInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!user) {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
      return;
    }

    const checkBusinessOpportunities = async () => {
      console.log('🔍 [QuotaMonitoring] Checking business opportunities...');
      try {
        const language = (navigator.language.startsWith('en') ? 'en' : 'fr') as 'fr' | 'en';
        console.log('🌐 [QuotaMonitoring] Language detected:', language);

        // Check for products needing optimization
        // @ts-ignore - Complex Supabase type causes TS deep instantiation error
        const { data: productsWithoutTitle } = await supabase
          .from('shopify_products')
          .select('id')
          .eq('seller_id', user.id)
          .is('seo_title', null)
          .limit(50);

        // @ts-ignore - Complex Supabase type causes TS deep instantiation error
        const { data: productsWithoutDesc } = await supabase
          .from('shopify_products')
          .select('id')
          .eq('seller_id', user.id)
          .is('seo_description', null)
          .limit(50);

        const unoptimizedProducts = Math.max(
          productsWithoutTitle?.length || 0,
          productsWithoutDesc?.length || 0
        );
        console.log('📦 [QuotaMonitoring] Unoptimized products:', unoptimizedProducts);

        // Check for images needing alt text
        // @ts-ignore - Complex Supabase type causes TS deep instantiation error
        const { data: imagesWithoutAltData } = await supabase
          .from('product_images')
          .select('id')
          .eq('user_id', user.id)
          .is('alt_text', null)
          .limit(100);

        const imagesWithoutAlt = imagesWithoutAltData?.length || 0;
        console.log('🖼️ [QuotaMonitoring] Images without alt:', imagesWithoutAlt);

        // Check for collections needing optimization
        // @ts-ignore - Complex Supabase type causes TS deep instantiation error
        const { data: collectionsWithoutTitle } = await supabase
          .from('shopify_collections')
          .select('id')
          .eq('user_id', user.id)
          .is('seo_title', null)
          .limit(25);

        // @ts-ignore - Complex Supabase type causes TS deep instantiation error
        const { data: collectionsWithoutDesc } = await supabase
          .from('shopify_collections')
          .select('id')
          .eq('user_id', user.id)
          .is('seo_description', null)
          .limit(25);

        const unoptimizedCollections = Math.max(
          collectionsWithoutTitle?.length || 0,
          collectionsWithoutDesc?.length || 0
        );
        console.log('📂 [QuotaMonitoring] Unoptimized collections:', unoptimizedCollections);

        // Send business-oriented notifications only if significant opportunities exist
        console.log('🎯 [QuotaMonitoring] Checking thresholds - Products:', unoptimizedProducts, 'Images:', imagesWithoutAlt, 'Collections:', unoptimizedCollections);
        
        if (unoptimizedProducts >= 5) {
          console.log('✉️ [QuotaMonitoring] Sending products notification');
          await sendNotification({
            user_id: user.id,
            title: language === 'fr' 
              ? '🎯 Opportunités SEO détectées' 
              : '🎯 SEO Opportunities Detected',
            message: language === 'fr'
              ? `${unoptimizedProducts}+ produits peuvent être optimisés pour améliorer votre visibilité Google.`
              : `${unoptimizedProducts}+ products can be optimized to improve your Google visibility.`,
            category: 'seo_task',
            priority: 'medium',
            action_url: '/seo',
            action_label: language === 'fr' ? 'Optimiser maintenant' : 'Optimize now',
            language,
            force_browser: true,
          });
        }

        if (imagesWithoutAlt >= 10) {
          console.log('✉️ [QuotaMonitoring] Sending images notification');
          await sendNotification({
            user_id: user.id,
            title: language === 'fr' 
              ? '📸 Images à optimiser' 
              : '📸 Images to Optimize',
            message: language === 'fr'
              ? `${imagesWithoutAlt}+ images n'ont pas de texte alternatif. Améliorez votre référencement image.`
              : `${imagesWithoutAlt}+ images are missing alt text. Improve your image SEO.`,
            category: 'seo_task',
            priority: 'low',
            action_url: '/seo?tab=images',
            action_label: language === 'fr' ? 'Voir les images' : 'View images',
            language,
            force_browser: true,
          });
        }

        if (unoptimizedCollections >= 3) {
          console.log('✉️ [QuotaMonitoring] Sending collections notification');
          await sendNotification({
            user_id: user.id,
            title: language === 'fr' 
              ? '📂 Collections à optimiser' 
              : '📂 Collections to Optimize',
            message: language === 'fr'
              ? `${unoptimizedCollections}+ collections nécessitent une optimisation SEO.`
              : `${unoptimizedCollections}+ collections need SEO optimization.`,
            category: 'seo_task',
            priority: 'medium',
            action_url: '/collections',
            action_label: language === 'fr' ? 'Optimiser' : 'Optimize',
            language,
            force_browser: true,
          });
        }
      } catch (error) {
        console.error('❌ [QuotaMonitoring] Error checking business opportunities:', error);
      }
    };

    // Check after 30 seconds then every 5 minutes
    console.log('⏰ [QuotaMonitoring] Scheduling initial check in 30 seconds...');
    const initialTimer = setTimeout(checkBusinessOpportunities, 30000);
    checkInterval.current = setInterval(checkBusinessOpportunities, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [user, sendNotification]);

  return {
    // Hook runs automatically, no return needed
  };
}
