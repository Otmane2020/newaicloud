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
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isAeoreply = hostname.includes('aeoreply') || hostname.includes('localhost');
    
    // For testing on localhost, check URL path as fallback
    const isAeoPath = typeof window !== 'undefined' && 
      (window.location.pathname.startsWith('/aeo') || window.location.search.includes('mode=aeo'));
    
    const mode: AppMode = (isAeoreply || isAeoPath) ? 'aeoreply' : 'newai';
    
    if (mode === 'aeoreply') {
      return {
        mode: 'aeoreply',
        appName: 'Aeoreply',
        logo: 'Aeoreply',
        primaryColor: 'hsl(262, 83%, 58%)', // Violet
        gradientFrom: '#8B5CF6', // violet-500
        gradientTo: '#3B82F6', // blue-500
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
export function getAppMode(): AppMode {
  if (typeof window === 'undefined') return 'newai';
  const hostname = window.location.hostname;
  return hostname.includes('aeoreply') ? 'aeoreply' : 'newai';
}

export function isAeoreplyDomain(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('aeoreply');
}
