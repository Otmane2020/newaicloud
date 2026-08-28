import { useState } from 'react';
import { AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CatalogActionCard } from '@/components/CatalogActionCard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';

export function TrialWarningBanner() {
  const { user } = useAuth();
  const { t, tf } = useTranslation();
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
    enabled: !!user?.id,
  });

  if (profile?.subscription_status === 'active') return null;

  const daysLeft = profile?.trial_ends_at
    ? Math.ceil((new Date(profile.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const handleActivate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('force-payment');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (error) {
      toast.error(t.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CatalogActionCard
      icon={AlertCircle}
      title={t.trial.warningTitle}
      description={t.trial.activateSubscription}
      meta={daysLeft && daysLeft > 0 ? tf('trial.daysLeft', { days: daysLeft }) : undefined}
      compact
      action={
        <Button
          onClick={handleActivate}
          disabled={loading}
          size="sm"
          className="rounded-lg bg-violet-600 px-5 font-semibold text-white shadow-none hover:bg-violet-700"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {loading ? t.common.loading : t.trial.activateSubscription}
        </Button>
      }
    />
  );
}
