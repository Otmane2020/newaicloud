import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// -------------------------------
// 1️⃣ AUTO-CATEGORISATION PRO
// -------------------------------
function categorize(name: string): string {
  const n = name.toLowerCase();

  const rules = [
    { cat: "Shopify", keys: ["shopify"] },
    { cat: "Stripe", keys: ["stripe"] },
    { cat: "Google APIs", keys: ["google", "gsc"] },
    { cat: "Google Merchant", keys: ["merchant"] },
    { cat: "Google Ads", keys: ["ads"] },
    { cat: "SEO", keys: ["seo"] },
    { cat: "AI Vision", keys: ["vision", "image", "alt"] },
    { cat: "AI Background", keys: ["background"] },
    { cat: "AI Generation", keys: ["generate", "enrich", "analyze"] },
    { cat: "Sync", keys: ["sync"] },
    { cat: "Emails", keys: ["email", "send"] },
    { cat: "Auth & Subscription", keys: ["subscription", "trial", "auth", "token"] },
    { cat: "Admin", keys: ["admin"] },
    { cat: "Imports", keys: ["import"] },
    { cat: "Utilities", keys: ["api", "batch", "convert", "performance"] },
  ];

  for (const rule of rules) {
    if (rule.keys.some((k) => n.includes(k))) return rule.cat;
  }

  return "Misc";
}

// -------------------------------
// 2️⃣ MOCK INTELLIGENT POUR IA
// -------------------------------
function getMockPayload(name: string) {
  const lower = name.toLowerCase();

  if (lower.includes("vision") || lower.includes("image")) {
    return {
      healthCheck: true,
      test: true,
      image: "mock",
    };
  }
  if (lower.includes("generate") || lower.includes("seo")) {
    return {
      healthCheck: true,
      test: true,
      input: "Health check ping",
    };
  }

  return { healthCheck: true };
}

// Timeout helper
function timeoutSignal(ms: number) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

