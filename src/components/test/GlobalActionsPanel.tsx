import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, RefreshCw, Activity, TestTube, Loader2, Trash2 } from 'lucide-react';

interface GlobalActionsPanelProps {
  storeId: string;
}

export function GlobalActionsPanel({ storeId }: GlobalActionsPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleImportProducts = async () => {
    setLoading('import');
    try {
      const { error } = await supabase.functions.invoke('import-products', {
        body: { storeId }
      });
      if (error) throw error;
      toast.success('Import des produits lancé');
    } catch (error) {
      toast.error('Erreur lors de l\'import');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleFullSync = async () => {
    setLoading('sync');
    try {
      const { error } = await supabase.functions.invoke('scheduled-sync', {
        body: { storeId }
      });
      if (error) throw error;
      toast.success('Synchronisation complète lancée');
    } catch (error) {
      toast.error('Erreur lors de la synchronisation');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleCheckLimits = async () => {
    setLoading('limits');
    try {
      const { data, error } = await supabase.functions.invoke('check-usage-limits');
      if (error) throw error;
      console.log('Usage limits:', data);
      toast.success('Limites vérifiées - voir la console');
    } catch (error) {
      toast.error('Erreur lors de la vérification des limites');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleTestVisionAI = async () => {
    setLoading('vision');
    try {
      const { error } = await supabase.functions.invoke('analyze-image-with-vision', {
        body: { imageUrl: 'https://via.placeholder.com/150' }
      });
      if (error) throw error;
      toast.success('Test Vision AI réussi');
    } catch (error) {
      toast.error('Erreur lors du test Vision AI');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleCleanupEurodesign = async () => {
    setLoading('cleanup');
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-eurodesign-products');
      if (error) throw error;
      console.log('Cleanup result:', data);
      toast.success(data.message || 'Produits EURODESIGN supprimés');
      // Reload page after cleanup
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error('Erreur lors du nettoyage EURODESIGN');
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">⚡ Actions Globales</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Button
          variant="outline"
          onClick={handleImportProducts}
          disabled={!!loading}
        >
          {loading === 'import' ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Import Produits
        </Button>
        <Button
          variant="outline"
          onClick={handleFullSync}
          disabled={!!loading}
        >
          {loading === 'sync' ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Sync Complète
        </Button>
        <Button
          variant="outline"
          onClick={handleCheckLimits}
          disabled={!!loading}
        >
          {loading === 'limits' ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Activity className="w-4 h-4 mr-2" />
          )}
          Vérifier Limites
        </Button>
        <Button
          variant="outline"
          onClick={handleTestVisionAI}
          disabled={!!loading}
        >
          {loading === 'vision' ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <TestTube className="w-4 h-4 mr-2" />
          )}
          Test Vision AI
        </Button>
        <Button
          variant="destructive"
          onClick={handleCleanupEurodesign}
          disabled={!!loading}
        >
          {loading === 'cleanup' ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 mr-2" />
          )}
          Nettoyer EURODESIGN
        </Button>
      </div>
    </Card>
  );
}
