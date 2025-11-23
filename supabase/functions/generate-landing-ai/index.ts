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
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error("❌ Invalid JSON in request body:", jsonError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }), 
        { 
          status: 400, 
          headers: { ...cors, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate required fields
    if (!body || !body.productTitle) {
      console.error("❌ Missing required field: productTitle");
      return new Response(
        JSON.stringify({ error: "Missing required field: productTitle" }), 
        { 
          status: 400, 
          headers: { ...cors, "Content-Type": "application/json" } 
        }
      );
    }

    const opts = body.options || {};

    // Load all config options from DB
    const layout = await getOption("layout", opts.layout);
    const design = await getOption("design_style", opts.designStyle);
    const length = await getOption("content_length", opts.contentLength);
    const palette = await getOption("color_scheme", opts.colorScheme);
    const vendor = await getOption("vendor_source", opts.vendorSource);

    console.log("🔵 Loaded options from DB:", {
      layout: opts.layout,
      design: opts.designStyle,
      palette: opts.colorScheme,
      contentLength: opts.contentLength,
      vendorSource: opts.vendorSource
    });

    // Build final IA prompt
    const prompt = `
Generate a modern, mobile-optimized product landing page.

PRODUCT TITLE:
${body.productTitle}

VENDOR SOURCE:
${vendor?.source || "shopify"}

LAYOUT:
${layout?.instructions || ""}

DESIGN STYLE:
${design?.instructions || ""}

CONTENT LENGTH / STRUCTURE:
${length?.instructions || ""}

COLOR PALETTE:
Primary: ${palette?.primary}
Secondary: ${palette?.secondary}
Accent: ${palette?.accent}
Background: ${palette?.background}
Surface: ${palette?.surface}
Text: ${palette?.text}

REQUIREMENTS:
- clean HTML
- mobile-first
- beautiful hero section
- CTA buttons
- semantic structure
- avoid boilerplate
- do NOT wrap in <html> or <body>

Now generate the final responsive HTML.
`;

    // 🔥 CALL AI MODEL (DeepSeek / Lovable)
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert HTML/CSS developer specialized in creating beautiful, conversion-optimized product landing pages." },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ AI API error:", response.status, errorText);
      throw new Error(`AI_API_ERROR: ${response.status}`);
    }

    const ai = await response.json();
    const generatedContent = ai.choices?.[0]?.message?.content;

    if (!generatedContent) {
      return new Response(JSON.stringify({ error: "AI_GENERATION_FAILED" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    return new Response(
      JSON.stringify({
        html: generatedContent,
        optimizedTitle: body.productTitle
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("❌ generate-landing-ai error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
