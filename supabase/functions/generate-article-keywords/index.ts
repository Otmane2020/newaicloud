import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl!, supabaseKey!);
    const { productIds, collectionName } = await req.json();

    console.log("🔑 Generating keywords for:", { productCount: productIds?.length, collectionName });

    if (!productIds || productIds.length === 0) {
      throw new Error("No products provided");
    }

    // Fetch product details
    const { data: products, error: productsError } = await supabase
      .from("shopify_products")
      .select("title, tags, body_html, category, seo_title, seo_description")
      .in("id", productIds);

    if (productsError) throw productsError;

    console.log("📦 Products fetched:", products?.length);

    // Prepare context for AI
    const productsContext = products
      .map((p, i) => `
Produit ${i + 1}:
- Titre: ${p.title}
- Tags: ${p.tags || "Aucun"}
- Catégorie: ${p.category || "Non définie"}
- Description: ${p.body_html?.replace(/<[^>]*>/g, "").slice(0, 200) || "Aucune"}
`)
      .join("\n");

    // Call Lovable AI to generate intelligent keywords
    const prompt = `Tu es un expert SEO e-commerce. Génère des mots-clés optimisés pour un article de blog sur ces produits de la collection "${collectionName}".

PRODUITS:
${productsContext}

TÂCHE:
1. **Mots-clés courts** (3-5 mots): Génère 8-10 mots-clés courts pertinents, concis et SEO-friendly
   - Exemples: "canapé angle velours", "mobilier moderne", "décoration salon"
   
2. **Phrases longues** (6-12 mots): Génère 5-7 phrases longues (longue traîne SEO) naturelles et conversationnelles
   - Exemples: "comment choisir un canapé d'angle pour petit salon", "meilleurs canapés modulables 2025 guide complet"

3. **Titre d'article**: Génère 1 titre SEO accrocheur et optimisé pour cet article

RÈGLES:
- Mots-clés en français, naturels et conversationnels
- Orientés intention d'achat et recherche informationnelle
- Pas de répétitions, variés et complémentaires
- Focus sur les bénéfices et caractéristiques des produits

Réponds UNIQUEMENT au format JSON strict suivant:
{
  "shortKeywords": ["mot-clé 1", "mot-clé 2", ...],
  "longKeywords": ["phrase longue 1", "phrase longue 2", ...],
  "articleTitle": "Titre d'article SEO"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Tu es un expert SEO e-commerce. Réponds UNIQUEMENT en JSON valide, sans markdown ni texte supplémentaire.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    console.log("🤖 AI response:", aiContent);

    // Parse AI response
    let parsedKeywords;
    try {
      // Remove markdown code blocks if present
      const cleanContent = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsedKeywords = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse AI-generated keywords");
    }

    return new Response(
      JSON.stringify({
        success: true,
        shortKeywords: parsedKeywords.shortKeywords || [],
        longKeywords: parsedKeywords.longKeywords || [],
        articleTitle: parsedKeywords.articleTitle || "",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error generating keywords:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
