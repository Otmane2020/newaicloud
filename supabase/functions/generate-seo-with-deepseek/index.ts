import { createClient } from "npm:@supabase/supabase-js@2";
import { getSeoPrompt, getSystemRole } from "../_shared/multilingual-prompts.ts";
import { resolveLanguage } from "../_shared/language-detector.ts";
import { routeAI } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function cleanJson(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function extractKeywords(product: any): string[] {
  const raw = [
    product.title,
    product.product_type,
    product.category,
    product.sub_category,
    product.ai_color,
    product.ai_material,
    product.style,
    product.vendor,
    product.tags,
  ].filter(Boolean).join(" ");
  return [...new Set(raw.toLowerCase().split(/[^\p{L}\p{N}-]+/u).filter((w) => w.length > 3))].slice(0, 20);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée. Utilisez POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { productId } = await req.json();
    if (!productId) throw new Error("ID produit requis");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: product, error: productError } = await supabase
      .from("shopify_products")
      .select("*, product_images(src, position), shopify_connections(store_language)")
      .eq("id", productId)
      .maybeSingle();
    if (productError) throw productError;
    if (!product) throw new Error("Produit non trouvé");
    if (product.seller_id !== user.id) throw new Error("Non autorisé");

    const language = resolveLanguage({
      contentText: `${product.title || ""} ${product.description || product.body_html || ""}`,
      storeLanguage: (product as any)?.shopify_connections?.store_language || "en-US",
    });

    let visionContext = "";
    const featuredImage = product.product_images?.find((img: any) => img.position === 0) || product.product_images?.[0];
    if (featuredImage?.src) {
      try {
        const vision = await supabase.functions.invoke("analyze-image-with-vision", {
          body: {
            imageUrl: featuredImage.src,
            productContext: { title: product.title, category: product.category, type: product.product_type },
          },
        });
        if (!vision.error && vision.data?.success !== false) {
          visionContext = JSON.stringify(vision.data).slice(0, 3500);
        }
      } catch (error) {
        console.warn("[generate-seo-with-deepseek] Kimi vision unavailable; continuing without vision", error);
      }
    }

    const keywords = extractKeywords(product);
    const prompt = getSeoPrompt(language, "product", {
      title: product.title,
      description: product.description || product.body_html,
      product_type: product.product_type,
      category: product.category,
      sub_category: product.sub_category,
      ai_color: product.ai_color,
      ai_material: product.ai_material,
      style: product.style,
      vendor: product.vendor,
      tags: product.tags,
      keywords,
      visionContext,
    });

    const routed = await routeAI({
      messages: [
        { role: "system", content: `${getSystemRole(language, "product")} Return only valid JSON with seo_title and seo_description.` },
        { role: "user", content: prompt },
      ],
      maxTokens: 1000,
      temperature: 0.45,
    });

    const parsed = JSON.parse(cleanJson(routed.content));
    const seoTitle = String(parsed.seo_title || "").trim();
    const seoDescription = String(parsed.seo_description || "").trim();
    if (!seoTitle || !seoDescription) throw new Error("AI returned incomplete SEO content");

    const nextCount = (product.optimization_count || 0) + 1;
    const { error: updateError } = await supabase
      .from("shopify_products")
      .update({
        seo_title: seoTitle,
        seo_description: seoDescription,
        enrichment_status: "enriched",
        seo_synced_to_shopify: false,
        optimization_count: nextCount,
        last_optimization_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);
    if (updateError) throw updateError;

    try {
      await supabase.rpc("increment_usage", {
        p_seller_id: product.seller_id,
        p_field: "optimizations_count",
        p_increment: 2,
      });
    } catch (error) {
      console.warn("[generate-seo-with-deepseek] usage tracking failed", error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "SEO généré avec succès",
        data: {
          product_id: productId,
          product_title: product.title,
          seo_title: seoTitle,
          seo_description: seoDescription,
          character_count: { title: seoTitle.length, description: seoDescription.length },
          vision_used: Boolean(visionContext),
          optimization_count: nextCount,
          keywords: keywords.slice(0, 5),
        },
        metadata: {
          generated_at: new Date().toISOString(),
          provider: routed.provider,
          model: routed.model,
          policy: "openrouter-free>gemini-free>kimi-free>deepseek-free",
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[generate-seo-with-deepseek] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
