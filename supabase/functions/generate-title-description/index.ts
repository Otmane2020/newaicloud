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

    let visionAnalysis = "";
    
    // Si une URL d'image est fournie, analyser avec Lovable AI Vision
    if (imageUrl) {
      console.log("Analyzing image with Lovable AI Vision:", imageUrl);
      
      try {
        const visionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-pro",
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
            max_tokens: 300
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
        }
      } catch (visionError) {
        console.error("Error during vision analysis:", visionError);
      }
    }

    // Générer le contenu avec Lovable AI et tool calling pour forcer JSON structuré
    const systemPrompt = `Tu es un expert en e-commerce, copywriting et design UX. Tu crées du contenu HTML riche et structuré qui convertit les visiteurs en clients.`;

    let userPrompt = `Produit: "${currentTitle}"`;
    
    if (visionAnalysis) {
      userPrompt += `\n\nAnalyse visuelle du produit (Vision AI):\n${visionAnalysis}`;
    }

    if (imageUrl) {
      userPrompt += `\n\nImage du produit: ${imageUrl}`;
    }

    userPrompt += `\n\nCrée une page produit e-commerce complète avec:
1. Titre accrocheur optimisé SEO (50-70 caractères)
2. Meta description engageante (150-300 caractères)
3. Description HTML enrichie professionnelle avec:
   - H1 principal avec image si disponible
   - H2 "Caractéristiques Principales" avec 4-6 points clés
   - H2 "Design & Matériaux" avec analyse détaillée
   ${visionAnalysis ? '- H2 "Analyse Vision AI" avec les insights de l\'analyse visuelle' : ''}
   - H2 "Points Forts" avec liste à puces
   - Structure sémantique (section, article)
   - Classes CSS: product-hero, features-grid, design-analysis, vision-insights, highlights-list`;

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
              description: "Génère un titre optimisé, une meta description et une description HTML enrichie professionnelle pour un produit e-commerce",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Titre SEO optimisé de 50-70 caractères, accrocheur et descriptif"
                  },
                  description: {
                    type: "string",
                    description: "Meta description SEO de 150-300 caractères, persuasive et engageante"
                  },
                  html_description: {
                    type: "string",
                    description: `Description HTML COMPLÈTE et ENRICHIE (minimum 800-1200 mots) avec cette structure EXACTE:

<div class="product-page-container" style="max-width: 1200px; margin: 0 auto; padding: 2rem; font-family: system-ui, -apple-system, sans-serif;">
  
  <section class="product-hero" style="margin-bottom: 3rem;">
    <h1 style="font-size: 2.5rem; font-weight: 700; color: #1a1a1a; margin-bottom: 1.5rem; line-height: 1.2;">[TITRE PRODUIT CAPTIVANT]</h1>
    ${imageUrl ? '<div class="hero-image" style="margin: 2rem 0; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);"><img src="${imageUrl}" alt="[ALT]" style="width: 100%; height: auto; display: block;"/></div>' : ''}
    <p style="font-size: 1.25rem; color: #4a5568; line-height: 1.75; margin-bottom: 2rem;">[Introduction engageante 2-3 phrases]</p>
  </section>

  <section class="features-section" style="margin-bottom: 3rem; padding: 2rem; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px;">
    <h2 style="font-size: 2rem; font-weight: 600; color: #2d3748; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
      <span style="color: #3b82f6;">✨</span> Caractéristiques Principales
    </h2>
    <ul class="features-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; list-style: none; padding: 0; margin: 0;">
      <li style="display: flex; gap: 1rem; padding: 1.5rem; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <span style="color: #10b981; font-size: 1.5rem;">✓</span>
        <div><strong style="display: block; margin-bottom: 0.5rem; color: #1a1a1a;">[Point Fort 1]</strong><p style="margin: 0; color: #6b7280; font-size: 0.95rem;">[Détail]</p></div>
      </li>
      [RÉPÉTER POUR 4-6 CARACTÉRISTIQUES]
    </ul>
  </section>

  <section class="design-section" style="margin-bottom: 3rem;">
    <h2 style="font-size: 2rem; font-weight: 600; color: #2d3748; margin-bottom: 1.5rem;">🎨 Design & Matériaux</h2>
    <article style="line-height: 1.8; color: #4a5568; font-size: 1.05rem;">
      <p style="margin-bottom: 1.5rem;">[Paragraphe détaillé sur le design, l'esthétique, les matériaux utilisés - minimum 150 mots]</p>
      <p style="margin-bottom: 1.5rem;">[Paragraphe sur la qualité de fabrication et finitions - minimum 100 mots]</p>
    </article>
  </section>

  ${visionAnalysis ? `
  <section class="vision-insights" style="margin-bottom: 3rem; padding: 2rem; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; border-left: 4px solid #3b82f6;">
    <h2 style="font-size: 2rem; font-weight: 600; color: #1e40af; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
      <span>🔍</span> Analyse Vision AI
    </h2>
    <div style="background: white; padding: 1.5rem; border-radius: 8px; line-height: 1.8; color: #475569;">
      <p style="margin: 0;">[Intégrer l'analyse vision: ${visionAnalysis}]</p>
    </div>
  </section>
  ` : ''}

  <section class="highlights" style="margin-bottom: 3rem;">
    <h2 style="font-size: 2rem; font-weight: 600; color: #2d3748; margin-bottom: 1.5rem;">⭐ Points Forts</h2>
    <ul class="highlights-list" style="display: grid; gap: 1rem; list-style: none; padding: 0;">
      <li style="display: flex; align-items: start; gap: 1rem; padding: 1rem; background: #f9fafb; border-radius: 8px;">
        <span style="color: #f59e0b; font-size: 1.25rem;">★</span>
        <p style="margin: 0; color: #374151; font-size: 1.05rem;">[Point fort détaillé 1]</p>
      </li>
      [RÉPÉTER POUR 4-5 POINTS FORTS]
    </ul>
  </section>

  <section class="cta-section" style="text-align: center; padding: 3rem 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
    <h3 style="font-size: 1.75rem; font-weight: 600; margin-bottom: 1rem;">Prêt à Commander ?</h3>
    <p style="font-size: 1.125rem; margin-bottom: 2rem; opacity: 0.95;">[Phrase d'appel à l'action convaincante]</p>
  </section>

</div>

IMPORTANT: 
- Remplir TOUS les placeholders avec du contenu réel et détaillé
- Minimum 800-1200 mots au total
- Utiliser les informations du titre et de l'analyse vision
- Ton professionnel, engageant et persuasif
- Descriptions riches en détails visuels et tactiles`
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

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
          await supabaseClient
            .from('shopify_products')
            .update({
              seo_title: result.title,
              seo_description: result.description,
              description: result.html_description || result.description,
              optimization_count: supabaseClient.rpc('increment', { x: 1 }),
              last_optimization_at: new Date().toISOString()
            })
            .eq('id', products[0].id);
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
