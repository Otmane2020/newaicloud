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
    const { article_ids } = await req.json();

    if (!article_ids || !Array.isArray(article_ids) || article_ids.length === 0) {
      return new Response(JSON.stringify({ error: "article_ids array is required" }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const results: { success: number; errors: number; details: any[] } = { success: 0, errors: 0, details: [] };

    for (const article_id of article_ids) {
      try {
        // Récupérer l'article
        const { data: article, error: articleError } = await supabase
          .from("blog_articles")
          .select("*")
          .eq("id", article_id)
          .single();

        if (articleError || !article) {
          results.errors++;
          results.details.push({ article_id, error: "Article not found" });
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
  "keywords": ["mot-clé1", "mot-clé2", "mot-clé3", "mot-clé4", "mot-clé5"]
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
          throw new Error(`AI Error: ${err}`);
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

        if (updateError) throw updateError;

        results.success++;
        results.details.push({ article_id, seo_data: seoData });

      } catch (error) {
        console.error("❌ Error optimizing article:", article_id, error);
        results.errors++;
        results.details.push({ 
          article_id, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
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
