import { supabase } from "@/integrations/supabase/client";

export const useOptimizationNotifications = () => {
  const sendOptimizationNotification = async (count: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user language from browser
      const language = navigator.language.startsWith('fr') ? 'fr' : 'en';

      // Send notification
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          user_id: user.id,
          template_code: 'seo_optimization_complete',
          metadata: {
            count: count.toString()
          },
          language,
          force_browser: true
        }
      });

      if (error) {
        console.error('Error sending optimization notification:', error);
      }

      // Update challenge progress
      await updateChallengeProgress(user.id, 'optimization', count);
    } catch (error) {
      console.error('Error in sendOptimizationNotification:', error);
    }
  };

  const updateChallengeProgress = async (userId: string, category: string, increment: number) => {
    try {
      // Get active challenges for this category
      const { data: challenges, error: fetchError } = await supabase
        .from('seo_challenges')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .eq('status', 'active');

      if (fetchError || !challenges) return;

      for (const challenge of challenges) {
        const newValue = challenge.current_value + increment;
        
        // Update progress
        const { error: updateError } = await supabase
          .from('seo_challenges')
          .update({
            current_value: Math.min(newValue, challenge.target_value),
            status: newValue >= challenge.target_value ? 'completed' : 'active',
            completed_at: newValue >= challenge.target_value ? new Date().toISOString() : null
          })
          .eq('id', challenge.id);

        if (updateError) {
          console.error('Error updating challenge:', updateError);
          continue;
        }

        // Send completion notification
        if (newValue >= challenge.target_value) {
          const language = navigator.language.startsWith('fr') ? 'fr' : 'en';
          
          await supabase.functions.invoke('send-notification', {
            body: {
              user_id: userId,
              template_code: 'seo_challenge_completed',
              metadata: {
                title: challenge.title,
                points: challenge.reward_points.toString()
              },
              language,
              force_browser: true
            }
          });
        }
      }
    } catch (error) {
      console.error('Error updating challenge progress:', error);
    }
  };

  return {
    sendOptimizationNotification,
    updateChallengeProgress
  };
};
