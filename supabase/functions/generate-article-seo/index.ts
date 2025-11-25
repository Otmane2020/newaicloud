import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getSeoPrompt, getSystemRole } from "../_shared/multilingual-prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Safe HealthCheck handler
  const bodyCheck = await req.json().catch(() => ({}));
  if (bodyCheck?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
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

    const { article_ids } = bodyCheck;

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

        // Récupérer l'article avec images et validation store
        const { data: article, error: articleError } = await supabase
          .from("blog_articles")
          .select("*, content_images(src, position), store_id")
          .eq("id", article_id)
          .single();

        if (articleError || !article) {
          console.error(`❌ Article not found: ${article_id}`);
          errorCount++;
          results.push({ article_id, success: false, error: "Article not found" });
          continue;
        }

        // Vérifier que l'utilisateur a accès à ce store
        const { data: store } = await supabase
          .from("shopify_connections")
          .select("id")
          .eq("id", article.store_id)
          .eq("user_id", user.id)
          .single();

        if (!store) {
          console.error(`❌ User unauthorized for article: ${article_id}`);
          errorCount++;
          results.push({ article_id, success: false, error: "Unauthorized access" });
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

        // Get store language
        let storeLanguage = 'fr';
        if (article.store_id) {
          const { data: storeData } = await supabase
            .from('shopify_connections')
            .select('store_language')
            .eq('id', article.store_id)
            .single();
          
          if (storeData?.store_language) {
            storeLanguage = storeData.store_language;
          }
        }

        console.log(`Using language: ${storeLanguage} for article ${article_id}`);

        // Get store localization for SERP analysis
        let storeCountry = 'FR';
        if (article.store_id) {
          const { data: storeData } = await supabase
            .from('shopify_connections')
            .select('country_code')
            .eq('id', article.store_id)
            .single();
          
          if (storeData?.country_code) {
            storeCountry = storeData.country_code.toUpperCase();
          }
        }

        // Analyze SERP competitors for the article
        let serpInsights = '';
        try {
          console.log(`🔍 Analyzing SERP for article: ${article.title}`);
          const serpResponse = await supabase.functions.invoke('analyze-serp-competitors', {
            body: {
              keyword: article.title,
              analysisType: 'article',
              location: storeCountry,
              language: storeLanguage,
              maxResults: 10
            }
          });

          if (!serpResponse.error && serpResponse.data?.insights) {
            const insights = serpResponse.data.insights;
            serpInsights = `

🎯 ANALYSE SERP CONCURRENTS :
- H2 fréquents : ${insights.commonH2s?.join(', ') || 'N/A'}
- Thèmes couverts : ${insights.topicCoverage?.join(', ') || 'N/A'}
- Angles éditoriaux : ${insights.editorialAngles?.join(', ') || 'N/A'}
- Longueur article moyenne : ${insights.avgContentLength || 'N/A'} mots

📌 Couvre ces sujets et angles pour mieux matcher les intentions de recherche.`;
            console.log('✅ SERP analysis successful for article');
          }
        } catch (serpError) {
          console.log('⚠️ SERP analysis failed, continuing without it:', serpError);
        }

        // Generate SEO using AI with Vision context
        let visionContextText = '';
        if (visionData?.visualAttributes) {
          const attrs = visionData.visualAttributes;
          const visionLabels: Record<string, any> = {
            fr: { dominant: 'Couleur dominante', secondary: 'Couleurs secondaires', style: 'Style visuel', mood: 'Ambiance', context: 'Contexte', technical: 'Détails techniques', instruction: 'Intègre ces éléments visuels naturellement dans le titre et la description pour les rendre plus descriptifs et précis.' },
            en: { dominant: 'Dominant color', secondary: 'Secondary colors', style: 'Visual style', mood: 'Mood', context: 'Context', technical: 'Technical details', instruction: 'Integrate these visual elements naturally into the title and description to make them more descriptive and precise.' },
            de: { dominant: 'Dominante Farbe', secondary: 'Sekundärfarben', style: 'Visueller Stil', mood: 'Stimmung', context: 'Kontext', technical: 'Technische Details', instruction: 'Integrieren Sie diese visuellen Elemente auf natürliche Weise in den Titel und die Beschreibung, um sie beschreibender und präziser zu machen.' },
            es: { dominant: 'Color dominante', secondary: 'Colores secundarios', style: 'Estilo visual', mood: 'Ambiente', context: 'Contexto', technical: 'Detalles técnicos', instruction: 'Integra estos elementos visuales de forma natural en el título y la descripción para hacerlos más descriptivos y precisos.' },
            it: { dominant: 'Colore dominante', secondary: 'Colori secondari', style: 'Stile visivo', mood: 'Atmosfera', context: 'Contesto', technical: 'Dettagli tecnici', instruction: 'Integra questi elementi visivi in modo naturale nel titolo e nella descrizione per renderli più descrittivi e precisi.' }
          };
          const labels = visionLabels[storeLanguage] || visionLabels.fr;
          
          visionContextText = `

${labels.dominant}: ${attrs.primaryColor}
${labels.secondary}: ${attrs.secondaryColors?.join(', ')}
${labels.style}: ${attrs.style}
${labels.mood}: ${attrs.mood}
${labels.context}: ${attrs.room || 'N/A'}
${labels.technical}: ${attrs.technicalDetails?.join(', ')}

${labels.instruction}`;
        }

        const prompt = getSeoPrompt(storeLanguage, 'article', {
          title: article.title,
          content: article.content + visionContextText + serpInsights,
          keywords: article.keywords
        });

        const systemRole = getSystemRole(storeLanguage, 'article');

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemRole },
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
          seo_title: seoData.seo_title,
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
          p_increment: 2
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