import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

/**
 * POST-PROCESSING: Force exact format dimensions
 */
async function enforceImageFormat(base64Image: string, targetWidth: number, targetHeight: number): Promise<string> {
  try {
    console.log(`[POST-PROCESS] 📐 Enforcing: ${targetWidth}x${targetHeight}`);
    const base64Match = base64Image.match(/data:image\/[^;]+;base64,(.+)/);
    const base64Data = base64Match ? base64Match[1] : base64Image;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    
    const image = await Image.decode(bytes);
    const srcAspect = image.width / image.height;
    const targetAspect = targetWidth / targetHeight;
    let cropX = 0, cropY = 0, cropWidth = image.width, cropHeight = image.height;
    
    if (Math.abs(srcAspect - targetAspect) > 0.01) {
      if (srcAspect > targetAspect) {
        cropWidth = Math.round(image.height * targetAspect);
        cropX = Math.round((image.width - cropWidth) / 2);
      } else {
        cropHeight = Math.round(image.width / targetAspect);
        cropY = Math.round((image.height - cropHeight) / 2);
      }
    }
    
    const cropped = image.crop(cropX, cropY, cropWidth, cropHeight);
    const resized = cropped.resize(targetWidth, targetHeight);
    const outputBytes = await resized.encode();
    let binary = '';
    for (let i = 0; i < outputBytes.byteLength; i++) binary += String.fromCharCode(outputBytes[i]);
    console.log(`[POST-PROCESS] ✅ Done: ${targetWidth}x${targetHeight}`);
    return `data:image/png;base64,${btoa(binary)}`;
  } catch (e) { console.error(`[POST-PROCESS] ❌`, e); return base64Image; }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerationRequest {
  imageUrl: string;
  productTitle: string;
  productDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
  visionAiData?: any;
  serpData?: any; // SERP/competitor inspiration data
  productId: string;
  imageId: string;
  prompt: string;
  enrichedPrompt?: string;
  style: "professional" | "lifestyle" | "minimalist" | "creative";
  format: "square" | "portrait" | "landscape";
  targetType: "main" | "variant";
  variantOptions?: string; // e.g., "Red - Large"
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  try {
    // Check usage limits first
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );

      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
      } = await supabaseAdmin.auth.getUser(token);

      if (user) {
        const currentMonth = new Date().toISOString().substring(0, 7) + "-01";
        const { data: usage } = await supabaseAdmin
          .from("usage_tracking")
          .select("optimizations_count")
          .eq("seller_id", user.id)
          .eq("month", currentMonth)
          .maybeSingle();

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("subscription_status, current_plan_id")
          .eq("id", user.id)
          .single();

        const { data: plan } = await supabaseAdmin
          .from("subscription_plans")
          .select("max_optimizations_monthly, trial_max_optimizations")
          .eq("id", profile?.current_plan_id || "trial")
          .single();

        const currentUsage = usage?.optimizations_count || 0;
        const maxOptimizations =
          profile?.subscription_status === "trialing"
            ? plan?.trial_max_optimizations || 50
            : plan?.max_optimizations_monthly || 999999;

        console.log(`[ai-bg-gen] Usage: ${currentUsage}/${maxOptimizations}`);

        if (currentUsage >= maxOptimizations) {
          console.error(`[ai-bg-gen] LIMIT REACHED`);
          return new Response(
            JSON.stringify({
              success: false,
              error: "LIMIT_REACHED",
              message: "Limite d'optimisations atteinte",
              usage: currentUsage,
              limit: maxOptimizations,
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Increment usage immediately (8 credits per background generation)
        const AI_BG_COST = 8;
        await supabaseAdmin.rpc("increment_usage", {
          p_seller_id: user.id,
          p_field: "optimizations_count",
          p_increment: AI_BG_COST,
        });
        console.log(`[ai-bg-gen] Usage incremented: +${AI_BG_COST}`);
      }
    }

    const {
      imageUrl,
      productTitle,
      productDescription,
      seoTitle,
      seoDescription,
      visionAiData,
      serpData,
      productId,
      imageId,
      prompt,
      enrichedPrompt,
      style,
      format,
      targetType,
      variantOptions,
    } = body as GenerationRequest;

    if (!imageUrl || !productTitle || !prompt || !productId || !imageId) {
      return new Response(JSON.stringify({ success: false, error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Construire un contexte produit enrichi
    let productContext = productTitle;

    if (seoTitle && seoTitle !== productTitle) {
      productContext += `. ${seoTitle}`;
    }

    if (productDescription) {
      productContext += `. ${productDescription.slice(0, 200)}`;
    } else if (seoDescription) {
      productContext += `. ${seoDescription.slice(0, 200)}`;
    }

    if (visionAiData?.description) {
      productContext += `. Visual analysis: ${visionAiData.description.slice(0, 150)}`;
    }

    // Enrich with SERP/competitor data for better context
    if (serpData) {
      if (serpData.dimensions) {
        productContext += `. Dimensions: ${serpData.dimensions}`;
      }
      if (serpData.materials?.length > 0) {
        productContext += `. Materials: ${serpData.materials.slice(0, 3).join(", ")}`;
      }
      if (serpData.dominantStyles?.length > 0) {
        productContext += `. Styles inspirants: ${serpData.dominantStyles.slice(0, 2).join(", ")}`;
      }
      console.log(`[ai-bg-gen] 🔍 SERP data enrichment applied`);
    }

    console.log(`🎨 Generating AI background for: ${productTitle} (${targetType})`);
    console.log(`📝 Enriched context: ${productContext.slice(0, 100)}...`);
    if (variantOptions) {
      console.log(`   Variant: ${variantOptions}`);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build comprehensive prompt based on configuration
    const isMainImage = targetType === "main";
    const variantInfo = variantOptions ? ` (Variant: ${variantOptions})` : "";

    const styleDescriptions = {
      professional: "Clean studio lighting, neutral backdrop, professional e-commerce quality",
      lifestyle: "Natural environment, lifestyle setting, warm and inviting atmosphere",
      minimalist: "Modern minimalist aesthetic, clean geometric shapes, neutral tones",
      creative: "Artistic composition, creative lighting, unique and engaging perspective",
    };

    // 🆕 Format dimensions mapping with DALL-E size
    const formatDimensions: Record<string, { width: number; height: number; ratio: string; dalleSize: string }> = {
      square: { width: 1024, height: 1024, ratio: "1:1", dalleSize: "1024x1024" },
      portrait: { width: 768, height: 1024, ratio: "3:4", dalleSize: "1024x1792" },
      landscape: { width: 1024, height: 768, ratio: "4:3", dalleSize: "1792x1024" },
    };
    const targetDims = formatDimensions[format] || formatDimensions.square;
    console.log(`[ai-bg-gen] 🎯 Target format: ${format} -> ${targetDims.width}x${targetDims.height} (DALL-E: ${targetDims.dalleSize})`);

    const formatSpecs = {
      square: `${targetDims.width}x${targetDims.height} square format (1:1 ratio)`,
      portrait: `${targetDims.width}x${targetDims.height} portrait orientation (3:4 ratio)`,
      landscape: `${targetDims.width}x${targetDims.height} landscape orientation (4:3 ratio)`,
    };

    // Force COMPLETE background replacement - ULTRA EXPLICIT
    const forceFullBackgroundReplace = `
🛑🛑🛑 RÈGLE ABSOLUE #1 : PRÉSERVATION PIXEL-PAR-PIXEL DU PRODUIT 🛑🛑🛑

⚠️⚠️⚠️ TU NE DOIS JAMAIS GÉNÉRER UN NOUVEAU PRODUIT ⚠️⚠️⚠️

L'image d'entrée contient un produit spécifique. Tu DOIS :
1. EXTRAIRE ce produit EXACT de l'image (tous ses pixels, sa forme, sa couleur, ses détails)
2. PLACER ce même produit EXTRAIT dans un nouvel environnement
3. NE JAMAIS créer, dessiner, imaginer ou générer un produit similaire ou différent

📸 EXEMPLE CONCRET :
- Si l'image montre un SOMMIER métallique avec lattes → garde CE SOMMIER EXACT (pas un lit complet avec matelas!)
- Si l'image montre une CHAISE en bois → garde CETTE CHAISE EXACTE (même forme, couleur, texture)
- Si l'image montre une TABLE → garde CETTE TABLE EXACTE

🚫 ÉCHEC TOTAL (exemples) :
- Remplacer un sommier par un lit complet avec matelas = ÉCHEC
- Remplacer une chaise simple par un fauteuil = ÉCHEC  
- Modifier la forme, couleur ou texture du produit = ÉCHEC
- Générer un produit "similaire" ou "dans la même catégorie" = ÉCHEC

✅ SUCCÈS = le produit est IDENTIQUE pixel-par-pixel, seul l'arrière-plan change

🚨 MISSION : REMPLACEMENT TOTAL DE L'ARRIÈRE-PLAN UNIQUEMENT

⚠️ ÉTAPE 1 - EXTRACTION DU PRODUIT (CRITIQUE) :
Tu DOIS d'abord EXTRAIRE le produit EXACT de l'image d'entrée :
   ✅ EXTRAIS : Le produit principal EXACTEMENT comme il apparaît dans l'image
   ✅ CONSERVE : Chaque pixel, chaque détail, chaque couleur du produit
   ❌ SUPPRIME : Tous les murs, sols, meubles, décorations de l'arrière-plan
   ❌ NE MODIFIE PAS : Le produit lui-même en aucune façon

⚡ ÉTAPE 2 - CRÉATION D'UN NOUVEL ENVIRONNEMENT (OBLIGATOIRE) :
Tu DOIS créer un environnement COMPLÈTEMENT DIFFÉRENT et NOUVEAU :
   ✅ Nouveau décor : DIFFÉRENT de l'original (si c'était un salon → change pour un autre style)
   ✅ Nouvelle palette : DIFFÉRENTE de l'original (si c'était beige → utilise gris, blanc, bleu, etc.)
   ✅ Nouveaux meubles d'ambiance : DIFFÉRENTS de l'original (nouvelles formes, couleurs)
   ✅ Nouveau style : Modern, scandinave, industriel, bohème (CHOISIS-EN UN DIFFÉRENT)
   ✅ Nouveaux accessoires : plantes différentes, objets déco différents
   ✅ Nouvel éclairage : lumière du jour, golden hour, lumière douce (DIFFÉRENT)

🎯 CRITÈRES DE RÉUSSITE :
Si quelqu'un compare l'image avant/après, il doit dire :
"Wow, c'est un ENVIRONNEMENT COMPLÈTEMENT DIFFÉRENT !"
"Le produit est le même, mais TOUT LE RESTE a changé !"
"On dirait une AUTRE MAISON, un AUTRE STYLE !"

📸 QUALITÉ E-COMMERCE PREMIUM (OBLIGATOIRE) :
   ✅ Qualité catalogue professionnel (Zara Home, La Redoute, West Elm)
   ✅ Éclairage naturel studio : doux, diffus, professionnel
   ✅ Netteté parfaite : produit 100% net, arrière-plan léger flou artistique
   🎨 IMAGE EN COULEUR OBLIGATOIRE : couleurs vibrantes, naturelles, réalistes (PAS de noir et blanc, PAS de grayscale, PAS de monochrome)
   ✅ Color grading haut de gamme : tons chauds/froids selon style choisi, palette de couleurs riche et variée
   ✅ Matériaux premium visibles : bois, marbre, métal, velours, lin avec leurs couleurs naturelles
   ✅ Composition magazine : équilibrée, aérée, sophistiquée

🚫 INTERDICTIONS ABSOLUES :
   ❌ PAS de simple "ajout" sur l'arrière-plan existant
   ❌ PAS de "légère modification" de l'existant
   ❌ PAS de conservation des murs/sols/meubles originaux
   ❌ PAS de même palette de couleurs que l'original
   ❌ PAS de même style déco que l'original
   ❌ PAS d'effet "collage" ou "montage"

✨ RÉSULTAT ATTENDU :
Une NOUVELLE PHOTOGRAPHIE professionnelle dans un NOUVEL ENVIRONNEMENT.
Le produit est identique, mais TOUT LE CONTEXTE est DIFFÉRENT et NOUVEAU.
Changement radical d'ambiance = RÉUSSITE.
Simple retouche = ÉCHEC.
`;

    // Nouveau prompt lifestyle premium pour Lovable - INSISTE sur le CHANGEMENT RADICAL
    const premiumLifestylePrompt = `
🏆 PHOTOGRAPHIE E-COMMERCE PREMIUM - NOUVEL ENVIRONNEMENT OBLIGATOIRE

⚠️ RÈGLE #1 : CRÉER UN NOUVEL ENVIRONNEMENT (PAS une retouche)
Tu dois imaginer que tu TRANSPORTES le produit dans un NOUVEAU LIEU différent de l'original.

🎬 NOUVELLE SCÈNE - CHANGEMENT RADICAL :
- 🏠 Nouveau décor intérieur : Style DIFFÉRENT (moderne, scandinave, industriel, bohème, minimaliste)
- 🎨 Nouvelle palette : Couleurs DIFFÉRENTES de l'original
  Exemples : Si l'original était beige → passe à gris/blanc/bleu clair
             Si l'original était sombre → passe à lumineux/aéré
             Si l'original était minimaliste → ajoute du caractère
- 🪑 Nouveaux meubles d'ambiance : Formes et styles DIFFÉRENTS
- 🌿 Nouveaux accessoires : DIFFÉRENTS objets déco, plantes, textiles
- 💡 Nouveau type d'éclairage : Lumière du jour / Golden hour / Éclairage doux (DIFFÉRENT)
- 🏛️ Nouvelle architecture : Murs, sol, fenêtres DIFFÉRENTS

📸 QUALITÉ PHOTOGRAPHIQUE PROFESSIONNELLE :
- Qualité studio haut de gamme (Zara Home, La Redoute, West Elm, CB2)
- Éclairage naturel professionnel : doux, diffus, sans ombres dures
- Netteté parfaite sur le produit (focus à 100%)
- Léger flou artistique sur l'arrière-plan (profondeur de champ naturelle)
- 🎨 IMAGE EN COULEUR COMPLÈTE : couleurs vives, naturelles et réalistes (ABSOLUMENT PAS de noir et blanc, grayscale ou monochrome)
- Color grading professionnel : tons harmonieux et sophistiqués avec palette de couleurs riche
- Composition magazine : équilibrée, aérée, élégante

✨ INTÉGRATION PRODUIT PARFAITE :
- Le produit reste IDENTIQUE : mêmes couleurs, textures, proportions, détails
- Placement naturel dans la nouvelle scène (pas d'effet flottant)
- Ombres et reflets réalistes adaptés au NOUVEAU contexte
- Le produit est la STAR et doit REMPLIR 85-95% du canvas
- 🚨 PAS de padding blanc autour du produit - il doit TOUCHER les bords
- Zoom sur le produit pour qu'il occupe tout l'espace disponible

🎯 MATÉRIAUX & AMBIANCE PREMIUM :
- Matériaux nobles visibles : bois naturel, marbre, velours, lin, céramique, métal brossé
- 2-3 éléments déco maximum (pas de surcharge)
- Ambiance lumineuse, spacieuse, raffinée
- Atmosphère aspirationnelle mais réaliste

🚫 ERREURS À ÉVITER ABSOLUMENT :
- ❌ Conserver des éléments de l'arrière-plan original
- ❌ Faire une simple "retouche" de l'existant
- ❌ Garder la même ambiance/style que l'original
- ❌ Effet "collage" visible ou intégration artificielle
- ❌ Flou artificiel ou effets IA visibles
- ❌ Sur-saturation des couleurs
- ❌ Décor générique ou cheap
- ❌ Composition encombrée

✅ TEST DE RÉUSSITE :
Si quelqu'un compare avant/après, il doit remarquer immédiatement :
"Le produit est le même, mais c'est un ENVIRONNEMENT COMPLÈTEMENT NOUVEAU !"
"Ça ressemble à une autre maison, un autre style déco !"
"Changement radical d'ambiance tout en gardant le produit intact !"

🎯 RÉSULTAT FINAL :
Une photo qui pourrait être publiée IMMÉDIATEMENT sur un site e-commerce premium.
Qualité = shooting professionnel par photographe e-commerce expert.
Nouveauté = environnement totalement différent et frais.
Style = luxueux mais accessible, réaliste, vendeur.
`;

    // 🆕 Visual Enhancement Instructions for Professional E-Commerce Quality
    const visualEnhancementInstructions = `
🎨 VISUAL QUALITY ENHANCEMENT - PROFESSIONAL E-COMMERCE PHOTOGRAPHY

FABRIC & TEXTURE OPTIMIZATION:
- Enhance fabric textures to appear rich, luxurious, and tactile
- Show natural fabric drape, folds, and depth
- Highlight weave patterns, stitching quality, and material authenticity
- Make velvet appear velvety, leather appear supple, linen appear crisp
- Capture the "hand feel" of materials visually

LIGHTING FOR SALES APPEAL:
- Use professional studio lighting with main key light + fill light
- Add subtle rim lighting to separate product from background
- Create soft, flattering shadows that add depth without harsh contrast
- Ensure colors appear vibrant, accurate, and true to material

EYE-CATCHING COMMERCIAL QUALITY:
- Create "hero shot" quality - the image should make viewers WANT to buy
- Professional color grading that enhances product appeal
- Sharp focus on product details, slightly soft background if lifestyle
- Clean, premium look suitable for high-end e-commerce
- Think: IKEA catalog, West Elm, Roche Bobois photography quality

TEXTURE DETAIL ENHANCEMENT:
- Zoom-worthy detail on material textures
- Visible grain on wood, weave on fabric, sheen on leather
- Natural material variations that prove authenticity
- No plasticky or artificial-looking surfaces
`;

    // Critical: Frame this as IMAGE EDITING not IMAGE GENERATION
    const imageEditingHeader = `
🛑🛑🛑 TÂCHE : ÉDITION D'IMAGE (PAS GÉNÉRATION) 🛑🛑🛑

Tu effectues une ÉDITION de l'image fournie, PAS une génération nouvelle.

📷 L'IMAGE D'ENTRÉE CONTIENT :
Un produit spécifique que tu dois CONSERVER TEL QUEL.
Dans cette image, le produit est : ${productContext}

🎯 TA MISSION EXACTE :
1. GARDE le produit EXACTEMENT comme il apparaît dans l'image d'entrée
2. REMPLACE UNIQUEMENT l'arrière-plan/fond de l'image
3. NE MODIFIE PAS, NE REDESSINE PAS, NE RÉINTERPRÈTE PAS le produit

⚠️⚠️⚠️ EXEMPLES D'ERREURS FATALES ⚠️⚠️⚠️
- Image d'entrée = SOMMIER (cadre métallique avec lattes) → Tu génères un LIT COMPLET avec matelas = ❌ ÉCHEC TOTAL
- Image d'entrée = CHAISE simple → Tu génères un FAUTEUIL = ❌ ÉCHEC TOTAL  
- Image d'entrée = TABLE basse → Tu génères une TABLE différente = ❌ ÉCHEC TOTAL
- Tu changes la forme, couleur, ou type du produit = ❌ ÉCHEC TOTAL

✅ SUCCÈS = L'objet dans l'image de sortie est VISUELLEMENT IDENTIQUE à l'objet dans l'image d'entrée
✅ SUCCÈS = Seul le FOND/ARRIÈRE-PLAN a changé, le produit est COPIÉ à l'identique

🔍 VÉRIFIE AVANT DE FINALISER :
- Le produit dans ma sortie est-il le MÊME objet que dans l'entrée ? (même forme, même type, même couleur)
- Si l'entrée montre un sommier métallique → ma sortie montre-t-elle CE sommier métallique (pas un lit) ?
`;

    // Format enforcement header
    const formatEnforcementHeader = `
🚨🚨🚨 CRITICAL FORMAT REQUIREMENT 🚨🚨🚨

📐 OUTPUT MUST BE EXACTLY ${targetDims.width}x${targetDims.height} pixels (${targetDims.ratio} ratio)
📐 CREATE a ${targetDims.width}x${targetDims.height} canvas FIRST, then place content
${format === "square" ? "🟦 PERFECT SQUARE: Width = Height = 1024 pixels" : ""}
${format === "portrait" ? "📱 VERTICAL: Height (1024) > Width (768)" : ""}
${format === "landscape" ? "🖼️ HORIZONTAL: Width (1024) > Height (768)" : ""}

⚠️ PRODUCT MUST FILL 85-95% OF CANVAS - NO WHITE PADDING ⚠️
Scale the product UP to TOUCH or NEARLY TOUCH the edges of the frame.
`;

    // Use enriched prompt if available, but ALWAYS prepend image editing rules + format + visual enhancement
    const finalPrompt = enrichedPrompt 
      ? `${formatEnforcementHeader}

${imageEditingHeader}

${visualEnhancementInstructions}

📝 INSTRUCTION POUR LE NOUVEL ARRIÈRE-PLAN :
${enrichedPrompt}

🚨 RAPPEL CRITIQUE : Tu ÉDITES l'image, tu ne la régénères pas.
Le produit (${productContext}) doit rester EXACTEMENT identique - seul l'arrière-plan change.
Product must fill 85-95% of the ${targetDims.width}x${targetDims.height} canvas.
`.trim()
      : `
${formatEnforcementHeader}

${forceFullBackgroundReplace}

${visualEnhancementInstructions}

${premiumLifestylePrompt}

📦 CONTEXTE PRODUIT :
${productContext}${variantOptions ? ` (Variante: ${variantOptions})` : ""}

🎯 PARAMÈTRES SÉLECTIONNÉS :
- Style demandé : ${style}
- Format image : ${format} (${targetDims.width}x${targetDims.height} pixels)
- Type : ${isMainImage ? "Image principale" : "Image variante"}

🎲 RÈGLE DE VARIÉTÉ (CRITIQUE) :
Chaque génération DOIT être UNIQUE et DIFFÉRENTE des autres.
Si tu génères plusieurs images pour le même produit :
- Change l'angle de vue
- Change la palette de couleurs
- Change le style de décoration
- Change les accessoires
- Change l'éclairage
JAMAIS deux générations identiques ou similaires !

⚠️ RÈGLES FINALES NON-NÉGOCIABLES :
1. OUTPUT EXACTEMENT ${targetDims.width}x${targetDims.height} pixels (${targetDims.ratio})
2. L'arrière-plan DOIT être COMPLÈTEMENT NOUVEAU et DIFFÉRENT de l'original
3. Le produit original doit rester 100% intact ET remplir 85-95% du canvas
4. PAS de padding blanc autour du produit - il doit TOUCHER les bords
5. Aucune modification du produit n'est autorisée
6. Le rendu doit être photoréaliste (pas d'effet cartoon ou stylisé)
7. La scène doit être digne d'un catalogue e-commerce haut de gamme

🎯 OBJECTIF FINAL :
Créer une photographie professionnelle ${targetDims.width}x${targetDims.height} qui TRANSFORME l'environnement du produit.
Changement d'ambiance = OBLIGATOIRE.
Variété = OBLIGATOIRE.
Qualité = OBLIGATOIRE.
`.trim();

    if (enrichedPrompt) {
      console.log("✨ Using SERP-enriched prompt for generation");
    } else {
      console.log("📝 Using standard premium lifestyle prompt");
    }
    
    console.log("🎯 Final prompt preview (first 500 chars):", finalPrompt.substring(0, 500) + "...");

    // Helper function to try Lovable AI
    async function tryLovableAI(): Promise<{ imageUrl: string; model: string; error?: string } | null> {
      try {
        console.log("📝 Trying Lovable AI...");

        // First, verify the image is accessible
        console.log("🔍 Verifying image URL:", imageUrl.substring(0, 100) + "...");
        try {
          const imageCheck = await fetch(imageUrl, { method: "HEAD" });
          if (!imageCheck.ok) {
            const errorMsg = `Image inaccessible (HTTP ${imageCheck.status})`;
            console.error("❌", errorMsg);
            return { imageUrl: "", model: "", error: errorMsg };
          }
          console.log("✅ Image accessible");
        } catch (e) {
          const errorMsg = `Impossible d'accéder à l'image: ${e instanceof Error ? e.message : "Erreur inconnue"}`;
          console.error("❌", errorMsg);
          return { imageUrl: "", model: "", error: errorMsg };
        }

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
                  { type: "text", text: finalPrompt },
                  { type: "image_url", image_url: { url: imageUrl } },
                ],
              },
            ],
            modalities: ["image", "text"],
            generationConfig: {
              aspectRatio: format === "portrait" ? "3:4" : format === "landscape" ? "4:3" : "1:1"
            },
          }),
        });

        if (response.status === 402) {
          const errorMsg = "Pas de crédits Lovable AI disponibles";
          console.error("❌", errorMsg);
          return { imageUrl: "", model: "", error: errorMsg };
        }

        if (response.status === 429) {
          const errorMsg = "Limite de taux atteinte, réessayez plus tard";
          console.error("❌", errorMsg);
          return { imageUrl: "", model: "", error: errorMsg };
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
          const errorMsg = errorData.error?.message || `Erreur API (${response.status})`;
          console.error(`❌ Lovable AI error (${response.status}):`, errorMsg);
          return { imageUrl: "", model: "", error: errorMsg };
        }

        const data = await response.json();
        const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!generatedImageUrl) {
          const errorMsg = "Aucune image générée dans la réponse";
          console.error("⚠️", errorMsg);
          return { imageUrl: "", model: "", error: errorMsg };
        }

        console.log("✅ Lovable AI succeeded");
        return { imageUrl: generatedImageUrl, model: "google/gemini-2.5-flash-image-preview (Lovable AI)" };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Erreur inconnue";
        console.error("❌ Lovable AI exception:", errorMsg);
        return { imageUrl: "", model: "", error: errorMsg };
      }
    }

    // Helper function to try DeepSeek
    async function tryDeepSeek(): Promise<{ imageUrl: string; model: string } | null> {
      // DeepSeek doesn't support image generation
      console.log("⚠️ DeepSeek doesn't support image generation");
      return null;
    }

    // Try providers in order: Lovable AI only (OpenAI removed)
    const result = await tryLovableAI();

    if (!result || !result.imageUrl || result.error) {
      const errorMsg = result?.error || "Service indisponible";
      console.error("❌ Generation failed:", errorMsg);

      return new Response(
        JSON.stringify({
          success: false,
          error: "GENERATION_FAILED",
          message: "La génération d'arrière-plan a échoué.",
          details: errorMsg,
          imageUrl: imageUrl,
          suggestions: errorMsg.includes("inaccessible")
            ? [
                "Vérifiez que l'image source est accessible",
                "Essayez avec une autre image",
                "Vérifiez que l'URL de l'image est valide et publique",
              ]
            : errorMsg.includes("crédits")
              ? ["Ajoutez des crédits à votre workspace Lovable AI"]
              : errorMsg.includes("taux")
                ? ["Attendez quelques minutes avant de réessayer"]
                : [
                    "Réessayez avec une image différente",
                    "Vérifiez la qualité et le format de l'image source",
                    "Contactez le support si le problème persiste",
                  ],
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { imageUrl: generatedImageUrl, model: usedModel } = result;
    console.log(`✅ Successfully generated AI background using ${usedModel}`);

    // 🆕 POST-PROCESSING: Force exact format dimensions
    let processedImageUrl = generatedImageUrl;
    if (generatedImageUrl.startsWith('data:')) {
      console.log(`[ai-bg-gen] 📐 Applying post-processing: ${format} (${targetDims.width}x${targetDims.height})`);
      processedImageUrl = await enforceImageFormat(generatedImageUrl, targetDims.width, targetDims.height);
    }

    // Save to product_image_history if user is authenticated
    if (authHeader) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );

      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
      } = await supabaseAdmin.auth.getUser(token);

      if (user) {
        try {
          // Get next version number
          const { data: versionData } = await supabaseAdmin.rpc("get_next_image_version", { p_image_id: imageId });

          const versionNumber = versionData || 1;

          // Mark all previous versions as not current
          await supabaseAdmin.from("product_image_history").update({ is_current: false }).eq("image_id", imageId);

          // Insert new history entry
          await supabaseAdmin.from("product_image_history").insert({
            product_id: productId,
            image_id: imageId,
            user_id: user.id,
            optimization_type: "ai_background",
            original_url: imageUrl,
            optimized_url: generatedImageUrl,
            version_number: versionNumber,
            is_current: true,
            ai_model: usedModel,
            ai_prompt: enrichedPrompt || prompt,
            metadata: {
              style,
              format,
              targetType,
              variantOptions,
            },
          });

          console.log("✅ Saved to product_image_history");
        } catch (error) {
          console.error("⚠️ Failed to save to history:", error);
          // Continue even if history save fails
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: processedImageUrl,
        metadata: {
          productTitle,
          style,
          format,
          targetType,
          variantOptions,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    console.error("❌ generate-ai-product-background error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
