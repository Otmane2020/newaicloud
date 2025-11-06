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

    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY non configuré");
    }

    let visionAnalysis = "";
    let productDimensions = "";
    let visualAttributes = {
      colors: [] as string[],
      materials: [] as string[],
      style: "",
      design: ""
    };
    
    // Si une URL d'image est fournie, analyser l'image avec Vision AI
    if (imageUrl) {
      console.log("Analyzing image with Gemini Vision:", imageUrl);
      
      try {
        // Fetch image and convert to base64
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

        const visionUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;
        
        const visionResponse = await fetch(visionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: `Analyze this product image in detail and provide:
1. Colors: List all visible colors
2. Materials: Identify materials used
3. Style: Describe the design style (modern, classic, rustic, etc.)
4. Design elements: Key visual features
5. Dimensions: If visible, estimate approximate dimensions
6. UX aspects: How the product looks in use, ergonomics, user appeal

Format as JSON:
{
  "colors": ["color1", "color2"],
  "materials": ["material1", "material2"],
  "style": "style description",
  "design": "design elements description",
  "dimensions": "dimension info if visible",
  "ux_appeal": "user experience description"
}`,
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Image,
                  },
                },
              ],
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800,
            },
          }),
        });

        if (!visionResponse.ok) {
          const errorText = await visionResponse.text();
          console.error("Gemini Vision error:", visionResponse.status, errorText);
          
          if (visionResponse.status === 429) {
            throw new Error("RATE_LIMIT: Trop de requêtes. Veuillez réessayer dans quelques instants.");
          }
        } else {
          const visionData = await visionResponse.json();
          const rawAnalysis = visionData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          console.log("Vision analysis completed:", rawAnalysis);
          
          // Parse JSON from the response
          try {
            const jsonMatch = rawAnalysis.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              visualAttributes = {
                colors: parsed.colors || [],
                materials: parsed.materials || [],
                style: parsed.style || "",
                design: parsed.design || ""
              };
              productDimensions = parsed.dimensions || "";
              visionAnalysis = parsed.ux_appeal || rawAnalysis;
            } else {
              visionAnalysis = rawAnalysis;
            }
          } catch (parseError) {
            console.error("Error parsing vision JSON:", parseError);
            visionAnalysis = rawAnalysis;
          }
        }
      } catch (visionError) {
        console.error("Error during vision analysis:", visionError);
      }
    }

    // Générer le titre, la description SEO et la description HTML enrichie
    const systemPrompt = `Tu es un expert en e-commerce et en copywriting UX. Ta tâche est de générer:
1. Un titre optimisé SEO (50-70 caractères)
2. Une meta description SEO (150-300 caractères)
3. Une description HTML enrichie selon les normes e-commerce avec structure H1, H2, H3

Exigences:

**Titre SEO** (50-70 caractères):
- Clair, descriptif, optimisé pour le référencement
- Inclure les mots-clés principaux
- Attractif pour augmenter le taux de clic

**Meta Description** (150-300 caractères):
- Engageante, met en valeur les bénéfices
- Incorpore naturellement des mots-clés SEO
- Convaincante, incite à l'achat

**Description HTML enrichie**:
Structure obligatoire:
- H1: Titre principal du produit (avec ${imageUrl ? 'image produit intégrée' : 'titre seul'})
- H2: "Caractéristiques principales" (liste à puces des bénéfices)
- H2: "Design & Style" (description visuelle, couleurs, matériaux)
${productDimensions ? '- H2: "Dimensions" (tableau ou liste des dimensions)\n' : ''}
- H2: "Expérience Utilisateur" (UX, confort, facilité d'utilisation)
- H3: Sous-sections si nécessaire

Format HTML professionnel avec:
- Balises sémantiques (<section>, <article>)
- Classes CSS: 'product-hero', 'feature-list', 'design-section', 'dimensions-table', 'ux-highlights'
- Images responsives si URL fournie
- Mise en page e-commerce moderne`;

    let userPrompt = `Titre actuel du produit: "${currentTitle}"`;
    
    if (visionAnalysis) {
      userPrompt += `\n\n**Analyse IA de l'image:**
${visionAnalysis}

**Attributs visuels détectés:**
- Couleurs: ${visualAttributes.colors.join(', ') || 'Non détecté'}
- Matériaux: ${visualAttributes.materials.join(', ') || 'Non détecté'}
- Style: ${visualAttributes.style || 'Non détecté'}
- Design: ${visualAttributes.design || 'Non détecté'}`;
    }

    if (productDimensions) {
      userPrompt += `\n\n**Dimensions du produit:**
${productDimensions}`;
    }

    userPrompt += `\n\nGénère en JSON:
{
  "title": "titre SEO optimisé",
  "description": "meta description SEO",
  "html_description": "description HTML enrichie complète avec H1, H2, H3, sections"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `${systemPrompt}\n\n${userPrompt}` 
          }],
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("RATE_LIMIT: Trop de requêtes. Veuillez réessayer dans quelques instants.");
      }
      
      throw new Error(`Erreur Gemini API: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error("Aucun contenu généré par l'IA");
    }

    // Clean up the response and parse JSON
    const cleanedContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from AI response");
    }

    const result = JSON.parse(jsonMatch[0]);

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
        hasVisionAnalysis: !!visionAnalysis,
        visualAttributes: visualAttributes,
        dimensions: productDimensions
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
