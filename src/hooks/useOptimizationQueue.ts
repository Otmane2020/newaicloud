import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QueueItem {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export const useOptimizationQueue = () => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [canCancel, setCanCancel] = useState(true);

  const processQueue = useCallback(async (
    items: Array<{ id: string; title: string }>,
    optimizationFn: (id: string) => Promise<void>,
    onProgress?: (current: number, total: number) => void
  ) => {
    setIsProcessing(true);
    setCanCancel(true);
    
    const queueItems: QueueItem[] = items.map(item => ({
      ...item,
      status: 'pending' as const,
      progress: 0,
    }));
    
    setQueue(queueItems);

    const batchSize = 3; // Paralléliser 3 à la fois
    let cancelled = false;

    const cancel = () => {
      cancelled = true;
      setCanCancel(false);
    };

    // Exposer la fonction cancel
    (window as any).__cancelOptimization = cancel;

    for (let i = 0; i < queueItems.length; i += batchSize) {
      if (cancelled) {
        toast.info('Optimisation annulée');
        break;
      }

      const batch = queueItems.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (item, batchIndex) => {
          const globalIndex = i + batchIndex;
          
          try {
            setQueue(prev => prev.map(q => 
              q.id === item.id ? { ...q, status: 'processing' as const, progress: 50 } : q
            ));

            await optimizationFn(item.id);

            setQueue(prev => prev.map(q => 
              q.id === item.id ? { ...q, status: 'completed' as const, progress: 100 } : q
            ));

            if (onProgress) {
              onProgress(globalIndex + 1, queueItems.length);
            }
          } catch (error) {
            console.error(`Erreur pour ${item.title}:`, error);
            setQueue(prev => prev.map(q => 
              q.id === item.id ? { 
                ...q, 
                status: 'failed' as const, 
                error: error instanceof Error ? error.message : 'Erreur inconnue' 
              } : q
            ));
          }
        })
      );
    }

    setIsProcessing(false);
    delete (window as any).__cancelOptimization;
  }, []);

  const cancelProcessing = useCallback(() => {
    if ((window as any).__cancelOptimization) {
      (window as any).__cancelOptimization();
    }
  }, []);

  return {
    queue,
    isProcessing,
    canCancel,
    processQueue,
    cancelProcessing,
  };
};
