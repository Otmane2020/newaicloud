import { Store } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/contexts/StoreContext';

export function StoreSelector() {
  const { selectedStore, setSelectedStore, stores, loading } = useStore();

  if (loading) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg animate-pulse">
        <Store className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  if (stores.length === 0) {
    return null;
  }

  // If only one store, show it in sidebar style
  if (stores.length === 1) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 bg-primary/10 rounded-lg">
        <Store className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-foreground truncate">
          {stores[0].store_label || stores[0].store_name || 'Boutique'}
        </span>
      </div>
    );
  }

  return (
    <Select
      value={selectedStore?.id || ''}
      onValueChange={(value) => {
        console.log('🔄 [STORE_SELECTOR] Changing store to:', value);
        const store = stores.find(s => s.id === value);
        if (store) {
          console.log('✅ [STORE_SELECTOR] Store found:', {
            id: store.id,
            name: store.store_name
          });
          setSelectedStore(store);
          console.log('✅ [STORE_SELECTOR] setSelectedStore called with store:', store.store_name);
        } else {
          console.error('❌ [STORE_SELECTOR] Store not found for ID:', value);
        }
      }}
    >
      <SelectTrigger className="flex items-center gap-3 px-3 py-2.5 h-auto bg-primary/10 hover:bg-primary/15 rounded-lg border-0 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Store className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {selectedStore?.store_label || selectedStore?.store_name || 'Sélectionner une boutique'}
          </span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {stores.map((store) => (
          <SelectItem key={store.id} value={store.id}>
            <div className="flex items-center gap-3">
              <Store className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{store.store_label || store.store_name || store.store_url}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
