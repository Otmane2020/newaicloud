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

interface TechnicalDimensions {
  height?: string;
  width?: string;
  length?: string;
  depth?: string;
  diameter?: string;
  weight?: string;
  seatHeight?: string;
  heightUnit?: string;
  widthUnit?: string;
  lengthUnit?: string;
  depthUnit?: string;
  diameterUnit?: string;
  weightUnit?: string;
  seatHeightUnit?: string;
}

interface VisualContext {
  hasTechnicalSchema: boolean;
  hasPackaging?: boolean;
  hasRuler?: boolean;
  hasLabels?: boolean;
  viewAngle?: string;
  dimensionSource?: 'visible' | 'estimated' | 'not_available';
}

interface VisualAttributes {
  primaryColor: string;
  secondaryColors: string[];
  materials: string[];
  style: string;
  room?: string;
  mood: string;
  finish?: string;
  texture?: string;
  technicalDetails: string[];
  technicalDimensions?: TechnicalDimensions;
  visualContext?: VisualContext;
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

    const visionPrompt = `Analyse cette image produit et EXTRAIS ou ESTIME les dimensions.${contextInfo}

🎯 MISSION : Pour CHAQUE image, tu DOIS :
1. Chercher des dimensions VISIBLES (schéma, étiquette, emballage, règle)
2. Si rien n'est visible, ESTIMER visuellement les dimensions basées sur le type de produit
3. Toujours fournir une estimation dimensionnelle

EXTRACTION DES DIMENSIONS :
- Si dimensions VISIBLES → extrais EXACTEMENT et marque dimensionSource: "visible"
- Si rien visible → ESTIME visuellement et marque dimensionSource: "estimated"
- Sépare TOUJOURS valeur et unité (height: "75", heightUnit: "cm")

Exemple pour un tabouret de bar :
{
  "visualAttributes": {
    "primaryColor": "vert sapin",
    "secondaryColors": ["doré"],
    "materials": ["velours", "métal"],
    "style": "scandinave",
    "room": "cuisine",
    "mood": "élégant",
    "finish": "brillant",
    "texture": "doux",
    "technicalDetails": ["pied métallique doré", "repose-pieds intégré"],
    "technicalDimensions": {
      "height": "75",
      "heightUnit": "cm",
      "diameter": "35",
      "diameterUnit": "cm",
      "seatHeight": "65",
      "seatHeightUnit": "cm",
      "weight": "8.5",
      "weightUnit": "kg"
    },
    "visualContext": {
      "hasTechnicalSchema": false,
      "dimensionSource": "estimated"
    }
  },
  "confidence": 0.75
}

RÈGLES CRITIQUES :
✓ Sépare TOUJOURS valeur et unité (height: "75", heightUnit: "cm")
✓ Utilise "cm" pour longueurs, "kg" pour poids
✓ Si dimensions estimées, baisse confidence à 0.7-0.8
✓ Si dimensions visibles, confidence 0.85-0.95
✓ NE laisse JAMAIS technicalDimensions complètement vide
✓ Estime basé sur le type de produit (tabouret = ~75cm hauteur, chaise = ~85cm, etc.)`;

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
          model: 'google/gemini-2.5-flash', // Flash is better at OCR
          messages: [
              {
                role: 'user',
                content: [
                  { 
                    type: 'text', 
                    text: `Analyse cette image produit. Cherche d'abord s'il y a des CHIFFRES visibles (100cm, 71cm, H:75, Ø43, etc.).

SI TU VOIS DES CHIFFRES avec des unités (cm, kg, mm) :
→ hasTechnicalSchema = true
→ dimensionSource = "visible"
→ Extrais EXACTEMENT ces valeurs (ne change rien, même les décimales)
→ Sépare valeur et unité : "100cm" devient height:"100", heightUnit:"cm"
→ confidence = 0.95

SI AUCUN CHIFFRE visible :
→ hasTechnicalSchema = false
→ dimensionSource = "estimated"  
→ Estime selon le type de produit
→ confidence = 0.75

Contexte : ${JSON.stringify(productContext, null, 2)}

IMPORTANT : Utilise la fonction set_vision_result pour retourner le résultat.` 
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${contentType};base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            temperature: 0.3,
            max_tokens: 768,
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
    console.log('Lovable AI Vision response received', JSON.stringify(lovableData, null, 2));

    // 1) Try to use structured tool-calling output first
    const toolCall = lovableData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const visionResult: VisionResponse = JSON.parse(toolCall.function.arguments);
        console.log('Vision analysis completed (tool call):', visionResult);

        return new Response(
          JSON.stringify(visionResult),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (toolParseError) {
        console.error('Failed to parse tool call arguments as JSON:', toolCall.function.arguments, toolParseError);
        // If this fails, we fall back to text-based parsing below
      }
    }

    // 2) Fallback: parse plain text content (for backward compatibility)
    const generatedText = lovableData.choices?.[0]?.message?.content;
    if (!generatedText || typeof generatedText !== 'string') {
      console.error('No usable content in Gemini response:', JSON.stringify(lovableData, null, 2));
      throw new Error('No text generated from Gemini Vision');
    }

    console.log('🔍 Raw Gemini response (fallback text parsing):', generatedText);

    let visionResult: VisionResponse;
    
    try {
      // Try direct JSON parse first
      visionResult = JSON.parse(generatedText);
      console.log('✅ Direct JSON parse successful');
    } catch (directParseError) {
      console.log('⚠️ Direct parse failed, extracting JSON from text...');
      
      // Extract JSON from markdown code blocks or text
      const jsonMatch = generatedText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                       generatedText.match(/(\{[\s\S]*\})/);
      
      if (!jsonMatch) {
        console.error('❌ Failed to find JSON in response:', generatedText);
        throw new Error('Failed to extract JSON from Vision response');
      }

      try {
        visionResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        console.log('✅ Extracted JSON parse successful');
      } catch (extractParseError) {
        console.error('❌ Failed to parse extracted JSON:', jsonMatch[0]);
        throw new Error('Failed to parse extracted JSON from Vision response');
      }
    }

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
