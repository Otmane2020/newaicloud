import { useMemo } from 'react';

export type AiImagesAppMode = 'ai-images' | 'newai';

export interface AiImagesAppModeConfig {
  mode: AiImagesAppMode;
  appName: string;
  logo: string;
  primaryColor: string;
  gradientFrom: string;
  gradientTo: string;
  authRedirect: string;
  dashboardRedirect: string;
  isAiImages: boolean;
}

export function useAiImagesAppMode(): AiImagesAppModeConfig {
  return useMemo(() => {
    const isAiImages = isAiImagesDomain();
    const mode: AiImagesAppMode = isAiImages ? 'ai-images' : 'newai';
    
    if (mode === 'ai-images') {
      return {
        mode: 'ai-images',
        appName: 'AI Product Image Shot',
        logo: 'AI Product Image Shot',
        primaryColor: 'hsl(262, 83%, 58%)',
        gradientFrom: '#8B5CF6',
        gradientTo: '#06B6D4',
        authRedirect: '/auth',
        dashboardRedirect: '/app/dashboard',
        isAiImages: true,
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
      isAiImages: false,
    };
  }, []);
}

// Helper to detect AI Images domain without hook
export function isAiImagesDomain(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  const searchParams = new URLSearchParams(window.location.search);
  
  // Check domain OR URL parameter for testing
  const isAiImagesHost = hostname.includes('ai-images');
  const isAiImagesMode = searchParams.get('mode') === 'ai-images';
  
  console.log('🌐 AI Images Domain detection:', { hostname, isAiImagesHost, isAiImagesMode });
  
  return isAiImagesHost || isAiImagesMode;
}

export function getAiImagesAppMode(): AiImagesAppMode {
  return isAiImagesDomain() ? 'ai-images' : 'newai';
}
