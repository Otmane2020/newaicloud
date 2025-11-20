import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface TrialStatus {
  isTrialing: boolean;
  trialExpired: boolean;
  limitReached: boolean;
  limitType?: string;
  daysLeft?: number;
  shouldForcePayment?: boolean;
}

export function useTrialLimits() {
  const { user } = useAuth();
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    isTrialing: false,
    trialExpired: false,
    limitReached: false,
  });
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkTrialStatus = async () => {
      try {
        // Récupérer le profil
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, current_plan_id, trial_ends_at')
          .eq('id', user.id)
          .single();

        if (!profile || profile.subscription_status !== 'trialing') {
          // ✅ Retourner un statut vide mais VALIDE pour utilisateurs non-trial
          setTrialStatus({
            isTrialing: false,
            trialExpired: false,
            limitReached: false,
            shouldForcePayment: false,
            daysLeft: 0
          });
          return;
        }

        // Récupérer le plan trial
        const { data: plan } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', 'trial')
          .single();

        if (!plan) return;

        // Récupérer l'usage actuel
        const currentMonth = new Date().toISOString().substring(0, 7) + '-01';
        const { data: usage } = await supabase
          .from('usage_tracking')
          .select('*')
          .eq('seller_id', user.id)
          .eq('month', currentMonth)
          .maybeSingle();

        // Vérifier si une limite est atteinte
        let limitReached = false;
        let limitType = '';

        if (usage) {
          if (usage.products_count >= (plan.trial_max_products || plan.max_products)) {
            limitReached = true;
            limitType = 'produits';
          } else if (usage.optimizations_count >= (plan.trial_max_optimizations || plan.max_optimizations_monthly)) {
            limitReached = true;
            limitType = 'optimisations SEO';
          } else if (usage.articles_count >= (plan.trial_max_articles || plan.max_articles_monthly)) {
            limitReached = true;
            limitType = 'articles';
          } else if (usage.shopify_requests_count >= (plan.max_shopify_requests_monthly || 20)) {
            limitReached = true;
            limitType = 'recherches Shopify';
          } else if (usage.chat_responses_count >= (plan.max_chat_responses_monthly || 100)) {
            limitReached = true;
            limitType = 'réponses chat';
          } else if (usage.shopify_stores_count >= (plan.max_shopify_stores || 1)) {
            limitReached = true;
            limitType = 'boutiques Shopify';
          }
        }

        // Vérifier si l'essai a expiré
        const trialExpired = profile.trial_ends_at 
          ? new Date(profile.trial_ends_at) < new Date()
          : false;

        const daysLeft = profile.trial_ends_at
          ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0;

        const newStatus = {
          isTrialing: true,
          trialExpired,
          limitReached,
          limitType,
          daysLeft,
          shouldForcePayment: limitReached || trialExpired
        };

        setTrialStatus(newStatus);

        // NE PLUS afficher automatiquement le popup
        // Les composants individuels géreront l'affichage au moment de l'action
        // Le popup s'affichera uniquement quand l'utilisateur essaie d'utiliser une fonctionnalité à 0
      } catch (error) {
        console.error('Erreur lors de la vérification des limites:', error);
      }
    };

    checkTrialStatus();
  }, [user]);

  return {
    trialStatus,
    showUpgradeDialog,
    setShowUpgradeDialog
  };
}
