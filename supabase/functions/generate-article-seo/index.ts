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
    const body = await req.json();
    console.log("📥 Received request body:", JSON.stringify(body));
    
    const { article_ids } = body;

    if (!article_ids || !Array.isArray(article_ids) || article_ids.length === 0) {
      return new Response(JSON.stringify({ error: "article_ids array is required" }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log(`🔄 Processing ${article_ids.length} articles for SEO optimization`);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    // Traiter chaque article
    for (const article_id of article_ids) {
      try {
        console.log(`📝 Processing article: ${article_id}`);

        // Récupérer l'article
        const { data: article, error: articleError } = await supabase
          .from("blog_articles")
          .select("*")
          .eq("id", article_id)
          .single();

        if (articleError || !article) {
          console.error(`❌ Article not found: ${article_id}`);
          errorCount++;
          results.push({ article_id, success: false, error: "Article not found" });
          continue;
        }

        // Générer SEO avec IA
        const prompt = `Génère un titre SEO optimisé et une meta description pour cet article de blog:

Titre actuel: ${article.title}
Contenu: ${article.content.substring(0, 500)}...

Retourne uniquement un JSON avec:
{
  "seo_title": "titre optimisé pour le SEO (max 60 caractères)",
  "meta_description": "description optimisée (max 160 caractères)",
  "keywords": ["mot-clé1", "mot-clé2", "mot-clé3"]
}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Tu es un expert SEO. Réponds uniquement en JSON valide." },
              { role: "user", content: prompt }
            ]
          })
        });

        if (!aiResponse.ok) {
          const err = await aiResponse.text();
          console.error(`❌ AI Error for ${article_id}: ${err}`);
          errorCount++;
          results.push({ article_id, success: false, error: "AI generation failed" });
          continue;
        }

        const result = await aiResponse.json();
        const content = result.choices[0].message.content.trim();
        
        // Parser le JSON
        let seoData;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          seoData = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        } catch {
          seoData = {
            seo_title: article.title.substring(0, 60),
            meta_description: article.content.substring(0, 160),
            keywords: []
          };
        }

        // Mettre à jour l'article
        const { error: updateError } = await supabase
          .from("blog_articles")
          .update({
            meta_description: seoData.meta_description,
            keywords: seoData.keywords,
            updated_at: new Date().toISOString()
          })
          .eq("id", article_id);

        if (updateError) {
          console.error(`❌ Update error for ${article_id}:`, updateError);
          errorCount++;
          results.push({ article_id, success: false, error: updateError.message });
          continue;
        }

        console.log(`✅ Successfully optimized article: ${article_id}`);
        successCount++;
        results.push({ article_id, success: true, seo_data: seoData });

      } catch (error) {
        console.error(`❌ Error processing article ${article_id}:`, error);
        errorCount++;
        results.push({ 
          article_id, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    console.log(`✨ SEO Optimization complete: ${successCount} success, ${errorCount} errors`);

    return new Response(JSON.stringify({
      success: true,
      success_count: successCount,
      error_count: errorCount,
      results
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), { status: 500, headers: corsHeaders });
  }
});
