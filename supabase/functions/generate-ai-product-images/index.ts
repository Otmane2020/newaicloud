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
    fr: "Vue de face du produit, angle frontal direct, fond blanc pur (#FFFFFF), AVEC une ombre portée douce et réaliste sous le produit (style Google Shopping), ombre légère diffuse vers le bas",
    en: "Front view of the product, direct frontal angle, pure white background (#FFFFFF), WITH a soft realistic drop shadow under the product (Google Shopping style), light diffuse shadow downward"
  },
  angle45: {
    fr: "Vue à 45 degrés du produit (vue trois-quarts), montrant profondeur et dimension, fond blanc pur (#FFFFFF), AVEC une ombre portée douce et réaliste sous le produit (style Google Shopping)",
    en: "45 degree angle view of the product (three-quarter view), showing depth and dimension, pure white background (#FFFFFF), WITH a soft realistic drop shadow under the product (Google Shopping style)"
  },
  profile: {
    fr: "Vue de profil du produit (côté gauche ou droit), angle 90 degrés, fond blanc pur (#FFFFFF), AVEC une ombre portée douce et réaliste sous le produit (style Google Shopping), ombre légère diffuse",
    en: "Profile view of the product (left or right side), 90 degree angle, pure white background (#FFFFFF), WITH a soft realistic drop shadow under the product (Google Shopping style), light diffuse shadow"
  },
  back: {
    fr: "Vue arrière du produit, montrant le dos/arrière, fond blanc pur avec ombre portée légère",
    en: "Back view of the product, showing the rear, pure white background with light drop shadow"
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const lang = language === 'fr' ? 'fr' : 'en';
    const generatedImages: Array<{ url: string; type: string; label: string }> = [];

    console.log(`🖼️ Generating AI images for product: ${productTitle}`);
    console.log(`📷 Source image: ${sourceImageUrl}`);
    console.log(`🎯 Image types requested: ${imageTypes.join(', ')}`);
    console.log(`🏠 Include decor: ${includeDecor} (${decorType})`);

    // Generate white background variant images
    for (const imageType of imageTypes) {
      const typePrompt = IMAGE_TYPE_PROMPTS[imageType]?.[lang] || IMAGE_TYPE_PROMPTS[imageType]?.en;
      if (!typePrompt) continue;

      console.log(`🎨 Generating ${imageType} image...`);

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
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image-preview",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: sourceImageUrl } }
                ]
              }
            ],
            modalities: ["image", "text"]
          }),
        });

        if (!response.ok) {
          console.error(`❌ Error generating ${imageType}:`, response.status);
          continue;
        }

        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (imageUrl) {
          generatedImages.push({
            url: imageUrl,
            type: imageType,
            label: IMAGE_TYPE_LABELS[imageType]?.[lang] || imageType
          });
          console.log(`✅ Generated ${imageType} image`);
        }
      } catch (error) {
        console.error(`❌ Error generating ${imageType}:`, error);
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Generate decor image FROM the first generated white background image (not duplicating source)
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
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image-preview",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: whiteBackgroundImage.url } }
                ]
              }
            ],
            modalities: ["image", "text"]
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

          if (imageUrl) {
            generatedImages.push({
              url: imageUrl,
              type: 'decor',
              label: IMAGE_TYPE_LABELS.decor[lang]
            });
            console.log(`✅ Generated decor image from white background`);
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
