import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ActivityMetadata {
  [key: string]: any;
}

export const useActivityTracker = (page: string, actionType: string = 'page_view', metadata?: ActivityMetadata) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const trackActivity = async () => {
      try {
        await supabase.functions.invoke('track-activity', {
          body: {
            user_id: user.id,
            action_type: actionType,
            page,
            metadata: metadata || {}
          }
        });
      } catch (error) {
        console.error('Error tracking activity:', error);
      }
    };

    trackActivity();
  }, [user, page, actionType, JSON.stringify(metadata)]);
};

export const trackAction = async (actionType: string, page: string, metadata?: ActivityMetadata) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  try {
    await supabase.functions.invoke('track-activity', {
      body: {
        user_id: user.id,
        action_type: actionType,
        page,
        metadata: metadata || {}
      }
    });
  } catch (error) {
    console.error('Error tracking action:', error);
  }
};
