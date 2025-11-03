import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Loader2, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/language";
import { useNavigate } from "react-router-dom";

export function BillingPortal() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      setCheckingSubscription(true);
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      setHasActiveSubscription(data?.subscribed === true);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setHasActiveSubscription(false);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleOpenPortal = async () => {
    if (!hasActiveSubscription) {
      navigate('/subscription');
      return;
    }

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
        title: "Error",
        description: t.account.billing.error,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.account.billing.title}</CardTitle>
          <CardDescription>
            {t.account.billing.description}
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.account.billing.title}</CardTitle>
        <CardDescription>
          {hasActiveSubscription 
            ? t.account.billing.description
            : "Vous n'avez pas encore d'abonnement actif. Choisissez un plan pour commencer."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleOpenPortal}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.account.billing.loading}
            </>
          ) : hasActiveSubscription ? (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              {t.account.billing.openPortal}
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Choisir un plan
            </>
          )}
        </Button>
        {hasActiveSubscription && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            {t.account.billing.redirectInfo}
          </p>
        )}
      </CardContent>
    </Card>
  );
}