import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  name: string;
}

interface AIImagesCreditsState {
  balance: number;
  isLoading: boolean;
  packages: CreditPackage[];
  shopDomain: string | null;
  isConnected: boolean;
}

export const useAIImagesCredits = () => {
  const [state, setState] = useState<AIImagesCreditsState>({
    balance: 0,
    isLoading: true,
    packages: [],
    shopDomain: null,
    isConnected: false,
  });

  const fetchCredits = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState(prev => ({ ...prev, isLoading: false, isConnected: false }));
        return;
      }

      // Check for AI Images Shopify connection
      const { data: connection } = await supabase
        .from('ai_images_shopify_connections')
        .select('shop_domain, user_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!connection) {
        // Fall back to regular shopify connection
        const { data: regularConnection } = await supabase
          .from('shopify_connections')
          .select('store_url')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (regularConnection) {
          const shopUrl = (regularConnection as any).store_url;
          setState(prev => ({
            ...prev,
            isLoading: false,
            shopDomain: shopUrl,
            isConnected: true,
          }));

          // Fetch credits using regular connection shop domain
          await fetchCreditsFromShop(shopUrl);
          return;
        }

        setState(prev => ({ ...prev, isLoading: false, isConnected: false }));
        return;
      }

      setState(prev => ({
        ...prev,
        shopDomain: connection.shop_domain,
        isConnected: true,
      }));

      await fetchCreditsFromShop(connection.shop_domain);
    } catch (error) {
      console.error('[AIImagesCredits] Error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const fetchCreditsFromShop = async (shopDomain: string) => {
    try {
      // Get credits from database directly
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: credits } = await supabase
        .from('ai_images_credits')
        .select('credits_balance')
        .eq('user_id', user.id)
        .single();

      // Default packages
      const defaultPackages: CreditPackage[] = [
        { id: 'pack_10', credits: 10, price: 5.00, name: '10 Credits' },
        { id: 'pack_50', credits: 50, price: 20.00, name: '50 Credits' },
        { id: 'pack_100', credits: 100, price: 35.00, name: '100 Credits' },
        { id: 'pack_500', credits: 500, price: 150.00, name: '500 Credits' },
      ];

      setState(prev => ({
        ...prev,
        balance: credits?.credits_balance || 0,
        packages: defaultPackages,
        isLoading: false,
      }));
    } catch (error) {
      console.error('[AIImagesCredits] Error fetching credits:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const purchaseCredits = async (packageId: string): Promise<string | null> => {
    if (!state.shopDomain) {
      toast.error('No shop connected');
      return null;
    }

    try {
      const response = await supabase.functions.invoke('ai-images-checkout', {
        body: {
          action: 'create_charge',
          package_id: packageId,
          shop_domain: state.shopDomain,
        },
      });

      if (response.error) throw response.error;

      if (response.data?.confirmation_url) {
        return response.data.confirmation_url;
      }

      return null;
    } catch (error: any) {
      console.error('[AIImagesCredits] Purchase error:', error);
      toast.error(error.message || 'Failed to create purchase');
      return null;
    }
  };

  const deductCredits = async (amount: number, description?: string): Promise<boolean> => {
    if (!state.shopDomain) {
      toast.error('No shop connected');
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Use database function directly
      const { data, error } = await supabase.rpc('deduct_ai_image_credits', {
        p_user_id: user.id,
        p_amount: amount,
        p_description: description || 'Image generation',
      });

      if (error) throw error;

      const result = data as { success: boolean; new_balance?: number; error?: string };

      if (result?.success) {
        setState(prev => ({
          ...prev,
          balance: result.new_balance || prev.balance - amount,
        }));
        return true;
      } else {
        toast.error(result?.error || 'Failed to deduct credits');
        return false;
      }
    } catch (error: any) {
      console.error('[AIImagesCredits] Deduct error:', error);
      toast.error(error.message || 'Failed to deduct credits');
      return false;
    }
  };

  const hasEnoughCredits = (required: number): boolean => {
    return state.balance >= required;
  };

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return {
    ...state,
    refreshCredits: fetchCredits,
    purchaseCredits,
    deductCredits,
    hasEnoughCredits,
  };
};
