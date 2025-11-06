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
    const systemPrompt = `Tu es un expert en e-commerce et en copywriting. Génère du contenu optimisé pour augmenter les ventes.`;

    let userPrompt = `Produit: "${currentTitle}"`;
    
    if (visionAnalysis) {
      userPrompt += `\n\nAnalyse visuelle du produit:\n${visionAnalysis}`;
    }

    if (imageUrl) {
      userPrompt += `\n\nImage du produit disponible: ${imageUrl}`;
    }

    userPrompt += `\n\nGénère du contenu marketing pour ce produit.`;

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
              description: "Génère un titre optimisé, une meta description et une description HTML enrichie pour un produit e-commerce",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Titre optimisé de 50-70 caractères, clair et attractif pour augmenter le taux de clic"
                  },
                  description: {
                    type: "string",
                    description: "Meta description de 150-300 caractères, engageante et convaincante"
                  },
                  html_description: {
                    type: "string",
                    description: `Description HTML enrichie avec structure complète:
- <h1> avec image si disponible
- <h2>Caractéristiques principales</h2> avec liste à puces
- <h2>Design & Style</h2> avec description visuelle
- <h2>Expérience Utilisateur</h2>
- Classes CSS: product-hero, feature-list, design-section, ux-highlights
- Balises sémantiques <section>, <article>
- HTML professionnel et moderne`
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
