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

    // ---- 🔥 Récupération AUTO de toutes les Edge Functions ----
    const listRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/`, {
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
    });

    if (!listRes.ok) {
      throw new Error("Impossible de lister les Edge Functions");
    }

    const allFunctions = await listRes.json();

    // Structure des résultats
    const results: Record<string, any[]> = {};
    const failedFunctions: any[] = [];

    let totalFunctions = allFunctions.length;
    let healthyCount = 0;
    let unhealthyCount = 0;
    let totalResponseTime = 0;

    // ---- TESTER TOUTES LES FUNCTIONS ----
    for (const fn of allFunctions) {
      const name = fn.name;
      const category = autoCategorize(name);

      const startTime = Date.now();

      const timeout = category.includes("AI") ? 30000 : category.includes("Sync") ? 15000 : 5000;

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
