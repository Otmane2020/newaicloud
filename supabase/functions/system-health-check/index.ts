import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---- AUTO-CATEGORISATION PAR MOTS-CLÉS ----
function autoCategorize(name: string): string {
  const n = name.toLowerCase();

  if (n.includes("shopify")) return "Shopify";
  if (n.includes("stripe")) return "Stripe";
  if (n.includes("seo")) return "SEO";
  if (n.includes("google")) return "Google APIs";
  if (n.includes("merchant")) return "Google Merchant";
  if (n.includes("ads")) return "Google Ads";
  if (n.includes("import")) return "Imports";
  if (n.includes("sync")) return "Sync";
  if (n.includes("generate")) return "AI Generation";
  if (n.includes("image") || n.includes("vision") || n.includes("alt")) return "AI Vision";
  if (n.includes("background")) return "AI Background";
  if (n.includes("send") || n.includes("email")) return "Emails";
  if (n.includes("clean") || n.includes("trigger")) return "Scheduling";
  if (n.includes("chat") || n.includes("assistant")) return "Chat/Assistant";
  if (n.includes("admin")) return "Admin";

  return "Misc";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---- Client admin supabase ----
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ---- 🔥 Liste complète des Edge Functions ----
    const allFunctions = [
      // Core Import
      { name: "import-products" }, { name: "import-shopify-collections" }, { name: "import-shopify-pages" },
      { name: "import-shopify-articles" }, { name: "import-content-images" }, { name: "import-costs-from-shopify" },
      { name: "import-shipping-costs" }, { name: "import-google-taxonomy" },
      
      // Auth & Subscription
      { name: "activate-free-trial" }, { name: "activate-full-plan" }, { name: "check-subscription" },
      { name: "check-usage-limits" }, { name: "diagnose-subscription" }, { name: "fix-invalid-trial-subscriptions" },
      { name: "fix-stuck-subscriptions" }, { name: "fix-subscription-sync" }, { name: "consume-optimization-credits" },
      
      // Stripe
      { name: "create-checkout" }, { name: "update-subscription" }, { name: "stripe-webhook" },
      { name: "admin-get-user-subscriptions" }, { name: "customer-portal" }, { name: "calculate-proration" },
      { name: "create-upgrade-invoice" }, { name: "force-payment" }, { name: "report-usage-to-stripe" },
      { name: "sync-stripe-subscription" },
      
      // Shopify OAuth
      { name: "shopify-oauth" }, { name: "shopify-install" }, { name: "shopify-webhook" },
      { name: "claim-shopify-connection" }, { name: "delete-shopify-connection" }, { name: "encrypt-shopify-token" },
      { name: "test-shopify-credentials" }, { name: "test-shopify-token" }, { name: "validate-shopify-credentials" },
      { name: "fetch-shopify-domain" },
      
      // Shopify Sync
      { name: "sync-landing-to-shopify" }, { name: "sync-seo-to-shopify" }, { name: "sync-homepage-seo" },
      { name: "sync-product-images-to-shopify" }, { name: "sync-blog-to-shopify" }, { name: "sync-page-to-shopify" },
      { name: "sync-article-image-to-shopify" }, { name: "sync-collection-image-to-shopify" },
      { name: "sync-pricing-to-shopify" }, { name: "sync-product-collections" }, { name: "sync-deleted-resources" },
      { name: "sync-shopify-orders" }, { name: "sync-shopify-to-feed" }, { name: "update-product-status" },
      { name: "delete-shopify-product" }, { name: "get-shopify-product-count" }, { name: "create-shopify-landing-page" },
      
      // AI Generation
      { name: "generate-landing-ai" }, { name: "generate-landing-deepseek" }, { name: "generate-blog-article" },
      { name: "generate-title-description" }, { name: "generate-tags" }, { name: "generate-vendor-name" },
      { name: "generate-google-category" }, { name: "generate-gtin" }, { name: "enrich-product" },
      { name: "generate-product-description-html" }, { name: "generate-promotional-articles" },
      { name: "generate-store-summary" }, { name: "generate-ads-landing-page" },
      
      // AI Vision
      { name: "generate-alt-texts" }, { name: "generate-alt-texts-vision" }, { name: "analyze-image-with-vision" },
      { name: "analyze-dimension-images" }, { name: "analyze-price-from-image" }, { name: "smart-alt-text" },
      
      // AI Background
      { name: "generate-white-background" }, { name: "generate-product-background" },
      { name: "generate-image-background" }, { name: "generate-ai-product-background" },
      { name: "generate-ai-background-variants" }, { name: "generate-image" },
      
      // SEO
      { name: "generate-comprehensive-seo-audit" }, { name: "generate-seo-audit" }, { name: "analyze-seo-with-ai" },
      { name: "generate-page-seo" }, { name: "generate-collection-seo" }, { name: "generate-article-seo" },
      { name: "generate-homepage-seo-element" }, { name: "audit-homepage-seo" }, { name: "optimize-product-title-serp" },
      { name: "generate-seo-with-deepseek" }, { name: "smart-title" }, { name: "export-seo-audit-pdf" },
      
      // SEO Tools
      { name: "analyze-serp-competitors" }, { name: "check-broken-links" }, { name: "search-similar-products-specs" },
      { name: "extract-netlinking-from-articles" }, { name: "generate-article-keywords" },
      { name: "classify-product-category" }, { name: "analyze-competitor-pricing" },
      
      // Google APIs
      { name: "google-oauth-token" }, { name: "google-oauth-url" }, { name: "check-google-apis-health" },
      { name: "get-search-console-data" }, { name: "sync-search-console-data" }, { name: "daily-gsc-sync" },
      { name: "list-search-console-sites" }, { name: "request-gsc-indexing" }, { name: "submit-gsc-sitemap" },
      { name: "list-gsc-sitemaps" }, { name: "analyze-gsc-anomalies" }, { name: "get-gsc-product-performance" },
      
      // Google Merchant
      { name: "create-google-merchant-feed" }, { name: "google-merchant-oauth-token" },
      { name: "refresh-google-merchant-token" }, { name: "list-merchant-accounts" },
      { name: "scheduled-merchant-sync" }, { name: "optimize-shopping-feed" }, { name: "shopping-feed" },
      
      // Google Ads
      { name: "google-ads-oauth-token" }, { name: "list-google-ads-campaigns" },
      
      // Blog & Content
      { name: "generate-blog-opportunities" }, { name: "generate-daily-opportunities" },
      { name: "process-blog-campaigns" }, { name: "update-article-link" },
      
      // Email Notifications
      { name: "send-admin-email" }, { name: "send-notification-email" }, { name: "send-notification" },
      { name: "send-welcome-email" }, { name: "send-trial-expiring" }, { name: "send-payment-failed" },
      { name: "send-subscription-confirmed" }, { name: "send-upgrade-limit-email" }, { name: "send-reset-password-email" },
      { name: "send-contact-email" }, { name: "send-demo-booking" }, { name: "send-order-confirmation" },
      { name: "send-shipping-notification" }, { name: "send-abandoned-cart" }, { name: "send-weekly-seo-digest" },
      { name: "send-monthly-report" }, { name: "receive-admin-email" }, { name: "download-email-attachment" },
      { name: "test-webhook-email" },
      
      // Scheduling & Cleanup
      { name: "scheduled-sync" }, { name: "trigger-auto-sync" }, { name: "trigger-hourly-sync" },
      { name: "trigger-cleanup-sync" }, { name: "cleanup-orphaned-data" }, { name: "cleanup-invalid-trials" },
      { name: "cleanup-stuck-syncs" }, { name: "notify-expiring-shopify-tokens" },
      
      // Challenges & Notifications
      { name: "generate-daily-seo-challenges" }, { name: "generate-daily-notifications" },
      { name: "track-activity" },
      
      // Chat & Assistant
      { name: "chat-smart" }, { name: "assistant-ai" }, { name: "robot-tts" }, { name: "robot-stt" },
      
      // API & Utils
      { name: "api-v1" }, { name: "generate-api-key" }, { name: "batch-translate" },
      { name: "convert-landing-to-mobile" }, { name: "performance-logger" }, { name: "track-referral-reward" },
      
      // Admin
      { name: "create-super-admin" }, { name: "setup-subscription-plans" }, { name: "admin-user-insights" },
      { name: "admin-repair-profiles" }, { name: "admin-sync-stripe" }
    ];

    // Structure des résultats
    const results: Record<string, any[]> = {};
    const failedFunctions: any[] = [];

    let totalFunctions = allFunctions.length;
    let healthyCount = 0;
    let unhealthyCount = 0;
    let totalResponseTime = 0;

    // ---- TESTER TOUTES LES FUNCTIONS (sauf system-health-check) ----
    for (const fn of allFunctions) {
      const name = fn.name;
      
      // ⚡ Skip self-test to avoid recursion
      if (name === "system-health-check") {
        totalFunctions--;
        continue;
      }

      const category = autoCategorize(name);

      const startTime = Date.now();

      // 🎯 Intelligent timeouts by category
      const timeout = 
        category.includes("AI Vision") ? 60000 : 
        category.includes("AI") ? 60000 : 
        category.includes("Sync") ? 30000 : 
        category.includes("Email") ? 15000 : 
        5000;

      try {
        const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({ healthCheck: true }),
          signal: AbortSignal.timeout(timeout),
        });

        const responseTime = Date.now() - startTime;
        totalResponseTime += responseTime;

        const healthyCodes = [200, 201, 400, 401, 403, 422];
        const isHealthy = healthyCodes.includes(res.status);

        if (!results[category]) results[category] = [];

        results[category].push({
          name,
          status: isHealthy ? "healthy" : "unhealthy",
          statusCode: res.status,
          responseTime,
        });

        if (isHealthy) healthyCount++;
        else {
          unhealthyCount++;
          failedFunctions.push({
            name,
            category,
            error: `HTTP ${res.status}`,
            responseTime,
          });
        }
      } catch (err) {
        const responseTime = Date.now() - startTime;
        unhealthyCount++;

        if (!results[category]) results[category] = [];

        results[category].push({
          name,
          status: "unhealthy",
          error: err instanceof Error ? err.message : "Unknown",
          responseTime,
        });

        failedFunctions.push({
          name,
          category,
          error: err instanceof Error ? err.message : "Unknown",
          responseTime,
        });
      }
    }

    const avgResponseTime = Math.round(totalResponseTime / totalFunctions);

    // ---- Sauvegarde DB ----
    await supabaseAdmin.from("system_health_checks").insert({
      total_functions: totalFunctions,
      healthy_count: healthyCount,
      unhealthy_count: unhealthyCount,
      avg_response_time_ms: avgResponseTime,
      results,
      alert_sent: false,
    });

    // ---- Email d’alerte si nécessaire ----
    if (failedFunctions.length > 0) {
      await supabaseAdmin.functions.invoke("send-notification-email", {
        body: {
          to: "oben.rockman@gmail.com",
          subject: `🚨 ${failedFunctions.length} fonctions en erreur`,
          html: `<pre>${JSON.stringify(failedFunctions, null, 2)}</pre>`,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalFunctions,
        healthyCount,
        unhealthyCount,
        avgResponseTime,
        results,
        failedFunctions,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
