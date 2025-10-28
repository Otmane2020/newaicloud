import { useState } from 'react';
import { AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export function TrialWarningBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile-trial', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_status, trial_ends_at')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Ne pas afficher si l'utilisateur a un abonnement actif
  if (profile?.subscription_status === 'active') {
    return null;
  }

  const daysLeft = profile?.trial_ends_at 
    ? Math.ceil((new Date(profile.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 border-b border-orange-200 dark:border-orange-800 p-4">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-orange-900 dark:text-orange-100">
              Période d'essai - Version limitée
              {daysLeft && daysLeft > 0 && (
                <span className="ml-2 text-sm">({daysLeft} jours restants)</span>
              )}
            </p>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Libérez toutes les fonctionnalités en activant votre abonnement
            </p>
          </div>
        </div>
        <Button 
          onClick={async () => {
            setLoading(true);
            try {
              const { data, error } = await supabase.functions.invoke('force-payment');
              if (error) throw error;
              if (data?.url) {
                window.open(data.url, '_blank');
              }
            } catch (error) {
              toast.error("Erreur lors de la création du paiement");
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white whitespace-nowrap shadow-lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Chargement...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Activer mon abonnement
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
