import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Catégories de fonctions pour organisation complète (~170 fonctions)
const FUNCTION_CATEGORIES = {
  'Core Import': [
    'import-products', 'import-shopify-collections', 'import-shopify-pages',
    'import-shopify-articles', 'import-content-images', 'import-costs-from-shopify',
    'import-shipping-costs', 'import-google-taxonomy'
  ],
  'Auth & Subscription': [
    'activate-free-trial', 'activate-full-plan', 'check-subscription',
    'check-usage-limits', 'diagnose-subscription', 'fix-invalid-trial-subscriptions',
    'fix-stuck-subscriptions', 'fix-subscription-sync', 'consume-optimization-credits'
  ],
  'Stripe': [
    'create-checkout', 'update-subscription', 'stripe-webhook',
    'admin-get-user-subscriptions', 'customer-portal', 'calculate-proration',
    'create-upgrade-invoice', 'force-payment', 'report-usage-to-stripe',
    'sync-stripe-subscription'
  ],
  'Shopify OAuth': [
    'shopify-oauth', 'shopify-install', 'shopify-webhook',
    'claim-shopify-connection', 'delete-shopify-connection',
    'encrypt-shopify-token', 'test-shopify-credentials', 'test-shopify-token',
    'validate-shopify-credentials', 'fetch-shopify-domain'
  ],
  'Shopify Sync': [
    'sync-landing-to-shopify', 'sync-seo-to-shopify', 'sync-homepage-seo',
    'sync-product-images-to-shopify', 'sync-blog-to-shopify', 'sync-page-to-shopify',
    'sync-article-image-to-shopify', 'sync-collection-image-to-shopify',
    'sync-pricing-to-shopify', 'sync-product-collections', 'sync-deleted-resources',
    'sync-shopify-orders', 'sync-shopify-to-feed', 'update-product-status',
    'delete-shopify-product', 'get-shopify-product-count', 'create-shopify-landing-page'
  ],
  'AI Generation': [
    'generate-landing-ai', 'generate-landing-deepseek', 'generate-blog-article',
    'generate-title-description', 'generate-tags', 'generate-vendor-name',
    'generate-google-category', 'generate-gtin', 'enrich-product',
    'generate-product-description-html', 'generate-promotional-articles',
    'generate-store-summary', 'generate-ads-landing-page'
  ],
  'AI Vision': [
    'generate-alt-texts', 'generate-alt-texts-vision', 'analyze-image-with-vision',
    'analyze-dimension-images', 'analyze-price-from-image', 'smart-alt-text'
  ],
  'AI Background': [
    'generate-white-background', 'generate-product-background',
    'generate-image-background', 'generate-ai-product-background',
    'generate-ai-background-variants', 'generate-image'
  ],
  'SEO': [
    'generate-comprehensive-seo-audit', 'generate-seo-audit', 'analyze-seo-with-ai',
    'generate-page-seo', 'generate-collection-seo', 'generate-article-seo',
    'generate-homepage-seo-element', 'audit-homepage-seo',
    'optimize-product-title-serp', 'generate-seo-with-deepseek', 'smart-title',
    'export-seo-audit-pdf'
  ],
  'SEO Tools': [
    'analyze-serp-competitors', 'check-broken-links', 'search-similar-products-specs',
    'extract-netlinking-from-articles', 'generate-article-keywords',
    'classify-product-category', 'analyze-competitor-pricing'
  ],
  'Google APIs': [
    'google-oauth-token', 'google-oauth-url', 'check-google-apis-health',
    'get-search-console-data', 'sync-search-console-data', 'daily-gsc-sync',
    'list-search-console-sites', 'request-gsc-indexing', 'submit-gsc-sitemap',
    'list-gsc-sitemaps', 'analyze-gsc-anomalies', 'get-gsc-product-performance'
  ],
  'Google Merchant': [
    'create-google-merchant-feed', 'google-merchant-oauth-token',
    'refresh-google-merchant-token', 'list-merchant-accounts',
    'scheduled-merchant-sync', 'optimize-shopping-feed', 'shopping-feed'
  ],
  'Google Ads': [
    'google-ads-oauth-token', 'list-google-ads-campaigns'
  ],
  'Blog & Content': [
    'generate-blog-opportunities', 'generate-daily-opportunities',
    'process-blog-campaigns', 'update-article-link'
  ],
  'Email Notifications': [
    'send-admin-email', 'send-notification-email', 'send-notification',
    'send-welcome-email', 'send-trial-expiring', 'send-payment-failed',
    'send-subscription-confirmed', 'send-upgrade-limit-email',
    'send-reset-password-email', 'send-contact-email', 'send-demo-booking',
    'send-order-confirmation', 'send-shipping-notification',
    'send-abandoned-cart', 'send-weekly-seo-digest', 'send-monthly-report',
    'receive-admin-email', 'download-email-attachment', 'test-webhook-email'
  ],
  'Scheduling & Cleanup': [
    'scheduled-sync', 'trigger-auto-sync', 'trigger-hourly-sync',
    'trigger-cleanup-sync', 'cleanup-orphaned-data', 'cleanup-invalid-trials',
    'cleanup-stuck-syncs', 'notify-expiring-shopify-tokens'
  ],
  'Challenges & Notifications': [
    'generate-daily-seo-challenges', 'generate-daily-notifications', 'track-activity'
  ],
  'Chat & Assistant': [
    'chat-smart', 'assistant-ai', 'robot-tts', 'robot-stt'
  ],
  'API & Utils': [
    'api-v1', 'generate-api-key', 'batch-translate', 'convert-landing-to-mobile',
    'performance-logger', 'track-referral-reward'
  ],
  'Admin': [
    'create-super-admin', 'setup-subscription-plans', 'system-health-check'
  ]
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const results: Record<string, any> = {};
    let totalFunctions = 0;
    let healthyCount = 0;
    let unhealthyCount = 0;
    let totalResponseTime = 0;
    const failedFunctions: Array<{ name: string; category: string; error: string; responseTime: number }> = [];

    // Tester toutes les fonctions par catégorie
    for (const [category, functions] of Object.entries(FUNCTION_CATEGORIES)) {
      for (const functionName of functions) {
        totalFunctions++;
        const startTime = Date.now();
        
        // Timeout adaptatif : 30s pour IA/Vision, 5s pour le reste
        const isAICategory = ['AI Generation', 'AI Vision', 'AI Background'].includes(category);
        const timeout = isAICategory ? 30000 : 5000;
        
        try {
          const response = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/${functionName}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              },
              body: JSON.stringify({ healthCheck: true }),
              signal: AbortSignal.timeout(timeout),
            }
          );

          const responseTime = Date.now() - startTime;
          totalResponseTime += responseTime;

          // Codes "healthy" : la fonction répond correctement
          // 200/201 = Succès, 400/401/403/422 = Validation/Auth (fonction répond)
          // Seuls 404 (fonction n'existe pas) et 500+ (erreur serveur) sont "unhealthy"
          const healthyStatusCodes = [200, 201, 400, 401, 403, 422];
          const isHealthy = healthyStatusCodes.includes(response.status);
          
          if (!results[category]) results[category] = [];
          
          results[category].push({
            name: functionName,
            status: isHealthy ? 'healthy' : 'unhealthy',
            responseTime,
            statusCode: response.status,
            timestamp: new Date().toISOString(),
          });

          if (isHealthy) {
            healthyCount++;
          } else {
            unhealthyCount++;
            failedFunctions.push({
              name: functionName,
              category,
              error: `HTTP ${response.status}`,
              responseTime,
            });
          }
        } catch (error) {
          const responseTime = Date.now() - startTime;
          unhealthyCount++;
          
          if (!results[category]) results[category] = [];
          
          results[category].push({
            name: functionName,
            status: 'unhealthy',
            responseTime,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          });

          failedFunctions.push({
            name: functionName,
            category,
            error: error instanceof Error ? error.message : 'Unknown error',
            responseTime,
          });
        }
      }
    }

    const avgResponseTime = totalFunctions > 0 ? Math.round(totalResponseTime / totalFunctions) : 0;

    // Sauvegarder dans la base de données
    const { error: dbError } = await supabaseAdmin
      .from('system_health_checks')
      .insert({
        total_functions: totalFunctions,
        healthy_count: healthyCount,
        unhealthy_count: unhealthyCount,
        avg_response_time_ms: avgResponseTime,
        results,
        alert_sent: false,
      });

    if (dbError) {
      console.error('Error saving health check:', dbError);
    }

    // Envoyer une alerte email si des erreurs détectées
    if (failedFunctions.length > 0) {
      try {
        const htmlContent = `
          <h2>🚨 Alerte Système - Fonctions en erreur</h2>
          <p><strong>${failedFunctions.length}</strong> fonction(s) présentent des problèmes :</p>
          <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
            <thead>
              <tr style="background-color: #f44336; color: white;">
                <th style="padding: 10px; border: 1px solid #ddd;">Catégorie</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Fonction</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Erreur</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Temps (ms)</th>
              </tr>
            </thead>
            <tbody>
              ${failedFunctions.map(f => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;">${f.category}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;"><code>${f.name}</code></td>
                  <td style="padding: 10px; border: 1px solid #ddd; color: red;">${f.error}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${f.responseTime}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p style="margin-top: 20px;">
            <strong>Résumé :</strong><br/>
            ✅ Saines : ${healthyCount}<br/>
            ❌ En erreur : ${unhealthyCount}<br/>
            ⏱️ Temps de réponse moyen : ${avgResponseTime}ms<br/>
            🕐 Timestamp : ${new Date().toISOString()}
          </p>
        `;

        await supabaseAdmin.functions.invoke('send-notification-email', {
          body: {
            to: 'oben.rockman@gmail.com',
            subject: `🚨 ALERTE: ${failedFunctions.length} fonction(s) en erreur`,
            html: htmlContent,
          },
        });

        // Marquer l'alerte comme envoyée
        await supabaseAdmin
          .from('system_health_checks')
          .update({ alert_sent: true })
          .order('checked_at', { ascending: false })
          .limit(1);
      } catch (emailError) {
        console.error('Error sending alert email:', emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          totalFunctions,
          healthyCount,
          unhealthyCount,
          avgResponseTimeMs: avgResponseTime,
          status: unhealthyCount === 0 ? 'operational' : unhealthyCount < totalFunctions * 0.1 ? 'degraded' : 'major_outage',
        },
        results,
        failedFunctions,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Health check error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
