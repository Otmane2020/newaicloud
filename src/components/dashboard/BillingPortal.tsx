import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Loader2, CreditCard, AlertCircle, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/language";
import { useNavigate } from "react-router-dom";

interface SubscriptionStatus {
  hasStripeSubscription: boolean;
  currentPlan: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
}

export function BillingPortal() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    hasStripeSubscription: false,
    currentPlan: null,
    subscriptionStatus: null,
    trialEndsAt: null,
  });

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      setCheckingSubscription(true);
      
      // Check both Stripe subscription and Supabase profile
      const [stripeResult, profileResult] = await Promise.all([
        supabase.functions.invoke('check-subscription'),
        supabase
          .from('profiles')
          .select('current_plan_id, subscription_status, trial_ends_at')
          .single()
      ]);
      
      if (stripeResult.error) throw stripeResult.error;
      if (profileResult.error) throw profileResult.error;
      
      setSubscriptionStatus({
        hasStripeSubscription: stripeResult.data?.subscribed === true,
        currentPlan: profileResult.data?.current_plan_id || null,
        subscriptionStatus: profileResult.data?.subscription_status || null,
        trialEndsAt: profileResult.data?.trial_ends_at || null,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionStatus({
        hasStripeSubscription: false,
        currentPlan: null,
        subscriptionStatus: null,
        trialEndsAt: null,
      });
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleOpenPortal = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'accéder au portail de facturation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivatePlan = () => {
    navigate('/subscription');
  };

  if (checkingSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.account.billing.title}</CardTitle>
          <CardDescription>
            Vérification de votre abonnement...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isTrialing = subscriptionStatus.subscriptionStatus === 'trialing' || 
    (subscriptionStatus.trialEndsAt && new Date(subscriptionStatus.trialEndsAt) > new Date());

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t.account.billing.title}</CardTitle>
            {subscriptionStatus.currentPlan && (
              <Badge variant={subscriptionStatus.hasStripeSubscription ? "default" : "secondary"}>
                {subscriptionStatus.currentPlan}
              </Badge>
            )}
          </div>
          <CardDescription>
            Gérez votre abonnement et consultez votre historique de paiement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          {subscriptionStatus.currentPlan && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">
                    Plan actuel : <span className="capitalize">{subscriptionStatus.currentPlan}</span>
                  </p>
                  {isTrialing && subscriptionStatus.trialEndsAt && (
                    <p className="text-sm text-muted-foreground">
                      Période d'essai jusqu'au {new Date(subscriptionStatus.trialEndsAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Stripe Subscription Status */}
          {!subscriptionStatus.hasStripeSubscription && subscriptionStatus.currentPlan && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="text-sm">
                  Votre abonnement est en période d'essai. Activez votre plan payant pour continuer après l'essai.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {subscriptionStatus.hasStripeSubscription ? (
              <Button 
                onClick={handleOpenPortal}
                disabled={loading}
                className="w-full"
                variant="default"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Accéder au portail Stripe
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleActivatePlan}
                className="w-full"
                variant="default"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {subscriptionStatus.currentPlan ? 'Activer mon abonnement payant' : 'Choisir un plan'}
              </Button>
            )}

            {subscriptionStatus.hasStripeSubscription && (
              <p className="text-xs text-muted-foreground text-center">
                Le portail Stripe vous permet de gérer votre abonnement, vos moyens de paiement et consulter vos factures
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}