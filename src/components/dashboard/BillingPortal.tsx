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
  const { t, tf, language } = useTranslation();
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
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('current_plan_id, subscription_status, trial_ends_at, stripe_customer_id')
        .single();
      
      if (profileError) throw profileError;
      
      const hasActivePaidPlan = profileData?.subscription_status === 'active' && 
        profileData?.current_plan_id && 
        profileData?.current_plan_id !== 'free';
      
      let hasStripeSubscription = false;
      if (profileData?.stripe_customer_id) {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : {};
        
        const stripeResult = await supabase.functions.invoke('check-subscription', {
          headers
        });
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

      if (error) {
        toast({
          title: t.common.error,
          description: t.account.billing.error,
          variant: "destructive"
        });
        throw error;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening portal:', error);
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
            {t.account.billing.checkingSubscription}
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US');
  };

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
              ? t.account.billing.descriptionActive
              : t.account.billing.descriptionInactive
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscriptionStatus.currentPlan && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">
                    {hasActivePaidPlan ? (
                      <>{t.account.billing.activePlan} : <span className="capitalize">{subscriptionStatus.currentPlan}</span></>
                    ) : (
                      <>{t.account.billing.currentPlanLabel} : <span className="capitalize">{subscriptionStatus.currentPlan}</span></>
                    )}
                  </p>
                  {isTrialing && !hasActivePaidPlan && subscriptionStatus.trialEndsAt && (
                    <p className="text-sm text-muted-foreground">
                      {tf('account.billing.trialPeriodUntil', { date: formatDate(subscriptionStatus.trialEndsAt) })}
                    </p>
                  )}
                  {hasActivePaidPlan && (
                    <p className="text-sm text-muted-foreground">
                      {t.account.billing.planFullyActivated}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {!hasActivePaidPlan && isTrialing && subscriptionStatus.currentPlan && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="text-sm">
                  {t.account.billing.trialWarning}
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            {hasActivePaidPlan && subscriptionStatus.hasStripeSubscription ? (
              <>
                <Button 
                  onClick={handleOpenPortal}
                  disabled={loading}
                  className="w-full"
                  variant="default"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.account.billing.loading}
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t.account.billing.portalButton}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {t.account.billing.managePaymentMethods}
                </p>
              </>
            ) : hasActivePaidPlan && !subscriptionStatus.hasStripeSubscription ? (
              <>
                <Button 
                  onClick={handleActivatePlan}
                  className="w-full"
                  variant="default"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t.account.billing.setupPayment}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {t.account.billing.setupPaymentDesc}
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
                  {subscriptionStatus.currentPlan ? t.account.billing.activateSubscription : t.account.subscription.choosePlan}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {t.account.billing.activateDesc}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
