import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ShopifyStore {
  id: string;
  store_name: string | null;
  store_url: string;
  store_label: string | null;
  is_active: boolean | null;
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

  const loadStores = async () => {
    if (!user?.id) {
      setStores([]);
      setSelectedStore(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('shopify_connections')
        .select('id, store_name, store_url, store_label, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setStores(data || []);
      
      // Auto-select first store if none selected and stores exist
      if (data && data.length > 0 && !selectedStore) {
        setSelectedStore(data[0]);
      }
      
      // If selected store no longer exists, reset
      if (selectedStore && !data?.find(s => s.id === selectedStore.id)) {
        setSelectedStore(data?.[0] || null);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      setStores([]);
      setSelectedStore(null);
    } finally {
      setLoading(false);
    }
  };

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
