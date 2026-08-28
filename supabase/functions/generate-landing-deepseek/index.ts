import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Backward-compatible endpoint.
 *
 * The old implementation contained provider-specific Vision/Lovable code.
 * All landing generation is now centralized in generate-landing-ai, which uses
 * the shared free-only text router. Keeping this endpoint prevents existing UI
 * calls from breaking while removing a second, divergent AI stack.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.text();
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("SUPABASE_URL not configured");

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-landing-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": req.headers.get("Authorization") || `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""}`,
        "apikey": req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "",
      },
      body,
    });

    const payload = await response.text();
    return new Response(payload, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "X-AI-Policy": "free-only-centralized",
      },
    });
  } catch (error) {
    console.error("[generate-landing-deepseek] compatibility wrapper failed:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
