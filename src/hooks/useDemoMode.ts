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
}

/**
 * Hook to detect if current user is in demo mode
 * Demo mode applies special restrictions:
 * - Read-only access (no modifications to products, SEO, etc.)
 * - Unlimited optimizations (for testing purposes)
 * - Cannot switch stores
 */
export const useDemoMode = (): DemoModeState => {
  const { user } = useAuth();
  
  return useMemo(() => {
    const isDemoMode = isDemoEmail(user?.email) || isDemoUserId(user?.id);
    
    return {
      isDemoMode,
      isReadOnly: isDemoMode && DEMO_CONFIG.isReadOnly,
      demoStoreId: isDemoMode ? DEMO_CONFIG.storeId : null,
      demoMessage: isDemoMode 
        ? 'Mode Démonstration - Les modifications ne seront pas enregistrées'
        : '',
      canModify: !isDemoMode,
      canSwitchStore: !isDemoMode,
    };
  }, [user?.email, user?.id]);
};

export default useDemoMode;
