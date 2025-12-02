import { useEffect, useState, createContext, useContext, ReactNode } from 'react';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

interface FacebookContextType {
  isLoaded: boolean;
  checkLoginState: () => void;
}

const FacebookContext = createContext<FacebookContextType>({ 
  isLoaded: false,
  checkLoginState: () => {}
});

export function FacebookSDKProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);

  const checkLoginState = () => {
    if (window.FB) {
      window.FB.getLoginStatus((response: any) => {
        console.log('[Facebook] Login status:', response.status);
        if (response.status === 'connected') {
          console.log('[Facebook] User connected:', response.authResponse);
        }
      });
    }
  };

  useEffect(() => {
    // Initialize Facebook SDK
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: import.meta.env.VITE_FACEBOOK_APP_ID || '2271146120064768',
        cookie: true,
        xfbml: true,
        version: 'v18.0'
      });

      window.FB.AppEvents.logPageView();
      setIsLoaded(true);
      console.log('[Facebook] SDK initialized');
    };

    // Load SDK script
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/fr_FR/sdk.js';
    script.async = true;
    script.defer = true;
    
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    }

    return () => {
      // Cleanup: remove script on unmount
      const fbScript = document.getElementById('facebook-jssdk');
      if (fbScript) {
        fbScript.remove();
      }
    };
  }, []);

  return (
    <FacebookContext.Provider value={{ isLoaded, checkLoginState }}>
      {children}
    </FacebookContext.Provider>
  );
}

export const useFacebookSDK = () => useContext(FacebookContext);
