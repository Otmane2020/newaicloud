import { useMemo } from 'react';

export type AppMode = 'aeoreply' | 'newai';

export interface AppModeConfig {
  mode: AppMode;
  appName: string;
  logo: string;
  primaryColor: string;
  gradientFrom: string;
  gradientTo: string;
  authRedirect: string;
  dashboardRedirect: string;
  isAeoreply: boolean;
}

export function useAppMode(): AppModeConfig {
  return useMemo(() => {
    const isAeoreply = isAeoreplyDomain();
    const mode: AppMode = isAeoreply ? 'aeoreply' : 'newai';
    
    if (mode === 'aeoreply') {
      return {
        mode: 'aeoreply',
        appName: 'Aeoreply',
        logo: 'Aeoreply',
        primaryColor: 'hsl(262, 83%, 58%)',
        gradientFrom: '#8B5CF6',
        gradientTo: '#3B82F6',
        authRedirect: '/auth',
        dashboardRedirect: '/dashboard',
        isAeoreply: true,
      };
    }
    
    return {
      mode: 'newai',
      appName: 'NewAI',
      logo: 'NewAI',
      primaryColor: 'hsl(262, 83%, 58%)',
      gradientFrom: '#8B5CF6',
      gradientTo: '#EC4899',
      authRedirect: '/auth',
      dashboardRedirect: '/dashboard',
      isAeoreply: false,
    };
  }, []);
}

// Helper to detect app mode without hook (for routing)
// Supports ?mode=aeo parameter for testing in preview environments
export function isAeoreplyDomain(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  const searchParams = new URLSearchParams(window.location.search);
  
  // Check domain OR URL parameter for testing
  const isAeoreplyHost = hostname.includes('aeoreply');
  const isAeoMode = searchParams.get('mode') === 'aeo';
  
  console.log('🌐 Domain detection:', { hostname, isAeoreplyHost, isAeoMode });
  
  return isAeoreplyHost || isAeoMode;
}

export function getAppMode(): AppMode {
  return isAeoreplyDomain() ? 'aeoreply' : 'newai';
}
