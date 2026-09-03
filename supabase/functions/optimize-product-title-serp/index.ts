import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { routeAI } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function cleanJSON(text: string) {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (body?.healthCheck === true) return json({ ok: true });

  try {
    const productId = typeof body.productId === "string" ? body.productId : null;
    const currentTitle = String(body.currentTitle || "").trim();
    const description = stripHtml(String(body.description || "")).slice(0, 1500);
    const productType = String(body.productType || "").trim();
    const vendor = String(body.vendor || "").trim();
    const language = String(body.language || "fr").toLowerCase().startsWith("en") ? "en" : "fr";

    if (!currentTitle && !productId) {
      return json({ success: false, error: "productId or currentTitle is required" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    let title = currentTitle;
    let type = productType;
    let brand = vendor;
    let desc = description;

    if (productId) {
      const { data: product } = await supabaseAdmin
        .from("shopify_products")
        .select("title, product_type, vendor, body_html")
        .eq("id", productId)
        .maybeSingle();

      if (product) {
        title = title || product.title || "";
        type = type || product.product_type || "";
        brand = brand || product.vendor || "";
        desc = desc || stripHtml(String(product.body_html || "")).slice(0, 1500);
      }
    }

    if (!title) return json({ success: false, error: "Product not found" }, 404);

    const prompt = language === "en"
      ? `You are an e-commerce SEO expert. Rewrite this product title for Google search.

Current title: ${title}
Product type: ${type || "unknown"}
Brand: ${brand || "unknown"}
Description: ${desc || "n/a"}

Rules:
- 50-65 characters max, no brand stuffing, no ALL CAPS, no emoji
- Put the strongest search keyword first
- Keep the real product identity (never invent features)
- Also write a meta description of 140-155 characters

Answer with strict JSON only:
{"optimizedTitle":"...","metaDescription":"...","keywords":["..."]}`
      : `Tu es un expert SEO e-commerce. Réécris ce titre produit pour la recherche Google.

Titre actuel : ${title}
Type de produit : ${type || "inconnu"}
Marque : ${brand || "inconnue"}
Description : ${desc || "n/a"}

Règles :
- 50 à 65 caractères max, pas de bourrage de marque, pas de MAJUSCULES, pas d'emoji
- Placer le mot-clé le plus recherché en premier
- Conserver l'identité réelle du produit (n'invente aucune caractéristique)
- Rédige aussi une meta description de 140 à 155 caractères

Réponds uniquement en JSON strict :
{"optimizedTitle":"...","metaDescription":"...","keywords":["..."]}`;

    const result = await routeAI({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 700,
      temperature: 0.4,
    });

    console.log(`[optimize-product-title-serp] provider=${result.provider} model=${result.model}`);

    let parsed: { optimizedTitle?: string; metaDescription?: string; keywords?: string[] } = {};
    try {
      parsed = JSON.parse(cleanJSON(result.content));
    } catch {
      const match = cleanJSON(result.content).match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    const optimizedTitle = String(parsed.optimizedTitle || "").trim().slice(0, 120);
    const metaDescription = String(parsed.metaDescription || "").trim().slice(0, 320);

    if (!optimizedTitle) {
      return json({ success: false, error: "AI did not return a usable title" }, 502);
    }

    if (productId) {
      const update: Record<string, unknown> = {
        seo_title: optimizedTitle,
        regenerated_title: optimizedTitle,
        updated_at: new Date().toISOString(),
      };
      if (metaDescription) update.seo_description = metaDescription;

      const { error: updateError } = await supabaseAdmin
        .from("shopify_products")
        .update(update)
        .eq("id", productId);

      if (updateError) console.error("[optimize-product-title-serp] update failed", updateError);
    }

    return json({
      success: true,
      originalTitle: title,
      optimizedTitle,
      metaDescription,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 10) : [],
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error("[optimize-product-title-serp] error", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});
