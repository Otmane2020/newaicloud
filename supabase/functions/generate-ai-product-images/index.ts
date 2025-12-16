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
  imageTypes: string[];
  includeDecor: boolean;
  decorType: 'living_room' | 'bedroom' | 'office' | 'dining_room';
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

    // Prioritize profile view as primary image
    const sortedImageTypes = [...imageTypes].sort((a, b) => {
      if (a === 'profile') return -1;
      if (b === 'profile') return 1;
      if (a === 'front') return -1;
      if (b === 'front') return 1;
      return 0;
    });

    console.log(`🎯 Sorted image types (profile priority): ${sortedImageTypes.join(', ')}`);

    // Generate white background variant images using Lovable AI
    for (const imageType of sortedImageTypes) {
      const typePrompt = IMAGE_TYPE_PROMPTS[imageType]?.[lang] || IMAGE_TYPE_PROMPTS[imageType]?.en;
      if (!typePrompt) continue;

      console.log(`🎨 Generating ${imageType} image via Lovable AI...`);

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
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
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
          const errorText = await response.text();
          console.error(`❌ Error generating ${imageType}:`, response.status, errorText);
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
          console.log(`✅ Generated ${imageType} image via Lovable AI`);
        } else {
          console.log(`⚠️ No image returned for ${imageType}`);
        }
      } catch (error) {
        console.error(`❌ Error generating ${imageType}:`, error);
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Generate decor image using the ORIGINAL source image to preserve product fidelity
    if (includeDecor) {
      console.log(`🏠 Generating decor image (${decorType}) from ORIGINAL source image to preserve product...`);

      const decorPrompt = DECOR_PROMPTS[decorType]?.[lang] || DECOR_PROMPTS[decorType]?.en;
      
      const prompt = lang === 'fr'
        ? `ÉDITION D'IMAGE - NE PAS RÉGÉNÉRER LE PRODUIT

TÂCHE: Prends CE produit EXACT de l'image et place-le dans un décor réaliste.

RÈGLES ABSOLUES:
1. COPIE le produit PIXEL PAR PIXEL - même forme, même couleur, même texture, même proportions
2. NE MODIFIE RIEN du produit - pas de redesign, pas de changement de couleur, pas de simplification
3. SUPPRIME uniquement le fond et REMPLACE par: ${decorPrompt}
4. Le produit doit être la COPIE EXACTE de celui dans l'image source

TECHNIQUE:
- Détourage précis du produit original
- Placement naturel dans l'environnement
- Ajout d'ombres cohérentes avec l'éclairage de la pièce
- Le produit (${productTitle}) reste au centre de l'image
- Format paysage 16:9, haute qualité

INTERDIT:
- Modifier le design du produit
- Changer les couleurs
- Simplifier ou styliser le produit
- Générer un produit "similaire" - il doit être IDENTIQUE`
        : `IMAGE EDITING - DO NOT REGENERATE THE PRODUCT

TASK: Take THIS EXACT product from the image and place it in a realistic decor.

ABSOLUTE RULES:
1. COPY the product PIXEL BY PIXEL - same shape, same color, same texture, same proportions
2. DO NOT MODIFY anything on the product - no redesign, no color change, no simplification
3. ONLY REMOVE the background and REPLACE with: ${decorPrompt}
4. The product must be the EXACT COPY of the one in the source image

TECHNIQUE:
- Precise cutout of the original product
- Natural placement in the environment
- Add shadows coherent with room lighting
- The product (${productTitle}) stays in the center of the image
- 16:9 landscape format, high quality

FORBIDDEN:
- Modifying product design
- Changing colors
- Simplifying or stylizing the product
- Generating a "similar" product - it must be IDENTICAL`;

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image-preview",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  // Use ORIGINAL source image to preserve product fidelity
                  { type: "image_url", image_url: { url: sourceImageUrl } }
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
            console.log(`✅ Generated decor image via Lovable AI (using original source)`);
          }
        } else {
          console.error(`❌ Error generating decor:`, response.status, await response.text());
        }
      } catch (error) {
        console.error(`❌ Error generating decor image:`, error);
      }
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
