import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VisionRequest {
  imageUrl: string;
  productContext?: {
    title?: string;
    category?: string;
    type?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const body: VisionRequest = await req.json();
    const { imageUrl, productContext } = body;

    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    console.log(`🔍 Analyzing image with Lovable AI Vision: ${imageUrl.substring(0, 100)}...`);

    const contextInfo = productContext 
      ? `\nContexte produit: ${productContext.title || ""} - ${productContext.category || ""} ${productContext.type || ""}`
      : "";

    // Appel à Lovable AI Vision avec prompt détaillé
    const prompt = `Tu es un expert en analyse visuelle de produits e-commerce. Analyse cette image de produit et extrait les informations suivantes:${contextInfo}

OBJECTIF PRINCIPAL: DÉTECTER ET EXTRAIRE LES DIMENSIONS TECHNIQUES SI UN SCHÉMA EST PRÉSENT

1. DIMENSIONS TECHNIQUES (PRIORITÉ ABSOLUE):
   - Cherche un schéma technique / plan côté / diagramme de dimensions
   - Si présent, extrait TOUTES les dimensions visibles avec leurs unités
   - Format attendu: { "length": 120, "length_unit": "cm", "width": 80, "width_unit": "cm", "height": 75, "height_unit": "cm", "diameter": null, "weight": null }
   - Si aucun schéma visible, retourne des objets vides ou null

2. CARACTÉRISTIQUES VISUELLES:
   - Couleur principale et couleurs secondaires
   - Matériaux visibles (bois, métal, verre, tissu, etc.)
   - Style de design (moderne, classique, scandinave, industriel, etc.)
   - Finition (mate, brillante, texturée)
   - Type de pièce suggéré (salon, chambre, cuisine, etc.)
   - Fonctionnalités visibles

3. ANALYSE CONTEXTUELLE:
   - Y a-t-il un schéma technique visible ? (true/false)
   - Qualité de présentation (0-10)
   - Niveau d'artisanat visible (standard, premium, luxury)
   - Type d'éclairage (studio, naturel, etc.)
   - Style de fond (neutre, lifestyle, etc.)

Réponds UNIQUEMENT en JSON valide:
{
  "visualAttributes": {
    "primaryColor": "string",
    "secondaryColors": ["string"],
    "materials": ["string"],
    "style": ["string"],
    "finish": "string",
    "texture": "string",
    "roomType": ["string"],
    "features": ["string"],
    "technicalDimensions": {
      "length": number | null,
      "length_unit": "string" | null,
      "width": number | null,
      "width_unit": "string" | null,
      "height": number | null,
      "height_unit": "string" | null,
      "diameter": number | null,
      "diameter_unit": "string" | null,
      "depth": number | null,
      "depth_unit": "string" | null,
      "weight": number | null,
      "weight_unit": "string" | null
    }
  },
  "visualContext": {
    "hasTechnicalSchema": boolean,
    "presentationQuality": number,
    "craftmanshipLevel": "standard" | "premium" | "luxury",
    "lightingType": "string",
    "backgroundStyle": "string"
  },
  "confidence": number
}`;

    const visionResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl
                  }
                }
              ]
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      }
    );

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error("Lovable AI Vision error:", errorText);
      
      if (visionResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please wait a moment and try again.");
      }
      if (visionResponse.status === 402) {
        throw new Error("Payment required. Please add credits to your Lovable workspace.");
      }
      
      throw new Error(`Lovable AI Vision error: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    const analysisText = visionData?.choices?.[0]?.message?.content || "";

    if (!analysisText) {
      throw new Error("No analysis returned from Lovable AI Vision");
    }

    console.log("✅ Vision analysis received");

    // Parser le JSON de la réponse
    let parsedAnalysis;
    try {
      // Nettoyer les markdown blocks
      const cleanedText = analysisText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      parsedAnalysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse vision response:", analysisText);
      throw new Error("Failed to parse vision analysis");
    }

    console.log("✅ Vision analysis parsed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        visualAttributes: parsedAnalysis.visualAttributes || {},
        visualContext: parsedAnalysis.visualContext || {},
        confidence: parsedAnalysis.confidence || 0.5,
        rawAnalysis: analysisText,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Vision analysis error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
