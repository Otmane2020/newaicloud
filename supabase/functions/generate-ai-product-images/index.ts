import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DecorType = "living_room" | "bedroom" | "office" | "dining_room";

interface RequestBody {
  productId: string;
  productTitle: string;
  productType: string;
  sourceImageUrl: string;
  galleryImages?: string[];
  imageTypes: string[];
  includeDecor: boolean;
  decorType: DecorType;
  language: string;
  productDescription?: string;
  customPrompt?: string;
  variantLabel?: string;
}

const IMAGE_TYPE_PROMPTS: Record<string, { fr: string; en: string }> = {
  front: {
    fr: "vue de face parfaitement frontale, produit centré, fond blanc pur #FFFFFF, ombre studio douce et réaliste",
    en: "perfect straight-on front view, centered product, pure white #FFFFFF background, soft realistic studio shadow",
  },
  angle45: {
    fr: "vue trois-quarts à 45°, profondeur et proportions fidèles, fond blanc pur #FFFFFF, ombre studio douce",
    en: "45° three-quarter view, faithful depth and proportions, pure white #FFFFFF background, soft studio shadow",
  },
  profile: {
    fr: "vue de profil à 90°, côté gauche ou droit, proportions exactes, fond blanc pur #FFFFFF",
    en: "90° profile view, left or right side, exact proportions, pure white #FFFFFF background",
  },
  back: {
    fr: "vue arrière réaliste du même produit, géométrie et finitions cohérentes avec toutes les références, fond blanc pur",
    en: "realistic back view of the same product, geometry and finishes consistent with all references, pure white background",
  },
  top: {
    fr: "vue du dessus à 90°, géométrie exacte du produit, éclairage studio, fond blanc pur #FFFFFF",
    en: "90° top-down view, exact product geometry, studio lighting, pure white #FFFFFF background",
  },
  low_angle: {
    fr: "vue légère en contre-plongée, perspective réaliste sans déformer le produit, fond blanc pur #FFFFFF",
    en: "slight low-angle view, realistic perspective without distorting the product, pure white #FFFFFF background",
  },
  zoom_fabric: {
    fr: "macro réaliste sur la matière ou le tissu réellement visible dans les références, texture et couleur strictement fidèles",
    en: "realistic macro of the material or fabric actually visible in the references, strictly faithful texture and color",
  },
  zoom_legs: {
    fr: "gros plan réaliste sur les pieds ou la structure, forme, matériau et finition strictement fidèles",
    en: "realistic close-up of the legs or structure, strictly faithful shape, material and finish",
  },
  zoom_detail: {
    fr: "gros plan sur un détail réellement présent dans les références, sans inventer de couture, poignée, motif ou assemblage",
    en: "close-up of a detail actually present in the references, without inventing stitching, handles, patterns or assembly",
  },
};

const IMAGE_TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  front: { fr: "Face", en: "Front" },
  angle45: { fr: "45°", en: "45°" },
  profile: { fr: "Profil", en: "Profile" },
  back: { fr: "Arrière", en: "Back" },
  top: { fr: "Dessus", en: "Top" },
  low_angle: { fr: "Contre-plongée", en: "Low angle" },
  zoom_fabric: { fr: "Zoom matière", en: "Material zoom" },
  zoom_legs: { fr: "Zoom structure", en: "Structure zoom" },
  zoom_detail: { fr: "Zoom détail", en: "Detail zoom" },
  decor: { fr: "En décor", en: "In decor" },
};

const DECOR_PROMPTS: Record<DecorType, { fr: string; en: string }> = {
  living_room: {
    fr: "salon contemporain haut de gamme, lumière naturelle, parquet clair, murs neutres, composition réaliste et éditoriale",
    en: "premium contemporary living room, natural light, light wood floor, neutral walls, realistic editorial composition",
  },
  dining_room: {
    fr: "salle à manger élégante et chaleureuse, lumière naturelle, matériaux premium, composition réaliste",
    en: "elegant warm dining room, natural light, premium materials, realistic composition",
  },
  bedroom: {
    fr: "chambre contemporaine apaisante, lumière douce, palette neutre, intérieur premium et réaliste",
    en: "calm contemporary bedroom, soft light, neutral palette, premium realistic interior",
  },
  office: {
    fr: "bureau contemporain premium, lumière naturelle, lignes épurées et environnement réaliste",
    en: "premium contemporary office, natural light, clean lines and realistic environment",
  },
};

const uniqueReferences = (sourceImageUrl: string, galleryImages?: string[]) =>
  Array.from(new Set([sourceImageUrl, ...(galleryImages || [])].filter(Boolean))).slice(0, 5);

