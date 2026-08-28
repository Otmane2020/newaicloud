import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Usage = {
  optimizations_count: number;
  articles_count: number;
  chat_responses_count: number;
  shopify_requests_count: number;
  products_count: number;
  shopify_stores_count: number;
  campaigns_count: number;
};

type Limits = {
  max_optimizations: number;
  max_articles: number;
  max_chat_responses: number;
  max_shopify_requests: number;
  max_products: number;
  max_shopify_stores: number;
  max_campaigns: number;
};

const EMPTY_USAGE: Usage = {
  optimizations_count: 0,
  articles_count: 0,
  chat_responses_count: 0,
  shopify_requests_count: 0,
  products_count: 0,
  shopify_stores_count: 0,
  campaigns_count: 0,
};

const DEFAULT_TRIAL_LIMITS: Limits = {
  max_optimizations: 50,
  max_articles: 1,
  max_chat_responses: 50,
  max_shopify_requests: 50,
  max_products: 50,
  max_shopify_stores: 1,
  max_campaigns: 0,
};

const STARTER_TRIAL_LIMITS: Limits = {
  max_optimizations: 30,
  max_articles: 1,
  max_chat_responses: 50,
  max_shopify_requests: 50,
  max_products: 20,
  max_shopify_stores: 1,
  max_campaigns: 0,
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function numberOrZero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function buildResponse({
  usage,
  limits,
  isTrialing,
  isPaid,
  planId,
  billingProvider,
  shouldForcePayment = false,
  forcePaymentReason = "",
}: {
  usage: Usage;
  limits: Limits;
  isTrialing: boolean;
  isPaid: boolean;
  planId: string | null;
  billingProvider?: string | null;
  shouldForcePayment?: boolean;
  forcePaymentReason?: string;
}) {
  const canUseOptimizations = !shouldForcePayment && usage.optimizations_count < limits.max_optimizations;
  const canUseArticles = !shouldForcePayment && usage.articles_count < limits.max_articles;
  const canUseChat = !shouldForcePayment && usage.chat_responses_count < limits.max_chat_responses;
  const canUseShopifySearch = !shouldForcePayment && usage.shopify_requests_count < limits.max_shopify_requests;
  const canAddProducts = !shouldForcePayment && usage.products_count < limits.max_products;
  const canAddShopifyStore = !shouldForcePayment && usage.shopify_stores_count < limits.max_shopify_stores;
  const canUseCampaigns = !shouldForcePayment && usage.campaigns_count < limits.max_campaigns;

  return {
    canUseOptimizations,
    canUseArticles,
    canUseChat,
    canUseShopifySearch,
    canAddProducts,
    canAddShopifyStore,
    canUseCampaigns,
    limitReached: {
      optimizations: !canUseOptimizations,
      articles: !canUseArticles,
      chat: !canUseChat,
      shopifySearch: !canUseShopifySearch,
      products: !canAddProducts,
      shopifyStores: !canAddShopifyStore,
      campaigns: !canUseCampaigns,
    },
    usage,
    limits,
    isTrialing,
    isPaid,
    planId,
    billingProvider: billingProvider || "stripe",
    shouldForcePayment,
    forcePaymentReason,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("[LIMITS] Missing Supabase environment variables");
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      console.error("[LIMITS] Authentication failed", userError);
      return jsonResponse({
        error: "Unauthorized",
        code: "AUTH_ERROR",
        details: "Invalid or expired authentication token. Please sign in again.",
      }, 401);
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const month = new Date();
    month.setUTCDate(1);
    month.setUTCHours(0, 0, 0, 0);
    const monthKey = month.toISOString().slice(0, 10);

    // Read the canonical entitlement, monthly usage, and REAL connected Shopify stores.
    // Store availability must never depend on a stale usage_tracking counter.
    const [profileResult, usageResult, storesResult] = await Promise.all([
      admin
        .from("profiles")
        .select("subscription_status, current_plan_id, trial_ends_at, billing_provider")
        .eq("id", user.id)
        .maybeSingle(),
      admin
        .from("usage_tracking")
        .select("*")
        .eq("seller_id", user.id)
        .eq("month", monthKey)
        .maybeSingle(),
      admin
        .from("shopify_connections")
        .select("store_url")
        .eq("user_id", user.id)
        .eq("is_active", true),
    ]);

    const profile = profileResult.data;
    if (profileResult.error) console.error("[LIMITS] Profile query error", profileResult.error);
    if (usageResult.error) console.error("[LIMITS] Usage query error", usageResult.error);
    if (storesResult.error) console.error("[LIMITS] Shopify store query error", storesResult.error);

    const rawUsage = usageResult.data || {};
    const realStoreCount = new Set(
      (storesResult.data || [])
        .map((row: { store_url?: string | null }) => row.store_url?.trim().toLowerCase())
        .filter(Boolean),
    ).size;

    const usage: Usage = {
      optimizations_count: numberOrZero(rawUsage.optimizations_count),
      articles_count: numberOrZero(rawUsage.articles_count),
      chat_responses_count: numberOrZero(rawUsage.chat_responses_count),
      shopify_requests_count: numberOrZero(rawUsage.shopify_requests_count),
      products_count: numberOrZero(rawUsage.products_count),
      shopify_stores_count: realStoreCount,
      campaigns_count: numberOrZero(rawUsage.campaigns_count),
    };

    if (!profile) {
      console.warn("[LIMITS] No profile found; using onboarding-safe trial limits", { userId: user.id });
      return jsonResponse(buildResponse({
        usage: { ...EMPTY_USAGE, shopify_stores_count: realStoreCount },
        limits: DEFAULT_TRIAL_LIMITS,
        isTrialing: true,
        isPaid: false,
        planId: "trial",
      }));
    }

    const status = String(profile.subscription_status || "inactive").toLowerCase();
    const planId = profile.current_plan_id ? String(profile.current_plan_id) : null;
    const normalizedPlanId = (planId || "").replace(/-monthly$/, "").replace(/-yearly$/, "");
    const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
    const trialStillValid = status === "trialing" && (!trialEndsAt || trialEndsAt.getTime() > Date.now());
    const isPaid = status === "active" && !!normalizedPlanId && normalizedPlanId !== "trial" && normalizedPlanId !== "free";
    const isTrialing = trialStillValid;

    // No active paid plan and no valid trial: block paid actions instead of silently granting a free mode.
    if (!isPaid && !isTrialing) {
      return jsonResponse(buildResponse({
        usage,
        limits: DEFAULT_TRIAL_LIMITS,
        isTrialing: false,
        isPaid: false,
        planId,
        billingProvider: profile.billing_provider,
        shouldForcePayment: true,
        forcePaymentReason: status === "trialing" ? "trial_expired" : "no_active_subscription",
      }));
    }

    if (isTrialing) {
      const limits = normalizedPlanId === "starter"
        ? STARTER_TRIAL_LIMITS
        : DEFAULT_TRIAL_LIMITS;

      return jsonResponse(buildResponse({
        usage,
        limits,
        isTrialing: true,
        isPaid: false,
        planId: planId || "trial",
        billingProvider: profile.billing_provider,
      }));
    }

    const { data: plan, error: planError } = await admin
      .from("subscription_plans")
      .select("max_optimizations_monthly, max_articles_monthly, max_chat_responses_monthly, max_shopify_requests_monthly, max_products, max_shopify_stores, max_campaigns")
      .eq("id", normalizedPlanId)
      .maybeSingle();

    if (planError) console.error("[LIMITS] Plan query error", planError);

    if (!plan) {
      console.error("[LIMITS] Active plan missing from subscription_plans", { userId: user.id, planId: normalizedPlanId });
      return jsonResponse({
        error: "plan_configuration_missing",
        message: `No limits configuration found for plan ${normalizedPlanId}`,
      }, 500);
    }

    const limits: Limits = {
      max_optimizations: numberOrZero(plan.max_optimizations_monthly),
      max_articles: numberOrZero(plan.max_articles_monthly),
      max_chat_responses: numberOrZero(plan.max_chat_responses_monthly),
      max_shopify_requests: numberOrZero(plan.max_shopify_requests_monthly),
      max_products: numberOrZero(plan.max_products),
      max_shopify_stores: Math.max(1, numberOrZero(plan.max_shopify_stores)),
      max_campaigns: numberOrZero(plan.max_campaigns),
    };

    console.log("[LIMITS] Resolved entitlement", {
      userId: user.id,
      planId: normalizedPlanId,
      status,
      realStoreCount,
      maxShopifyStores: limits.max_shopify_stores,
    });

    return jsonResponse(buildResponse({
      usage,
      limits,
      isTrialing: false,
      isPaid: true,
      planId: normalizedPlanId,
      billingProvider: profile.billing_provider,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[LIMITS] Critical error", error);
    return jsonResponse({
      error: "Error checking usage limits",
      message,
      timestamp: new Date().toISOString(),
    }, 500);
  }
});