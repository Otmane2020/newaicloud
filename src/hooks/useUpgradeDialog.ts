import { useState, useEffect, useCallback } from 'react';
import { useShopifyBilling } from './useShopifyBilling';
import { useUsageLimits } from './useUsageLimits';

interface UseUpgradeDialogOptions {
  limitType?: 'optimizations' | 'articles' | 'chat' | 'shopifySearch' | 'campaigns';
  onUpgradeComplete?: () => void;
}

interface UseUpgradeDialogReturn {
  // Dialog state
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  
  // Billing info
  billingProvider: 'shopify' | 'stripe' | null;
  isShopifyUser: boolean;
  shopDomain: string | null;
  
  // Usage info
  usage: number;
  limit: number;
  currentPlanId: string | null;
  canDoAction: boolean;
  
  // Loading states
  loading: boolean;
  
  // Callbacks
  onUpgradeComplete: () => void;
}

export function useUpgradeDialog(options: UseUpgradeDialogOptions = {}): UseUpgradeDialogReturn {
  const { limitType = 'optimizations', onUpgradeComplete: externalOnComplete } = options;
  
  const [isOpen, setIsOpen] = useState(false);
  
  const { 
    isShopifyUser, 
    shopDomain, 
    billingProvider, 
    loading: shopifyLoading 
  } = useShopifyBilling();
  
  const { 
    limits, 
    loading: limitsLoading, 
    canDoAction: checkCanDoAction,
    refresh: refreshLimits 
  } = useUsageLimits();

  // Get usage and limit based on limitType
  const getUsageForType = useCallback(() => {
    if (!limits) return { usage: 0, limit: 0 };
    
    switch (limitType) {
      case 'optimizations':
        return {
          usage: limits.usage.optimizations_count,
          limit: limits.limits.max_optimizations
        };
      case 'articles':
        return {
          usage: limits.usage.articles_count,
          limit: limits.limits.max_articles
        };
      case 'chat':
        return {
          usage: limits.usage.chat_responses_count,
          limit: limits.limits.max_chat_responses
        };
      case 'campaigns':
        return {
          usage: limits.usage.campaigns_count,
          limit: limits.limits.max_campaigns
        };
      default:
        return { usage: 0, limit: 0 };
    }
  }, [limits, limitType]);

  const { usage, limit } = getUsageForType();
  
  const canDoAction = checkCanDoAction(limitType === 'shopifySearch' ? 'shopifySearch' : limitType);

  const openDialog = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleUpgradeComplete = useCallback(() => {
    refreshLimits();
    closeDialog();
    if (externalOnComplete) {
      externalOnComplete();
    }
  }, [refreshLimits, closeDialog, externalOnComplete]);

  return {
    isOpen,
    openDialog,
    closeDialog,
    billingProvider,
    isShopifyUser,
    shopDomain,
    usage,
    limit,
    currentPlanId: limits?.currentPlanId || null,
    canDoAction,
    loading: shopifyLoading || limitsLoading,
    onUpgradeComplete: handleUpgradeComplete,
  };
}
