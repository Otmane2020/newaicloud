import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  productId: string;
  productTitle: string;
  productType: string;
  sourceImageUrl: string;
  imageTypes: string[]; // ['front', 'profile', 'back', 'zoom_fabric', 'zoom_legs', 'zoom_detail']
  includeDecor: boolean;
  decorType: 'living_room' | 'bedroom' | 'office';
  language: string;
}

const IMAGE_TYPE_PROMPTS: Record<string, { fr: string; en: string }> = {
  front: {
    fr: "Vue de face du produit, angle frontal direct, fond blanc pur (#FFFFFF), AVEC une ombre portée douce et réaliste sous le produit (style Google Shopping). IMPORTANT: Image CARRÉE 1:1, produit CENTRÉ au milieu avec une petite marge (10-15%) sur tous les côtés pour que le produit ne touche pas les bords",
    en: "Front view of the product, direct frontal angle, pure white background (#FFFFFF), WITH a soft realistic drop shadow under the product (Google Shopping style). IMPORTANT: SQUARE 1:1 image, product CENTERED in the middle with small margin (10-15%) on all sides so the product doesn't touch the edges"
  },
  angle45: {
    fr: "Vue à 45 degrés du produit (vue trois-quarts), montrant profondeur et dimension, fond blanc pur (#FFFFFF), AVEC une ombre portée douce et réaliste sous le produit (style Google Shopping)",
    en: "45 degree angle view of the product (three-quarter view), showing depth and dimension, pure white background (#FFFFFF), WITH a soft realistic drop shadow under the product (Google Shopping style)"
  },
  profile: {
    fr: "Vue de profil du produit (côté gauche ou droit), angle 90 degrés, fond blanc pur (#FFFFFF), AVEC une ombre portée douce et réaliste sous le produit (style Google Shopping). IMPORTANT: Image CARRÉE 1:1, produit CENTRÉ au milieu avec une petite marge (10-15%) sur tous les côtés pour que le produit ne touche pas les bords",
    en: "Profile view of the product (left or right side), 90 degree angle, pure white background (#FFFFFF), WITH a soft realistic drop shadow under the product (Google Shopping style). IMPORTANT: SQUARE 1:1 image, product CENTERED in the middle with small margin (10-15%) on all sides so the product doesn't touch the edges"
  },
  back: {
    fr: "Vue arrière du produit, montrant le dos/arrière, fond blanc pur avec ombre portée légère",
    en: "Back view of the product, showing the rear, pure white background with light drop shadow"
  },
  top: {
    fr: "Vue du dessus (vue plongeante) du produit, montrant le produit vu d'en haut à 90 degrés, fond blanc pur (#FFFFFF), éclairage studio professionnel",
    en: "Top-down view of the product, showing the product from directly above at 90 degrees, pure white background (#FFFFFF), professional studio lighting"
  },
  low_angle: {
    fr: "Vue en contre-plongée du produit (angle bas vers le haut), donnant une perspective dramatique et imposante, fond blanc pur (#FFFFFF), éclairage studio",
    en: "Low angle view of the product (from below looking up), giving a dramatic and imposing perspective, pure white background (#FFFFFF), studio lighting"
  },
  zoom_fabric: {
    fr: "Gros plan macro sur le tissu/matière du produit, montrant la texture détaillée, fond blanc",
    en: "Macro close-up on the fabric/material of the product, showing detailed texture, white background"
  },
  zoom_legs: {
    fr: "Gros plan sur les pieds/structure du produit, montrant les détails de finition, fond blanc",
    en: "Close-up on the legs/structure of the product, showing finish details, white background"
  },
  zoom_detail: {
    fr: "Gros plan sur un détail caractéristique du produit (accoudoir, couture, assemblage), fond blanc",
    en: "Close-up on a characteristic detail of the product (armrest, stitching, assembly), white background"
  }
};

