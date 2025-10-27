import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  Sparkles, 
  Zap, 
  Crown, 
  Rocket,
  ShoppingBag,
  BarChart3,
  FileText,
  MessageSquare,
  Shield,
  Star
} from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_products: number;
  max_optimizations_monthly: number;
  max_articles_monthly: number;
  max_campaigns: number;
  max_chat_responses_monthly: number;
  features: Record<string, any>;
  trial_days: number;
  popular: boolean;
  best_value: boolean;
  recommended: boolean;
}

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('professional');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // Check if user already has active subscription
    checkExistingSubscription();
    loadPlans();
    
    // Check if user is returning from checkout
    if (searchParams.get('checkout') === 'success') {
      handleCheckSubscription();
    }
  }, [user, navigate]);

  const checkExistingSubscription = async () => {
    try {
      console.log('🔍 Checking if user already has subscription...');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, onboarding_completed')
        .eq('id', user?.id)
        .single();
      
      console.log('📋 Profile data:', profile);
      
      // If user has active subscription and onboarding is completed, redirect to dashboard
      if (profile?.subscription_status === 'active' && profile?.onboarding_completed) {
        console.log('✅ User already has active subscription, redirecting to dashboard');
        navigate('/dashboard');
        return;
      }
      
      // Otherwise, verify with Stripe
      const { data: subData } = await supabase.functions.invoke('check-subscription');
      
      if (subData?.subscribed) {
        console.log('✅ Active subscription found in Stripe, redirecting to dashboard');
        // Update profile
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user?.id);
        
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error checking existing subscription:', error);
    }
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      
      // Cast features from Json to Record<string, any>
      const formattedPlans = (data || []).map(plan => ({
        ...plan,
        features: (plan.features as Record<string, any>) || {}
      })) as Plan[];
      
      setPlans(formattedPlans);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Erreur lors du chargement des forfaits');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleCheckSubscription = async () => {
    setCheckingSubscription(true);
    try {
      console.log('🔍 Checking subscription status...');
      
      // First try check-subscription
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('❌ Error checking subscription:', error);
        // Fallback: try fix-stuck-subscriptions
        console.log('🔧 Attempting to fix stuck subscription...');
        const { data: fixData, error: fixError } = await supabase.functions.invoke('fix-stuck-subscriptions');
        
        if (fixError) {
          throw fixError;
        }
        
        console.log('✅ Fix result:', fixData);
        
        if (fixData?.fixed > 0) {
          toast.success('Votre abonnement a été activé avec succès !');
          setTimeout(() => navigate('/dashboard'), 1500);
          return;
        }
      }
      
      if (data?.subscribed) {
        toast.success('Abonnement vérifié avec succès !');
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        toast.error('Aucun abonnement actif trouvé. Veuillez contacter le support.');
      }
    } catch (error) {
      console.error('💥 Error checking subscription:', error);
      toast.error('Erreur lors de la vérification de l\'abonnement');
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleSelectPlan = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 Creating checkout for plan:', selectedPlanId, 'billing:', billingCycle);
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan_id: selectedPlanId,
          billing_period: billingCycle,
          success_url: `${window.location.origin}/onboarding?checkout=success`,
          cancel_url: `${window.location.origin}/onboarding?checkout=cancelled`
        }
      });

      console.log('📦 Checkout response:', { data, error });

      if (error) {
        console.error('❌ Checkout error:', error);
        throw error;
      }

      if (data?.url) {
        console.log('✅ Redirecting to:', data.url);
        window.location.href = data.url;
      } else {
        console.error('❌ No URL in response:', data);
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('💥 Error creating checkout:', error);
      toast.error('Erreur lors de la création du paiement');
      setLoading(false);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter': return ShoppingBag;
      case 'professional': return Rocket;
      case 'enterprise': return Crown;
      default: return Sparkles;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'starter': return 'from-blue-500 to-cyan-500';
      case 'professional': return 'from-purple-500 to-pink-500';
      case 'enterprise': return 'from-orange-500 to-red-500';
      default: return 'from-primary-light to-primary-dark';
    }
  };

  const formatLimit = (value: number) => {
    if (value === -1) return 'Illimité';
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const getPrice = (plan: Plan) => {
    return billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
  };

  const getSavingsPercent = (plan: Plan) => {
    const monthlyTotal = plan.price_monthly * 12;
    const yearlyTotal = plan.price_yearly;
    return Math.round(((monthlyTotal - yearlyTotal) / monthlyTotal) * 100);
  };

  if (loadingPlans) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show verification message if returning from checkout
  if (checkingSubscription || searchParams.get('checkout') === 'success') {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-8">
        <Card className="p-8 max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">Vérification de votre abonnement</h2>
          <p className="text-muted-foreground mb-6">
            Nous vérifions votre paiement avec Stripe...
          </p>
          <Button onClick={handleCheckSubscription} disabled={checkingSubscription}>
            Vérifier maintenant
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-primary/20 text-primary-foreground border-primary/30">
          <Sparkles className="w-4 h-4 mr-2" />
          ✨ Essai gratuit de 14 jours - Carte bancaire requise
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Choisissez votre{' '}
          <span className="bg-gradient-primary bg-clip-text text-transparent">
            forfait NewAI
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Commencez gratuitement pendant 14 jours. Votre carte ne sera débitée qu'à la fin de l'essai.
        </p>
      </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-card rounded-full p-1 border-2 border-border">
            <Button
              variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
              onClick={() => setBillingCycle('monthly')}
              className="rounded-full"
            >
              Mensuel
            </Button>
            <Button
              variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
              onClick={() => setBillingCycle('yearly')}
              className="rounded-full"
            >
              Annuel
              <Badge className="ml-2 bg-green-500">
                Économisez jusqu'à 20%
              </Badge>
            </Button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto mb-12">
          {plans.map((plan) => {
            const Icon = getPlanIcon(plan.id);
            const isSelected = selectedPlanId === plan.id;

            return (
              <Card
                key={plan.id}
                className={`p-8 cursor-pointer transition-all duration-300 hover:-translate-y-2 ${
                  isSelected 
                    ? 'border-2 border-primary shadow-primary' 
                    : 'border-2 border-transparent hover:border-primary/20'
                } ${plan.popular ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                {plan.popular && (
                  <Badge className="mb-4 bg-primary">
                    <Star className="w-3 h-3 mr-1" />
                    Plus populaire
                  </Badge>
                )}
                {plan.best_value && (
                  <Badge className="mb-4 bg-green-500">
                    <Zap className="w-3 h-3 mr-1" />
                    Meilleur rapport
                  </Badge>
                )}

                <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${getPlanColor(plan.id)} flex items-center justify-center mb-4 shadow-glow`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground mb-6">{plan.description}</p>

                <div className="mb-6">
                  <div className="flex flex-col items-center justify-center mb-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {billingCycle === 'yearly' 
                    ? `$${(plan.price_yearly / 12).toFixed(2)}`
                    : `$${plan.price_monthly.toFixed(2)}`
                  }
                      </span>
                      <span className="text-muted-foreground">
                        /mois
                      </span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        soit ${plan.price_yearly.toFixed(2)} facturé annuellement
                      </p>
                    )}
                  </div>
                  {billingCycle === 'yearly' && getSavingsPercent(plan) > 0 && (
                    <p className="text-sm text-green-600 font-medium text-center">
                      Économisez {getSavingsPercent(plan)}% par an
                    </p>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    <span className="text-sm">
                      {formatLimit(plan.max_products)} produits
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm">
                      {formatLimit(plan.max_optimizations_monthly)} optimisations/mois
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm">
                      {formatLimit(plan.max_articles_monthly)} articles/mois
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span className="text-sm">
                      {formatLimit(plan.max_campaigns)} campagnes
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span className="text-sm">
                      {formatLimit(plan.max_chat_responses_monthly)} réponses chat/mois
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-6 pt-4 border-t border-border">
                  {Object.entries(plan.features).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-success" />
                      <span className="text-sm">
                        {typeof value === 'boolean' 
                          ? key.replace('_', ' ')
                          : `${key.replace('_', ' ')}: ${value}`}
                      </span>
                    </div>
                  ))}
                </div>

                {isSelected && (
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <Check className="w-5 h-5" />
                    Plan sélectionné
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button
            size="lg"
            onClick={handleSelectPlan}
            disabled={loading}
            className="px-12"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Redirection sécurisée...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5 mr-2" />
                Commencer l'essai gratuit
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            💳 Carte bancaire requise • Aucun débit pendant 14 jours • Annulez à tout moment
          </p>
        </div>
      </div>
    </div>
  );
}