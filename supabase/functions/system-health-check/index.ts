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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // --------------------------------------
    // 🔥 1. LISTER TOUTES LES FUNCTIONS RÉELLEMENT DÉPLOYÉES
    // --------------------------------------
    const listRes = await fetch(`${SUPABASE_URL}/functions/v1/`, {
      headers: { Authorization: `Bearer ${SERVICE_ROLE}` },
    });

    const deployed: Array<{ id: string }> = await listRes.json();

    const allFunctions = deployed.filter((f) => f.id !== "system-health-check").map((f) => f.id);

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
      } catch (err) {
        const ms = Date.now() - start;
        unhealthy++;

        if (!results[category]) results[category] = [];

        results[category].push({
          name: fn,
          status: "unhealthy",
          error: err?.message ?? "Unknown",
          responseTime: ms,
        });

        failed.push({ name: fn, category, error: err?.message, responseTime: ms });
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
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
