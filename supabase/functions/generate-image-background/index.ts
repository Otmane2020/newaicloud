import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ ok: true, provider: "cloudflare-workers-ai", policy: "cloudflare-only" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("SUPABASE_URL not configured");

    // Preserve legacy input names while routing every request to the single
    // Cloudflare-only product background implementation.
    const forwarded = {
      ...body,
      targetType: body.targetType || (body.imageType === "primary" ? "main" : "variant"),
      style: body.style || (body.imageType === "primary" ? "professional" : "lifestyle"),
      format: body.format || "square",
    };

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-ai-product-background`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": req.headers.get("Authorization") || `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""}`,
        "apikey": req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "",
      },
      body: JSON.stringify(forwarded),
    });

    return new Response(await response.text(), {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "X-Image-Provider": "cloudflare-workers-ai",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
