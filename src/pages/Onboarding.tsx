import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/language";
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
  Store,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getCurrencySymbol, formatPrice, getPriceByLanguage } from "@/lib/formatUtils";

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
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [selectedProTier, setSelectedProTier] = useState<string>("");
  const [selectedEnterpriseTier, setSelectedEnterpriseTier] = useState<string>("");
  const [claimingShopify, setClaimingShopify] = useState(false);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [hasCheckedAfterCheckout, setHasCheckedAfterCheckout] = useState(false);

  useEffect(() => {
    if (!user) {
      const shopifyPending = searchParams.get("shopify_pending");
      if (shopifyPending) {
        navigate(`/auth?shopify_pending=${shopifyPending}`);
      } else {
        navigate("/auth");
      }
      return;
    }

    checkExistingSubscription();
    loadPlans();

    if (searchParams.get("checkout") === "success") {
      console.log("🔄 [ONBOARDING] Checkout success detected, checking subscription");
      handleCheckSubscription();
    }
  }, [user, navigate, searchParams]);

  const checkExistingSubscription = async () => {
    try {
      console.log("🔍 Checking if user already has subscription...");

      const { data: adminCheck } = await supabase.rpc("has_role", {
        _user_id: user?.id,
        _role: "admin",
      });

      if (adminCheck) {
        console.log("👑 Admin user detected, redirecting to dashboard");
        navigate("/dashboard");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_status, onboarding_completed")
        .eq("id", user?.id)
        .single();

      console.log("📋 Profile data:", profile);

      if (profile?.subscription_status === "active" && profile?.onboarding_completed) {
        console.log("✅ User already has active subscription, redirecting to dashboard");
        navigate("/dashboard");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log("⚠️ No valid session, skipping Stripe check");
        return;
      }

      const { data: subData } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (subData?.subscribed) {
        console.log("✅ Active subscription found in Stripe, redirecting to dashboard");
        await supabase
          .from("profiles")
          .update({
            subscription_status: "active",
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user?.id);

        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error checking existing subscription:", error);
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
        console.log("🎁 User trial status: has_used_trial =", profileData.has_used_trial);
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
        .filter(
          (p) =>
            p.id === "professional" || p.id === "pro" || p.id.startsWith("pro-") || p.id.startsWith("professional"),
        )
        .sort((a, b) => {
          const priceA = a.price_monthly;
          const priceB = b.price_monthly;
          return priceA - priceB;
        });

      const enterprisePlans = formattedPlans
        .filter((p) => p.id === "enterprise" || p.id.startsWith("enterprise"))
        .sort((a, b) => {
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
      console.error("Error loading plans:", error);
      toast.error(t.onboarding.errors.loadingPlans);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleCheckSubscription = async () => {
    setCheckingSubscription(true);

    try {
      console.log("🔍 [CHECK-SUBSCRIPTION] Starting subscription check", {
        hasShopifyPending: !!searchParams.get("shopify_pending"),
        shopifyPendingValue: searchParams.get("shopify_pending"),
        checkoutSuccess: searchParams.get("checkout") === "success",
        userId: user?.id,
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log("⚠️ [CHECK-SUBSCRIPTION] No valid session");
        toast.error("Session expired. Please log in again.");
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("❌ [CHECK-SUBSCRIPTION] Error checking subscription:", error);
        console.log("🔧 [CHECK-SUBSCRIPTION] Attempting to fix stuck subscription...");
        const { data: fixData, error: fixError } = await supabase.functions.invoke("fix-stuck-subscriptions");

        if (fixError) {
          throw fixError;
        }

        console.log("✅ [CHECK-SUBSCRIPTION] Fix result:", fixData);

        if (fixData?.fixed > 0) {
          const shopifyPending = searchParams.get("shopify_pending");
          if (shopifyPending) {
            await claimShopifyConnection(shopifyPending);
          }

          toast.success(t.onboarding.verification.activated);
          setTimeout(() => navigate("/dashboard?show_shopify_prompt=true"), 1500);
          return;
        }
      }

      const shopifyPending = searchParams.get("shopify_pending");
      if (shopifyPending) {
        console.log("🔗 Claiming Shopify connection BEFORE subscription check");
        await claimShopifyConnection(shopifyPending);
      }

      if (data?.subscribed) {
        console.log("✅ [CHECK-SUBSCRIPTION] Subscription verified");
        toast.success(t.onboarding.verification.success);
        setTimeout(() => {
          navigate("/dashboard?show_shopify_prompt=true");
        }, 5000);
      } else {
        console.warn("⚠️ [CHECK-SUBSCRIPTION] No active subscription found");
        toast.error(t.onboarding.errors.noActiveSubscription);
      }
    } catch (error) {
      console.error("❌ [CHECK-SUBSCRIPTION] Error:", error);
      toast.error(t.onboarding.errors.paymentError);
    } finally {
      setCheckingSubscription(false);
      setHasCheckedAfterCheckout(true);
    }
  };

  const claimShopifyConnection = async (pendingToken: string) => {
    console.log("🔗 [CHECK-SUBSCRIPTION] Claiming Shopify connection before redirect", { pendingToken });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.error("[CHECK-SUBSCRIPTION] No session access token available");
        toast.error(t.sync.connectionFailed, {
          description: "Please log in again to continue.",
        });
        return;
      }

      console.log("[CHECK-SUBSCRIPTION] Calling claim function with auth token");

      const { data: claimData, error: claimError } = await supabase.functions.invoke("claim-shopify-connection", {
        body: { pendingToken },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log("🔗 [CHECK-SUBSCRIPTION] Claim response:", { claimData, claimError });

      if (claimError || claimData?.error === "Token expired" || claimData?.error === "Invalid or expired token") {
        console.error("❌ [CHECK-SUBSCRIPTION] Token expired or invalid:", claimData);

        const errorMessage = claimError?.message || claimData?.error || "";

        await supabase.from("integration_failures").insert({
          user_id: user?.id,
          integration_type: "shopify",
          error_type: "token_expired",
          error_message: errorMessage,
          context: { pendingToken },
        });

        if (errorMessage.includes("expired") || errorMessage.includes("Token expired")) {
          toast.error("Votre connexion Shopify a expiré (24h). Veuillez réinstaller l'application Shopify.", {
            duration: 10000,
            action: {
              label: "Réinstaller",
              onClick: () => window.open("https://apps.shopify.com/newai-sale", "_blank"),
            },
          });
        } else {
          toast.error(t.sync.connectionFailed, {
            description: errorMessage || "Please try again or contact support.",
          });
        }

        return;
      }

      if (claimError) {
        console.error("❌ [CHECK-SUBSCRIPTION] Shopify claim error:", claimError);

        await supabase.from("integration_failures").insert({
          user_id: user?.id,
          integration_type: "shopify",
          error_type: "claim_exception",
          error_message: claimError.message,
          context: { pendingToken },
        });

        throw claimError;
      }

      if (claimData?.success) {
        console.log("✅ [CHECK-SUBSCRIPTION] Shopify connection claimed successfully");
        toast.success(t.sync.shopifyConnected);
        toast.info(t.sync.autoImport, { duration: 5000 });

        await new Promise((resolve) => setTimeout(resolve, 3000));
      } else {
        console.error("❌ [CHECK-SUBSCRIPTION] Claim failed:", claimData);

        await supabase.from("integration_failures").insert({
          user_id: user?.id,
          integration_type: "shopify",
          error_type: "claim_failed",
          error_message: JSON.stringify(claimData),
          context: { pendingToken },
        });
      }
    } catch (claimError) {
      console.error("❌ [CHECK-SUBSCRIPTION] Failed to claim Shopify:", claimError);
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
      console.log("🎁 Activating free trial for user:", user.id);

      const { data, error } = await supabase.functions.invoke("activate-free-trial");

      if (error) throw error;

      if (data?.success) {
        toast.success(
          language === "fr" ? "Essai Gratuit activé ! Redirection..." : "Free trial activated! Redirecting...",
        );

        const shopifyPending = searchParams.get("shopify_pending");
        if (shopifyPending) {
          console.log("🔗 Claiming Shopify connection after trial setup");
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            const { data: claimData, error: claimError } = await supabase.functions.invoke("claim-shopify-connection", {
              body: { pendingToken: shopifyPending },
              headers: session?.access_token
                ? {
                    Authorization: `Bearer ${session.access_token}`,
                  }
                : {},
            });

            if (claimError) throw claimError;

            if (claimData?.success) {
              toast.success(t.sync.shopifyConnected);
              toast.info(t.sync.autoImport, { duration: 5000 });
              await new Promise((resolve) => setTimeout(resolve, 3000));
            }
          } catch (claimError) {
            console.error("Failed to claim Shopify connection:", claimError);
            toast.error(t.sync.connectionFailed);
          }
        }

        setTimeout(() => navigate("/dashboard?show_shopify_prompt=true"), 1500);
      }
    } catch (error) {
      console.error("💥 Error activating trial:", error);
      toast.error(language === "fr" ? "Erreur lors de l'activation de l'Essai Gratuit" : "Error activating free trial");
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
      console.log("🚀 Creating checkout for plan:", planId, "billing:", billingCycle, "trial:", isTrial);
      console.log(
        "📋 Available plans:",
        plans.map((p) => ({ id: p.id, name: p.name })),
      );

      const selectedPlan = plans.find((p) => p.id === planId);
      if (!selectedPlan) {
        console.error("❌ Plan not found:", planId);
        console.error(
          "Available plan IDs:",
          plans.map((p) => p.id),
        );
        toast.error(`Plan "${planId}" not found. Please try again or contact support.`);
        return;
      }

      console.log("✅ Selected plan found:", { id: selectedPlan.id, name: selectedPlan.name });

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("stripe_subscription_id, status")
        .eq("seller_id", user.id)
        .in("status", ["active", "trialing"])
        .maybeSingle();

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_status, trial_ends_at")
        .eq("id", user.id)
        .single();

      const hasActiveSubscription = !!subscription?.stripe_subscription_id;
      const hasActiveTrial = Boolean(
        profile?.subscription_status === "trialing" ||
          (profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date()),
      );

      console.log("💳 User subscription status:", {
        hasActiveSubscription,
        hasActiveTrial,
        subscriptionStatus: profile?.subscription_status,
      });

      if (hasActiveSubscription) {
        const priceId =
          billingCycle === "yearly"
            ? (selectedPlan as any).stripe_price_id_yearly
            : (selectedPlan as any).stripe_price_id_monthly;

        const { data, error } = await supabase.functions.invoke("update-subscription", {
          body: {
            new_price_id: priceId,
            new_plan_id: planId,
          },
        });

        if (error) throw error;

        toast.success(t.onboarding.verification.success);
        setTimeout(() => navigate("/dashboard"), 1500);
        return;
      }

      const shopifyPending = searchParams.get("shopify_pending");
      const successUrl = shopifyPending
        ? `${window.location.origin}/onboarding?checkout=success&shopify_pending=${shopifyPending}`
        : `${window.location.origin}/onboarding?checkout=success`;

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          plan_id: planId,
          billing_period: billingCycle,
          currency: language === "fr" ? "EUR" : "USD",
          success_url: successUrl,
          cancel_url: `${window.location.origin}/onboarding?checkout=cancelled`,
          force_immediate_payment: hasActiveTrial,
        },
      });

      console.log("📦 Checkout response:", { data, error });

      if (error) {
        console.error("❌ Checkout error:", error);
        throw error;
      }

      if (data?.url) {
        console.log("✅ Redirecting to:", data.url);
        window.location.href = data.url;
      } else {
        console.error("❌ No URL in response:", data);
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("💥 Error creating checkout:", error);
      toast.error(t.onboarding.errors.paymentError);
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case "starter":
        return ShoppingBag;
      case "professional":
        return Rocket;
      case "enterprise":
        return Crown;
      default:
        return Sparkles;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case "starter":
        return "from-blue-500 to-cyan-500";
      case "professional":
        return "from-purple-500 to-pink-500";
      case "enterprise":
        return "from-orange-500 to-red-500";
      default:
        return "from-primary-light to-primary-dark";
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

    if (language === "fr") {
      return `${formattedValue} ${isPlural ? "Boutiques connectées" : "Boutique connectée"}`;
    }
    return `${formattedValue} ${isPlural ? "Connected stores" : "Connected store"}`;
  };

  const getPrice = (plan: Plan) => {
    return billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
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

  if (checkingSubscription || (searchParams.get("checkout") === "success" && !hasCheckedAfterCheckout)) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-8">
        <Card className="p-8 max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">{t.onboarding.verification.title}</h2>
          <p className="text-muted-foreground mb-6">{t.onboarding.verification.checking}</p>
          <Button onClick={handleCheckSubscription} disabled={checkingSubscription}>
            {t.onboarding.verification.verifyNow}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            {t.onboarding.title.split("NewAI")[0]}
            <span className="bg-gradient-primary bg-clip-text text-transparent">NewAI</span>
          </h1>
          <p className="text-lg text-muted-foreground">{t.onboarding.subtitle}</p>
        </div>

        {/* Plans Grid - Structure Pro comme dans l'image */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {/* Basic Plan */}
          <Card className="p-6 border-2 border-border">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold mb-2">Basic</h3>
              <div className="text-3xl font-bold mb-2">
                $31<span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <Badge className="bg-green-500 mb-4">Get 50% discount with LIMITED PROMO</Badge>
            </div>

            <div className="space-y-4 mb-6">
              <h4 className="font-semibold text-center">AI Writing Tools</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>25 AI Blog Articles / Month</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>YT Video to Blog Articles</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>100 AI Image Generations for Blog</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>AI-powered Autoblogger</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Access to Millions of Stock Images</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Unlimited AI Meta Descriptions & FAQ Schemas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Unlimited Access to Content Editor</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Import & Sync 5 Sitemaps</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Internal Link Builder</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Table of Contents Builder</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Button className="w-full" onClick={() => handleSelectPlan("basic")} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Choose Plan
              </Button>
            </div>
          </Card>

          {/* Advanced Plan */}
          <Card className="p-6 border-2 border-border">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold mb-2">Advanced</h3>
              <div className="text-3xl font-bold mb-2">
                $79<span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <Badge className="bg-green-500 mb-4">Get 50% discount with LIMITED PROMO</Badge>
            </div>

            <div className="space-y-4 mb-6">
              <h4 className="font-semibold text-center">AI Writing Tools</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>100 AI Blog Articles / Month</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>YT Video to Blog Articles</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>500 AI Image Generations for Blog</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>AI-powered Autoblogger</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Access to Millions of Stock Images</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Unlimited AI Meta Descriptions & FAQ Schemas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Unlimited Access to Content Editor</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Import & Sync 5 Sitemaps</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Internal Link Builder</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Table of Contents Builder</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Button className="w-full" onClick={() => handleSelectPlan("advanced")} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Choose Plan
              </Button>
            </div>
          </Card>

          {/* Recommended Plan */}
          <Card className="p-6 border-2 border-primary relative">
            <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">Recommended</Badge>
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold mb-2">Recommended</h3>
              <div className="text-3xl font-bold mb-2">
                $39<span className="text-sm text-muted-foreground">/ month</span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <h4 className="font-semibold text-center">AI Writing Tools</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>All Basic features</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Enhanced limits</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Priority support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Advanced analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Custom integrations</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Button className="w-full bg-primary" onClick={() => handleSelectPlan("recommended")} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Choose Plan
              </Button>
            </div>
          </Card>

          {/* Max Plan */}
          <Card className="p-6 border-2 border-border">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold mb-2">Max</h3>
              <div className="text-3xl font-bold mb-2">
                $135<span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <Badge className="bg-green-500 mb-4">Get 50% discount with LIMITED PROMO</Badge>
            </div>

            <div className="space-y-4 mb-6">
              <h4 className="font-semibold text-center">AI Writing Tools</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>300 AI Blog Articles / Month</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>YT Video to Blog Articles</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>2000 AI Image Generations for Blog</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>AI-powered Autoblogger</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Access to Millions of Stock Images</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Unlimited AI Meta Descriptions & FAQ Schemas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Unlimited Access to Content Editor</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Import & Sync 15 Sitemaps</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Internal Link Builder</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Button className="w-full" onClick={() => handleSelectPlan("max")} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Choose Plan
              </Button>
            </div>
          </Card>
        </div>

        {/* Free Trial Option */}
        {!hasUsedTrial && (
          <div className="max-w-2xl mx-auto mt-8 text-center">
            <Card className="p-6 bg-green-50 border-green-200">
              <h3 className="text-xl font-bold mb-2">Start with Free Trial</h3>
              <p className="text-muted-foreground mb-4">Try all features for 14 days. No credit card required.</p>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleStartFreeTrial} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Start Free Trial
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
