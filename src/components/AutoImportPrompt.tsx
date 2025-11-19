import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { useStoreDataCheck } from '@/hooks/useStoreDataCheck';
import { ImportConfirmDialog } from '@/components/integration/ImportConfirmDialog';
import { toast } from 'sonner';

const DISMISS_STORAGE_KEY = 'import_prompt_dismissed';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function AutoImportPrompt() {
  const navigate = useNavigate();
  const { selectedStore } = useStore();
  const { hasData, loading } = useStoreDataCheck(selectedStore?.id);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (loading || !selectedStore) {
      return;
    }

    // Check if user dismissed the prompt recently for this store
    const dismissedData = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (dismissedData) {
      try {
        const { storeId, timestamp } = JSON.parse(dismissedData);
        if (
          storeId === selectedStore.id &&
          Date.now() - timestamp < DISMISS_DURATION_MS
        ) {
          return; // Don't show if dismissed within last 24h
        }
      } catch (e) {
        // Invalid data, clear it
        localStorage.removeItem(DISMISS_STORAGE_KEY);
      }
    }

    // Show dialog if no data found
    if (!hasData) {
      setShowDialog(true);
    }
  }, [hasData, loading, selectedStore]);

  const handleConfirm = () => {
    setShowDialog(false);
    navigate('/dashboard');
    toast.info("Cliquez sur 'Synchroniser maintenant' pour importer vos données Shopify", {
      duration: 5000,
    });
  };

  const handleDismiss = () => {
    setShowDialog(false);
    if (selectedStore) {
      // Store dismissal in localStorage
      localStorage.setItem(
        DISMISS_STORAGE_KEY,
        JSON.stringify({
          storeId: selectedStore.id,
          timestamp: Date.now(),
        })
      );
    }
  };

  if (!selectedStore) {
    return null;
  }

  return (
    <ImportConfirmDialog
      open={showDialog}
      onOpenChange={(open) => {
        if (!open) {
          handleDismiss();
        }
      }}
      onConfirm={handleConfirm}
      storeName={selectedStore.store_name}
    />
  );
}
