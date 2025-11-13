import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';

/**
 * Hook to fetch and manage the public domain for the selected Shopify store
 * Automatically fetches the domain from Shopify API if not present in database
 * Filters out .myshopify.com domains and uses the real public domain
 */
export function useStoreDomain() {
  const { selectedStore } = useStore();
  const [domain, setDomain] = useState<string>('example.com');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndUpdateDomain = async () => {
      if (!selectedStore?.id) {
        setDomain('example.com');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Check if we already have a valid public_domain in the store context
        if (selectedStore.public_domain && !selectedStore.public_domain.includes('.myshopify.com')) {
          console.log('✅ Using cached public_domain:', selectedStore.public_domain);
          setDomain(selectedStore.public_domain);
          setLoading(false);
          return;
        }

        // If no public_domain or it's a myshopify domain, try to fetch from Shopify
        if (selectedStore.access_token && selectedStore.store_url) {
          console.log('🔄 Fetching domain from Shopify API...');
          
          try {
            const shopifyUrl = selectedStore.store_url.includes('https://') 
              ? selectedStore.store_url 
              : `https://${selectedStore.store_url}`;
            
            const response = await fetch(`${shopifyUrl}/admin/api/2025-10/shop.json`, {
              headers: {
                'X-Shopify-Access-Token': selectedStore.access_token,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const shopData = await response.json();
              const shopifyDomain = shopData.shop?.domain;

              if (shopifyDomain && !shopifyDomain.includes('.myshopify.com')) {
                console.log('✅ Fetched domain from Shopify:', shopifyDomain);
                setDomain(shopifyDomain);

                // Update the database for future use
                await supabase
                  .from('shopify_connections')
                  .update({ public_domain: shopifyDomain })
                  .eq('id', selectedStore.id);

                console.log('✅ Updated public_domain in database');
                setLoading(false);
                return;
              }
            }
          } catch (err) {
            console.error('❌ Error fetching from Shopify API:', err);
          }
        }

        // Fallback: use store_url if available and not a myshopify domain
        if (selectedStore.store_url) {
          const cleanUrl = selectedStore.store_url
            .replace(/^https?:\/\//, '')
            .replace(/\/$/, '');
          
          if (!cleanUrl.includes('.myshopify.com')) {
            console.log('⚠️ Using store_url as fallback:', cleanUrl);
            setDomain(cleanUrl);
            setLoading(false);
            return;
          }
        }

        // Last resort: use placeholder
        console.log('⚠️ No valid domain found, using placeholder');
        setDomain('example.com');
      } catch (error) {
        console.error('❌ Error in useStoreDomain:', error);
        setDomain('example.com');
      } finally {
        setLoading(false);
      }
    };

    fetchAndUpdateDomain();
  }, [selectedStore?.id, selectedStore?.public_domain, selectedStore?.access_token, selectedStore?.store_url]);

  return { domain, loading };
}
