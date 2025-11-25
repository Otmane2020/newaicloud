import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Catégories de fonctions pour organisation
const FUNCTION_CATEGORIES = {
  'Core': [
    'import-products',
    'import-shopify-collections',
    'sync-shopify-to-feed',
    'cleanup-orphaned-data',
  ],
  'AI Generation': [
    'generate-alt-texts-vision',
    'generate-landing-ai',
    'generate-blog-article',
    'analyze-image-with-vision',
    'enrich-product',
  ],
  'SEO': [
    'generate-comprehensive-seo-audit',
    'analyze-seo-with-ai',
    'generate-page-seo',
    'generate-collection-seo',
    'generate-product-seo',
    'optimize-product-title-serp',
  ],
  'Email': [
    'send-admin-email',
    'send-notification-email',
  ],
  'Stripe': [
    'create-checkout',
    'update-subscription',
    'stripe-webhook',
    'admin-get-user-subscriptions',
  ],
  'Shopify': [
    'shopify-oauth',
    'sync-landing-to-shopify',
    'sync-seo-to-shopify',
    'sync-product-images-to-shopify',
    'sync-homepage-seo',
    'update-product-status',
    'test-shopify-credentials',
  ],
  'Background Processing': [
    'robot-tts',
    'robot-stt',
    'performance-logger',
  ],
  'System': [
    'check-google-apis-health',
    'cleanup-invalid-trials',
    'cleanup-expired-shopify-tokens',
  ],
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
              signal: AbortSignal.timeout(5000), // 5s timeout
            }
          );

          const responseTime = Date.now() - startTime;
          totalResponseTime += responseTime;

          const isHealthy = response.ok || response.status === 400; // 400 OK si healthCheck non supporté
          
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
