import { Store, ChevronDown } from 'lucide-react';
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
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg animate-pulse">
        <Store className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  if (stores.length === 0) {
    return null;
  }

  // If only one store, show it without selector
  if (stores.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
        <Store className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          {stores[0].store_label || stores[0].store_name || 'Boutique'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Store className="w-4 h-4 text-muted-foreground" />
      <Select
        value={selectedStore?.id || ''}
        onValueChange={(value) => {
          console.log('🔄 [STORE_SELECTOR] Changing store to:', value);
          const store = stores.find(s => s.id === value);
          if (store) {
            console.log('✅ [STORE_SELECTOR] Store found:', store.store_name);
            setSelectedStore(store);
          } else {
            console.error('❌ [STORE_SELECTOR] Store not found for ID:', value);
          }
        }}
      >
        <SelectTrigger className="w-[200px] h-9 bg-background/50 border-border/50">
          <SelectValue placeholder="Sélectionner une boutique" />
        </SelectTrigger>
        <SelectContent>
          {stores.map((store) => (
            <SelectItem key={store.id} value={store.id}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${store.is_active ? 'bg-success' : 'bg-muted-foreground'}`} />
                <span>{store.store_label || store.store_name || store.store_url}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
