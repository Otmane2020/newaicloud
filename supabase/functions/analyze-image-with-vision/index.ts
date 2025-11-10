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
  finish?: string;
  pattern?: string;
  shape?: string;
  texture?: string;
  craftsmanshipLevel?: string;
  presentationQuality?: number;
  useCases?: string[];
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

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    console.log('Analyzing image with Gemini Vision:', imageUrl);

    // Download image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(imageBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    // Determine image MIME type
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Construct Vision AI prompt
    const contextInfo = productContext 
      ? `\nContexte produit : ${productContext.title || ''} ${productContext.category || ''} ${productContext.type || ''}`
      : '';

    const visionPrompt = `Analyse cette image produit et extrait les attributs visuels suivants en français.${contextInfo}

Réponds UNIQUEMENT avec un objet JSON valide contenant :
{
  "visualAttributes": {
    "primaryColor": "couleur dominante principale",
    "secondaryColors": ["couleur 2", "couleur 3"],
    "materials": ["matériau 1", "matériau 2"],
    "style": "style/design (moderne, scandinave, industriel, vintage, classique, etc.)",
    "room": "contexte/pièce si visible (salon, chambre, cuisine, bureau, etc.)",
    "mood": "ambiance/atmosphère (chaleureux, élégant, minimaliste, cosy, contemporain, etc.)",
    "technicalDetails": ["détail technique 1", "détail technique 2"],
    "finish": "finition (mat, brillant, vernis, satiné, etc.)",
    "pattern": "motif si visible (uni, rayé, fleuri, géométrique, etc.)",
    "shape": "forme globale (rectangulaire, rond, carré, ovale, asymétrique, etc.)",
    "texture": "texture apparente (lisse, rugueux, tissé, granuleux, etc.)",
    "craftsmanshipLevel": "niveau artisanat (standard, premium, luxe)",
    "presentationQuality": 8.5,
    "useCases": ["cas d'usage 1", "cas d'usage 2"]
  },
  "confidence": 0.95
}

Instructions :
- primaryColor : la couleur la plus dominante et visible
- secondaryColors : 2-3 couleurs complémentaires/secondaires
- materials : matériaux visibles (bois, métal, tissu, verre, cuir, plastique, etc.)
- style : style de design global
- room : pièce/contexte si identifiable
- mood : ambiance/feeling général
- technicalDetails : détails visibles (pieds en bois, coussins amovibles, finition mate, etc.)
- finish : type de finition visible
- pattern : motif décoratif si présent
- shape : forme générale du produit
- texture : texture de surface apparente
- craftsmanshipLevel : évaluation du niveau de qualité
- presentationQuality : note de 1 à 10 sur la qualité de présentation
- useCases : 2-3 cas d'usage suggérés
- confidence : score de confiance entre 0 et 1

Sois précis et descriptif. N'invente pas, base-toi sur ce qui est visible.`;

    // Call Gemini Vision API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: visionPrompt },
                {
                  inline_data: {
                    mime_type: contentType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini Vision response:', JSON.stringify(geminiData));

    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
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
