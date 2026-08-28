import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { routeAI } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function parseJson(text: string): any {
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI returned no JSON object");
  return JSON.parse(match[0]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) throw new Error("Supabase service is not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { productIds, collectionName } = await req.json();
    if (!Array.isArray(productIds) || productIds.length === 0) throw new Error("No products provided");

    const { data: products, error: productsError } = await supabase
      .from("shopify_products")
      .select("title, tags, body_html, category, seo_title, seo_description")
      .in("id", productIds);
    if (productsError) throw productsError;

    const productsContext = (products || []).map((p, i) => `
Produit ${i + 1}:
- Titre: ${p.title}
- Tags: ${p.tags || "Aucun"}
- Catégorie: ${p.category || "Non définie"}
- Description: ${p.body_html?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 300) || "Aucune"}
- SEO existant: ${p.seo_title || ""} ${p.seo_description || ""}
`).join("\n");

    const prompt = `Tu es un expert SEO e-commerce. Génère des mots-clés ultra-ciblés pour un article de blog sur la collection "${collectionName || "Collection"}".

PRODUITS:
${productsContext}

RÈGLES:
- 4 à 5 shortKeywords de 2 à 4 mots, très spécifiques aux produits.
- 3 à 4 longKeywords de 6 à 10 mots avec une intention d'achat ou de comparaison claire.
- 1 articleTitle SEO, maximum 55 caractères.
- N'invente aucune matière, dimension, marque ou caractéristique absente des données.
- Évite les mots-clés génériques et les répétitions.

Réponds UNIQUEMENT en JSON valide:
{"shortKeywords":["..."],"longKeywords":["..."],"articleTitle":"..."}`;

    const routed = await routeAI({
      messages: [
        { role: "system", content: "Tu es un expert SEO e-commerce. Réponds uniquement en JSON valide, sans markdown." },
        { role: "user", content: prompt },
      ],
      maxTokens: 900,
      temperature: 0.35,
    });

    const parsed = parseJson(routed.content);
    return new Response(JSON.stringify({
      success: true,
      shortKeywords: Array.isArray(parsed.shortKeywords) ? parsed.shortKeywords.slice(0, 5) : [],
      longKeywords: Array.isArray(parsed.longKeywords) ? parsed.longKeywords.slice(0, 4) : [],
      articleTitle: String(parsed.articleTitle || "").slice(0, 70),
      provider: routed.provider,
      model: routed.model,
      policy: "openrouter-free>gemini-free>kimi-free>deepseek-free",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[generate-article-keywords] error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
