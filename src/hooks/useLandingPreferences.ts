import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useLandingPreferences(userId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['landing-preferences', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('landing_page_preferences')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const deletePreference = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('landing_page_preferences')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-preferences'] });
      toast({
        title: 'Configuration supprimée',
        description: 'La configuration a été supprimée avec succès',
      });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la configuration',
        variant: 'destructive',
      });
    },
  });

  const setAsDefault = useMutation({
    mutationFn: async (id: string) => {
      // First, unset all defaults
      await supabase
        .from('landing_page_preferences')
        .update({ is_default: false })
        .eq('user_id', userId!);

      // Then set the selected one as default
      const { error } = await supabase
        .from('landing_page_preferences')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-preferences'] });
      toast({
        title: 'Configuration par défaut',
        description: 'Cette configuration est maintenant la configuration par défaut',
      });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de définir comme configuration par défaut',
        variant: 'destructive',
      });
    },
  });

  return {
    preferences,
    isLoading,
    deletePreference: deletePreference.mutate,
    setAsDefault: setAsDefault.mutate,
  };
}
