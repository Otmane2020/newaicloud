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
      
      // Check Supabase profile for plan status
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('current_plan_id, subscription_status, trial_ends_at, stripe_customer_id')
        .single();
      
      if (profileError) throw profileError;
      
      const hasActivePaidPlan = profileData?.subscription_status === 'active' && 
        profileData?.current_plan_id && 
        profileData?.current_plan_id !== 'free';
      
      // Only check Stripe if we have a customer ID
      let hasStripeSubscription = false;
      if (profileData?.stripe_customer_id) {
        const stripeResult = await supabase.functions.invoke('check-subscription');
        hasStripeSubscription = stripeResult.data?.subscribed === true;
      }
      
      setSubscriptionStatus({
        hasStripeSubscription,
        currentPlan: profileData?.current_plan_id || null,
        subscriptionStatus: profileData?.subscription_status || null,
        trialEndsAt: profileData?.trial_ends_at || null,
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
  
  const hasActivePaidPlan = subscriptionStatus.subscriptionStatus === 'active' && 
    subscriptionStatus.currentPlan && 
    subscriptionStatus.currentPlan !== 'free';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t.account.billing.title}</CardTitle>
            {subscriptionStatus.currentPlan && (
              <Badge variant={hasActivePaidPlan ? "default" : "secondary"}>
                {subscriptionStatus.currentPlan}
              </Badge>
            )}
          </div>
          <CardDescription>
            {hasActivePaidPlan 
              ? "Votre plan est actif et opérationnel"
              : "Gérez votre abonnement et consultez votre historique de paiement"
            }
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
                    {hasActivePaidPlan ? (
                      <>Plan actif : <span className="capitalize">{subscriptionStatus.currentPlan}</span></>
                    ) : (
                      <>Plan actuel : <span className="capitalize">{subscriptionStatus.currentPlan}</span></>
                    )}
                  </p>
                  {isTrialing && !hasActivePaidPlan && subscriptionStatus.trialEndsAt && (
                    <p className="text-sm text-muted-foreground">
                      Période d'essai jusqu'au {new Date(subscriptionStatus.trialEndsAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                  {hasActivePaidPlan && (
                    <p className="text-sm text-muted-foreground">
                      Votre plan complet est activé et tous les services sont disponibles
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Trial Warning - only show if still in trial and NOT paid */}
          {!hasActivePaidPlan && isTrialing && subscriptionStatus.currentPlan && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="text-sm">
                  Vous êtes en période d'essai. Activez votre plan payant pour continuer après l'essai.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {hasActivePaidPlan ? (
              <>
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
                        Gérer mon abonnement Stripe
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleActivatePlan}
                    className="w-full"
                    variant="outline"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Changer de plan
                  </Button>
                )}
                <p className="text-xs text-muted-foreground text-center">
                  {subscriptionStatus.hasStripeSubscription 
                    ? "Gérez votre abonnement, moyens de paiement et factures via Stripe"
                    : "Consultez les plans disponibles pour évoluer"
                  }
                </p>
              </>
            ) : (
              <>
                <Button 
                  onClick={handleActivatePlan}
                  className="w-full"
                  variant="default"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {subscriptionStatus.currentPlan ? 'Activer mon abonnement payant' : 'Choisir un plan'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Activez votre plan pour continuer à utiliser tous les services
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}