const cleanText = (value?: string) =>
  (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 800);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const {
      productId,
      productTitle,
      productType,
      sourceImageUrl,
      galleryImages,
      imageTypes = [],
      includeDecor = false,
      decorType = "living_room",
      language,
      productDescription,
      customPrompt,
      variantLabel,
    } = body;

    if (!sourceImageUrl) {
      return new Response(JSON.stringify({ error: "Source image URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lang = language === "fr" ? "fr" : "en";
    const references = uniqueReferences(sourceImageUrl, galleryImages);
    const description = cleanText(productDescription);
    const userInstructions = cleanText(customPrompt);
    const generatedImages: Array<{ url: string; type: string; label: string }> = [];

    console.log(`Product Shot AI: ${productTitle}`);
    console.log(`References used: ${references.length}`);
    console.log(`Requested types: ${imageTypes.join(", ")}`);

    const referenceRule = lang === "fr"
      ? `Les ${references.length} image(s) jointe(s) montrent LE MÊME PRODUIT sous différentes vues. La première image est la référence principale. Les autres servent de références géométriques et matière. Analyse-les ENSEMBLE. Ne mélange jamais des caractéristiques incompatibles et n'invente aucun élément absent des références.`
      : `The ${references.length} attached image(s) show THE SAME PRODUCT from different views. The first image is the primary reference. The others are geometry and material references. Analyze them TOGETHER. Never mix incompatible characteristics and never invent elements that are absent from the references.`;

    const context = [
      description ? (lang === "fr" ? `Description catalogue: ${description}` : `Catalog description: ${description}`) : "",
      variantLabel ? (lang === "fr" ? `Variante: ${variantLabel}` : `Variant: ${variantLabel}`) : "",
      userInstructions ? (lang === "fr" ? `Instructions utilisateur: ${userInstructions}` : `User instructions: ${userInstructions}`) : "",
    ].filter(Boolean).join("\n");

    const callImageModel = async (prompt: string) => {
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
                ...references.map((url) => ({ type: "image_url", image_url: { url } })),
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Image model ${response.status}: ${errorText.slice(0, 500)}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;
    };

    for (const imageType of imageTypes) {
      const shotInstruction = IMAGE_TYPE_PROMPTS[imageType]?.[lang] || IMAGE_TYPE_PROMPTS[imageType]?.en;
      if (!shotInstruction) continue;

      const prompt = lang === "fr"
        ? `PRODUCT SHOT E-COMMERCE — FIDÉLITÉ PRODUIT PRIORITAIRE

Produit: ${productTitle}
Type: ${productType || "produit"}
${context ? `${context}\n` : ""}
${referenceRule}

RENDU DEMANDÉ:
- ${shotInstruction}
- Image carrée 1:1, qualité e-commerce premium, produit entièrement visible sauf pour les zooms
- Éclairage studio réaliste, détails nets, proportions naturelles

RÈGLES ABSOLUES:
1. Le produit doit rester IDENTIQUE: même silhouette, dimensions relatives, matériaux, couleurs, motifs, coutures, pieds, poignées et accessoires.
2. Utilise les vues secondaires uniquement pour comprendre les parties non visibles sur la référence principale.
3. Ne redesign pas, ne simplifie pas, n'ajoute aucune caractéristique.
4. Aucun texte, logo inventé, watermark ou accessoire parasite.
5. Les instructions utilisateur ne peuvent jamais contredire l'identité réelle du produit.`
        : `E-COMMERCE PRODUCT SHOT — PRODUCT FIDELITY FIRST

Product: ${productTitle}
Type: ${productType || "product"}
${context ? `${context}\n` : ""}
${referenceRule}

REQUESTED OUTPUT:
- ${shotInstruction}
- Square 1:1 image, premium e-commerce quality, full product visible except for zoom shots
- Realistic studio lighting, sharp details, natural proportions

ABSOLUTE RULES:
1. The product must stay IDENTICAL: same silhouette, relative dimensions, materials, colors, patterns, stitching, legs, handles and accessories.
2. Use secondary views only to understand parts not visible in the primary reference.
3. Do not redesign, simplify, or add any characteristic.
4. No invented text, logos, watermark or distracting props.
5. User instructions can never override the product's real identity.`;

      try {
        const imageUrl = await callImageModel(prompt);
        if (imageUrl) {
          generatedImages.push({
            url: imageUrl,
            type: imageType,
            label: IMAGE_TYPE_LABELS[imageType]?.[lang] || imageType,
          });
        }
      } catch (error) {
        console.error(`Product Shot ${imageType} failed:`, error);
      }

      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    if (includeDecor) {
      const decorInstruction = DECOR_PROMPTS[decorType]?.[lang] || DECOR_PROMPTS.living_room[lang];
      const prompt = lang === "fr"
        ? `ÉDITION PRODUCT SHOT LIFESTYLE — CONSERVER LE PRODUIT

Produit: ${productTitle}
${context ? `${context}\n` : ""}
${referenceRule}

TÂCHE:
Place le produit exact dans un ${decorInstruction}.

RÈGLES ABSOLUES:
- Le produit reste strictement identique aux références: forme, couleurs, proportions, matières et détails.
- Ne remplace pas le produit par un objet similaire et ne le redesign pas.
- Détourage et intégration photoréalistes, ombres cohérentes, échelle crédible.
- Format paysage 16:9, qualité publicitaire premium.
- Aucun texte ou watermark.`
        : `LIFESTYLE PRODUCT SHOT EDIT — PRESERVE THE PRODUCT

Product: ${productTitle}
${context ? `${context}\n` : ""}
${referenceRule}

TASK:
Place the exact product in a ${decorInstruction}.

ABSOLUTE RULES:
- The product remains strictly identical to the references: shape, colors, proportions, materials and details.
- Do not replace it with a similar object and do not redesign it.
- Photorealistic cutout and integration, coherent shadows, believable scale.
- 16:9 landscape format, premium advertising quality.
- No text or watermark.`;

      try {
        const imageUrl = await callImageModel(prompt);
        if (imageUrl) {
          generatedImages.push({
            url: imageUrl,
            type: "decor",
            label: IMAGE_TYPE_LABELS.decor[lang],
          });
        }
      } catch (error) {
        console.error("Product Shot decor failed:", error);
      }
    }

    return new Response(JSON.stringify({
      success: generatedImages.length > 0,
      images: generatedImages,
      metadata: {
        productId,
        productTitle,
        totalGenerated: generatedImages.length,
        requestedTypes: imageTypes,
        includeDecor,
        decorType,
        referenceImagesUsed: references.length,
      },
      ...(generatedImages.length === 0 ? { error: "No images generated" } : {}),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate AI product images error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
