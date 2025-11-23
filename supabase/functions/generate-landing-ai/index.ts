import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Load config option from SQL
async function getOption(category: string, key: string) {
  if (!key) return null;

  const { data, error } = await supabase
    .from("landing_page_config_options")
    .select("option_value")
    .eq("category", category)
    .eq("option_key", key)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("❌ DB option error:", error);
    return null;
  }

  return data?.option_value ? JSON.parse(data.option_value) : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const body = await req.json();

    if (!body.productTitle) {
      return new Response(JSON.stringify({ error: "Missing productTitle" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const opts = body.options || {};

    // Load dynamic options from DB
    const layout = await getOption("layout", opts.layout);
    const design = await getOption("design_style", opts.designStyle);
    const length = await getOption("content_length", opts.contentLength);
    const palette = await getOption("color_scheme", opts.colorScheme);
    const vendor = await getOption("vendor_source", opts.vendorSource);

    console.log("🔵 Loaded Options:", opts);

    const prompt = `
GENERATE A CONVERSION-OPTIMIZED, MOBILE-FIRST PRODUCT LANDING PAGE IN HTML ONLY.

PRODUCT TITLE:
${body.productTitle}

VENDOR SOURCE:
${vendor?.source || "shopify"}

LAYOUT:
${layout?.instructions || ""}

DESIGN STYLE:
${design?.instructions || ""}

CONTENT STRUCTURE:
${length?.instructions || ""}

COLOR PALETTE:
Primary: ${palette?.primary}
Secondary: ${palette?.secondary}
Accent: ${palette?.accent}
Background: ${palette?.background}
Surface: ${palette?.surface}
Text: ${palette?.text}

RULES:
- ONLY RETURN HTML (no head/body)
- MUST be beautiful, modern, mobile-first
- Strong hero section
- Responsive grid sections
- Clean CTAs
- No lorem ipsum
- No markdown
`;

    // 🔥 Correct Lovable API endpoint
    const response = await fetch("https://api.lovable.dev/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        prompt
      })
    });

    // ---------- SAFE JSON PARSER ----------
    const aiRaw = await response.text();

    if (!aiRaw) {
      throw new Error("AI_EMPTY_RESPONSE");
    }

    let ai;
    try {
      ai = JSON.parse(aiRaw);
    } catch (jsonErr) {
      console.error("❌ JSON parse failed:", aiRaw);
      throw new Error("AI_INVALID_JSON_RESPONSE");
    }

    // ---------- Validate AI output ----------
    if (!ai || typeof ai !== "object") {
      console.error("❌ AI object invalid:", ai);
      throw new Error("AI_INVALID_OBJECT");
    }

    if (!ai.output && !ai.choices) {
      console.error("❌ AI missing expected fields:", ai);
      throw new Error("AI_MISSING_FIELDS");
    }

    const htmlOutput = ai.output || ai.choices?.[0]?.message?.content;

    return new Response(
      JSON.stringify({
        html: htmlOutput,
        optimizedTitle: body.productTitle
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("❌ generate-landing-ai ERROR:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
