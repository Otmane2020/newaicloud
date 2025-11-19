import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';

interface ConsumeResult {
  success: boolean;
  consumed?: number;
  newBalance?: number;
  error?: string;
  deficit?: number;
}

export function useOptimizationConsumption() {
  const [consuming, setConsuming] = useState(false);
  const { t } = useTranslation();

  const consumeOptimizations = async (
    actionType: 'article' | 'campaign',
    frequency?: 'monthly' | 'weekly' | 'daily'
  ): Promise<ConsumeResult> => {
    setConsuming(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('consume-optimization-credits', {
        body: { actionType, frequency }
      });

      if (error) {
        console.error('[CONSUME] Error:', error);
        throw error;
      }

      if (!data.success) {
        // Insufficient balance
        return {
          success: false,
          error: data.error,
          deficit: data.deficit
        };
      }

      // Success
      toast.success(
        actionType === 'article'
          ? `✅ ${t.optimizationConsumption.article} (${data.consumed} ${t.optimizationConsumption.optimizations})`
          : `✅ ${actionType === 'campaign' ? t.optimizationConsumption[`campaign${frequency?.charAt(0).toUpperCase()}${frequency?.slice(1)}`] : ''} (${data.consumed} ${t.optimizationConsumption.optimizations})`
      );

      return {
        success: true,
        consumed: data.consumed,
        newBalance: data.newBalance
      };
    } catch (error) {
      console.error('[CONSUME] Unexpected error:', error);
      toast.error(t.optimizationConsumption.upgradeRequired || 'Une erreur est survenue');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setConsuming(false);
    }
  };

  const calculateCost = (
    actionType: 'article' | 'campaign',
    frequency?: 'monthly' | 'weekly' | 'daily'
  ): number => {
    if (actionType === 'article') return 10;
    if (actionType === 'campaign') {
      if (frequency === 'monthly') return 10;
      if (frequency === 'weekly') return 40;
      if (frequency === 'daily') return 300;
    }
    return 0;
  };

  return {
    consuming,
    consumeOptimizations,
    calculateCost
  };
}
