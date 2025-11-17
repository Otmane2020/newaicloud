import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VisionRequest {
  imageUrl: string;
  productContext?: {
    title?: string;
    category?: string;
    type?: string;
  };
}

interface VisualAttributes {
  primaryColor: string;
  secondaryColors: string[];
  materials: string[];
  style: string;
  room?: string;
  mood: string;
  technicalDetails: string[];
}

interface VisionResponse {
  visualAttributes: VisualAttributes;
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, productContext }: VisionRequest = await req.json();

    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Analyzing image with Gemini Vision:', imageUrl);

    // Download image with timeout (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    let imageResponse;
    try {
      imageResponse = await fetch(imageUrl, { signal: controller.signal });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Image download timeout after 30 seconds');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    // Check image size (limit to 10MB)
    const contentLength = imageResponse.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      throw new Error('Image too large (max 10MB)');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageSize = imageBuffer.byteLength;
    console.log(`Image size: ${(imageSize / 1024 / 1024).toFixed(2)}MB`);

    if (imageSize > 10 * 1024 * 1024) {
      throw new Error('Image too large (max 10MB)');
    }

    // Efficient base64 conversion using chunked approach to avoid stack overflow
    const uint8Array = new Uint8Array(imageBuffer);
    const chunkSize = 8192;
    let binary = '';
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode(...chunk);
    }
    
    const base64Image = btoa(binary);

    // Determine image MIME type
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Construct Vision AI prompt
    const contextInfo = productContext 
      ? `\nContexte produit : ${productContext.title || ''} ${productContext.category || ''} ${productContext.type || ''}`
      : '';

    const visionPrompt = `Analyse cette image produit de manière technique et précise.${contextInfo}

INSTRUCTIONS CRITIQUES :
1. DIMENSIONS : Si des dimensions sont visibles (sur emballage, étiquette, schéma technique, règle visible), extrais-les EXACTEMENT
2. POIDS : Si le poids est visible (sur emballage, étiquette), extrais-le EXACTEMENT
3. MATÉRIAUX : Identifie VISUELLEMENT les matériaux (grain du bois, reflets métalliques, texture du tissu)
4. FINITION : Décris la finition visible (vernis mat/brillant, peinture, métal brossé, etc.)
5. COULEURS : Liste les couleurs réelles visibles, pas les noms de produits

Réponds UNIQUEMENT avec un objet JSON valide contenant :
{
  "visualAttributes": {
    "primaryColor": "couleur dominante réelle vue",
    "secondaryColors": ["couleur 2 visible", "couleur 3 visible"],
    "materials": ["matériau identifié visuellement 1", "matériau 2"],
    "style": "style/design (moderne, scandinave, industriel, vintage, classique, contemporain)",
    "room": "contexte/pièce si visible (salon, chambre, cuisine, bureau, extérieur)",
    "mood": "ambiance (chaleureux, élégant, minimaliste, cosy, luxueux, rustique)",
    "finish": "finition visible (vernis mat, brillant, peinture, laqué, brossé, brut)",
    "texture": "texture visible (lisse, rugueux, grain fin, grain épais, tissé)",
    "technicalDetails": ["détail technique visible 1", "détail 2"],
    "technicalDimensions": {
      "height": "hauteur EXACTE si visible (avec unité, e.g., '80cm')",
      "width": "largeur EXACTE si visible (avec unité)",
      "length": "longueur EXACTE si visible (avec unité)",
      "depth": "profondeur EXACTE si visible (avec unité)",
      "diameter": "diamètre EXACT si visible (avec unité)",
      "weight": "poids EXACT si visible sur emballage/étiquette (avec unité, e.g., '5kg', '2.5kg')",
      "seatHeight": "hauteur d'assise si applicable et visible",
      "packageDimensions": "dimensions emballage si visibles"
    },
    "visualContext": {
      "hasPackaging": false,
      "hasTechnicalSchema": false,
      "hasRuler": false,
      "hasLabels": false,
      "viewAngle": "face/profil/3/4/dessus/dessous"
    }
  },
  "confidence": 0.85
}

IMPORTANT : 
- Ne mets une dimension que si elle est RÉELLEMENT VISIBLE sur l'image
- Si rien n'est visible, laisse technicalDimensions vide {}
- Le confidence score doit être élevé (>0.8) seulement si dimensions visibles
- Donne priorité absolue aux données extraites d'étiquettes, emballages, ou schémas techniques`;

    // Call Lovable AI with Vision support (higher quota limits)
    const lovableController = new AbortController();
    const lovableTimeoutId = setTimeout(() => lovableController.abort(), 45000);
    
    let lovableResponse;
    try {
      console.log('Calling Lovable AI with Vision...');
      lovableResponse = await fetch(
        'https://ai.gateway.lovable.dev/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          signal: lovableController.signal,
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: visionPrompt },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${contentType};base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            temperature: 0.4,
            max_tokens: 1024,
          }),
        }
      );
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Lovable AI timeout after 45 seconds');
      }
      throw error;
    } finally {
      clearTimeout(lovableTimeoutId);
    }

    if (!lovableResponse.ok) {
      const errorText = await lovableResponse.text();
      console.error('Lovable AI error:', lovableResponse.status, errorText);
      
      // Handle rate limiting gracefully
      if (lovableResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (lovableResponse.status === 402) {
        throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
      }
      
      throw new Error(`Lovable AI error: ${lovableResponse.status} ${errorText}`);
    }

    const lovableData = await lovableResponse.json();
    console.log('Lovable AI Vision response received');

    const generatedText = lovableData.choices?.[0]?.message?.content;
    if (!generatedText) {
      throw new Error('No text generated from Gemini Vision');
    }

    // Parse JSON response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to parse JSON from response:', generatedText);
      throw new Error('Failed to extract JSON from Vision response');
    }

    const visionResult: VisionResponse = JSON.parse(jsonMatch[0]);

    console.log('Vision analysis completed:', visionResult);

    return new Response(
      JSON.stringify(visionResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-image-with-vision:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
