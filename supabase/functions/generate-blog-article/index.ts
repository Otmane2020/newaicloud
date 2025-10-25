import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl!, supabaseKey!);
    const requestData = await req.json();

    if (requestData.mode === "auto") {
      console.log("🧠 MODE AUTO : génération d'articles...");
      
      const { data: campaigns, error: campaignError } = await supabase
        .from("blog_campaigns")
        .select("*")
        .eq("is_active", true)
        .limit(requestData.limit || 5);

      if (campaignError) throw campaignError;
      if (!campaigns?.length) {
        return new Response(JSON.stringify({
          success: false,
          message: "Aucune campagne active."
        }), { status: 200, headers: corsHeaders });
      }

      const results = [];
      for (const campaign of campaigns) {
        const res = await generateSingleArticle({ campaign_id: campaign.id }, supabase, lovableApiKey);
        results.push(res);
      }

      return new Response(JSON.stringify({
        success: true,
        message: `${results.length} articles générés.`,
        results
      }), { status: 200, headers: corsHeaders });
    }

    const result = await generateSingleArticle(requestData, supabase, lovableApiKey);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), { status: 500, headers: corsHeaders });
  }
});

async function generateSingleArticle(requestData: any, supabase: any, apiKey: string) {
  try {
    const { user_id, category = "Guide", keywords = [], title } = requestData;
    
    const articleTitle = title || `Guide Complet : ${keywords[0] || category}`;
    const targetKeywords = keywords.length ? keywords : [category, "guide"];

    console.log(`🎯 Génération d'article : ${articleTitle}`);

    const { data: products } = await supabase
      .from("shopify_products")
      .select("id, title, handle, price, category")
      .eq("seller_id", user_id)
      .limit(10);

    const productNames = products?.map((p: any) => p.title).join(", ") || "";
    
    const prompt = `Rédige un article SEO complet en français intitulé "${articleTitle}".
Intègre naturellement ces produits : ${productNames}.
Longueur : 1500-2000 mots.
Mots-clés : ${targetKeywords.join(", ")}.
Structure HTML avec <h2>, <h3>, paragraphes.
Inclus un appel à l'action.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu es un expert en rédaction SEO." },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      throw new Error(`AI Error: ${err}`);
    }

    const result = await aiResponse.json();
    const content = result.choices[0].message.content.trim();

    const { data: savedArticle, error: saveError } = await supabase
      .from("blog_articles")
      .insert([{
        user_id,
        title: articleTitle,
        content,
        meta_description: `Découvrez ${articleTitle}`,
        keywords: targetKeywords,
        status: "draft"
      }])
      .select()
      .single();

    if (saveError) throw saveError;

    console.log(`✅ Article sauvegardé : ${savedArticle.id}`);
    return { success: true, article_id: savedArticle.id, article: savedArticle };

  } catch (err) {
    console.error("Erreur génération:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}