import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ShopifyStore {
  id: string;
  store_name: string | null;
  store_url: string;
  store_label: string | null;
  is_active: boolean | null;
  public_domain: string | null;
  access_token: string | null;
}

interface StoreContextType {
  selectedStore: ShopifyStore | null;
  setSelectedStore: (store: ShopifyStore | null) => void;
  stores: ShopifyStore[];
  loading: boolean;
  refreshStores: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedStore, setSelectedStore] = useState<ShopifyStore | null>(null);
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStores = useCallback(async () => {
    if (!user?.id) {
      console.log('🏪 [STORE_CONTEXT] No user, clearing stores');
      setStores([]);
      setSelectedStore(null);
      setLoading(false);
      return;
    }

    try {
      console.log('🏪 [STORE_CONTEXT] Loading stores for user:', user.id);
      const { data, error } = await supabase
        .from('shopify_connections')
        .select('id, store_name, store_url, store_label, is_active, public_domain, access_token')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      console.log('🏪 [STORE_CONTEXT] Loaded stores:', data?.length, data);
      setStores(data || []);
      
      // Only auto-select if no stores were loaded before
      if (data && data.length > 0) {
        setSelectedStore(prev => {
          // Keep current selection if it still exists
          if (prev && data.find(s => s.id === prev.id)) {
            console.log('🏪 [STORE_CONTEXT] Keeping current store:', prev.store_name);
            return prev;
          }
          // Otherwise select first store
          console.log('🏪 [STORE_CONTEXT] Auto-selecting first store:', data[0].store_name);
          return data[0];
        });
      }
    } catch (error) {
      console.error('❌ [STORE_CONTEXT] Error loading stores:', error);
      setStores([]);
      setSelectedStore(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadStores();
  }, [user?.id]);

  return (
    <StoreContext.Provider 
      value={{ 
        selectedStore, 
        setSelectedStore, 
        stores, 
        loading,
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
