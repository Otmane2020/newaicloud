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
    const systemPrompt = `Tu es un expert en e-commerce. Crée du contenu HTML riche et structuré.`;

    let userPrompt = `Produit: "${currentTitle}"`;
    
    if (visionAnalysis) {
      userPrompt += `\n\nAnalyse visuelle:\n${visionAnalysis}`;
    }

    if (imageUrl) {
      userPrompt += `\n\nImage: ${imageUrl}`;
    }

    userPrompt += `\n\nCrée:
1. Titre SEO (50-60 caractères)
2. Meta description (150-160 caractères)
3. Description HTML avec H1, H2, caractéristiques (300-500 mots max)`;

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
                    description: `Description HTML structurée (300-500 mots):

<div style="max-width: 1200px; margin: 0 auto; padding: 2rem; font-family: system-ui;">
  <h1 style="font-size: 2.5rem; font-weight: 700; margin-bottom: 1.5rem;">[Titre Produit]</h1>
  ${imageUrl ? '<img src="${imageUrl}" alt="[Alt]" style="width: 100%; max-width: 600px; border-radius: 12px; margin: 2rem 0;"/>' : ''}
  
  <p style="font-size: 1.2rem; line-height: 1.75; margin-bottom: 2rem;">[Introduction 2-3 phrases]</p>
  
  <h2 style="font-size: 2rem; margin: 2rem 0 1rem;">✨ Caractéristiques</h2>
  <ul style="list-style: none; padding: 0;">
    <li style="margin: 0.75rem 0;"><strong>✓</strong> [Caractéristique 1]</li>
    <li style="margin: 0.75rem 0;"><strong>✓</strong> [Caractéristique 2]</li>
    <li style="margin: 0.75rem 0;"><strong>✓</strong> [Caractéristique 3]</li>
    <li style="margin: 0.75rem 0;"><strong>✓</strong> [Caractéristique 4]</li>
  </ul>
  
  <h2 style="font-size: 2rem; margin: 2rem 0 1rem;">🎨 Design & Qualité</h2>
  <p style="line-height: 1.75;">[Description design et matériaux 100-150 mots]</p>
  
  ${visionAnalysis ? '<h2 style="font-size: 2rem; margin: 2rem 0 1rem;">🔍 Analyse Vision</h2><p style="line-height: 1.75;">[Intégrer analyse vision]</p>' : ''}
</div>

Remplir tous les placeholders avec contenu réel`
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
