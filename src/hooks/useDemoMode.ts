import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DEMO_CONFIG, isDemoEmail, isDemoUserId } from '@/lib/demoConfig';

interface DemoModeState {
  isDemoMode: boolean;
  isReadOnly: boolean;
  demoStoreId: string | null;
  demoMessage: string;
  canModify: boolean;
  canSwitchStore: boolean;
  unlimitedOptimizations: boolean;
}

/**
 * Hook to detect if current user is in demo mode
 * Admin mode applies special privileges:
 * - Unlimited optimizations
 * - Can modify and switch stores
 */
export const useDemoMode = (): DemoModeState => {
  const { user } = useAuth();
  
  return useMemo(() => {
    const isDemoMode = isDemoEmail(user?.email) || isDemoUserId(user?.id);
    
    return {
      isDemoMode,
      isReadOnly: false, // Admin can modify everything
      demoStoreId: null, // Admin is not locked to a specific store
      demoMessage: isDemoMode 
        ? 'Mode Admin - Optimisations illimitées'
        : '',
      canModify: true, // Admin can modify
      canSwitchStore: true, // Admin can switch stores
      unlimitedOptimizations: isDemoMode && DEMO_CONFIG.unlimitedOptimizations,
    };
  }, [user?.email, user?.id]);
};

export default useDemoMode;
