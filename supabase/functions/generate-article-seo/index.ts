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

    // Get authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: corsHeaders }
      );
    }

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

        // Récupérer l'article avec images
        const { data: article, error: articleError } = await supabase
          .from("blog_articles")
          .select("*, content_images(src, position)")
          .eq("id", article_id)
          .eq("user_id", user.id)
          .single();

        if (articleError || !article) {
          console.error(`❌ Article not found or unauthorized: ${article_id}`);
          errorCount++;
          results.push({ article_id, success: false, error: "Article not found or unauthorized" });
          continue;
        }

        // Check optimization limits using RPC
        const { data: checkResult, error: checkError } = await supabase
          .rpc('check_optimization_allowed', {
            p_user_id: user.id,
            p_resource_type: 'article',
            p_resource_id: article_id,
            p_force: false
          });

        if (checkError) {
          console.error(`❌ Error checking limits for ${article_id}:`, checkError);
          errorCount++;
          results.push({ article_id, success: false, error: 'Failed to check optimization limits' });
          continue;
        }

        if (!checkResult.allowed) {
          console.log(`⚠️ Optimization not allowed for ${article_id}: ${checkResult.reason}`);
          errorCount++;
          results.push({ 
            article_id, 
            success: false, 
            error: checkResult.message,
            reason: checkResult.reason 
          });
          continue;
        }

        // Try to get Vision AI analysis if article has cover image
        let visionData = null;
        const coverImage = article.content_images?.find((img: any) => img.position === 0) || article.content_images?.[0];
        
        if (coverImage?.src) {
          console.log('Attempting Vision AI analysis for article image:', coverImage.src);
          
          try {
            const visionResponse = await supabase.functions.invoke('analyze-image-with-vision', {
              body: {
                imageUrl: coverImage.src,
                productContext: {
                  title: article.title,
                  category: 'blog',
                  type: 'article'
                }
              }
            });

            if (!visionResponse.error && visionResponse.data) {
              visionData = visionResponse.data;
              console.log('Vision AI analysis successful for article:', visionData);
            } else {
              console.log('Vision AI analysis failed for article, continuing without it:', visionResponse.error);
            }
          } catch (visionError) {
            console.log('Vision AI error for article, continuing without it:', visionError);
          }
        }

        // Generate SEO using AI with Vision context
        let visionContext = '';
        if (visionData?.visualAttributes) {
          const attrs = visionData.visualAttributes;
          visionContext = `

ANALYSE VISUELLE DE L'IMAGE (Utilise ces données pour enrichir le SEO) :
- Couleur dominante : ${attrs.primaryColor}
- Couleurs secondaires : ${attrs.secondaryColors?.join(', ')}
- Style visuel : ${attrs.style}
- Ambiance : ${attrs.mood}
- Contexte : ${attrs.room || 'N/A'}
- Détails techniques : ${attrs.technicalDetails?.join(', ')}

Intègre ces éléments visuels naturellement dans le titre et la description pour les rendre plus descriptifs et précis.`;
        }

        const prompt = `Génère un titre SEO optimisé et une meta description pour cet article de blog:

Titre actuel: ${article.title}
Contenu: ${article.content.substring(0, 500)}...
${visionContext}

Retourne uniquement un JSON avec:
{
  "seo_title": "titre optimisé pour le SEO (max 60 caractères)",
  "meta_description": "description optimisée (max 160 caractères)",
  "keywords": ["mot-clé1", "mot-clé2", "mot-clé3"]
}

${visionData ? 'Utilise les données visuelles pour enrichir le contenu.' : ''}`;

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

        // Update article with SEO data and Vision AI info
        const updateData: any = {
          title: seoData.seo_title,
          meta_description: seoData.meta_description,
          keywords: seoData.keywords,
          optimization_count: (article.optimization_count || 0) + 1,
          last_optimization_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Add Vision AI metadata if analysis was successful
        if (visionData) {
          updateData.vision_analyzed = true;
          updateData.vision_attributes = visionData.visualAttributes;
          updateData.vision_confidence = visionData.confidence;
        }

        const { error: updateError } = await supabase
          .from("blog_articles")
          .update(updateData)
          .eq("id", article_id);

        if (updateError) {
          console.error(`❌ Update error for ${article_id}:`, updateError);
          errorCount++;
          results.push({ article_id, success: false, error: updateError.message });
          continue;
        }

        // Track usage
        await supabase.rpc('increment_usage', {
          p_seller_id: user.id,
          p_field: 'optimizations_count',
          p_increment: 1
        });

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