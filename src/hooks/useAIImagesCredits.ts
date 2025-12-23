import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsagePricing {
  id: string;
  name: string;
  pricePerImage: number;
  cappedAmount: number;
}

interface BillingPlan {
  id: string;
  name: string;
  cappedAmount: string;
  balanceUsed: string;
  balanceRemaining: number;
}

interface AIImagesBillingState {
  isActive: boolean;
  plan: BillingPlan | null;
  pricing: UsagePricing | null;
  isLoading: boolean;
  shopDomain: string | null;
  isConnected: boolean;
}

export const useAIImagesCredits = () => {
  const [state, setState] = useState<AIImagesBillingState>({
    isActive: false,
    plan: null,
    pricing: null,
    isLoading: true,
    shopDomain: null,
    isConnected: false,
  });

  const fetchBillingStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState(prev => ({ ...prev, isLoading: false, isConnected: false }));
        return;
      }

      // Get shop domain from connections
      let shopDomain: string | null = null;

      // Check for AI Images specific connection
      const { data: aiConnection } = await supabase
        .from('ai_images_shopify_connections')
        .select('shop_domain')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (aiConnection) {
        shopDomain = aiConnection.shop_domain;
      } else {
        // Fall back to regular shopify connection
        const { data: regularConnection } = await supabase
          .from('shopify_connections')
          .select('store_url')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (regularConnection) {
          shopDomain = (regularConnection as any).store_url;
        }
      }

      if (!shopDomain) {
        setState(prev => ({ ...prev, isLoading: false, isConnected: false }));
        return;
      }

      setState(prev => ({
        ...prev,
        shopDomain,
        isConnected: true,
      }));

      // Fetch billing status from edge function
      const { data, error } = await supabase.functions.invoke('ai-images-checkout', {
        body: {
          action: 'get_billing_status',
          shop_domain: shopDomain,
        },
      });

      if (error) {
        console.error('[AIImagesBilling] Error:', error);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      setState(prev => ({
        ...prev,
        isActive: data?.active || false,
        plan: data?.plan || null,
        pricing: data?.pricing || null,
        isLoading: false,
      }));
    } catch (error) {
      console.error('[AIImagesBilling] Error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const setupBilling = async (): Promise<string | null> => {
    if (!state.shopDomain) {
      toast.error('No shop connected');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-images-checkout', {
        body: {
          action: 'setup_usage_charge',
          shop_domain: state.shopDomain,
        },
      });

      if (error) throw error;

      if (data?.confirmation_url) {
        return data.confirmation_url;
      }

      return null;
    } catch (error: any) {
      console.error('[AIImagesBilling] Setup error:', error);
      toast.error(error.message || 'Failed to setup billing');
      return null;
    }
  };

  const recordUsage = async (imagesCount: number, description?: string): Promise<boolean> => {
    if (!state.shopDomain) {
      // Allow usage without billing for demo
      return true;
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-images-checkout', {
        body: {
          action: 'record_usage',
          shop_domain: state.shopDomain,
          amount: imagesCount,
          description,
        },
      });

      if (error) throw error;

      // Refresh billing status to update balance
      await fetchBillingStatus();

      return data?.success || true;
    } catch (error: any) {
      console.error('[AIImagesBilling] Usage error:', error);
      // Don't block on billing errors
      return true;
    }
  };

  // Legacy compatibility - deductCredits now records usage
  const deductCredits = async (amount: number, description?: string): Promise<boolean> => {
    return recordUsage(amount, description);
  };

  // Check if billing is active or allow free usage
  const hasEnoughCredits = (_required: number): boolean => {
    // Always allow usage - billing is handled per-use
    return true;
  };

  useEffect(() => {
    fetchBillingStatus();
  }, [fetchBillingStatus]);

  return {
    // Legacy compatibility
    balance: state.plan?.balanceRemaining || 999, // Large number to indicate unlimited
    isLoading: state.isLoading,
    packages: [], // No more packages
    shopDomain: state.shopDomain,
    isConnected: state.isConnected,
    
    // New billing state
    isActive: state.isActive,
    plan: state.plan,
    pricing: state.pricing,
    
    // Actions
    refreshCredits: fetchBillingStatus,
    setupBilling,
    recordUsage,
    deductCredits,
    hasEnoughCredits,
    
    // Legacy
    purchaseCredits: async (_packageId: string) => setupBilling(),
  };
};
