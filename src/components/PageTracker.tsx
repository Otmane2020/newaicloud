import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageVisit, updateVisitDuration } from '@/lib/visitTracker';

export function PageTracker() {
  const location = useLocation();

  useEffect(() => {
    // Track page visit on route change
    trackPageVisit(location.pathname, document.title);

    // Update duration on page leave
    const handleBeforeUnload = () => {
      updateVisitDuration();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also update duration when navigating away within the SPA
      updateVisitDuration();
    };
  }, [location.pathname]);

  return null;
}
