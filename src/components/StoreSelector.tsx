import { Store, Lock, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/contexts/StoreContext';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useTranslation } from '@/lib/language';

export function StoreSelector() {
  const { selectedStore, setSelectedStore, stores, loading } = useStore();
  const { isDemoMode, canSwitchStore } = useDemoMode();
  const { t } = useTranslation();

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

  // If cannot switch stores (demo mode restriction), show static label
  if (!canSwitchStore) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 bg-primary/10 rounded-lg">
        {isDemoMode ? (
          <Lock className="w-4 h-4 text-warning shrink-0" />
        ) : (
          <Store className="w-4 h-4 text-primary shrink-0" />
        )}
        <span className="text-sm text-foreground truncate">
          {selectedStore?.store_label || selectedStore?.store_name || stores[0]?.store_label || stores[0]?.store_name || stores[0]?.store_url || 'Boutique'}
        </span>
      </div>
    );
  }
  
  // If only one store, show static label (no need for dropdown)
  if (stores.length === 1) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 bg-primary/10 rounded-lg">
        <Store className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm text-foreground truncate">
          {selectedStore?.store_label || selectedStore?.store_name || stores[0]?.store_label || stores[0]?.store_name || stores[0]?.store_url || 'Boutique'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
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
        <SelectTrigger className="w-full h-auto px-3 py-2.5 bg-primary/10 hover:bg-primary/15 rounded-lg border-0 transition-colors focus:ring-0 focus:ring-offset-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Store className="w-4 h-4 text-primary shrink-0" />
            <SelectValue placeholder="Sélectionner une boutique">
              <span className="text-sm text-foreground truncate">
                {selectedStore?.store_label || selectedStore?.store_name || selectedStore?.store_url || 'Sélectionner'}
              </span>
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent 
          className="z-[200] bg-popover border border-border shadow-xl"
          position="popper"
          sideOffset={4}
        >
          {stores.map((store) => (
            <SelectItem 
              key={store.id} 
              value={store.id}
              className="cursor-pointer hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <Store className={`w-4 h-4 shrink-0 ${store.is_active ? 'text-muted-foreground' : 'text-muted-foreground/50'}`} />
                <span className={`text-sm ${store.is_active ? '' : 'text-muted-foreground'}`}>
                  {store.store_label || store.store_name || store.store_url}
                  {!store.is_active && <span className="ml-2 text-xs text-warning">(Inactive)</span>}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