// -------------------------------
// 3️⃣ VERSION ULTIME - HEALTH CHECK
// -------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Handle healthCheck to prevent self-testing
    const body = await req.json().catch(() => ({}));
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // --------------------------------------
    // 🔥 1. LISTE HARDCODÉE DES FONCTIONS ACTIVES
    // --------------------------------------
    const allFunctions = [
      "activate-free-trial",
      "activate-full-plan",
      "admin-get-user-subscriptions",
      "admin-repair-profiles",
      "admin-sync-stripe",
      "admin-user-insights",
      "analyze-competitor-pricing",
      "analyze-dimension-images",
      "analyze-gsc-anomalies",
      "analyze-image-with-vision",
      "analyze-price-from-image",
      "analyze-seo-with-ai",
      "analyze-serp-competitors",
      "api-v1",
      "assistant-ai",
      "audit-homepage-seo",
      "batch-translate",
      "calculate-proration",
      "chat-smart",
      "check-broken-links",
      "check-google-apis-health",
      "check-subscription",
      "check-usage-limits",
      "claim-shopify-connection",
      "classify-product-category",
      "cleanup-invalid-trials",
      "cleanup-orphaned-data",
      "cleanup-stuck-syncs",
      "consume-optimization-credits",
      "convert-landing-to-mobile",
      "create-checkout",
      "create-google-merchant-feed",
      "create-shopify-landing-page",
      "create-super-admin",
      "create-upgrade-invoice",
      "customer-portal",
      "daily-gsc-sync",
      "delete-shopify-connection",
      "delete-shopify-product",
      "diagnose-subscription",
      "download-email-attachment",
      "encrypt-shopify-token",
      "enrich-product",
      "export-seo-audit-pdf",
      "extract-netlinking-from-articles",
      "fetch-shopify-domain",
      "fix-invalid-trial-subscriptions",
      "fix-stuck-subscriptions",
      "fix-subscription-sync",
      "force-payment",
      "generate-ads-landing-page",
      "generate-ai-background-variants",
      "generate-ai-product-background",
      "generate-alt-texts-vision",
      "generate-api-key",
      "generate-article-keywords",
      "generate-article-seo",
      "generate-blog-article",
      "generate-blog-opportunities",
      "generate-collection-seo",
      "generate-comprehensive-seo-audit",
      "generate-daily-notifications",
      "generate-daily-opportunities",
      "generate-daily-seo-challenges",
      "generate-google-category",
      "generate-gtin",
      "generate-homepage-seo-element",
      "generate-image",
      "generate-image-background",
      "generate-landing-ai",
      "generate-page-seo",
      "generate-product-background",
      "generate-product-description-html",
      "generate-promotional-articles",
      "generate-store-summary",
      "generate-tags",
      "generate-title-description",
      "generate-vendor-name",
      "generate-white-background",
      "get-gsc-product-performance",
      "get-search-console-data",
      "get-shopify-product-count",
      "google-ads-oauth-token",
      "google-merchant-oauth-token",
      "google-oauth-token",
      "google-oauth-url",
      "import-content-images",
      "import-costs-from-shopify",
      "import-google-taxonomy",
      "import-products",
      "import-shipping-costs",
      "import-shopify-articles",
      "import-shopify-collections",
      "import-shopify-pages",
      "list-google-ads-campaigns",
      "list-gsc-sitemaps",
      "list-merchant-accounts",
      "list-search-console-sites",
      "notify-expiring-shopify-tokens",
      "optimize-shopping-feed",
      "performance-logger",
      "process-blog-campaigns",
      "receive-admin-email",
      "refresh-google-merchant-token",
      "report-usage-to-stripe",
      "request-gsc-indexing",
      "robot-stt",
      "robot-tts",
      "scheduled-merchant-sync",
      "scheduled-sync",
      "search-similar-products-specs",
      "send-abandoned-cart",
      "send-admin-email",
      "send-contact-email",
      "send-demo-booking",
      "send-monthly-report",
      "send-notification",
      "send-notification-email",
      "send-order-confirmation",
      "send-payment-failed",
      "send-reset-password-email",
      "send-shipping-notification",
      "send-subscription-confirmed",
      "send-trial-expiring",
      "send-upgrade-limit-email",
      "send-weekly-seo-digest",
      "send-welcome-email",
      "setup-subscription-plans",
      "shopify-install",
      "shopify-oauth",
      "shopify-webhook",
      "shopping-feed",
      "smart-alt-text",
      "smart-title",
      "stripe-webhook",
      "submit-gsc-sitemap",
      "sync-article-image-to-shopify",
      "sync-blog-to-shopify",
      "sync-collection-image-to-shopify",
      "sync-deleted-resources",
      "sync-homepage-seo",
      "sync-landing-to-shopify",
      "sync-page-to-shopify",
      "sync-pricing-to-shopify",
      "sync-product-collections",
      "sync-product-images-to-shopify",
      "sync-search-console-data",
      "sync-seo-to-shopify",
      "sync-shopify-orders",
      "sync-shopify-to-feed",
      "sync-stripe-subscription",
      "test-shopify-credentials",
      "test-shopify-token",
      "test-webhook-email",
      "track-activity",
      "track-referral-reward",
      "trigger-auto-sync",
      "trigger-cleanup-sync",
      "trigger-hourly-sync",
      "update-article-link",
      "update-product-status",
      "update-subscription",
      "validate-shopify-credentials",
    ];

    const results: Record<string, any[]> = {};
    const failed = [];

    let totalResponse = 0;
    let healthy = 0;
    let unhealthy = 0;

    // --------------------------------------
    // 🔥 2. TEST CHAQUE FUNCTION
    // --------------------------------------
    for (const fn of allFunctions) {
      const category = categorize(fn);
      const mock = getMockPayload(fn);

      const start = Date.now();

      const timeout = category.includes("AI")
        ? 30000
        : category.includes("Sync")
          ? 15000
          : category.includes("Emails")
            ? 15000
            : 5000;

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ANON}`,
          },
          body: JSON.stringify(mock),
          signal: timeoutSignal(timeout),
        });

        const ms = Date.now() - start;
        totalResponse += ms;

        const ok = [200, 201, 400, 401, 403, 422].includes(res.status);

        if (!results[category]) results[category] = [];
        results[category].push({
          name: fn,
          status: ok ? "healthy" : "unhealthy",
          code: res.status,
          responseTime: ms,
        });

        if (ok) healthy++;
        else {
          unhealthy++;
          failed.push({ name: fn, category, code: res.status, responseTime: ms });
        }
      } catch (err: unknown) {
        const ms = Date.now() - start;
        unhealthy++;

        if (!results[category]) results[category] = [];

        results[category].push({
          name: fn,
          status: "unhealthy",
          error: err instanceof Error ? err.message : "Unknown error",
          responseTime: ms,
        });

        failed.push({ name: fn, category, error: err instanceof Error ? err.message : "Unknown error", responseTime: ms });
      }
    }

    const avg = Math.round(totalResponse / allFunctions.length);

    // --------------------------------------
    // 🔥 3. SAUVEGARDE DB
    // --------------------------------------
    await supabase.from("system_health_checks").insert({
      total_functions: allFunctions.length,
      healthy_count: healthy,
      unhealthy_count: unhealthy,
      avg_response_time_ms: avg,
      results,
      alert_sent: failed.length > 0,
    });

    // --------------------------------------
    // 🔥 4. ENVOI EMAIL PRO
    // --------------------------------------
    if (failed.length > 0) {
      const html = `
        <h2>🚨 System Health Report</h2>
        <p>${failed.length} function(s) en erreur</p>
        <table border="1" cellpadding="6" style="border-collapse:collapse;font-family:Arial;font-size:13px">
          <tr style="background:#f44336;color:white">
            <th>Category</th><th>Function</th><th>Error</th><th>Time (ms)</th>
          </tr>
          ${failed
            .map(
              (f) => `
            <tr>
              <td>${f.category}</td>
              <td>${f.name}</td>
              <td>${f.code || f.error}</td>
              <td>${f.responseTime}</td>
            </tr>`,
            )
            .join("")}
        </table>
      `;

      await supabase.functions.invoke("send-notification-email", {
        body: {
          to: "oben.rockman@gmail.com",
          subject: `🚨 ${failed.length} Supabase Functions en erreur`,
          html,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: allFunctions.length,
          healthy,
          unhealthy,
          avg_response_time: avg,
        },
        results,
        failed,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
