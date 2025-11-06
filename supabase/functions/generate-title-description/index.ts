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
    
    // Si une URL d'image est fournie, analyser l'image avec Vision AI
    if (imageUrl) {
      console.log("Analyzing image with Vision AI:", imageUrl);
      
      const visionMessages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this product image and describe the key visual features: colors, patterns, textures, materials, style. Be specific and focus on what makes this product unique visually."
            },
            {
              type: "image_url",
              image_url: { url: imageUrl }
            }
          ]
        }
      ];

      const visionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: visionMessages,
        }),
      });

      if (!visionResponse.ok) {
        console.error("Vision API error:", await visionResponse.text());
      } else {
        const visionData = await visionResponse.json();
        visionAnalysis = visionData.choices?.[0]?.message?.content || "";
        console.log("Vision analysis completed:", visionAnalysis);
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
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`Erreur AI API: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("Aucun contenu généré par l'IA");
    }

    const result = JSON.parse(content);

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
