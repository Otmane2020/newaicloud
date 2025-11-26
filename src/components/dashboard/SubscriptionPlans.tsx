import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Sparkles,
  Zap,
  Crown,
  CreditCard,
  TrendingUp,
  Loader2,
  ShoppingBag,
  FileText,
  BarChart3,
  MessageSquare,
  Tag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { useTranslation } from "@/lib/language";
import { getCurrencySymbol, getPriceByLanguage, formatPrice, getPriceIdByLanguage } from "@/lib/formatUtils";
import { PlanChangeConfirmDialog } from "./PlanChangeConfirmDialog";

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly_eur: number;
  price_yearly_eur: number;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  max_products: number;
  max_optimizations_monthly: number;
  max_articles_monthly: number;
  max_campaigns: number;
  max_chat_responses_monthly: number;
  max_shopify_stores: number;
  trial_days: number;
  features: any;
  display_order: number;
}

export function SubscriptionPlans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { limits } = useUsageLimits();
  const { t, tf, language } = useTranslation();
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [currentBillingPeriod, setCurrentBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedProPlan, setSelectedProPlan] = useState<string>("");
  const [selectedEnterprisePlan, setSelectedEnterprisePlan] = useState<string>("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [useManualPromo, setUseManualPromo] = useState(false);
  const [pendingPlanChange, setPendingPlanChange] = useState<{
    planId: string;
    planName: string;
    priceId: string;
    prorationAmount: number;
    hasActiveSubscription: boolean;
    breakdown?: any;
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;

      // Load plans
      const { data: plansData } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      // Get user's product count from usage_tracking
      const { data: usage } = await supabase
        .from('usage_tracking')
        .select('products_count')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const productCount = usage?.products_count || 0;
      console.log('📊 User has', productCount, 'products');

      if (plansData) {
        // Filter plans - only include plans with valid Stripe price IDs
        const validPlans = plansData.filter((plan) => {
          const monthlyId = plan.stripe_price_id_monthly || "";
          const yearlyId = plan.stripe_price_id_yearly || "";

          const hasValidMonthly =
            monthlyId.startsWith("price_") &&
            !monthlyId.includes("monthly") &&
            !monthlyId.includes("pro_") &&
            !monthlyId.includes("enterprise_");

          const hasValidYearly =
            yearlyId.startsWith("price_") &&
            !yearlyId.includes("yearly") &&
            !yearlyId.includes("pro_") &&
            !yearlyId.includes("enterprise_");

          // Show all plans - don't filter by product count to allow downgrades
          return (hasValidMonthly || hasValidYearly);
        });

        setPlans(validPlans);

        // Set default selections - select smallest available plan for each tier
        const proPlans = validPlans.filter((p) => p.id === "professional" || p.id === "pro" || p.id.startsWith("pro-"));
        const enterprisePlans = validPlans.filter((p) => p.id === "enterprise" || p.id.startsWith("enterprise-"));

        if (proPlans.length > 0) setSelectedProPlan(proPlans[0].id);
        if (enterprisePlans.length > 0) setSelectedEnterprisePlan(enterprisePlans[0].id);
      }

      // Load current plan and billing period
      const { data: profile } = await supabase.from("profiles").select("current_plan_id").eq("id", user.id).single();

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("billing_period")
        .eq("seller_id", user.id)
        .in("status", ["active", "trialing"])
        .maybeSingle();

      setCurrentPlanId(profile?.current_plan_id || null);
      setCurrentBillingPeriod((subscription?.billing_period as "monthly" | "yearly") || "monthly");
      setLoading(false);
    };

    loadData();
  }, [user?.id]);

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      toast({
        title: t.errors.required,
        variant: "destructive",
      });
      return;
    }

    setCheckoutLoading(planId);
    try {
      // Get the selected plan details
      const selectedPlan = plans.find((p) => p.id === planId);
      if (!selectedPlan) throw new Error("Plan not found");

      // Get user profile to check for Stripe customer ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_customer_id, subscription_status")
        .eq("id", user.id)
        .single();

      // Check if user has an active subscription in local DB
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("stripe_subscription_id, status")
        .eq("seller_id", user.id)
        .in("status", ["active", "trialing"])
        .maybeSingle();

      let hasActiveSubscription = !!subscription?.stripe_subscription_id;

      // 🔧 SYNC FIX: If no local subscription but Stripe customer exists, sync from Stripe
      if (!hasActiveSubscription && profile?.stripe_customer_id) {
        console.log('🔄 [SubscriptionPlans] No local subscription but Stripe customer exists - syncing...');
        
        const { data: syncResult, error: syncError } = await supabase.functions.invoke('sync-stripe-subscription', {
          body: { customerId: profile.stripe_customer_id }
        });

        if (syncError) {
          console.error('❌ [SubscriptionPlans] Sync error:', syncError);
          // Continue to checkout as fallback
        } else if (syncResult?.hasActiveSubscription) {
          console.log('✅ [SubscriptionPlans] Successfully synced subscription from Stripe');
          
          // Reload subscription from DB after sync
          const { data: reloadedSub } = await supabase
            .from('subscriptions')
            .select('stripe_subscription_id, status')
            .eq('seller_id', user.id)
            .in('status', ['active', 'trialing'])
            .maybeSingle();

          hasActiveSubscription = !!reloadedSub?.stripe_subscription_id;
          console.log('✅ [SubscriptionPlans] Subscription now in local DB, proceeding with proration');
        }
      }

      // If user has active subscription, calculate proration
      if (hasActiveSubscription) {
        // Get the stripe price ID for the new plan
        const newPriceId =
          billingPeriod === "monthly" ? selectedPlan.stripe_price_id_monthly : selectedPlan.stripe_price_id_yearly;

        if (!newPriceId) throw new Error("Price ID not found for selected plan");

        // Calculate proration
        const { data: prorationData, error: prorationError } = await supabase.functions.invoke("calculate-proration", {
          body: { new_price_id: newPriceId },
        });

        if (prorationError) throw prorationError;

        // Show confirmation dialog with proration amount
        setPendingPlanChange({
          planId,
          planName: selectedPlan.name,
          priceId: newPriceId,
          prorationAmount: prorationData.prorationAmount || 0,
          hasActiveSubscription: true,
          breakdown: prorationData.breakdown || null,
        });
        setConfirmDialogOpen(true);
      } else {
        // No active subscription, redirect directly to Stripe checkout
        const { data, error } = await supabase.functions.invoke("force-payment", {
          body: {
            plan_id: planId,
            billing_period: billingPeriod,
            use_manual_promo: useManualPromo,
          },
        });

        if (error) throw error;

        if (data?.url) {
          window.location.href = data.url;
        }
      }
    } catch (error: any) {
      console.error("Error handling plan selection:", error);
      toast({
        title: t.errors.error,
        description: error.message,
        variant: "destructive",
      });
      setCheckoutLoading(null);
    }
  };

  const handleConfirmPlanChange = async () => {
    if (!pendingPlanChange) return;

    try {
      if (pendingPlanChange.hasActiveSubscription) {
        // Create upgrade invoice and get payment URL
        const { data, error } = await supabase.functions.invoke("create-upgrade-invoice", {
          body: {
            new_price_id: pendingPlanChange.priceId,
          },
        });

        if (error) throw error;

        if (data.payment_required && data.payment_url) {
          // Open Stripe payment page in new tab
          window.open(data.payment_url, "_blank");

          toast({
            title: "Redirection vers le paiement",
            description: `Montant à payer: ${data.amount_due.toFixed(2)} ${data.currency.toUpperCase()}`,
          });
        } else {
          // No payment required (downgrade or $0 proration)
          toast({
            title: t.account.subscription.activationSuccess,
            description: "Votre plan a été mis à jour avec succès!",
          });

          setTimeout(() => window.location.reload(), 1500);
        }
      }
    } catch (error: any) {
      console.error("Error confirming plan change:", error);
      toast({
        title: t.errors.error,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setConfirmDialogOpen(false);
      setCheckoutLoading(null);
      setPendingPlanChange(null);
    }
  };

  const isCurrentPlan = (planId: string) => {
    // Check both plan ID and billing period
    return currentPlanId === planId && currentBillingPeriod === billingPeriod;
  };

  const getPrice = (plan: Plan) => {
    let price = getPriceByLanguage(plan, language, billingPeriod);
    // Pour l'annuel, afficher le prix mensuel équivalent
    if (billingPeriod === "yearly") {
      price = price / 12;
    }

    // Format avec 2 décimales pour être cohérent avec Stripe
    const formattedPrice = price.toFixed(2).replace(".", ",");
    return formattedPrice;
  };

  const getSavings = (plan: Plan) => {
    // Remise fixe de 20% sur l'annuel
    return "20";
  };

  const getPlanLevel = (planId: string) => {
    if (planId === "starter") return 1;
    if (planId === "professional" || planId.startsWith("pro-")) return 2;
    if (planId.startsWith("enterprise-")) return 3;
    return 0;
  };

  const getButtonText = (planId: string) => {
    if (isCurrentPlan(planId)) return t.dashboard.plans.currentPlan;

    const currentLevel = getPlanLevel(currentPlanId || "");
    const targetLevel = getPlanLevel(planId);

    // If different category levels, compare levels
    if (targetLevel !== currentLevel) {
      if (targetLevel > currentLevel) return "Upgrade";
      if (targetLevel < currentLevel) return "Downgrade";
    }

    // Same category level - compare actual plan metrics (max_optimizations)
    const currentPlan = plans.find(p => p.id === currentPlanId);
    const targetPlan = plans.find(p => p.id === planId);
    
    if (currentPlan && targetPlan) {
      if (targetPlan.max_optimizations_monthly > currentPlan.max_optimizations_monthly) {
        return "Upgrade";
      } else if (targetPlan.max_optimizations_monthly < currentPlan.max_optimizations_monthly) {
        return "Downgrade";
      } else {
        // Equal optimizations - not an upgrade
        return t.dashboard.plans.currentPlan;
      }
    }

    return "Upgrade";
  };

  const isUpgradePlan = (planId: string) => {
    if (isCurrentPlan(planId) || !currentPlanId) return false;
    
    const currentPlan = plans.find(p => p.id === currentPlanId);
    const targetPlan = plans.find(p => p.id === planId);
    
    if (!currentPlan || !targetPlan) return false;
    
    return targetPlan.max_optimizations_monthly > currentPlan.max_optimizations_monthly;
  };

  // Group plans by category
  const starterPlan = plans.find((p) => p.id === "starter");
  const proPlans = plans.filter((p) => p.id.startsWith("pro-")).sort((a, b) => a.display_order - b.display_order);
  const enterprisePlans = plans
    .filter((p) => p.id.startsWith("enterprise-"))
    .sort((a, b) => a.display_order - b.display_order);

  const selectedPro = proPlans.find((p) => p.id === selectedProPlan);
  const selectedEnterprise = enterprisePlans.find((p) => p.id === selectedEnterprisePlan);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">{t.dashboard.plans.title}</h2>
        <p className="text-muted-foreground">{t.dashboard.plans.subtitle}</p>

        <div className="flex justify-center">
          <Tabs value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as "monthly" | "yearly")}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="monthly">{t.dashboard.plans.monthly}</TabsTrigger>
              <TabsTrigger value="yearly">
                {t.dashboard.plans.yearly}
                <Badge variant="secondary" className="ml-2 bg-success/20 text-success">
                  {tf("dashboard.plans.save", { percent: "20" })}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4 p-4 bg-muted/50 rounded-lg max-w-md mx-auto">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <Label htmlFor="manual-promo" className="text-sm cursor-pointer">
            Utiliser un code promo personnalisé (désactive la réduction automatique)
          </Label>
          <Switch
            id="manual-promo"
            checked={useManualPromo}
            onCheckedChange={setUseManualPromo}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Starter Plan */}
        {starterPlan && (
          <Card
            className={`p-8 relative flex flex-col ${
              isCurrentPlan(starterPlan.id) 
                ? "border-2 border-primary shadow-primary" 
                : isUpgradePlan(starterPlan.id)
                ? "border-2 border-success/50 shadow-lg"
                : ""
            }`}
          >
            {isCurrentPlan(starterPlan.id) && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                {t.dashboard.plans.currentPlan}
              </Badge>
            )}
            {isUpgradePlan(starterPlan.id) && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-success">
                <TrendingUp className="w-3 h-3 mr-1" />
                Upgrade recommandé
              </Badge>
            )}

            <div className="space-y-6 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  <h3 className="text-2xl font-bold">{starterPlan.name}</h3>
                </div>
                <p className="text-muted-foreground text-sm">{t.dashboard.plans.descriptions.starter}</p>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">€{getPrice(starterPlan)}</span>
                  <span className="text-muted-foreground">{t.dashboard.plans.perMonth}</span>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t">
                <div className="flex items-start gap-2 text-sm">
                  <ShoppingBag className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    {starterPlan.max_products} {t.dashboard.plans.features.products}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    {starterPlan.max_optimizations_monthly} {t.dashboard.plans.features.optimizations}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    {starterPlan.max_articles_monthly} {t.dashboard.plans.features.articles}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <BarChart3 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>0 {t.dashboard.plans.features.campaigns}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    {starterPlan.max_chat_responses_monthly} {t.dashboard.plans.features.chatResponses}
                  </span>
                </div>
              </div>
            </div>

            <Button
              className="w-full mt-6"
              variant={isCurrentPlan(starterPlan.id) ? "outline" : "default"}
              onClick={() => handleSelectPlan(starterPlan.id)}
              disabled={isCurrentPlan(starterPlan.id) || checkoutLoading === starterPlan.id}
            >
              {checkoutLoading === starterPlan.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                getButtonText(starterPlan.id)
              )}
            </Button>
          </Card>
        )}

        {/* Pro Plans */}
        {selectedPro && (
          <Card
            className={`p-8 relative flex flex-col ${
              isCurrentPlan(selectedPro.id) 
                ? "border-2 border-primary shadow-primary" 
                : isUpgradePlan(selectedPro.id)
                ? "border-2 border-success/50 shadow-lg"
                : "border-2 border-primary/20"
            }`}
          >
            {isCurrentPlan(selectedPro.id) && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                {t.dashboard.plans.currentPlan}
              </Badge>
            )}
            {isUpgradePlan(selectedPro.id) && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-success animate-pulse">
                <TrendingUp className="w-3 h-3 mr-1" />
                🚀 Meilleur rapport qualité-prix
              </Badge>
            )}

            <div className="space-y-6 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-6 h-6 text-primary" />
                  <h3 className="text-2xl font-bold">Pro</h3>
                </div>
                <p className="text-muted-foreground text-sm">{t.dashboard.plans.descriptions.pro}</p>
              </div>

              {proPlans.length > 1 && (
                <Select value={selectedProPlan} onValueChange={setSelectedProPlan}>
                  <SelectTrigger className="w-full bg-card border-2">
                    <SelectValue>
                      €{getPrice(selectedPro)} - {selectedPro?.max_optimizations_monthly.toLocaleString("fr-FR")}{" "}
                      optimisations
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {proPlans.map((plan) => {
                      let price = getPriceByLanguage(plan, language, billingPeriod);
                      if (billingPeriod === "yearly") {
                        price = price / 12;
                      }
                      const formattedPrice = price.toFixed(2).replace(".", ",");
                      return (
                        <SelectItem key={plan.id} value={plan.id}>
                          €{formattedPrice}/mois - {plan.max_optimizations_monthly.toLocaleString("fr-FR")}{" "}
                          optimisations
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">€{getPrice(selectedPro)}</span>
                  <span className="text-muted-foreground">{t.dashboard.plans.perMonth}</span>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t">
                <div className="flex items-start gap-2 text-sm">
                  <ShoppingBag className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    {selectedPro.max_products.toLocaleString("fr-FR")} {t.dashboard.plans.features.products}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    {selectedPro.max_optimizations_monthly.toLocaleString("fr-FR")}{" "}
                    {t.dashboard.plans.features.optimizations}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    {selectedPro.max_articles_monthly} {t.dashboard.plans.features.articles}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <BarChart3 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    {selectedPro.max_campaigns} {t.dashboard.plans.features.campaigns}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    {selectedPro.max_chat_responses_monthly.toLocaleString("fr-FR")}{" "}
                    {t.dashboard.plans.features.chatResponses}
                  </span>
                </div>
              </div>
            </div>

            <Button
              className="w-full mt-6"
              variant={isCurrentPlan(selectedPro.id) ? "outline" : "default"}
              onClick={() => handleSelectPlan(selectedPro.id)}
              disabled={isCurrentPlan(selectedPro.id) || checkoutLoading === selectedPro.id}
            >
              {checkoutLoading === selectedPro.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                getButtonText(selectedPro.id)
              )}
            </Button>
          </Card>
        )}

        {/* Enterprise Plans */}
        {selectedEnterprise && (
          <Card
            className={`p-8 relative flex flex-col ${
              isCurrentPlan(selectedEnterprise.id) 
                ? "border-2 border-primary shadow-primary" 
                : isUpgradePlan(selectedEnterprise.id)
                ? "border-2 border-success/50 shadow-lg"
                : ""
            }`}
          >
            {isCurrentPlan(selectedEnterprise.id) && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                {t.dashboard.plans.currentPlan}
              </Badge>
            )}
            {isUpgradePlan(selectedEnterprise.id) && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-success">
                <TrendingUp className="w-3 h-3 mr-1" />
                Upgrade recommandé
              </Badge>
            )}

            <div className="space-y-6 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-6 h-6 text-primary" />
                  <h3 className="text-2xl font-bold">Enterprise</h3>
                </div>
                <p className="text-muted-foreground text-sm">{t.dashboard.plans.descriptions.enterprise}</p>
              </div>

              {enterprisePlans.length > 1 && (
                <Select value={selectedEnterprisePlan} onValueChange={setSelectedEnterprisePlan}>
                  <SelectTrigger className="w-full bg-card border-2">
                    <SelectValue>
                      €{getPrice(selectedEnterprise)} -{" "}
                      {selectedEnterprise?.max_optimizations_monthly.toLocaleString("fr-FR")} optimisations
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {enterprisePlans.map((plan) => {
                      let price = getPriceByLanguage(plan, language, billingPeriod);
                      if (billingPeriod === "yearly") {
                        price = price / 12;
                      }
                      const formattedPrice = price.toFixed(2).replace(".", ",");
                      return (
                        <SelectItem key={plan.id} value={plan.id}>
                          €{formattedPrice}/mois - {plan.max_optimizations_monthly.toLocaleString("fr-FR")}{" "}
                          optimisations
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">€{getPrice(selectedEnterprise)}</span>
                  <span className="text-muted-foreground">/mois</span>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t">
                <div className="flex items-start gap-2 text-sm">
                  <ShoppingBag className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span> Produits Illimité</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    {selectedEnterprise.max_optimizations_monthly.toLocaleString("fr-FR")}+ optimisations/mois
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{selectedEnterprise.max_articles_monthly}+ articles/mois</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <BarChart3 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{selectedEnterprise.max_campaigns}+ campagnes</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                    {selectedEnterprise.max_chat_responses_monthly.toLocaleString("fr-FR")}+ réponses chat/mois
                  </span>
                </div>
              </div>
            </div>

            <Button
              className="w-full mt-6"
              variant={isCurrentPlan(selectedEnterprise.id) ? "outline" : "default"}
              onClick={() => handleSelectPlan(selectedEnterprise.id)}
              disabled={isCurrentPlan(selectedEnterprise.id) || checkoutLoading === selectedEnterprise.id}
            >
              {checkoutLoading === selectedEnterprise.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                getButtonText(selectedEnterprise.id)
              )}
            </Button>
          </Card>
        )}
      </div>

      <PlanChangeConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={(open) => {
          setConfirmDialogOpen(open);
          if (!open) {
            setCheckoutLoading(null);
            setPendingPlanChange(null);
          }
        }}
        currentPlanName={plans.find((p) => p.id === currentPlanId)?.name || ""}
        newPlanName={pendingPlanChange?.planName || ""}
        prorationAmount={pendingPlanChange?.prorationAmount || 0}
        currency="eur"
        isLoading={!!checkoutLoading}
        onConfirm={handleConfirmPlanChange}
        isUpgrade={getPlanLevel(pendingPlanChange?.planId || "") > getPlanLevel(currentPlanId || "")}
        breakdown={pendingPlanChange?.breakdown}
      />
    </div>
  );
}