const DECOR_PROMPTS: Record<string, { fr: string; en: string }> = {
  living_room: {
    fr: "dans un salon moderne et lumineux, avec parquet clair, murs blancs, grande baie vitrée, plantes vertes, ambiance cosy et élégante",
    en: "in a modern bright living room, with light wood flooring, white walls, large window, green plants, cozy and elegant atmosphere"
  },
  dining_room: {
    fr: "dans une salle à manger élégante et conviviale, avec grande table en bois, chaises design, luminaire suspendu, vaisselle décorative, ambiance chaleureuse",
    en: "in an elegant and welcoming dining room, with large wooden table, designer chairs, pendant lighting, decorative tableware, warm atmosphere"
  },
  bedroom: {
    fr: "dans une chambre moderne et apaisante, avec lit confortable, lumière douce, tons neutres, décoration minimaliste",
    en: "in a modern soothing bedroom, with comfortable bed, soft lighting, neutral tones, minimalist decoration"
  },
  office: {
    fr: "dans un bureau moderne et professionnel, avec bureau en bois, éclairage naturel, plantes, ambiance productive",
    en: "in a modern professional office, with wooden desk, natural lighting, plants, productive atmosphere"
  }
};

const IMAGE_TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  front: { fr: "Face", en: "Front" },
  angle45: { fr: "45°", en: "45°" },
  profile: { fr: "Profil", en: "Profile" },
  back: { fr: "Arrière", en: "Back" },
  top: { fr: "Dessus", en: "Top" },
  low_angle: { fr: "Contre-plongée", en: "Low angle" },
  zoom_fabric: { fr: "Zoom tissu", en: "Fabric zoom" },
  zoom_legs: { fr: "Zoom pieds", en: "Legs zoom" },
  zoom_detail: { fr: "Zoom détail", en: "Detail zoom" },
  decor: { fr: "En décor", en: "In decor" }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { productId, productTitle, productType, sourceImageUrl, imageTypes, includeDecor, decorType, language } = body;

    if (!sourceImageUrl) {
      return new Response(
        JSON.stringify({ error: "Source image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Gemini direct API key instead of Lovable AI
    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
    }

    const lang = language === 'fr' ? 'fr' : 'en';
    const generatedImages: Array<{ url: string; type: string; label: string }> = [];

    console.log(`🖼️ Generating AI images for product: ${productTitle}`);
    console.log(`📷 Source image: ${sourceImageUrl}`);
    console.log(`🎯 Image types requested: ${imageTypes.join(', ')}`);
    console.log(`🏠 Include decor: ${includeDecor} (${decorType})`);

    // Prioritize profile view as primary image - sort image types to put profile first
    const sortedImageTypes = [...imageTypes].sort((a, b) => {
      if (a === 'profile') return -1;
      if (b === 'profile') return 1;
      if (a === 'front') return -1;
      if (b === 'front') return 1;
      return 0;
    });

    console.log(`🎯 Sorted image types (profile priority): ${sortedImageTypes.join(', ')}`);

    // Generate white background variant images
    for (const imageType of sortedImageTypes) {
      const typePrompt = IMAGE_TYPE_PROMPTS[imageType]?.[lang] || IMAGE_TYPE_PROMPTS[imageType]?.en;
      if (!typePrompt) continue;

      console.log(`🎨 Generating ${imageType} image via Gemini Direct...`);

      const prompt = lang === 'fr'
        ? `À partir de cette image de produit (${productTitle}, type: ${productType}), génère une image professionnelle e-commerce de haute qualité.

INSTRUCTIONS CRITIQUES:
- ${typePrompt}
- Le produit doit être identique à l'image source, même design, même couleur, même style
- Fond blanc pur (#FFFFFF), éclairage studio professionnel
- Image carrée 1024x1024 pixels
- Qualité professionnelle pour catalogue produit
- Pas de texte, pas de watermark`
        : `From this product image (${productTitle}, type: ${productType}), generate a professional high-quality e-commerce image.

CRITICAL INSTRUCTIONS:
- ${typePrompt}
- The product must be identical to the source image, same design, same color, same style
- Pure white background (#FFFFFF), professional studio lighting
- Square image 1024x1024 pixels
- Professional quality for product catalog
- No text, no watermark`;

      try {
        // Use Gemini 2.0 Flash direct API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { 
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: await fetchImageAsBase64(sourceImageUrl)
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"]
            }
          }),
        });

        if (!response.ok) {
          console.error(`❌ Error generating ${imageType}:`, response.status, await response.text());
          continue;
        }

        const data = await response.json();
        
        // Extract image from Gemini response
        const parts = data.candidates?.[0]?.content?.parts || [];
        let imageUrl: string | null = null;
        
        for (const part of parts) {
          if (part.inlineData?.mimeType?.startsWith('image/')) {
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }

        if (imageUrl) {
          generatedImages.push({
            url: imageUrl,
            type: imageType,
            label: IMAGE_TYPE_LABELS[imageType]?.[lang] || imageType
          });
          console.log(`✅ Generated ${imageType} image via Gemini Direct`);
        }
      } catch (error) {
        console.error(`❌ Error generating ${imageType}:`, error);
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Generate decor image FROM the first generated white background image (prioritizing profile)
    if (includeDecor && generatedImages.length > 0) {
      console.log(`🏠 Generating decor image (${decorType}) from generated white background image...`);

      // Use the first generated white background image as source for decor transformation
      const whiteBackgroundImage = generatedImages[0];
      const decorPrompt = DECOR_PROMPTS[decorType]?.[lang] || DECOR_PROMPTS[decorType]?.en;
      
      const prompt = lang === 'fr'
        ? `TRANSFORME cette image de produit sur fond blanc en une image lifestyle professionnelle.

INSTRUCTIONS CRITIQUES:
- PRENDS ce produit (${productTitle}) EXACTEMENT comme il apparaît dans l'image
- SUPPRIME le fond blanc et REMPLACE-LE par un environnement réaliste: ${decorPrompt}
- Le produit doit être IDENTIQUE - même design, même couleur, même orientation
- Intégration NATURELLE et RÉALISTE dans l'environnement
- Éclairage naturel correspondant à la pièce, ombres cohérentes
- Format 16:9 paysage, haute résolution
- Composition harmonieuse mettant en valeur le produit au centre
- Pas de texte, pas de watermark
- Le produit ne doit PAS être dupliqué ou modifié`
        : `TRANSFORM this white background product image into a professional lifestyle image.

CRITICAL INSTRUCTIONS:
- TAKE this product (${productTitle}) EXACTLY as it appears in the image
- REMOVE the white background and REPLACE it with a realistic environment: ${decorPrompt}
- The product must be IDENTICAL - same design, same color, same orientation
- NATURAL and REALISTIC integration into the environment
- Natural lighting matching the room, coherent shadows
- 16:9 landscape format, high resolution
- Harmonious composition highlighting the product in center
- No text, no watermark
- The product must NOT be duplicated or modified`;

      try {
        // For decor, we need to use the generated image which is base64
        const imageBase64 = whiteBackgroundImage.url.startsWith('data:') 
          ? whiteBackgroundImage.url.split(',')[1]
          : await fetchImageAsBase64(whiteBackgroundImage.url);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { 
                    inlineData: {
                      mimeType: "image/png",
                      data: imageBase64
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"]
            }
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const parts = data.candidates?.[0]?.content?.parts || [];
          
          for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith('image/')) {
              generatedImages.push({
                url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                type: 'decor',
                label: IMAGE_TYPE_LABELS.decor[lang]
              });
              console.log(`✅ Generated decor image via Gemini Direct`);
              break;
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error generating decor image:`, error);
      }
    } else if (includeDecor && generatedImages.length === 0) {
      console.log(`⚠️ Cannot generate decor - no white background images generated first`);
    }

    console.log(`📦 Total images generated: ${generatedImages.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        images: generatedImages,
        metadata: {
          productId,
          productTitle,
          totalGenerated: generatedImages.length,
          requestedTypes: imageTypes,
          includeDecor,
          decorType
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Generate AI product images error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to fetch image and convert to base64 (chunked to avoid stack overflow)
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Process in chunks to avoid stack overflow with large images
  const CHUNK_SIZE = 8192;
  let binary = '';
  for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
    const chunk = uint8Array.subarray(i, Math.min(i + CHUNK_SIZE, uint8Array.length));
    binary += String.fromCharCode(...chunk);
  }
  
  return btoa(binary);
}
