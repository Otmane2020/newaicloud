import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ShopifyStore {
  id: string;
  store_name: string | null;
  store_url: string;
  store_label: string | null;
  is_active: boolean | null;
  public_domain: string | null;
  access_token: string | null;
  store_language: string | null;
}

interface StoreContextType {
  selectedStore: ShopifyStore | null;
  setSelectedStore: (store: ShopifyStore | null) => void;
  stores: ShopifyStore[];
  loading: boolean;
  serverError: boolean;
  refreshStores: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Helper: detect server error
const isServerError = (error: any): boolean => {
  const msg = error?.message || String(error) || '';
  return msg.includes('Failed to fetch') || 
         msg.includes('timeout') || 
         msg.includes('NetworkError') ||
         msg.includes('522') ||
         msg.includes('503');
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedStore, setSelectedStore] = useState<ShopifyStore | null>(null);
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(false);
  
  // ✅ FIX: Track last fetch to prevent rapid consecutive calls
  const lastFetchRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  const loadStores = useCallback(async () => {
    // ✅ FIX: Prevent concurrent calls
    if (isLoadingRef.current) {
      console.log('🚨🚨🚨 [STORE_CONTEXT] Already loading, skipping');
      return;
    }
    // Validate user.id is defined AND is a valid UUID (not "undefined" string)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!user?.id || !uuidRegex.test(user.id)) {
      console.log('🚨🚨🚨 [STORE_CONTEXT] No valid user ID, clearing stores');
      setStores([]);
      setSelectedStore(null);
      setLoading(false);
      return;
    }

    // ✅ FIX: Debounce - skip if called within 2 seconds
    const now = Date.now();
    if (now - lastFetchRef.current < 2000) {
      console.log('🚨🚨🚨 [STORE_CONTEXT] Debounced - skipping fetch (too soon)');
      return;
    }
    isLoadingRef.current = true;
    setServerError(false);
    
    // ✅ 8-second timeout
    const timeoutId = setTimeout(() => {
      if (isLoadingRef.current) {
        console.error('⏰ [STORE_CONTEXT] Timeout reached (8s)');
        isLoadingRef.current = false;
        setLoading(false);
        setServerError(true);
        toast.error('Serveur indisponible', {
          description: 'Impossible de charger vos boutiques. Réessayez dans quelques minutes.'
        });
      }
    }, 8000);
    
    try {
      console.log('🚨🚨🚨 [STORE_CONTEXT] Loading stores for user:', user.id);
      const { data, error } = await supabase
        .from('shopify_connections')
        .select('id, store_name, store_url, store_label, is_active, public_domain, access_token, store_language')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      clearTimeout(timeoutId);

      if (error) {
        if (isServerError(error)) {
          setServerError(true);
          toast.error('Serveur indisponible', {
            description: 'Impossible de charger vos boutiques. Réessayez dans quelques minutes.'
          });
        }
        throw error;
      }

      console.log('🚨🚨🚨 [STORE_CONTEXT] Loaded stores:', data?.length);
      
      // ✅ FIX: Compare stores array to prevent unnecessary re-renders
      setStores(prevStores => {
        if (JSON.stringify(prevStores) === JSON.stringify(data || [])) {
          console.log('🚨🚨🚨 [STORE_CONTEXT] Stores unchanged, keeping same reference');
          return prevStores;
        }
        return data || [];
      });
      
      // Only auto-select if no stores were loaded before
      if (data && data.length > 0) {
        setSelectedStore(prev => {
          if (!prev) {
            // Auto-select first store only if no store is selected
            console.log('🚨🚨🚨 [STORE_CONTEXT] Auto-selecting first store:', data[0].store_name, 'ID:', data[0].id);
            return data[0];
          }
          // Find the current store in the new data to get a fresh reference
          const currentStore = data.find(s => s.id === prev.id);
          if (currentStore) {
            // ✅ FIX: Only update if data actually changed to prevent re-renders
            if (JSON.stringify(currentStore) === JSON.stringify(prev)) {
              console.log('🚨🚨🚨 [STORE_CONTEXT] Store data unchanged, keeping same reference');
              return prev; // Keep same reference to prevent re-renders
            }
            console.log('🚨🚨🚨 [STORE_CONTEXT] Updating store reference:', currentStore.store_name, 'ID:', currentStore.id);
            return currentStore;
          }
          // If current store no longer exists, select first one
          console.log('🚨🚨🚨 [STORE_CONTEXT] Current store not found, selecting first:', data[0].store_name, 'ID:', data[0].id);
          return data[0];
        });
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('❌ [STORE_CONTEXT] Error loading stores:', error);
      
      if (isServerError(error)) {
        setServerError(true);
      }
      
      setStores([]);
      setSelectedStore(null);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;
    loadStores();

    if (!user?.id) return;

    // Subscribe to realtime changes on shopify_connections
    console.log('🔴 [STORE_CONTEXT] Setting up realtime listener for user:', user.id);
    const channel = supabase
      .channel('shopify-connections-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopify_connections',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (isMounted) {
            console.log('🔄 [STORE_CONTEXT] Shopify connection changed:', payload);
            
            // ✅ FIX: Debounce realtime events with a timeout
            if (debounceTimeoutRef.current) {
              clearTimeout(debounceTimeoutRef.current);
            }
            debounceTimeoutRef.current = setTimeout(() => {
              if (isMounted) {
                loadStores();
              }
            }, 1000); // 1 second debounce
          }
        }
      )
      .subscribe((status) => {
        if (isMounted) {
          console.log('🔴 [STORE_CONTEXT] Realtime subscription status:', status);
        }
      });

    return () => {
      isMounted = false;
      console.log('⏹️ [STORE_CONTEXT] Unsubscribing from shopify connections');
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // Ignore cleanup errors during rapid navigation
        console.warn('[STORE_CONTEXT] Cleanup warning:', e);
      }
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <StoreContext.Provider 
      value={{ 
        selectedStore, 
        setSelectedStore, 
        stores, 
        loading,
        serverError,
        refreshStores: loadStores 
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
