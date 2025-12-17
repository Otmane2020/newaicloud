import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/language";
import { aeoTranslations } from "@/lib/translations/aeo";
import {
  Check,
  Sparkles,
  Zap,
  Crown,
  Rocket,
  MessageSquare,
  FileText,
  Shield,
  Star,
  LogOut,
  Loader2,
  Target,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatPrice, getPriceByLanguage } from "@/lib/formatUtils";

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

export default function AeoOnboarding() {
  const { user, signOut } = useAuth();
  const { language } = useTranslation();
  const t = aeoTranslations[language] || aeoTranslations.fr;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [trialPlan, setTrialPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [selectedProTier, setSelectedProTier] = useState<string>("");
  const [selectedEnterpriseTier, setSelectedEnterpriseTier] = useState<string>("");
  const [hasUsedTrial, setHasUsedTrial] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth?mode=signup");
      return;
    }
    checkExistingSubscription();
    loadPlans();
    
    // Handle checkout success
    if (searchParams.get("checkout") === "success") {
      handleCheckSubscription();
    }
  }, [user, navigate, searchParams]);

  const checkExistingSubscription = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_status, onboarding_completed")
        .eq("id", user?.id)
        .single();

      if (profile?.subscription_status === "active" && profile?.onboarding_completed) {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const loadPlans = async () => {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("has_used_trial")
        .eq("id", user?.id)
        .single();

      if (profileData) {
        setHasUsedTrial(profileData.has_used_trial || false);
      }

      const { data: trialData } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", "trial")
        .single();

      if (trialData) {
        setTrialPlan({ ...trialData, features: trialData.features as Record<string, any> || {} });
      }

      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .not("id", "in", "(trial,pay-as-you-go)")
        .order("display_order");

      if (error) throw error;

      const formattedPlans = (data || []).map((plan) => ({
        ...plan,
        features: (plan.features as Record<string, any>) || {},
      })) as Plan[];

      setPlans(formattedPlans);

      const proPlans = formattedPlans
        .filter((p) => p.id.startsWith("pro") || p.id === "professional")
        .sort((a, b) => a.price_monthly - b.price_monthly);
      const enterprisePlans = formattedPlans
        .filter((p) => p.id.startsWith("enterprise"))
        .sort((a, b) => a.price_monthly - b.price_monthly);

      if (proPlans.length > 0) setSelectedProTier(proPlans[0].id);
      if (enterprisePlans.length > 0) setSelectedEnterpriseTier(enterprisePlans[0].id);
    } catch (error) {
      console.error("Error loading plans:", error);
      toast.error(language === 'fr' ? "Erreur lors du chargement des plans" : "Error loading plans");
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleCheckSubscription = async () => {
    setCheckingSubscription(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const { data: subData } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (subData?.subscribed) {
        await supabase.from("profiles").update({
          subscription_status: "active",
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        }).eq("id", user?.id);

        toast.success(language === 'fr' ? "Abonnement activé !" : "Subscription activated!");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error(language === 'fr' ? "Session expirée" : "Session expired");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          planId,
          billingCycle,
          successUrl: `${window.location.origin}/onboarding?checkout=success`,
          cancelUrl: `${window.location.origin}/onboarding`,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast.error(error.message || (language === 'fr' ? "Erreur lors du paiement" : "Payment error"));
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    if (hasUsedTrial) {
      toast.error(language === 'fr' ? "Essai déjà utilisé" : "Trial already used");
      return;
    }
    setLoading(true);
    try {
      await supabase.from("profiles").update({
        subscription_status: "trialing",
        current_plan_id: "trial",
        has_used_trial: true,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }).eq("id", user?.id);

      toast.success(language === 'fr' ? "Essai gratuit activé !" : "Free trial activated!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error starting trial:", error);
      toast.error(language === 'fr' ? "Erreur lors de l'activation" : "Activation error");
    } finally {
      setLoading(false);
    }
  };

  const getPlanPrice = (plan: Plan) => {
    return billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
  };

  const getYearlySavings = (plan: Plan) => {
    const monthlyCost = plan.price_monthly * 12;
    const yearlyCost = plan.price_yearly * 12;
    return Math.round(((monthlyCost - yearlyCost) / monthlyCost) * 100);
  };

  const starterPlan = plans.find((p) => p.id === "starter");
  const proPlans = plans.filter((p) => p.id.startsWith("pro") || p.id === "professional");
  const enterprisePlans = plans.filter((p) => p.id.startsWith("enterprise"));
  const selectedPro = proPlans.find((p) => p.id === selectedProTier) || proPlans[0];
  const selectedEnterprise = enterprisePlans.find((p) => p.id === selectedEnterpriseTier) || enterprisePlans[0];

  const renderFeatures = (plan: Plan | null) => {
    if (!plan) return null;
    const features = [
      { 
        label: language === 'fr' ? "Crédits AEO" : "AEO Credits", 
        value: plan.max_optimizations_monthly === -1 ? (language === 'fr' ? "Illimité" : "Unlimited") : plan.max_optimizations_monthly,
        icon: Target 
      },
      { 
        label: language === 'fr' ? "Articles AEO" : "AEO Articles", 
        value: plan.max_articles_monthly === -1 ? (language === 'fr' ? "Illimité" : "Unlimited") : plan.max_articles_monthly,
        icon: FileText 
      },
      { 
        label: language === 'fr' ? "Réponses IA" : "AI Responses", 
        value: plan.max_chat_responses_monthly === -1 ? (language === 'fr' ? "Illimité" : "Unlimited") : plan.max_chat_responses_monthly,
        icon: MessageSquare 
      },
    ];

    return (
      <ul className="space-y-3 mt-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <f.icon className="w-4 h-4 text-violet-500" />
            </div>
            <span className="text-muted-foreground">{f.label}</span>
            <span className="ml-auto font-semibold">{f.value}</span>
          </li>
        ))}
        <li className="flex items-center gap-3 text-sm">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-muted-foreground">LLMs.txt</span>
          <span className="ml-auto font-semibold">
            <Check className="w-4 h-4 text-emerald-500" />
          </span>
        </li>
      </ul>
    );
  };

  if (loadingPlans) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-blue-50/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-blue-50/20">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
              Aeoreply
            </span>
          </div>
          <Button variant="ghost" onClick={() => signOut()} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-2" />
            {language === 'fr' ? 'Déconnexion' : 'Sign out'}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Title */}
        <div className="text-center mb-12">
          <Badge className="bg-violet-100 text-violet-700 border-violet-200 mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            {language === 'fr' ? 'Choisissez votre plan' : 'Choose your plan'}
          </Badge>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-slate-900 via-violet-900 to-slate-900 bg-clip-text text-transparent">
            {language === 'fr' ? 'Crédits AEO pour votre visibilité IA' : 'AEO Credits for your AI visibility'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === 'fr' 
              ? 'Chaque crédit vous permet de générer une réponse optimisée pour les assistants IA.' 
              : 'Each credit lets you generate an AI-optimized response.'}
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Label className={billingCycle === "monthly" ? "font-semibold" : "text-muted-foreground"}>
            {language === 'fr' ? 'Mensuel' : 'Monthly'}
          </Label>
          <Switch
            checked={billingCycle === "yearly"}
            onCheckedChange={(checked) => setBillingCycle(checked ? "yearly" : "monthly")}
          />
          <Label className={billingCycle === "yearly" ? "font-semibold" : "text-muted-foreground"}>
            {language === 'fr' ? 'Annuel' : 'Yearly'}
          </Label>
          {billingCycle === "yearly" && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              -20%
            </Badge>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Trial Plan */}
          {trialPlan && !hasUsedTrial && (
            <Card className="p-6 border-2 border-dashed border-violet-200 bg-white/50 hover:border-violet-300 transition-all">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Star className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <h3 className="font-bold">{language === 'fr' ? 'Essai Gratuit' : 'Free Trial'}</h3>
                  <p className="text-xs text-muted-foreground">7 {language === 'fr' ? 'jours' : 'days'}</p>
                </div>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold">0€</span>
              </div>
              {renderFeatures(trialPlan)}
              <Button 
                className="w-full mt-6 bg-violet-500 hover:bg-violet-600" 
                onClick={handleStartTrial}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (language === 'fr' ? 'Démarrer l\'essai' : 'Start trial')}
              </Button>
            </Card>
          )}

          {/* Starter Plan */}
          {starterPlan && (
            <Card className="p-6 border border-slate-200 bg-white hover:border-violet-300 hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold">{starterPlan.name}</h3>
                  <p className="text-xs text-muted-foreground">{language === 'fr' ? 'Pour démarrer' : 'To get started'}</p>
                </div>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold">{formatPrice(getPlanPrice(starterPlan), language)}</span>
                <span className="text-muted-foreground">/{language === 'fr' ? 'mois' : 'mo'}</span>
              </div>
              {renderFeatures(starterPlan)}
              <Button 
                className="w-full mt-6" 
                variant="outline"
                onClick={() => handleSelectPlan(starterPlan.id)}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (language === 'fr' ? 'Sélectionner' : 'Select')}
              </Button>
            </Card>
          )}

          {/* Pro Plan */}
          {selectedPro && (
            <Card className="p-6 border-2 border-violet-500 bg-white shadow-xl shadow-violet-500/10 relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500">
                {language === 'fr' ? 'Populaire' : 'Popular'}
              </Badge>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <h3 className="font-bold">Pro</h3>
                  {proPlans.length > 1 && (
                    <Select value={selectedProTier} onValueChange={setSelectedProTier}>
                      <SelectTrigger className="h-6 text-xs border-0 p-0 bg-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {proPlans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.max_optimizations_monthly} {language === 'fr' ? 'crédits' : 'credits'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold">{formatPrice(getPlanPrice(selectedPro), language)}</span>
                <span className="text-muted-foreground">/{language === 'fr' ? 'mois' : 'mo'}</span>
              </div>
              {renderFeatures(selectedPro)}
              <Button 
                className="w-full mt-6 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600" 
                onClick={() => handleSelectPlan(selectedPro.id)}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (language === 'fr' ? 'Sélectionner' : 'Select')}
              </Button>
            </Card>
          )}

          {/* Enterprise Plan */}
          {selectedEnterprise && (
            <Card className="p-6 border border-amber-200 bg-gradient-to-br from-amber-50/50 to-white hover:shadow-lg transition-all">
              <Badge className="absolute -top-3 right-4 bg-amber-500">
                {language === 'fr' ? 'Meilleur rapport' : 'Best value'}
              </Badge>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold">Enterprise</h3>
                  {enterprisePlans.length > 1 && (
                    <Select value={selectedEnterpriseTier} onValueChange={setSelectedEnterpriseTier}>
                      <SelectTrigger className="h-6 text-xs border-0 p-0 bg-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {enterprisePlans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.max_optimizations_monthly === -1 ? (language === 'fr' ? 'Illimité' : 'Unlimited') : p.max_optimizations_monthly} {language === 'fr' ? 'crédits' : 'credits'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold">{formatPrice(getPlanPrice(selectedEnterprise), language)}</span>
                <span className="text-muted-foreground">/{language === 'fr' ? 'mois' : 'mo'}</span>
              </div>
              {renderFeatures(selectedEnterprise)}
              <Button 
                className="w-full mt-6 bg-amber-500 hover:bg-amber-600" 
                onClick={() => handleSelectPlan(selectedEnterprise.id)}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (language === 'fr' ? 'Sélectionner' : 'Select')}
              </Button>
            </Card>
          )}
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="text-sm">{language === 'fr' ? 'Paiement sécurisé' : 'Secure payment'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span className="text-sm">{language === 'fr' ? 'Sans engagement' : 'No commitment'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm">{language === 'fr' ? 'Annulez à tout moment' : 'Cancel anytime'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
