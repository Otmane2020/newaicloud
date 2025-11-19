import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/language';
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
  Star,
  LogOut,
  Loader2,
  Store
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { getCurrencySymbol, formatPrice, getPriceByLanguage } from '@/lib/formatUtils';

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
  max_shopify_stores: number;
  features: Record<string, any>;
  trial_days: number;
  popular: boolean;
  best_value: boolean;
  recommended: boolean;
  display_order: number;
}

export default function Onboarding() {
  const { user, signOut } = useAuth();
  const { t, tf, language } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [selectedProTier, setSelectedProTier] = useState<string>('');
  const [selectedEnterpriseTier, setSelectedEnterpriseTier] = useState<string>('');
  const [claimingShopify, setClaimingShopify] = useState(false);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);

  useEffect(() => {
    if (!user) {
      // Préserver le token shopify_pending si présent
      const shopifyPending = searchParams.get('shopify_pending');
      if (shopifyPending) {
        navigate(`/auth?shopify_pending=${shopifyPending}`);
      } else {
        navigate('/auth');
      }
      return;
    }
    
    // Check if user already has active subscription
    checkExistingSubscription();
    loadPlans();
    
    // ✅ Gérer le retour de checkout Stripe
    // Le claim Shopify sera fait dans handleCheckSubscription
    if (searchParams.get('checkout') === 'success') {
      console.log('🔄 [ONBOARDING] Checkout success detected, checking subscription');
      handleCheckSubscription();
    }
  }, [user, navigate, searchParams]);

  const checkExistingSubscription = async () => {
    try {
      console.log('🔍 Checking if user already has subscription...');
      
      // Check if user is admin first
      const { data: adminCheck } = await supabase.rpc('has_role', {
        _user_id: user?.id,
        _role: 'admin'
      });
      
      if (adminCheck) {
        console.log('👑 Admin user detected, redirecting to dashboard');
        navigate('/dashboard');
        return;
      }
      
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log('⚠️ No valid session, skipping Stripe check');
        return;
      }
      
      const { data: subData } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
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
      // Check if user has already used their lifetime trial
      const { data: profileData } = await supabase
        .from('profiles')
        .select('has_used_trial')
        .eq('id', user?.id)
        .single();
      
      if (profileData) {
        setHasUsedTrial(profileData.has_used_trial || false);
        console.log('🎁 User trial status: has_used_trial =', profileData.has_used_trial);
      }

      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .not('id', 'in', '(trial,pay-as-you-go)')
        .order('display_order');

      if (error) throw error;
      
      // Cast features from Json to Record<string, any>
      const formattedPlans = (data || []).map(plan => ({
        ...plan,
        features: (plan.features as Record<string, any>) || {}
      })) as Plan[];
      
      setPlans(formattedPlans);
      
            // Initialize default selections for Pro and Enterprise (lowest price first)
            const proPlans = formattedPlans.filter(p => 
              p.id === 'professional' || 
              p.id === 'pro' || 
              p.id.startsWith('pro-') || 
              p.id.startsWith('professional')
            ).sort((a, b) => {
              const priceA = a.price_monthly;
              const priceB = b.price_monthly;
              return priceA - priceB;
            });
            const enterprisePlans = formattedPlans.filter(p => 
              p.id === 'enterprise' || 
              p.id.startsWith('enterprise')
            ).sort((a, b) => {
              const priceA = a.price_monthly;
              const priceB = b.price_monthly;
              return priceA - priceB;
            });

            if (proPlans.length > 0) {
              setSelectedProTier(proPlans[0].id);
            }
      if (enterprisePlans.length > 0) {
        setSelectedEnterpriseTier(enterprisePlans[0].id);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error(t.onboarding.errors.loadingPlans);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleCheckSubscription = async () => {
    setCheckingSubscription(true);
    
    try {
      console.log('🔍 [CHECK-SUBSCRIPTION] Starting subscription check', {
        hasShopifyPending: !!searchParams.get('shopify_pending'),
        shopifyPendingValue: searchParams.get('shopify_pending'),
        checkoutSuccess: searchParams.get('checkout') === 'success',
        userId: user?.id
      });
      
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log('⚠️ [CHECK-SUBSCRIPTION] No valid session');
        toast.error('Session expired. Please log in again.');
        return;
      }
      
      // 1. Vérifier l'abonnement
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) {
        console.error('❌ [CHECK-SUBSCRIPTION] Error checking subscription:', error);
        // Fallback: try fix-stuck-subscriptions
        console.log('🔧 [CHECK-SUBSCRIPTION] Attempting to fix stuck subscription...');
        const { data: fixData, error: fixError } = await supabase.functions.invoke('fix-stuck-subscriptions');
        
        if (fixError) {
          throw fixError;
        }
        
        console.log('✅ [CHECK-SUBSCRIPTION] Fix result:', fixData);
        
        if (fixData?.fixed > 0) {
          // 2. Avant de rediriger, claim Shopify si nécessaire
          const shopifyPending = searchParams.get('shopify_pending');
          if (shopifyPending) {
            await claimShopifyConnection(shopifyPending);
          }
          
          toast.success(t.onboarding.verification.activated);
          setTimeout(() => navigate('/dashboard?show_shopify_prompt=true'), 1500);
          return;
        }
      }
      
      if (data?.subscribed) {
        console.log('✅ [CHECK-SUBSCRIPTION] Subscription verified');
        
        // 2. ✅ AVANT de rediriger, claim Shopify si nécessaire
        const shopifyPending = searchParams.get('shopify_pending');
        if (shopifyPending) {
          await claimShopifyConnection(shopifyPending);
        }
        
      toast.success(t.onboarding.verification.success);
      // Phase 1C: Augmenter le délai de 1.5s à 5s pour laisser l'import démarrer
      setTimeout(() => {
        navigate('/dashboard?show_shopify_prompt=true');
      }, 5000);
      } else {
        console.warn('⚠️ [CHECK-SUBSCRIPTION] No active subscription found');
        toast.error(t.onboarding.errors.noActiveSubscription);
      }
    } catch (error) {
      console.error('❌ [CHECK-SUBSCRIPTION] Error:', error);
      toast.error(t.onboarding.errors.paymentError);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const claimShopifyConnection = async (pendingToken: string) => {
    console.log('🔗 [CHECK-SUBSCRIPTION] Claiming Shopify connection before redirect', { pendingToken });
    
    try {
      const { data: claimData, error: claimError } = await supabase.functions.invoke(
        'claim-shopify-connection',
        { body: { pendingToken } }
      );
      
      console.log('🔗 [CHECK-SUBSCRIPTION] Claim response:', { claimData, claimError });
      
      // Phase 1B: Vérifier si le token est expiré AVANT d'essayer
      if (claimError || claimData?.error === 'Token expired' || claimData?.error === 'Invalid or expired token') {
        console.error('❌ [CHECK-SUBSCRIPTION] Token expired or invalid:', claimData);
        
        // Log l'échec dans integration_failures
        await supabase.from('integration_failures').insert({
          user_id: user?.id,
          integration_type: 'shopify',
          error_type: 'token_expired',
          error_message: claimData?.error || claimError?.message,
          context: { pendingToken }
        });
        
        toast.error(
          "Votre connexion Shopify a expiré (24h). Veuillez réinstaller l'application Shopify.",
          {
            duration: 10000,
            action: {
              label: "Réinstaller",
              onClick: () => window.open('https://apps.shopify.com/newai-sale', '_blank')
            }
          }
        );
        return;
      }
      
      if (claimError) {
        console.error('❌ [CHECK-SUBSCRIPTION] Shopify claim error:', claimError);
        
        // Log l'échec
        await supabase.from('integration_failures').insert({
          user_id: user?.id,
          integration_type: 'shopify',
          error_type: 'claim_exception',
          error_message: claimError.message,
          context: { pendingToken }
        });
        
        throw claimError;
      }
      
      if (claimData?.success) {
        console.log('✅ [CHECK-SUBSCRIPTION] Shopify connection claimed successfully');
        toast.success(t.sync.shopifyConnected);
        toast.info(t.sync.autoImport, { duration: 5000 });
        
        // Phase 1C: Attendre 3 secondes pour que l'import démarre
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.error('❌ [CHECK-SUBSCRIPTION] Claim failed:', claimData);
        
        // Log l'échec
        await supabase.from('integration_failures').insert({
          user_id: user?.id,
          integration_type: 'shopify',
          error_type: 'claim_failed',
          error_message: JSON.stringify(claimData),
          context: { pendingToken }
        });
      }
    } catch (claimError) {
      console.error('❌ [CHECK-SUBSCRIPTION] Failed to claim Shopify:', claimError);
      toast.error(t.sync.connectionFailed);
    }
  };

  const handleStartFreeTrial = async () => {
    if (!user) {
      toast.error(t.onboarding.errors.mustBeConnected);
      return;
    }

    setLoading(true);
    try {
      console.log('🎁 Activating free trial for user:', user.id);

      const { data, error } = await supabase.functions.invoke('activate-free-trial');

      if (error) throw error;

      if (data?.success) {
        toast.success(language === 'fr' 
          ? 'Essai Gratuit activé ! Redirection...' 
          : 'Free trial activated! Redirecting...'
        );
        
        // Check for Shopify pending connection
        const shopifyPending = searchParams.get('shopify_pending');
        if (shopifyPending) {
          console.log('🔗 Claiming Shopify connection after trial setup');
          try {
            const { data: claimData, error: claimError } = await supabase.functions.invoke('claim-shopify-connection', {
              body: { pendingToken: shopifyPending }
            });

            if (claimError) throw claimError;

            if (claimData?.success) {
              toast.success(t.sync.shopifyConnected);
              toast.info(t.sync.autoImport, { duration: 5000 });
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
          } catch (claimError) {
            console.error('Failed to claim Shopify connection:', claimError);
            toast.error(t.sync.connectionFailed);
          }
        }

        setTimeout(() => navigate('/dashboard?show_shopify_prompt=true'), 1500);
      }
    } catch (error) {
      console.error('💥 Error activating trial:', error);
      toast.error(language === 'fr'
        ? 'Erreur lors de l\'activation de l\'Essai Gratuit'
        : 'Error activating free trial'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string, isTrial: boolean = false) => {
    if (!user) {
      toast.error(t.onboarding.errors.mustBeConnected);
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 Creating checkout for plan:', planId, 'billing:', billingCycle, 'trial:', isTrial);
      
      // Check if user has active subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id, status')
        .eq('seller_id', user.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle();

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, trial_ends_at')
        .eq('id', user.id)
        .single();
      
      const hasActiveSubscription = !!subscription?.stripe_subscription_id;
      const hasActiveTrial = Boolean(
        profile?.subscription_status === 'trialing' || 
        (profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date())
      );
      
      console.log('💳 User subscription status:', { 
        hasActiveSubscription,
        hasActiveTrial, 
        subscriptionStatus: profile?.subscription_status 
      });

      // If user has active subscription, use update-subscription for proration
      if (hasActiveSubscription) {
        const selectedPlan = plans.find(p => p.id === planId);
        if (!selectedPlan) throw new Error('Plan not found');

        const priceId = billingCycle === 'yearly' 
          ? (selectedPlan as any).stripe_price_id_yearly 
          : (selectedPlan as any).stripe_price_id_monthly;

        const { data, error } = await supabase.functions.invoke('update-subscription', {
          body: {
            new_price_id: priceId,
            new_plan_id: planId,
          },
        });

        if (error) throw error;

        toast.success(t.onboarding.verification.success);
        setTimeout(() => navigate('/dashboard'), 1500);
        return;
      }
      
      // Otherwise, create new checkout session
      const shopifyPending = searchParams.get('shopify_pending');
      const successUrl = shopifyPending 
        ? `${window.location.origin}/onboarding?checkout=success&shopify_pending=${shopifyPending}`
        : `${window.location.origin}/onboarding?checkout=success`;
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan_id: planId,
          billing_period: billingCycle,
          currency: language === 'fr' ? 'EUR' : 'USD',
          success_url: successUrl,
          cancel_url: `${window.location.origin}/onboarding?checkout=cancelled`,
          force_immediate_payment: hasActiveTrial
        }
      });

      console.log('📦 Checkout response:', { data, error });

      if (error) {
        console.error('❌ Checkout error:', error);
        throw error;
      }

      if (data?.url) {
        console.log('✅ Redirecting to:', data.url);
        // Redirection dans le même onglet pour éviter les popups bloqués
        window.location.href = data.url;
      } else {
        console.error('❌ No URL in response:', data);
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('💥 Error creating checkout:', error);
      toast.error(t.onboarding.errors.paymentError);
    } finally {
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
    if (value === -1 || value >= 999999) return t.onboarding.planFeatures.unlimited;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const formatStoreLimit = (value: number) => {
    const formattedValue = formatLimit(value);
    const isUnlimited = formattedValue === t.onboarding.planFeatures.unlimited;
    const isPlural = value > 1 || isUnlimited;
    
    if (language === 'fr') {
      return `${formattedValue} ${isPlural ? 'Boutiques connectées' : 'Boutique connectée'}`;
    }
    return `${formattedValue} ${isPlural ? 'Connected stores' : 'Connected store'}`;
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
          <h2 className="text-2xl font-bold mb-2">{t.onboarding.verification.title}</h2>
          <p className="text-muted-foreground mb-6">
            {t.onboarding.verification.checking}
          </p>
          <Button onClick={handleCheckSubscription} disabled={checkingSubscription}>
            {t.onboarding.verification.verifyNow}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-2 sm:p-4 md:p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Logout Button */}
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              await signOut();
              navigate('/auth');
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

      {/* Header */}
      <div className="text-center mb-4 sm:mb-8 md:mb-10">
        {plans.some(p => p.trial_days > 0) && (
          <Badge className="mb-2 sm:mb-3 bg-primary/20 text-primary-foreground border-primary/30 text-xs sm:text-sm">
            <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            {t.onboarding.trial.available}
          </Badge>
        )}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-2 sm:mb-3 px-2">
          {t.onboarding.title.split('NewAI')[0]}
          <span className="bg-gradient-primary bg-clip-text text-transparent">
            NewAI
          </span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
          {t.onboarding.subtitle}
        </p>
      </div>

      {/* Shopify pending connection alert */}
      {searchParams.get('shopify_pending') && (
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              {claimingShopify ? (
                <Loader2 className="h-5 w-5 text-blue-600 mt-0.5 animate-spin" />
              ) : (
                <ShoppingBag className="h-5 w-5 text-blue-600 mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  {claimingShopify 
                    ? "Connexion en cours..." 
                    : "Connexion Shopify en attente"
                  }
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {claimingShopify 
                    ? "Import automatique de vos 10 premiers produits en cours..."
                    : `Votre boutique ${searchParams.get('shop') || 'Shopify'} sera automatiquement connectée et vos 10 premiers produits importés une fois votre plan sélectionné.`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Billing Toggle */}
        <div className="flex justify-center mb-4 sm:mb-8 md:mb-10 px-2">
          <div className="bg-card rounded-full p-1 border-2 border-border">
            <Button
              variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
              onClick={() => setBillingCycle('monthly')}
              className="rounded-full text-xs sm:text-sm px-3 sm:px-4"
              size="sm"
            >
              {t.onboarding.billing.monthly}
            </Button>
            <Button
              variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
              onClick={() => setBillingCycle('yearly')}
              className="rounded-full text-xs sm:text-sm px-3 sm:px-4"
              size="sm"
            >
              {t.onboarding.billing.yearly}
              <Badge className="ml-1.5 sm:ml-2 bg-green-500 text-[10px] sm:text-xs px-1.5 sm:px-2">
                {t.onboarding.billing.save}
              </Badge>
            </Button>
          </div>
        </div>

      {/* Plans */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${!hasUsedTrial ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 sm:gap-6 md:gap-8 max-w-7xl mx-auto mb-4 sm:mb-8 md:mb-10 px-2`}>
          {/* Free Trial Plan - Only show if user hasn't used their lifetime trial */}
          {!hasUsedTrial && (() => {
            const starterPlan = plans.find(p => p.id === 'starter');
            if (!starterPlan) return null;

            return (
              <Card className="p-5 sm:p-6 md:p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-glow border-4 border-green-500/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-gradient-to-br from-green-500 to-emerald-600 text-white px-3 py-1 text-xs font-bold rounded-bl-lg shadow-lg">
                  {language === 'fr' ? 'GRATUIT' : 'FREE'}
                </div>
                
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center mb-3 sm:mb-4 shadow-glow">
                  <Star className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>

                <h3 className="text-xl sm:text-2xl font-bold mb-2">
                  {language === 'fr' ? 'Essai Gratuit' : 'Free Trial'}
                </h3>
                <Badge variant="outline" className="mb-2 sm:mb-3 bg-success/10 text-success border-success/30 text-xs">
                  {language === 'fr' ? '14 jours Essai Gratuit' : '14 days free'}
                </Badge>
                
                <div className="mb-4">
                  <div className="text-3xl sm:text-4xl font-bold mb-1">
                    {getCurrencySymbol(language)}0
                    <span className="text-base sm:text-lg text-muted-foreground font-normal">
                      /{t.onboarding.billing.monthly}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.onboarding.trial.cardRequired.split('•')[0]} • {language === 'fr' ? 'Annulez à tout moment' : 'Cancel anytime'}
                  </p>
                </div>

                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">
                      {formatLimit(starterPlan.max_products)} {language === 'fr' ? 'produits' : 'products'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatStoreLimit(starterPlan.max_shopify_stores)}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">
                      {formatLimit(starterPlan.max_optimizations_monthly)} {language === 'fr' ? 'optimisations/mois' : 'optimizations/month'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">
                      {formatLimit(starterPlan.max_articles_monthly)} {language === 'fr' ? 'articles/mois' : 'articles/month'}
                    </span>
                  </div>
                  {starterPlan.max_campaigns > 0 && (
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">
                        {formatLimit(starterPlan.max_campaigns)} {language === 'fr' ? 'campagnes' : 'campaigns'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">
                      {formatLimit(starterPlan.max_chat_responses_monthly)} {language === 'fr' ? 'réponses chat/mois' : 'chat responses/month'}
                    </span>
                  </div>
                </div>

                <Button 
                  className="w-full text-xs sm:text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-glow"
                  onClick={handleStartFreeTrial}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {language === 'fr' ? 'Activation...' : 'Activating...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {t.onboarding.trial.startTrial}
                    </>
                  )}
                </Button>
                
                <p className="text-[10px] text-center text-muted-foreground mt-2">
                  {t.onboarding.choosePlanAfterTrial}
                </p>
              </Card>
            );
          })()}

          {/* Starter Plan */}
          {(() => {
            const starterPlan = plans.find(p => p.id === 'starter');
            if (!starterPlan) return null;
            
            const Icon = getPlanIcon(starterPlan.id);
            
            return (
              <Card
                key={starterPlan.id}
                className="p-5 sm:p-6 md:p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-glow border-2 border-border"
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-r ${getPlanColor(starterPlan.id)} flex items-center justify-center mb-3 sm:mb-4 shadow-glow`}>
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>

                <h3 className="text-xl sm:text-2xl font-bold mb-2">{starterPlan.name}</h3>
                {starterPlan.trial_days > 0 && (
                  <Badge variant="outline" className="mb-2 sm:mb-3 bg-success/10 text-success border-success/30 text-xs">
                    {tf('onboarding.trial.freeTrial', { days: starterPlan.trial_days })}
                  </Badge>
                )}
                <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">{t.dashboard.plans.descriptions.starter}</p>

                <div className="mb-4 sm:mb-6">
                  <div className="flex flex-col items-center justify-center mb-2">
                    <div className="flex items-baseline gap-1.5 sm:gap-2">
                      <span className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                        {formatPrice(
                          billingCycle === 'yearly' 
                            ? getPriceByLanguage(starterPlan, language, billingCycle) / 12 
                            : getPriceByLanguage(starterPlan, language, billingCycle), 
                          language
                        )}
                      </span>
                      <span className="text-muted-foreground text-sm sm:text-base">{language === 'fr' ? '/mois' : '/month'}</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <span className="text-xs sm:text-sm text-muted-foreground text-center">
                        {formatPrice(getPriceByLanguage(starterPlan, language, billingCycle), language)} {language === 'fr' ? 'facturé annuellement' : 'billed annually'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 sm:space-y-3 mb-4 sm:mb-6">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatLimit(starterPlan.max_products)} {t.onboarding.planFeatures.products}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatStoreLimit(starterPlan.max_shopify_stores || 1)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatLimit(starterPlan.max_optimizations_monthly)} {t.onboarding.planFeatures.optimizations}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatLimit(starterPlan.max_articles_monthly)} {t.onboarding.planFeatures.articles}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatLimit(starterPlan.max_campaigns)} {t.onboarding.planFeatures.campaigns}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatLimit(starterPlan.max_chat_responses_monthly)} {t.onboarding.planFeatures.chatResponses}</span>
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 pt-3 sm:pt-4 border-t border-border">
                  {Object.entries(starterPlan.features).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success flex-shrink-0" />
                      <span className="text-xs sm:text-sm">
                        {typeof value === 'boolean' 
                          ? key.replace('_', ' ')
                          : `${key.replace('_', ' ')}: ${value}`}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  size="lg"
                  onClick={() => handleSelectPlan(starterPlan.id)}
                  disabled={loading}
                  className="w-full text-sm sm:text-base py-3 sm:py-4 h-auto min-h-[48px]"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                  ) : (
                    <>
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                      <span className="leading-tight">{t.onboarding.planFeatures.subscribe}</span>
                    </>
                  )}
                </Button>
                
                {starterPlan.trial_days > 0 && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground text-center mt-2 sm:mt-3 px-2">
                    {tf('onboarding.trial.cardRequired', { 
                      date: new Date(Date.now() + starterPlan.trial_days * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')
                    })}
                  </p>
                )}
              </Card>
            );
          })()}

          {/* Pro Plans with Dropdown */}
          {(() => {
            const proPlans = plans.filter(p => 
              p.id === 'professional' || 
              p.id === 'pro' || 
              p.id.startsWith('pro-') || 
              p.id.startsWith('professional')
            ).sort((a, b) => a.display_order - b.display_order);
            
            if (proPlans.length === 0) return null;
            
            const selectedPlan = proPlans.find(p => p.id === selectedProTier) || proPlans[0];
            const Icon = getPlanIcon('professional');
            const isPopular = proPlans.some(p => p.popular);
            
            return (
              <Card
                key="pro-group"
                className={`p-5 sm:p-6 md:p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-glow ${
                  isPopular ? 'ring-2 ring-primary' : 'border-2 border-border'
                }`}
              >
                {isPopular && (
                  <Badge className="mb-3 sm:mb-4 bg-primary text-xs">
                    <Star className="w-3 h-3 mr-1" />
                    {t.onboarding.planFeatures.mostPopular}
                  </Badge>
                )}

                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-r ${getPlanColor('professional')} flex items-center justify-center mb-3 sm:mb-4 shadow-glow`}>
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>

                <h3 className="text-xl sm:text-2xl font-bold mb-2">Pro</h3>
                <p className="text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base">{t.onboarding.planFeatures.forGrowth}</p>

                {/* Dropdown pour choisir le tier */}
                <div className="mb-3 sm:mb-4">
                  <Select value={selectedProTier} onValueChange={setSelectedProTier}>
                    <SelectTrigger className="w-full bg-background z-50 text-xs sm:text-sm">
                      <SelectValue placeholder={t.onboarding.planFeatures.chooseTier} />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50 text-xs sm:text-sm">
                      {proPlans
                        .sort((a, b) => {
                          const priceA = billingCycle === 'yearly' ? a.price_yearly : a.price_monthly;
                          const priceB = billingCycle === 'yearly' ? b.price_yearly : b.price_monthly;
                          return priceA - priceB; // Tri croissant: 49€ en premier
                        })
                        .map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.max_optimizations_monthly.toLocaleString()} {t.onboarding.planFeatures.optimizations} - {formatPrice(getPriceByLanguage(plan, language, billingCycle), language)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mb-4 sm:mb-6">
                  <div className="flex flex-col items-center justify-center mb-2">
                    <div className="flex items-baseline gap-1.5 sm:gap-2">
                      <span className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                        {formatPrice(
                          billingCycle === 'yearly' 
                            ? getPriceByLanguage(selectedPlan, language, billingCycle) / 12 
                            : getPriceByLanguage(selectedPlan, language, billingCycle), 
                          language
                        )}
                      </span>
                      <span className="text-muted-foreground text-sm sm:text-base">{t.onboarding.planFeatures.perMonth}</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <span className="text-xs sm:text-sm text-muted-foreground text-center">
                        {formatPrice(getPriceByLanguage(selectedPlan, language, billingCycle), language)} {language === 'fr' ? 'facturé annuellement' : 'billed annually'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 sm:space-y-3 mb-4 sm:mb-6">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatLimit(selectedPlan.max_products)} {t.onboarding.planFeatures.products}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatStoreLimit(selectedPlan.max_shopify_stores || 1)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatLimit(selectedPlan.max_optimizations_monthly)} {t.onboarding.planFeatures.optimizations}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatLimit(selectedPlan.max_articles_monthly)} {t.onboarding.planFeatures.articles}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatLimit(selectedPlan.max_campaigns)} {t.onboarding.planFeatures.campaigns}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatLimit(selectedPlan.max_chat_responses_monthly)} {t.onboarding.planFeatures.chatResponses}</span>
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 pt-3 sm:pt-4 border-t border-border">
                  {Object.entries(selectedPlan.features).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success flex-shrink-0" />
                      <span className="text-xs sm:text-sm">
                        {typeof value === 'boolean' 
                          ? key.replace('_', ' ')
                          : `${key.replace('_', ' ')}: ${value}`}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  size="lg"
                  onClick={() => handleSelectPlan(selectedProTier)}
                  disabled={loading}
                  className="w-full text-sm sm:text-base py-3 sm:py-4 h-auto min-h-[48px]"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2" />
                  ) : (
                    <>
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                      <span className="leading-tight">{selectedPlan.trial_days > 0 ? t.onboarding.trial.startTrial : t.onboarding.planFeatures.subscribe}</span>
                    </>
                  )}
                </Button>
              </Card>
            );
          })()}

          {/* Enterprise Plans with Dropdown */}
          {(() => {
            const enterprisePlans = plans.filter(p => 
              p.id === 'enterprise' || 
              p.id.startsWith('enterprise')
            ).sort((a, b) => a.display_order - b.display_order);
            
            if (enterprisePlans.length === 0) return null;
            
            const selectedPlan = enterprisePlans.find(p => p.id === selectedEnterpriseTier) || enterprisePlans[0];
            const Icon = getPlanIcon('enterprise');
            const isBestValue = enterprisePlans.some(p => p.best_value);
            
            return (
              <Card
                key="enterprise-group"
                className="p-5 sm:p-6 md:p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-glow border-2 border-border"
              >
                {isBestValue && (
                  <Badge className="mb-3 sm:mb-4 bg-green-500 text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    {t.onboarding.planFeatures.bestValue}
                  </Badge>
                )}

                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-r ${getPlanColor('enterprise')} flex items-center justify-center mb-3 sm:mb-4 shadow-glow`}>
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>

                <h3 className="text-xl sm:text-2xl font-bold mb-2">Enterprise</h3>
                <p className="text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base">{t.onboarding.planFeatures.forEnterprise}</p>

                {/* Dropdown pour choisir le tier */}
                <div className="mb-3 sm:mb-4">
                  <Select value={selectedEnterpriseTier} onValueChange={setSelectedEnterpriseTier}>
                    <SelectTrigger className="w-full bg-background z-50 text-xs sm:text-sm">
                      <SelectValue placeholder={t.onboarding.planFeatures.chooseTier} />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50 text-xs sm:text-sm">
                      {enterprisePlans
                        .sort((a, b) => {
                          const priceA = billingCycle === 'yearly' ? a.price_yearly : a.price_monthly;
                          const priceB = billingCycle === 'yearly' ? b.price_yearly : b.price_monthly;
                          return priceA - priceB;
                        })
                        .map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.max_optimizations_monthly.toLocaleString()} {t.onboarding.planFeatures.optimizations} - {formatPrice(getPriceByLanguage(plan, language, billingCycle), language)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mb-4 sm:mb-6">
                  <div className="flex flex-col items-center justify-center mb-2">
                    <div className="flex items-baseline gap-1.5 sm:gap-2">
                      <span className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                        {formatPrice(
                          billingCycle === 'yearly' 
                            ? getPriceByLanguage(selectedPlan, language, billingCycle) / 12 
                            : getPriceByLanguage(selectedPlan, language, billingCycle), 
                          language
                        )}
                      </span>
                      <span className="text-muted-foreground text-sm sm:text-base">{t.onboarding.planFeatures.perMonth}</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <span className="text-xs sm:text-sm text-muted-foreground text-center">
                        {formatPrice(getPriceByLanguage(selectedPlan, language, billingCycle), language)} {language === 'fr' ? 'facturé annuellement' : 'billed annually'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 sm:space-y-3 mb-4 sm:mb-6">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatLimit(selectedPlan.max_products)} {t.onboarding.planFeatures.products}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatStoreLimit(selectedPlan.max_shopify_stores || 1)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatLimit(selectedPlan.max_optimizations_monthly)} {t.onboarding.planFeatures.optimizations}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatLimit(selectedPlan.max_articles_monthly)} {t.onboarding.planFeatures.articles}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatLimit(selectedPlan.max_campaigns)} {t.onboarding.planFeatures.campaigns}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{formatLimit(selectedPlan.max_chat_responses_monthly)} {t.onboarding.planFeatures.chatResponses}</span>
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 pt-3 sm:pt-4 border-t border-border">
                  {Object.entries(selectedPlan.features).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success flex-shrink-0" />
                      <span className="text-xs sm:text-sm">
                        {typeof value === 'boolean' 
                          ? key.replace('_', ' ')
                          : `${key.replace('_', ' ')}: ${value}`}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  size="lg"
                  onClick={() => handleSelectPlan(selectedEnterpriseTier)}
                  disabled={loading}
                  className="w-full text-sm sm:text-base py-3 sm:py-4 h-auto min-h-[48px]"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2" />
                  ) : (
                    <>
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                      <span className="leading-tight">{selectedPlan.trial_days > 0 ? t.onboarding.trial.startTrial : t.onboarding.planFeatures.subscribe}</span>
                    </>
                  )}
                </Button>
              </Card>
            );
          })()}
        </div>

      </div>
    </div>
  );
}