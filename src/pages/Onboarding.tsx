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
import { PricingCard } from '@/components/pricing/PricingCard';

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
  const [hasCheckedAfterCheckout, setHasCheckedAfterCheckout] = useState(false);

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
      
      // ✅ TOUJOURS claim Shopify AVANT de vérifier subscription
      const shopifyPending = searchParams.get('shopify_pending');
      if (shopifyPending) {
        console.log('🔗 Claiming Shopify connection BEFORE subscription check');
        await claimShopifyConnection(shopifyPending);
      }

      // PUIS vérifier subscription
      if (data?.subscribed) {
        console.log('✅ [CHECK-SUBSCRIPTION] Subscription verified');
        toast.success(t.onboarding.verification.success);
        // Laisser quelques secondes pour que l'import démarre
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
      setHasCheckedAfterCheckout(true);
    }
  };

  const claimShopifyConnection = async (pendingToken: string) => {
    console.log('🔗 [CHECK-SUBSCRIPTION] Claiming Shopify connection before redirect', { pendingToken });
    
    try {
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('[CHECK-SUBSCRIPTION] No session access token available');
        toast.error(t.sync.connectionFailed, {
          description: "Please log in again to continue."
        });
        return;
      }

      console.log('[CHECK-SUBSCRIPTION] Calling claim function with auth token');

      const { data: claimData, error: claimError } = await supabase.functions.invoke(
        'claim-shopify-connection',
        { 
          body: { pendingToken },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );
      
      console.log('🔗 [CHECK-SUBSCRIPTION] Claim response:', { claimData, claimError });
      
      // Phase 1B: Vérifier si le token est expiré AVANT d'essayer
      if (claimError || claimData?.error === 'Token expired' || claimData?.error === 'Invalid or expired token') {
        console.error('❌ [CHECK-SUBSCRIPTION] Token expired or invalid:', claimData);
        
        // Check if it's a token expiration error
        const errorMessage = claimError?.message || claimData?.error || '';
        
        // Log l'échec dans integration_failures
        await supabase.from('integration_failures').insert({
          user_id: user?.id,
          integration_type: 'shopify',
          error_type: 'token_expired',
          error_message: errorMessage,
          context: { pendingToken }
        });
        
        if (errorMessage.includes('expired') || errorMessage.includes('Token expired')) {
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
        } else {
          toast.error(t.sync.connectionFailed, {
            description: errorMessage || "Please try again or contact support."
          });
        }
        
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
            const { data: { session } } = await supabase.auth.getSession();
            const { data: claimData, error: claimError } = await supabase.functions.invoke('claim-shopify-connection', {
              body: { pendingToken: shopifyPending },
              headers: session?.access_token ? {
                Authorization: `Bearer ${session.access_token}`
              } : {}
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
      console.log('📋 Available plans:', plans.map(p => ({ id: p.id, name: p.name })));
      
      // Vérifier que le plan existe
      const selectedPlan = plans.find(p => p.id === planId);
      if (!selectedPlan) {
        console.error('❌ Plan not found:', planId);
        console.error('Available plan IDs:', plans.map(p => p.id));
        toast.error(`Plan "${planId}" not found. Please try again or contact support.`);
        return;
      }
      
      console.log('✅ Selected plan found:', { id: selectedPlan.id, name: selectedPlan.name });
      
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

  if (checkingSubscription || (searchParams.get('checkout') === 'success' && !hasCheckedAfterCheckout)) {
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
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Header Section */}
      <section className="relative overflow-hidden pt-8 pb-12">
        <div className="absolute inset-0 bg-gradient-dark opacity-95" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzYjgyZjYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="container relative mx-auto px-4">
          <div className="flex justify-end mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await signOut();
                navigate('/auth');
              }}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex flex-col items-center text-center space-y-6 animate-fade-in">
            {plans.some(p => p.trial_days > 0) && (
              <Badge className="bg-primary/20 text-white border-primary/30 px-6 py-2">
                <Shield className="w-4 h-4 mr-2" />
                {t.onboarding.trial.available}
              </Badge>
            )}
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white max-w-4xl leading-tight">
              {t.onboarding.title.split('NewAI')[0]}
              <span className="bg-gradient-to-r from-primary-light via-primary to-primary-dark bg-clip-text text-transparent">
                NewAI
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl max-w-2xl text-gray-300">
              {t.onboarding.subtitle}
            </p>
          </div>
        </div>

        {/* Floating gradient orbs */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none" />
      </section>

      <div className="container mx-auto px-4 py-8 max-w-[1600px]">

        {/* Shopify Pending Alert */}
        {searchParams.get('shopify_pending') && (
          <div className="max-w-2xl mx-auto mb-10 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-5 flex items-start gap-4">
            {claimingShopify ? (
              <Loader2 className="w-6 h-6 text-blue-600 mt-1 animate-spin flex-shrink-0" />
            ) : (
              <ShoppingBag className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
            )}
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100">
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
        )}

        {/* Billing Toggle - Toujours visible */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-4 bg-card/50 backdrop-blur-sm rounded-full p-1 border-2 border-border shadow-lg">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full font-medium text-sm transition-all duration-300 ${
                billingCycle === 'monthly' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.onboarding.billing.monthly}
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full font-medium text-sm transition-all duration-300 relative ${
                billingCycle === 'yearly' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.onboarding.billing.yearly}
              <Badge className="absolute -top-2 -right-2 bg-success text-xs px-2 py-0.5">
                {t.onboarding.billing.save}
              </Badge>
            </button>
          </div>
        </div>

        {/* Plans Grid - Style Premium */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1600px] mx-auto auto-rows-fr">
        {/* Free Trial Plan - Only show if user hasn't used their lifetime trial */}
        {!hasUsedTrial && (() => {
            const starterPlan = plans.find(p => p.id === 'starter');
            if (!starterPlan) return null;

            return (
              <Card className="transition-all duration-300 hover:-translate-y-2 hover:shadow-glow border-4 border-green-500/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-gradient-to-br from-green-500 to-emerald-600 text-white px-3 py-1 text-xs font-bold rounded-bl-lg shadow-lg">
                  {language === 'fr' ? 'GRATUIT' : 'FREE'}
                </div>
                
                <div className="p-5 sm:p-6 md:p-8 space-y-4 flex flex-col min-h-[650px]">
                  {/* Bloc 1: Icon centré */}
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center shadow-glow">
                      <Star className="w-7 h-7 text-white" />
                    </div>
                  </div>

                  {/* Bloc 2: Name */}
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">
                      {language === 'fr' ? 'Essai Gratuit' : 'Free Trial'}
                    </h3>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                      {language === 'fr' ? '14 jours Essai Gratuit' : '14 days free'}
                    </Badge>
                  </div>

                  {/* Bloc 3: Price */}
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl sm:text-5xl font-bold text-success">
                        {getCurrencySymbol(language)}0
                      </span>
                      <span className="text-muted-foreground">
                        /{t.onboarding.billing.monthly}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.onboarding.trial.noCardRequired}
                    </p>
                  </div>

                  {/* Bloc 4: Description */}
                  <div className="text-center flex-1 space-y-2">
                    <p className="text-sm text-muted-foreground">{t.onboarding.choosePlanAfterTrial}</p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'fr' 
                        ? "Testez toutes les fonctionnalités premium sans engagement. Aucune carte bancaire requise."
                        : "Test all premium features with no commitment. No credit card required."}
                    </p>
                  </div>

                  {/* Bloc 4bis: Bouton */}
                  <Button
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-glow"
                    size="lg"
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

                  {/* Bloc 5: Séparation et détails */}
                  <div className="pt-4 border-t space-y-3 mt-auto">
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span><strong>{formatLimit(starterPlan.max_products)}</strong> {language === 'fr' ? 'produits' : 'products'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span>{formatStoreLimit(starterPlan.max_shopify_stores)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span><strong>{formatLimit(starterPlan.max_optimizations_monthly)}</strong> {language === 'fr' ? 'optimisations/mois' : 'optimizations/month'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span><strong>{formatLimit(starterPlan.max_articles_monthly)}</strong> {language === 'fr' ? 'articles/mois' : 'articles/month'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span><strong>{formatLimit(starterPlan.max_chat_responses_monthly)}</strong> {language === 'fr' ? 'réponses chat/mois' : 'chat responses/month'}</span>
                    </div>
                  </div>
                </div>
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
                className="transition-all duration-300 hover:-translate-y-2 hover:shadow-glow border-2 border-border"
              >
                <div className="p-5 sm:p-6 md:p-8 space-y-4 flex flex-col min-h-[650px]">
                  {/* Bloc 1: Icon centré */}
                  <div className="flex justify-center">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${getPlanColor(starterPlan.id)} flex items-center justify-center shadow-glow`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                  </div>

                  {/* Bloc 2: Name */}
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">{starterPlan.name}</h3>
                    {starterPlan.trial_days > 0 && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                        {tf('onboarding.trial.freeTrial', { days: starterPlan.trial_days })}
                      </Badge>
                    )}
                  </div>

                  {/* Bloc 3: Price */}
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-2 mb-1">
                      <span className="text-4xl sm:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                        {formatPrice(
                          billingCycle === 'yearly' 
                            ? getPriceByLanguage(starterPlan, language, billingCycle) / 12 
                            : getPriceByLanguage(starterPlan, language, billingCycle), 
                          language
                        )}
                      </span>
                      <span className="text-muted-foreground">{language === 'fr' ? '/mois' : '/month'}</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <span className="text-xs text-muted-foreground">
                        {formatPrice(getPriceByLanguage(starterPlan, language, billingCycle), language)} {language === 'fr' ? 'facturé annuellement' : 'billed annually'}
                      </span>
                    )}
                  </div>

                  {/* Bloc 4: Description */}
                  <div className="text-center flex-1 space-y-2">
                    <p className="text-sm text-muted-foreground">{t.dashboard.plans.descriptions.starter}</p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'fr' 
                        ? "Parfait pour démarrer votre optimisation SEO et booster vos ventes rapidement."
                        : "Perfect to start your SEO optimization and boost your sales quickly."}
                    </p>
                  </div>

                  {/* Bloc 4bis: Bouton */}
                  <Button
                    size="lg"
                    onClick={() => handleSelectPlan(starterPlan.id)}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <>
                        <Shield className="w-5 h-5 mr-2" />
                        {t.onboarding.planFeatures.subscribe}
                      </>
                    )}
                  </Button>

                  {/* Bloc 5: Séparation et détails */}
                  <div className="pt-4 border-t space-y-3 mt-auto">
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span><strong>{formatLimit(starterPlan.max_products)}</strong> {t.onboarding.planFeatures.products}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span>{formatStoreLimit(starterPlan.max_shopify_stores || 1)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span><strong>{formatLimit(starterPlan.max_optimizations_monthly)}</strong> {t.onboarding.planFeatures.optimizations}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span><strong>{formatLimit(starterPlan.max_articles_monthly)}</strong> {t.onboarding.planFeatures.articles}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span><strong>{formatLimit(starterPlan.max_chat_responses_monthly)}</strong> {t.onboarding.planFeatures.chatResponses}</span>
                    </div>
                  </div>
                  
                  {starterPlan.trial_days > 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      {tf('onboarding.trial.cardRequired', { 
                        date: new Date(Date.now() + starterPlan.trial_days * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')
                      })}
                    </p>
                  )}
                </div>
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
                className={`transition-all duration-300 hover:-translate-y-2 hover:shadow-glow ${
                  isPopular ? 'ring-2 ring-primary border-0' : 'border-2 border-border'
                } relative`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-xs">
                    <Star className="w-3 h-3 mr-1" />
                    {t.onboarding.planFeatures.mostPopular}
                  </Badge>
                )}

                <div className="p-5 sm:p-6 md:p-8 space-y-4 flex flex-col">
                  {/* Bloc 1: Icon centré */}
                  <div className="flex justify-center">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${getPlanColor('professional')} flex items-center justify-center shadow-glow`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                  </div>

                  {/* Bloc 2: Name */}
                  <div className="text-center">
                    <h3 className="text-2xl font-bold">Pro</h3>
                  </div>

                  {/* Sélecteur de tier */}
                  <div>
                    <Select value={selectedProTier} onValueChange={setSelectedProTier}>
                      <SelectTrigger className="w-full bg-background z-50">
                        <SelectValue placeholder={t.onboarding.planFeatures.chooseTier} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {proPlans
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

                  {/* Bloc 3: Price avec promo */}
                  <div className="text-center space-y-2">
                    <div className="text-2xl text-muted-foreground line-through">
                      {formatPrice(
                        billingCycle === 'yearly' 
                          ? getPriceByLanguage(selectedPlan, language, billingCycle) / 12 
                          : getPriceByLanguage(selectedPlan, language, billingCycle), 
                        language
                      )}
                    </div>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl sm:text-5xl font-bold text-primary">
                        {formatPrice(
                          (billingCycle === 'yearly' 
                            ? getPriceByLanguage(selectedPlan, language, billingCycle) / 12 
                            : getPriceByLanguage(selectedPlan, language, billingCycle)) * 0.8, 
                          language
                        )}
                      </span>
                      <span className="text-muted-foreground">{t.onboarding.planFeatures.perMonth}</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <span className="text-xs text-muted-foreground">
                        {formatPrice(getPriceByLanguage(selectedPlan, language, billingCycle) * 0.8, language)} {language === 'fr' ? 'facturé annuellement' : 'billed annually'}
                      </span>
                    )}
                    <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-lg px-3 py-2 border border-pink-200 dark:border-pink-800">
                      <p className="text-xs font-medium">
                        <span className="text-pink-600 dark:text-pink-400">
                          {language === 'fr' ? 'Obtenez 20% de réduction' : 'Get 20% discount'}
                        </span>
                        <span className="text-purple-600 dark:text-purple-400 font-bold ml-1">
                          {language === 'fr' ? 'PROMO LIMITÉE' : 'LIMITED PROMO'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Bloc 4: Description */}
                  <div className="text-center flex-1 space-y-2">
                    <p className="text-sm text-muted-foreground">{t.onboarding.planFeatures.forGrowth}</p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'fr' 
                        ? "Idéal pour les boutiques en croissance qui veulent maximiser leur présence en ligne."
                        : "Ideal for growing stores that want to maximize their online presence."}
                    </p>
                  </div>

                  {/* Bloc 4bis: Bouton */}
                  <Button
                    size="lg"
                    onClick={() => handleSelectPlan(selectedProTier)}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <>
                        <Shield className="w-5 h-5 mr-2" />
                        {selectedPlan.trial_days > 0 ? t.onboarding.trial.startTrial : t.onboarding.planFeatures.subscribe}
                      </>
                    )}
                  </Button>

                  {/* Bloc 5: Séparation et détails */}
                  <div className="pt-4 border-t space-y-3 mt-auto">
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span><strong>{formatLimit(selectedPlan.max_products)}</strong> {t.onboarding.planFeatures.products}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span>{formatStoreLimit(selectedPlan.max_shopify_stores || 1)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span><strong>{formatLimit(selectedPlan.max_optimizations_monthly)}</strong> {t.onboarding.planFeatures.optimizations}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span><strong>{formatLimit(selectedPlan.max_articles_monthly)}</strong> {t.onboarding.planFeatures.articles}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span><strong>{formatLimit(selectedPlan.max_chat_responses_monthly)}</strong> {t.onboarding.planFeatures.chatResponses}</span>
                    </div>
                  </div>
                </div>
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
                className="transition-all duration-300 hover:-translate-y-2 hover:shadow-glow border-2 border-border relative"
              >
                {isBestValue && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-success text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    {t.onboarding.planFeatures.bestValue}
                  </Badge>
                )}

                <div className="p-5 sm:p-6 md:p-8 space-y-4 flex flex-col min-h-[650px]">
                  {/* Bloc 1: Icon centré */}
                  <div className="flex justify-center">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${getPlanColor('enterprise')} flex items-center justify-center shadow-glow`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                  </div>

                  {/* Bloc 2: Name */}
                  <div className="text-center">
                    <h3 className="text-2xl font-bold">Enterprise</h3>
                  </div>

                  {/* Sélecteur de tier */}
                  <div>
                    <Select value={selectedEnterpriseTier} onValueChange={setSelectedEnterpriseTier}>
                      <SelectTrigger className="w-full bg-background z-50">
                        <SelectValue placeholder={t.onboarding.planFeatures.chooseTier} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
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

                  {/* Bloc 3: Price avec promo */}
                  <div className="text-center space-y-2">
                    <div className="text-2xl text-muted-foreground line-through">
                      {formatPrice(
                        billingCycle === 'yearly' 
                          ? getPriceByLanguage(selectedPlan, language, billingCycle) / 12 
                          : getPriceByLanguage(selectedPlan, language, billingCycle), 
                        language
                      )}
                    </div>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl sm:text-5xl font-bold text-primary">
                        {formatPrice(
                          (billingCycle === 'yearly' 
                            ? getPriceByLanguage(selectedPlan, language, billingCycle) / 12 
                            : getPriceByLanguage(selectedPlan, language, billingCycle)) * 0.7, 
                          language
                        )}
                      </span>
                      <span className="text-muted-foreground">{t.onboarding.planFeatures.perMonth}</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <span className="text-xs text-muted-foreground">
                        {formatPrice(getPriceByLanguage(selectedPlan, language, billingCycle) * 0.7, language)} {language === 'fr' ? 'facturé annuellement' : 'billed annually'}
                      </span>
                    )}
                    <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-lg px-3 py-2 border border-pink-200 dark:border-pink-800">
                      <p className="text-xs font-medium">
                        <span className="text-pink-600 dark:text-pink-400">
                          {language === 'fr' ? 'Obtenez 30% de réduction' : 'Get 30% discount'}
                        </span>
                        <span className="text-purple-600 dark:text-purple-400 font-bold ml-1">
                          {language === 'fr' ? 'PROMO LIMITÉE' : 'LIMITED PROMO'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Bloc 4: Description */}
                  <div className="text-center flex-1 space-y-2">
                    <p className="text-sm text-muted-foreground">{t.onboarding.planFeatures.forEnterprise}</p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'fr' 
                        ? "Solution complète pour les grandes entreprises avec support prioritaire et volumes illimités."
                        : "Complete solution for large businesses with priority support and unlimited volumes."}
                    </p>
                  </div>

                  {/* Bloc 4bis: Bouton */}
                  <Button
                    size="lg"
                    onClick={() => handleSelectPlan(selectedEnterpriseTier)}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <>
                        <Shield className="w-5 h-5 mr-2" />
                        {selectedPlan.trial_days > 0 ? t.onboarding.trial.startTrial : t.onboarding.planFeatures.subscribe}
                      </>
                    )}
                  </Button>

                  {/* Bloc 5: Séparation et détails */}
                  <div className="pt-4 border-t space-y-3 mt-auto">
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span><strong>{formatLimit(selectedPlan.max_products)}</strong> {t.onboarding.planFeatures.products}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span>{formatStoreLimit(selectedPlan.max_shopify_stores || 1)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span><strong>{formatLimit(selectedPlan.max_optimizations_monthly)}</strong> {t.onboarding.planFeatures.optimizations}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span><strong>{formatLimit(selectedPlan.max_articles_monthly)}</strong> {t.onboarding.planFeatures.articles}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span><strong>{formatLimit(selectedPlan.max_chat_responses_monthly)}</strong> {t.onboarding.planFeatures.chatResponses}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })()}
        </div>
      </div>
    </div>
  );
}