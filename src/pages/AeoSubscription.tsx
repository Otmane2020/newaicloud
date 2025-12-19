import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Zap, Building2, ExternalLink, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "@/lib/language";
import { getCurrencySymbol } from "@/lib/formatUtils";

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  stripe_price_id_monthly: string;
  stripe_price_id_yearly: string;
  max_products: number;
  max_optimizations_monthly: number;
  max_articles_monthly: number;
  display_order: number;
  recommended?: boolean;
}

const AeoSubscription = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const currency = getCurrencySymbol(language);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    const status = searchParams.get('checkout');
    if (status === 'success') {
      toast.success(language === 'fr' ? 'Abonnement activé avec succès !' : 'Subscription activated successfully!');
      navigate('/subscription', { replace: true });
    } else if (status === 'cancelled') {
      toast.info(language === 'fr' ? 'Paiement annulé' : 'Payment cancelled');
      navigate('/subscription', { replace: true });
    }
  }, [searchParams, navigate, language]);

  useEffect(() => {
    loadPlansAndCurrentPlan();
  }, [user]);

  const loadPlansAndCurrentPlan = async () => {
    if (!user) return;
    
    try {
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (plansError) throw plansError;
      
      const validPlans = plansData?.filter(plan => {
        const monthlyId = plan.stripe_price_id_monthly || '';
        return monthlyId.startsWith('price_');
      }) || [];
      
      setPlans(validPlans);

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_plan_id')
        .eq('id', user.id)
        .single();

      const activePlanId = profile?.current_plan_id;
      const currentPlanData = activePlanId ? validPlans.find((p: Plan) => p.id === activePlanId) : null;
      setCurrentPlan(currentPlanData || null);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error(language === 'fr' ? 'Erreur lors du chargement des plans' : 'Error loading plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      navigate('/auth?mode=signup');
      return;
    }

    setCheckoutLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan_id: planId,
          billing_period: billingCycle,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la création du paiement' : 'Error creating checkout');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const isCurrentPlan = (planId: string) => currentPlan?.id === planId;

  const getAeoFeatures = (planId: string) => {
    if (planId === 'starter') {
      return [
        language === 'fr' ? '50 AEO Answers / mois' : '50 AEO Answers / month',
        language === 'fr' ? '10 AEO Articles / mois' : '10 AEO Articles / month',
        language === 'fr' ? '5 plateformes IA ciblées' : '5 AI platforms targeted',
        language === 'fr' ? 'Score de citabilité' : 'Citability score',
      ];
    }
    if (planId.startsWith('pro')) {
      return [
        language === 'fr' ? '500 AEO Answers / mois' : '500 AEO Answers / month',
        language === 'fr' ? '100 AEO Articles / mois' : '100 AEO Articles / month',
        language === 'fr' ? 'Toutes les plateformes IA' : 'All AI platforms',
        language === 'fr' ? 'Analytics avancés' : 'Advanced analytics',
        language === 'fr' ? 'API Access' : 'API Access',
      ];
    }
    return [
      language === 'fr' ? 'AEO Answers illimités' : 'Unlimited AEO Answers',
      language === 'fr' ? 'AEO Articles illimités' : 'Unlimited AEO Articles',
      language === 'fr' ? 'Support prioritaire' : 'Priority support',
      language === 'fr' ? 'Intégrations personnalisées' : 'Custom integrations',
      language === 'fr' ? 'Account manager dédié' : 'Dedicated account manager',
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const starterPlan = plans.find(p => p.id === 'starter');
  const proPlan = plans.find(p => p.id === 'pro' || p.id === 'professional' || p.id.startsWith('pro'));
  const enterprisePlan = plans.find(p => p.id.startsWith('enterprise'));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <Badge className="bg-violet-100 text-violet-700 border-violet-200">
          Aeoreply
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold">
          {language === 'fr' ? 'Choisissez votre plan AEO' : 'Choose your AEO plan'}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {language === 'fr' 
            ? 'Optimisez votre visibilité sur ChatGPT, Gemini, Claude et Perplexity'
            : 'Optimize your visibility on ChatGPT, Gemini, Claude and Perplexity'
          }
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            billingCycle === 'monthly' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {language === 'fr' ? 'Mensuel' : 'Monthly'}
        </button>
        <button
          onClick={() => setBillingCycle('yearly')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            billingCycle === 'yearly' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {language === 'fr' ? 'Annuel' : 'Yearly'}
          <Badge className="ml-2 bg-green-100 text-green-700 text-xs">-20%</Badge>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* Starter Plan */}
        {starterPlan && (
          <Card className={`p-6 relative ${isCurrentPlan(starterPlan.id) ? 'ring-2 ring-primary' : ''}`}>
            {isCurrentPlan(starterPlan.id) && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                {language === 'fr' ? 'Plan actuel' : 'Current plan'}
              </Badge>
            )}
            <div className="text-center space-y-4">
              <h3 className="text-xl font-bold">{starterPlan.name}</h3>
              <div className="text-3xl font-bold">
                {currency}{billingCycle === 'monthly' ? starterPlan.price_monthly : Math.round(starterPlan.price_yearly / 12)}
                <span className="text-sm font-normal text-muted-foreground">/{language === 'fr' ? 'mois' : 'mo'}</span>
              </div>
              <ul className="space-y-2 text-left">
                {getAeoFeatures(starterPlan.id).map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full" 
                variant={isCurrentPlan(starterPlan.id) ? "outline" : "default"}
                onClick={() => handleSelectPlan(starterPlan.id)}
                disabled={isCurrentPlan(starterPlan.id) || checkoutLoading === starterPlan.id}
              >
                {checkoutLoading === starterPlan.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCurrentPlan(starterPlan.id) ? (
                  language === 'fr' ? 'Plan actuel' : 'Current plan'
                ) : (
                  language === 'fr' ? 'Commencer' : 'Get started'
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Pro Plan */}
        {proPlan && (
          <Card className={`p-6 relative border-primary ${isCurrentPlan(proPlan.id) ? 'ring-2 ring-primary' : ''}`}>
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600">
              {language === 'fr' ? 'Populaire' : 'Popular'}
            </Badge>
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Zap className="h-5 w-5 text-violet-600" />
                <h3 className="text-xl font-bold">{proPlan.name}</h3>
              </div>
              <div className="text-3xl font-bold">
                {currency}{billingCycle === 'monthly' ? proPlan.price_monthly : Math.round(proPlan.price_yearly / 12)}
                <span className="text-sm font-normal text-muted-foreground">/{language === 'fr' ? 'mois' : 'mo'}</span>
              </div>
              <ul className="space-y-2 text-left">
                {getAeoFeatures(proPlan.id).map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full bg-violet-600 hover:bg-violet-700" 
                onClick={() => handleSelectPlan(proPlan.id)}
                disabled={isCurrentPlan(proPlan.id) || checkoutLoading === proPlan.id}
              >
                {checkoutLoading === proPlan.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCurrentPlan(proPlan.id) ? (
                  language === 'fr' ? 'Plan actuel' : 'Current plan'
                ) : (
                  <>
                    {language === 'fr' ? 'Choisir Pro' : 'Choose Pro'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Enterprise Plan */}
        {enterprisePlan && (
          <Card className={`p-6 relative ${isCurrentPlan(enterprisePlan.id) ? 'ring-2 ring-primary' : ''}`}>
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Building2 className="h-5 w-5 text-slate-600" />
                <h3 className="text-xl font-bold">{enterprisePlan.name}</h3>
              </div>
              <div className="text-3xl font-bold">
                {currency}{billingCycle === 'monthly' ? enterprisePlan.price_monthly : Math.round(enterprisePlan.price_yearly / 12)}
                <span className="text-sm font-normal text-muted-foreground">/{language === 'fr' ? 'mois' : 'mo'}</span>
              </div>
              <ul className="space-y-2 text-left">
                {getAeoFeatures(enterprisePlan.id).map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => handleSelectPlan(enterprisePlan.id)}
                disabled={isCurrentPlan(enterprisePlan.id) || checkoutLoading === enterprisePlan.id}
              >
                {checkoutLoading === enterprisePlan.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCurrentPlan(enterprisePlan.id) ? (
                  language === 'fr' ? 'Plan actuel' : 'Current plan'
                ) : (
                  language === 'fr' ? 'Contacter' : 'Contact us'
                )}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Link to Aeoreply.com */}
      <div className="text-center pt-8">
        <a 
          href="https://aeoreply.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          {language === 'fr' ? 'En savoir plus sur aeoreply.com' : 'Learn more at aeoreply.com'}
        </a>
      </div>
    </div>
  );
};

export default AeoSubscription;
