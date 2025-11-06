import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currentTitle, imageUrl } = await req.json();

    if (!currentTitle) {
      throw new Error("Le titre actuel est requis");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY non configuré");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    let visionAnalysis = "";
    
    // Si une URL d'image est fournie, vérifier le cache puis analyser avec Lovable AI Vision
    if (imageUrl) {
      console.log("Checking cache for image:", imageUrl);
      
      // Vérifier si l'analyse existe déjà en cache
      const { data: cachedAnalysis } = await supabaseClient
        .from('vision_ai_cache')
        .select('analysis_result')
        .eq('image_url', imageUrl)
        .single();
      
      if (cachedAnalysis) {
        console.log("✅ Cache hit - Using cached vision analysis");
        visionAnalysis = cachedAnalysis.analysis_result;
      } else {
        console.log("❌ Cache miss - Analyzing image with Lovable AI Vision");
        
        try {
          const visionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Analyse ce produit et décris ses couleurs, matériaux, style et design en 2-3 phrases concises."
                    },
                    {
                      type: "image_url",
                      image_url: { url: imageUrl }
                    }
                  ]
                }
              ],
              max_tokens: 200
            }),
          });

          if (!visionResponse.ok) {
            const errorText = await visionResponse.text();
            console.error("Lovable AI Vision error:", visionResponse.status, errorText);
            
            if (visionResponse.status === 429) {
              throw new Error("RATE_LIMIT: Trop de requêtes. Veuillez réessayer dans quelques instants.");
            }
            if (visionResponse.status === 402) {
              throw new Error("CREDITS_DEPLETED: Les crédits Lovable AI sont épuisés.");
            }
          } else {
            const visionData = await visionResponse.json();
            visionAnalysis = visionData.choices?.[0]?.message?.content || "";
            console.log("Vision analysis completed:", visionAnalysis);
            
            // Sauvegarder dans le cache pour utilisation future
            if (visionAnalysis) {
              await supabaseClient
                .from('vision_ai_cache')
                .upsert({ 
                  image_url: imageUrl, 
                  analysis_result: visionAnalysis 
                }, { 
                  onConflict: 'image_url' 
                });
              console.log("✅ Vision analysis cached");
            }
          }
        } catch (visionError) {
          console.error("Error during vision analysis:", visionError);
        }
      }
    }

    // Générer le contenu avec Lovable AI et tool calling pour forcer JSON structuré
    const systemPrompt = `Tu es un expert SEO e-commerce et UX designer spécialisé dans la conversion. 
Ton objectif : créer du contenu optimisé SEO qui convertit avec un HTML moderne et professionnel.

🎯 RÈGLES SEO STRICTES:
- Titre: 50-60 caractères max avec mot-clé principal + bénéfice
- Meta: 150-160 caractères avec USP + CTA
- HTML: Structure sémantique, responsive, accessible`;

    let userPrompt = `Produit à optimiser: "${currentTitle}"`;
    
    if (visionAnalysis) {
      userPrompt += `\n\n📸 Analyse visuelle:\n${visionAnalysis}`;
    }

    if (imageUrl) {
      userPrompt += `\n\n🖼️ Image: ${imageUrl}`;
    }

    userPrompt += `\n\n✨ GÉNÉRER:

1️⃣ TITRE SEO OPTIMISÉ (50-60 car):
   Format: [Produit] + [Caractéristique unique] + [Bénéfice]
   Exemples:
   - "T-shirt" → "T-shirt Premium Coton Bio - Confort Maximum"
   - "Lampe" → "Lampe LED Design - Économie Énergie 80%"
   
2️⃣ META DESCRIPTION (150-160 car):
   Structure: [Bénéfice] + [Caractéristiques clés] + [CTA] + [Réassurance]
   Exemple: "Découvrez notre produit X en matériau Y. Livraison 48h offerte ✓"

3️⃣ HTML BODY (landing page professionnelle):
   - Design moderne responsive
   - Sections bien structurées
   - Intégration image produit
   - Call-to-actions clairs
   - Informations pratiques`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_product_content",
              description: "Génère titre, meta description et description HTML enrichie pour e-commerce",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Titre SEO optimisé 50-60 caractères"
                  },
                  description: {
                    type: "string",
                    description: "Meta description SEO 150-160 caractères"
                  },
                  html_description: {
                    type: "string",
                    description: `HTML landing page moderne et responsive (structure complète):

<div style="max-width: 1200px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.6;">
  
  <!-- Hero Section -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 3rem; color: white; margin-bottom: 3rem; text-align: center;">
    <h1 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem; line-height: 1.2;">[Titre Produit Optimisé]</h1>
    <p style="font-size: 1.25rem; opacity: 0.95; max-width: 600px; margin: 0 auto;">[Phrase d'accroche bénéfices]</p>
  </div>

  ${imageUrl ? `<!-- Image Produit -->
  <div style="text-align: center; margin: 3rem 0;">
    <img src="${imageUrl}" alt="[Description SEO]" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.15);"/>
  </div>` : ''}

  <!-- Introduction -->
  <div style="background: #f8f9fa; border-radius: 12px; padding: 2rem; margin-bottom: 3rem;">
    <p style="font-size: 1.15rem; margin: 0;">[Paragraphe intro 3-4 phrases sur bénéfices principaux]</p>
  </div>

  <!-- Caractéristiques Clés -->
  <h2 style="font-size: 2rem; font-weight: 700; margin: 3rem 0 1.5rem; color: #2d3748;">✨ Caractéristiques principales</h2>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 3rem;">
    <div style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎯</div>
      <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">[Caractéristique 1]</h3>
      <p style="color: #718096; margin: 0;">[Détail]</p>
    </div>
    <div style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚡</div>
      <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">[Caractéristique 2]</h3>
      <p style="color: #718096; margin: 0;">[Détail]</p>
    </div>
    <div style="background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 1.5rem;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">💎</div>
      <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">[Caractéristique 3]</h3>
      <p style="color: #718096; margin: 0;">[Détail]</p>
    </div>
  </div>

  <!-- Description Détaillée -->
  <h2 style="font-size: 2rem; font-weight: 700; margin: 3rem 0 1.5rem; color: #2d3748;">📋 Description complète</h2>
  <div style="background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <p style="margin-bottom: 1.5rem;">[Paragraphe détaillé sur le produit, ses usages, ses matériaux - 150 mots]</p>
    ${visionAnalysis ? `<div style="background: #edf2f7; border-left: 4px solid #667eea; padding: 1.5rem; margin: 1.5rem 0;">
      <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">🔍 Analyse visuelle</h3>
      <p style="margin: 0;">[Intégrer l'analyse vision ici]</p>
    </div>` : ''}
  </div>

  <!-- Spécifications -->
  <h2 style="font-size: 2rem; font-weight: 700; margin: 3rem 0 1.5rem; color: #2d3748;">🔧 Spécifications techniques</h2>
  <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <tr style="background: #f7fafc;">
      <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Matériau</td>
      <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">[Valeur]</td>
    </tr>
    <tr>
      <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Dimensions</td>
      <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">[Valeur]</td>
    </tr>
    <tr style="background: #f7fafc;">
      <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Poids</td>
      <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">[Valeur]</td>
    </tr>
    <tr>
      <td style="padding: 1rem; font-weight: 600;">Garantie</td>
      <td style="padding: 1rem;">[Valeur]</td>
    </tr>
  </table>

  <!-- CTA Final -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 3rem; margin-top: 3rem; text-align: center; color: white;">
    <h2 style="font-size: 2rem; font-weight: 700; margin-bottom: 1rem;">Prêt à passer commande ?</h2>
    <p style="font-size: 1.15rem; margin-bottom: 2rem; opacity: 0.95;">[Message de réassurance: livraison, garantie, etc.]</p>
    <div style="display: inline-block; background: white; color: #667eea; padding: 1rem 2.5rem; border-radius: 8px; font-weight: 700; font-size: 1.1rem;">
      Commander maintenant →
    </div>
  </div>

</div>

IMPORTANT: Remplace TOUS les placeholders [...] avec du contenu réel et pertinent`
                  }
                },
                required: ["title", "description", "html_description"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_product_content" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("RATE_LIMIT: Trop de requêtes. Veuillez réessayer dans quelques instants.");
      }
      if (response.status === 402) {
        throw new Error("CREDITS_DEPLETED: Les crédits Lovable AI sont épuisés.");
      }
      
      throw new Error(`Erreur Lovable AI: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      throw new Error("Aucun contenu généré par l'IA");
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Update database with new SEO data

    // Get auth header to find product
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      
      if (user) {
        // Find product by title and update
        const { data: products } = await supabaseClient
          .from('shopify_products')
          .select('id')
          .eq('seller_id', user.id)
          .eq('title', currentTitle)
          .limit(1);
        
        if (products && products.length > 0) {
          const productId = products[0].id;
          
          // Update product with optimized SEO title and rich HTML body
          await supabaseClient
            .from('shopify_products')
            .update({
              title: result.title, // Update main title with SEO-optimized version
              seo_title: result.title,
              seo_description: result.description,
              description: result.html_description || result.description, // Rich HTML for Body field
              optimization_count: supabaseClient.rpc('increment', { x: 1 }),
              last_optimization_at: new Date().toISOString()
            })
            .eq('id', productId);
          
          console.log(`✅ Product ${productId} updated with SEO title and rich HTML body`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        title: result.title || "",
        description: result.description || "",
        html_description: result.html_description || "",
        hasVisionAnalysis: !!visionAnalysis
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-title-description:", error);
    const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue s'est produite";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
