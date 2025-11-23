import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Supabase client
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// ---------- CLEAN HTML ----------
function cleanHTML(html: string) {
  if (!html) return "";
  return html
    .replace(/```html/gi, "")
    .replace(/```/g, "")
    .trim();
}

// ---------- FETCH CONFIG OPTIONS ----------
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
    console.error("❌ DB Error:", error);
    return null;
  }

  return data?.option_value ? JSON.parse(data.option_value) : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    // ---------- PARSE REQUEST ----------
    const body = await req.json().catch(() => null);

    if (!body) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: cors,
      });
    }

    if (!body.productTitle) {
      return new Response(JSON.stringify({ error: "Missing productTitle" }), {
        status: 400,
        headers: cors,
      });
    }

    const opts = body.options || {};

    // ---------- LOAD OPTIONS FROM SQL ----------
    const layout = await getOption("layout", opts.layout);
    const design = await getOption("design_style", opts.designStyle);
    const length = await getOption("content_length", opts.contentLength);
    const palette = await getOption("color_scheme", opts.colorScheme);
    const vendor = await getOption("vendor_source", opts.vendorSource);

    console.log("🔵 Loaded options:", opts);

    // ---------- BUILD PROMPT ----------
    const prompt = `
Generate a beautiful, mobile-first landing page in pure HTML.

PRODUCT TITLE:
${body.productTitle}

VENDOR SOURCE:
${vendor?.source || "shopify"}

LAYOUT:
${layout?.instructions || ""}

DESIGN STYLE:
${design?.instructions || ""}

CONTENT LENGTH:
${length?.instructions || ""}

COLOR PALETTE:
Primary: ${palette?.primary || ""}
Secondary: ${palette?.secondary || ""}
Accent: ${palette?.accent || ""}
Background: ${palette?.background || ""}
Surface: ${palette?.surface || ""}
Text: ${palette?.text || ""}

RULES:
- Return ONLY pure HTML (no <html> or <body> tags)
- Modern, premium design
- Big hero section + CTA
- Clean grids, sections, features
- No markdown
`;

    // ---------- CALL LOVABLE AI ----------
    const response = await fetch("https://api.lovable.dev/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
        "User-Agent": "NewAI-Landing/1.0",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        prompt,
      }),
    });

    // ---------- SAFE JSON PARSING ----------
    const aiText = await response.text();

    if (!aiText) throw new Error("AI_EMPTY_RESPONSE");

    let ai;
    try {
      ai = JSON.parse(aiText);
    } catch {
      console.error("❌ AI returned invalid JSON:", aiText);
      throw new Error("AI_INVALID_JSON_RESPONSE");
    }

    // ---------- EXTRACT HTML ----------
    const raw = ai.output || ai.choices?.[0]?.message?.content;
    if (!raw) throw new Error("AI_NO_OUTPUT");

    const cleaned = cleanHTML(raw);

    // ---------- RETURN RESULT ----------
    return new Response(
      JSON.stringify({
        html: cleaned,
        optimizedTitle: body.productTitle,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("❌ generate-landing-ai ERROR:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }
});
