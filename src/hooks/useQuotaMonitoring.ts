import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from './useNotifications';

const NOTIFICATION_COOLDOWN = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Hook to monitor business opportunities and send actionable notifications
 * - Checks SEO opportunities every 5 minutes
 * - Sends regular push notifications to encourage SEO optimization
 * - Uses cooldown period to avoid spamming (4 hours between notifications of same type)
 */
export function useQuotaMonitoring() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const checkInterval = useRef<NodeJS.Timeout>();

  const canSendNotification = (type: string): boolean => {
    const lastSent = localStorage.getItem(`last_seo_notification_${type}`);
    if (!lastSent) return true;
    
    const timeSince = Date.now() - parseInt(lastSent);
    return timeSince >= NOTIFICATION_COOLDOWN;
  };

  const markNotificationSent = (type: string) => {
    localStorage.setItem(`last_seo_notification_${type}`, Date.now().toString());
  };

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
        // First, get products for this user
        // @ts-ignore - Complex Supabase type causes TS deep instantiation error
        const { data: userProducts } = await supabase
          .from('shopify_products')
          .select('id')
          .eq('seller_id', user.id)
          .limit(200);

        let imagesWithoutAlt = 0;

        if (userProducts && userProducts.length > 0) {
          // Then, get images for those products without alt text
          // @ts-ignore - Complex Supabase type causes TS deep instantiation error
          const { data: imagesWithoutAltData } = await supabase
            .from('product_images')
            .select('id')
            .in('product_id', userProducts.map((p: any) => p.id))
            .is('alt_text', null)
            .limit(100);

          imagesWithoutAlt = imagesWithoutAltData?.length || 0;
        }

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

        // Send regular SEO optimization reminders with cooldown to avoid spam
        console.log('🎯 [QuotaMonitoring] Checking thresholds - Products:', unoptimizedProducts, 'Images:', imagesWithoutAlt, 'Collections:', unoptimizedCollections);
        
        // Products notification - sent if ANY unoptimized products exist (with cooldown)
        if (unoptimizedProducts > 0 && canSendNotification('products')) {
          console.log('✉️ [QuotaMonitoring] Sending products notification');
          await sendNotification({
            user_id: user.id,
            title: language === 'fr' 
              ? '🎯 Améliorez votre score SEO' 
              : '🎯 Improve Your SEO Score',
            message: language === 'fr'
              ? `${unoptimizedProducts} produit${unoptimizedProducts > 1 ? 's' : ''} ${unoptimizedProducts > 1 ? 'peuvent' : 'peut'} être optimisé${unoptimizedProducts > 1 ? 's' : ''} pour améliorer votre visibilité Google.`
              : `${unoptimizedProducts} product${unoptimizedProducts > 1 ? 's' : ''} can be optimized to improve your Google visibility.`,
            category: 'seo_task',
            priority: unoptimizedProducts >= 10 ? 'high' : 'medium',
            action_url: '/seo',
            action_label: language === 'fr' ? 'Optimiser maintenant' : 'Optimize now',
            language,
            force_browser: true,
          });
          markNotificationSent('products');
        }

        // Images notification - sent if ANY images without alt text exist (with cooldown)
        if (imagesWithoutAlt > 0 && canSendNotification('images')) {
          console.log('✉️ [QuotaMonitoring] Sending images notification');
          await sendNotification({
            user_id: user.id,
            title: language === 'fr' 
              ? '📸 Optimisez vos images' 
              : '📸 Optimize Your Images',
            message: language === 'fr'
              ? `${imagesWithoutAlt} image${imagesWithoutAlt > 1 ? 's' : ''} ${imagesWithoutAlt > 1 ? 'nécessitent' : 'nécessite'} un texte alternatif pour le SEO.`
              : `${imagesWithoutAlt} image${imagesWithoutAlt > 1 ? 's need' : ' needs'} alt text for SEO.`,
            category: 'seo_task',
            priority: imagesWithoutAlt >= 20 ? 'medium' : 'low',
            action_url: '/seo?tab=images',
            action_label: language === 'fr' ? 'Voir les images' : 'View images',
            language,
            force_browser: true,
          });
          markNotificationSent('images');
        }

        // Collections notification - sent if ANY unoptimized collections exist (with cooldown)
        if (unoptimizedCollections > 0 && canSendNotification('collections')) {
          console.log('✉️ [QuotaMonitoring] Sending collections notification');
          await sendNotification({
            user_id: user.id,
            title: language === 'fr' 
              ? '📂 Boostez vos collections' 
              : '📂 Boost Your Collections',
            message: language === 'fr'
              ? `${unoptimizedCollections} collection${unoptimizedCollections > 1 ? 's' : ''} ${unoptimizedCollections > 1 ? 'peuvent' : 'peut'} être optimisée${unoptimizedCollections > 1 ? 's' : ''} pour plus de visibilité.`
              : `${unoptimizedCollections} collection${unoptimizedCollections > 1 ? 's can' : ' can'} be optimized for more visibility.`,
            category: 'seo_task',
            priority: unoptimizedCollections >= 5 ? 'high' : 'medium',
            action_url: '/collections',
            action_label: language === 'fr' ? 'Optimiser' : 'Optimize',
            language,
            force_browser: true,
          });
          markNotificationSent('collections');
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
