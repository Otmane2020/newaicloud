import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, CreditCard, Calendar, Package, Check, Zap, Crown } from 'lucide-react';
import { useTranslation } from '@/lib/language';
import { getCurrencySymbol } from '@/lib/formatUtils';


interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  stripe_price_id_monthly: string;
  stripe_price_id_yearly: string;
  max_products: number;
  max_optimizations_monthly: number;
  max_articles_monthly: number;
  max_chat_responses_monthly: number;
  features?: any;
  popular?: boolean;
  best_value?: boolean;
}

export function SubscriptionManagement() {
  const { user } = useAuth();
  const { language } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    loadSubscriptionData();
  }, [user]);

  const loadSubscriptionData = async () => {
    try {
      console.log('🔄 Loading subscription data...');
      
      // Load current subscription from Stripe
      const { data: subData, error: subError } = await supabase.functions.invoke('check-subscription');
      
      if (subError) {
        console.error('❌ Error checking subscription:', subError);
        throw subError;
      }

      console.log('✅ Subscription data:', subData);
      
      if (subData?.subscribed && subData?.product_id) {
        // Find plan by Stripe product ID
        const { data: plansData } = await supabase
          .from('subscription_plans')
          .select('*');

        console.log('📋 Available plans:', plansData);

        // Match by product_id from Stripe
        const plan = plansData?.find((p: Plan) => {
          // Get product ID from the price IDs in Stripe
          return p.stripe_price_id_monthly === subData.plan_id || 
                 p.stripe_price_id_yearly === subData.plan_id;
        });

        console.log('🎯 Matched plan:', plan);
        setCurrentPlan(plan || null);
        setSubscriptionEnd(subData.subscription_end);
      } else {
        console.log('⚠️ No active subscription found');
      }

      // Load all plans
      const { data: allPlans } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      setPlans(allPlans || []);
    } catch (error) {
      console.error('❌ Error loading subscription:', error);
      toast.error('Erreur lors du chargement de l\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: Plan) => {
    if (currentPlan?.id === plan.id) return;
    
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: plan.stripe_price_id_monthly }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Erreur lors de la création du paiement');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      toast.error('Erreur lors de l\'ouverture du portail');
    } finally {
      setPortalLoading(false);
    }
  };

  const getPlanIcon = (planName: string) => {
    if (planName.toLowerCase().includes('enterprise')) return <Crown className="w-6 h-6" />;
    if (planName.toLowerCase().includes('pro')) return <Zap className="w-6 h-6" />;
    return <Package className="w-6 h-6" />;
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Current Plan Card */}
      {currentPlan && (
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-primary">
                {getPlanIcon(currentPlan.name)}
              </div>
              <div>
                <h3 className="text-xl font-semibold">{currentPlan.name}</h3>
                <p className="text-sm text-muted-foreground">Plan actuel</p>
              </div>
            </div>
            <Badge className="bg-success text-success-foreground">Actif</Badge>
          </div>

          {subscriptionEnd && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Calendar className="w-4 h-4" />
              Renouvellement le {new Date(subscriptionEnd).toLocaleDateString('fr-FR')}
            </div>
          )}

          <Button 
            onClick={handleManageSubscription}
            disabled={portalLoading}
            variant="outline"
            className="w-full"
          >
            {portalLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Gérer la facturation
              </>
            )}
          </Button>
        </Card>
      )}

      {/* Plans Comparison */}
      <div>
        <h2 className="text-2xl font-bold mb-6">
          {currentPlan ? 'Change Your Plan' : 'Choose Your Plan'}
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan?.id === plan.id;
            const features = [
              `${plan.max_products} produits`,
              `${plan.max_optimizations_monthly} optimisations SEO/mois`,
              `${plan.max_articles_monthly} articles/mois`,
              `${plan.max_chat_responses_monthly} réponses chat/mois`,
            ];

            return (
              <Card 
                key={plan.id}
                className={`relative p-6 transition-all hover:shadow-lg ${
                  isCurrentPlan ? 'border-2 border-primary shadow-lg' : ''
                } ${plan.popular ? 'border-primary/50' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Populaire
                  </Badge>
                )}
                {plan.best_value && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-success">
                    Meilleure valeur
                  </Badge>
                )}

                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                    {getPlanIcon(plan.name)}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{getCurrencySymbol(language)}{plan.price_monthly}</span>
                    <span className="text-muted-foreground">/mois</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-success shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleUpgrade(plan)}
                  disabled={isCurrentPlan || portalLoading}
                  variant={isCurrentPlan ? 'outline' : 'default'}
                  className="w-full"
                >
                  {portalLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrentPlan ? (
                    'Plan actuel'
                  ) : (
                    'Choisir ce plan'
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
