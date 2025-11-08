import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';

interface ActivityMetadata {
  [key: string]: any;
}

export const useActivityTracker = (page: string, actionType: string = 'page_view', metadata?: ActivityMetadata) => {
  const { user } = useAuth();
  const { selectedStore } = useStore();

  useEffect(() => {
    if (!user) return;

    const trackActivity = async () => {
      try {
        await supabase.functions.invoke('track-activity', {
          body: {
            user_id: user.id,
            action_type: actionType,
            page,
            store_id: selectedStore?.id || null,
            metadata: metadata || {}
          }
        });
      } catch (error) {
        console.error('Error tracking activity:', error);
      }
    };

    trackActivity();
  }, [user, page, actionType, selectedStore?.id, JSON.stringify(metadata)]);
};

export const trackAction = async (actionType: string, page: string, storeId?: string | null, metadata?: ActivityMetadata) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  try {
    await supabase.functions.invoke('track-activity', {
      body: {
        user_id: user.id,
        action_type: actionType,
        page,
        store_id: storeId || null,
        metadata: metadata || {}
      }
    });
  } catch (error) {
    console.error('Error tracking action:', error);
  }
};
