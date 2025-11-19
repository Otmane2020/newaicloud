import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { useStoreDataCheck } from '@/hooks/useStoreDataCheck';
import { ImportConfirmDialog } from '@/components/integration/ImportConfirmDialog';
import { toast } from 'sonner';

export function AutoImportPrompt() {
  const navigate = useNavigate();
  const { selectedStore } = useStore();
  const { hasData, loading } = useStoreDataCheck(selectedStore?.id);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (loading || !selectedStore) {
      setShowDialog(false);
      return;
    }

    // Show dialog immediately if no data found
    setShowDialog(!hasData);
  }, [hasData, loading, selectedStore]);

  const handleConfirm = () => {
    setShowDialog(false);
    navigate('/dashboard');
    toast.info("Cliquez sur 'Synchroniser maintenant' pour importer vos données Shopify", {
      duration: 5000,
    });
  };

  if (!selectedStore) {
    return null;
  }

  return (
    <ImportConfirmDialog
      open={showDialog}
      onOpenChange={setShowDialog}
      onConfirm={handleConfirm}
      storeName={selectedStore.store_name}
    />
  );
}
