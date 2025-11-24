/**********************************************************************
 *  GENERATE-LANDING-AI — VERSION ULTRA-STABLE
 *  Fix complet du bug "[object Object] is not valid JSON"
 *  - Toutes les sorties sont FORCÉES en JSON valide
 *  - callAI 100% safe
 *  - Aucun objet non-sérialisable
 **********************************************************************/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

/**********************************************************************
 * UTIL - CLEAN SAFE JSON
 **********************************************************************/
function safeJSONStringify(obj: any) {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return JSON.stringify({ error: "CANNOT_SERIALIZE_OBJECT", details: String(e) });
  }
}

function safeValue(v: any) {
  if (v === undefined || v === null) return null;
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**********************************************************************
 * AI CALL — FIX DEFINITIF
 **********************************************************************/
async function callAI(prompt: string) {
  const res = await fetch("https://api.lovable.dev/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      prompt,
    }),
  });

  let json: any;
  try {
    json = await res.json();
  } catch {
    const raw = await res.text();
    console.error("⛔ INVALID JSON FROM LOVABLE:", raw);
    throw new Error("INVALID_JSON_FROM_AI");
  }

  // Force output extraction
  let output = json?.output;

  // LOVABLE FORMAT FIX
  if (output && typeof output === "object" && output.text) {
    output = output.text;
  }

  if (typeof output === "object") {
    output = JSON.stringify(output, null, 2);
  }

  if (typeof output !== "string") {
    output = String(output);
  }

  return output
    .replace(/```html/gi, "")
    .replace(/```/g, "")
    .trim();
}

/**********************************************************************
 * ENDPOINT HTTP
 **********************************************************************/
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return new Response(safeJSONStringify({ error: "INVALID_REQUEST_BODY" }), { status: 400, headers: corsHeaders });
    }

    const { productId, productTitle, vendor = "", description = "", images = [] } = body;

    if (!productId || !productTitle) {
      return new Response(safeJSONStringify({ error: "MISSING_FIELDS" }), { status: 400, headers: corsHeaders });
    }

    // Simple prompt (tu ajouteras tes règles ensuite)
    const prompt = `
Generate a premium HTML landing page for:
${productTitle}
Vendor: ${vendor}

Description:
${description}
`;

    const html = await callAI(prompt);

    // store in DB
    await supabase.from("shopify_products").update({ landing_page_html: html }).eq("id", productId);

    return new Response(
      safeJSONStringify({
        success: true,
        html: safeValue(html),
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error("🔥 INTERNAL ERROR:", err);

    return new Response(
      safeJSONStringify({
        error: "INTERNAL_SERVER_ERROR",
        details: String(err),
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
