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
    "technicalDetails": ["détail technique 1", "détail technique 2"]
  },
  "confidence": 0.95
}

Instructions :
- primaryColor : la couleur la plus dominante et visible
- secondaryColors : 2-3 couleurs complémentaires/secondaires
- materials : matériaux visibles - SOIS TRÈS PRÉCIS :
  * Bois (chêne, noyer, teck, pin, hêtre, acajou)
  * Métaux (acier, laiton, fer forgé, aluminium, cuivre, bronze)
  * Tissus (lin, coton, velours, polyester, cuir)
  * Pierres naturelles (marbre, travertin, granit, ardoise, onyx, quartz, terrazzo)
  * Autres (verre, plastique, béton, résine, céramique, rotin)
  * NOTE : Distingue bien travertin (nervures horizontales) vs marbre (veinage aléatoire) vs granit (grains fins)
- style : style de design global
- room : pièce/contexte si identifiable
- mood : ambiance/feeling général
- technicalDimensions : UNIQUEMENT SI l'image est un schéma technique avec des cotes/mesures annotées :
  * EXTRAIT les dimensions EXACTES avec format structuré : {"hauteur_totale": "98cm", "hauteur_assise": "72cm", "largeur": "47cm", "profondeur": "47cm", "diametre": "36cm"}
  * PRIORITÉ ABSOLUE aux dimensions du schéma technique (ligne de cote avec flèches)
  * Si pas de schéma technique, renvoie null
- technicalDetails : détails visibles précis (autres que dimensions) :
  * Pieds en bois massif, nervures du travertin, veinage du marbre, coussins amovibles, finition mate/brillante, texture rugueuse/lisse, etc.
- confidence : score de confiance entre 0 et 1

⚠️ CRITIQUE : Si l'image contient un schéma technique avec des dimensions annotées, tu DOIS extraire TOUTES les mesures visibles et les mettre dans technicalDimensions sous format JSON structuré.

Sois TRÈS précis et descriptif sur les matériaux, textures ET dimensions. N'invente pas, base-toi UNIQUEMENT sur ce qui est VISIBLE dans l'image.`;

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
