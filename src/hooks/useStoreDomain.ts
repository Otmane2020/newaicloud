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

        // Use the edge function to fetch the domain
        console.log('🔄 Fetching domain using edge function...');
        try {
          const { data: domainData, error: domainError } = await supabase.functions.invoke('fetch-shopify-domain', {
            body: { storeId: selectedStore.id }
          });

          if (!domainError && domainData?.domain) {
            const fetchedDomain = domainData.domain;
            
            // Only use if it's not a myshopify domain
            if (!fetchedDomain.includes('.myshopify.com')) {
              console.log('✅ Fetched valid domain:', fetchedDomain);
              setDomain(fetchedDomain);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error('❌ Error fetching domain via edge function:', err);
        }

        // Fallback: use store_url if available
        if (selectedStore.store_url) {
          const cleanUrl = selectedStore.store_url
            .replace(/^https?:\/\//, '')
            .replace(/\/$/, '');
          
          console.log('⚠️ Using store_url as fallback:', cleanUrl);
          setDomain(cleanUrl);
          setLoading(false);
          return;
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
  }, [selectedStore?.id, selectedStore?.public_domain, selectedStore?.store_url]);

  return { domain, loading };
}
