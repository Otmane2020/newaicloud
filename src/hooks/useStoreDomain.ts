import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';

// Global cache to prevent multiple simultaneous calls
const domainCache = new Map<string, { domain: string; timestamp: number }>();
const ongoingRequests = new Map<string, Promise<string>>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
          console.log('✅ [DOMAIN] Using cached public_domain:', selectedStore.public_domain);
          setDomain(selectedStore.public_domain);
          setLoading(false);
          return;
        }

        // Check global cache first
        const cached = domainCache.get(selectedStore.id);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          console.log('✅ [DOMAIN] Using global cache:', cached.domain);
          setDomain(cached.domain);
          setLoading(false);
          return;
        }

        // Check if there's already an ongoing request for this store
        let domainPromise = ongoingRequests.get(selectedStore.id);
        
        if (!domainPromise) {
          // Create new request
          domainPromise = (async () => {
            console.log('🔄 [DOMAIN] Fetching domain using edge function...');
            try {
              const { data: domainData, error: domainError } = await supabase.functions.invoke('fetch-shopify-domain', {
                body: { storeId: selectedStore.id }
              });

              if (!domainError && domainData?.domain) {
                const fetchedDomain = domainData.domain;
                
                // Only use if it's not a myshopify domain
                if (!fetchedDomain.includes('.myshopify.com')) {
                  console.log('✅ [DOMAIN] Fetched valid domain:', fetchedDomain);
                  // Cache it
                  domainCache.set(selectedStore.id, { domain: fetchedDomain, timestamp: Date.now() });
                  return fetchedDomain;
                }
              }
            } catch (err) {
              console.error('❌ [DOMAIN] Error fetching domain via edge function:', err);
            }

            // Fallback: use store_url if available
            if (selectedStore.store_url) {
              const cleanUrl = selectedStore.store_url
                .replace(/^https?:\/\//, '')
                .replace(/\/$/, '');
              
              console.log('⚠️ [DOMAIN] Using store_url as fallback:', cleanUrl);
              // Cache it
              domainCache.set(selectedStore.id, { domain: cleanUrl, timestamp: Date.now() });
              return cleanUrl;
            }

            // Last resort: use placeholder
            console.log('⚠️ [DOMAIN] No valid domain found, using placeholder');
            return 'example.com';
          })();

          // Store the promise
          ongoingRequests.set(selectedStore.id, domainPromise);
          
          // Clean up after completion
          domainPromise.finally(() => {
            ongoingRequests.delete(selectedStore.id);
          });
        } else {
          console.log('⏳ [DOMAIN] Waiting for ongoing request...');
        }

        const fetchedDomain = await domainPromise;
        setDomain(fetchedDomain);
      } catch (error) {
        console.error('❌ [DOMAIN] Error in useStoreDomain:', error);
        setDomain('example.com');
      } finally {
        setLoading(false);
      }
    };

    fetchAndUpdateDomain();
  }, [selectedStore?.id, selectedStore?.public_domain, selectedStore?.store_url]);

  return { domain, loading };
}
