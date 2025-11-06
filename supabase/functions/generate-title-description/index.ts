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
                  text: "Analyze this product image and describe the key visual features: colors, patterns, textures, materials, style. Be specific and focus on what makes this product unique visually.",
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
              maxOutputTokens: 500,
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
          visionAnalysis = visionData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          console.log("Vision analysis completed:", visionAnalysis);
        }
      } catch (visionError) {
        console.error("Error during vision analysis:", visionError);
      }
    }

    // Générer le titre et la description optimisés
    const systemPrompt = `Tu es un expert en e-commerce et en copywriting. Ta tâche est de générer un titre optimisé SEO et une description captivante pour un produit.

Le titre doit:
- Être clair, descriptif et optimisé pour le référencement
- Inclure les mots-clés principaux
- Être attractif pour augmenter le taux de clic
- Faire entre 50 et 70 caractères

La description doit:
- Être engageante et mettre en valeur les bénéfices du produit
- Incorporer naturellement des mots-clés SEO
- Faire entre 150 et 300 caractères
- Être convaincante et inciter à l'achat`;

    let userPrompt = `Titre actuel du produit: "${currentTitle}"`;
    
    if (visionAnalysis) {
      userPrompt += `\n\nAnalyse visuelle de l'image du produit:\n${visionAnalysis}`;
    }

    userPrompt += `\n\nGénère un titre optimisé et une description captivante en JSON avec les clés "title" et "description".`;

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

    return new Response(
      JSON.stringify({
        title: result.title || "",
        description: result.description || "",
        hasVisionAnalysis: !!visionAnalysis,
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
