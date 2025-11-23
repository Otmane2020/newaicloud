import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      productId,
      imageId,
      prompt,
      enrichedPrompt,
      style,
      format,
      targetType,
      variantOptions,
    } = (await req.json()) as GenerationRequest;

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

    const formatSpecs = {
      square: "1024x1024 square format",
      portrait: "768x1024 portrait orientation (3:4)",
      landscape: "1024x768 landscape orientation (4:3)",
    };

    // Force COMPLETE background replacement - ULTRA EXPLICIT
    const forceFullBackgroundReplace = `
🚨 MISSION CRITIQUE : REMPLACEMENT TOTAL DE L'ARRIÈRE-PLAN

⚠️ ÉTAPE 1 - SUPPRESSION COMPLÈTE (NON-NÉGOCIABLE) :
Tu DOIS d'abord DÉTRUIRE et SUPPRIMER ENTIÈREMENT l'arrière-plan existant :
   ❌ SUPPRIME : Tous les murs visibles dans l'image originale
   ❌ SUPPRIME : Tous les sols/planchers de l'image originale  
   ❌ SUPPRIME : Tous les meubles qui NE SONT PAS le produit principal
   ❌ SUPPRIME : Tous les canapés, fauteuils, chaises de l'arrière-plan
   ❌ SUPPRIME : Toutes les décorations, tableaux, lampes, vases de l'arrière-plan
   ❌ SUPPRIME : Toutes les plantes de l'image originale
   ❌ SUPPRIME : Tous les rideaux, fenêtres de l'arrière-plan
   ❌ SUPPRIME : L'éclairage, les ombres, les couleurs de la scène originale
   ✅ GARDE UNIQUEMENT : Le produit principal lui-même (table, chaise, meuble, etc.)

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
   ✅ Color grading haut de gamme : tons chauds/froids selon style choisi
   ✅ Matériaux premium visibles : bois, marbre, métal, velours, lin
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
- Color grading professionnel : tons harmonieux et sophistiqués
- Composition magazine : équilibrée, aérée, élégante

✨ INTÉGRATION PRODUIT PARFAITE :
- Le produit reste IDENTIQUE : mêmes couleurs, textures, proportions, détails
- Placement naturel dans la nouvelle scène (pas d'effet flottant)
- Ombres et reflets réalistes adaptés au NOUVEAU contexte
- Le produit est la STAR (80% du focus visuel)

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

    // Use enriched prompt if available (includes SERP insights), otherwise use premium lifestyle prompt
    const finalPrompt =
      enrichedPrompt ||
      `
${forceFullBackgroundReplace}

${premiumLifestylePrompt}

📦 CONTEXTE PRODUIT :
${productContext}${variantOptions ? ` (Variante: ${variantOptions})` : ""}

🎯 PARAMÈTRES SÉLECTIONNÉS :
- Style demandé : ${style}
- Format image : ${format}
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
1. L'arrière-plan DOIT être COMPLÈTEMENT NOUVEAU et DIFFÉRENT de l'original
2. Le produit original doit rester 100% intact (forme, couleur, texture, dimensions)
3. Aucune modification du produit n'est autorisée
4. Le rendu doit être photoréaliste (pas d'effet cartoon ou stylisé)
5. La scène doit être digne d'un catalogue e-commerce haut de gamme
6. L'image finale doit être utilisable IMMÉDIATEMENT sur un site e-commerce premium
7. Si l'original avait un canapé beige → utilise des meubles DIFFÉRENTS (autre couleur, forme, matériau)
8. Si l'original était dans une pièce lumineuse → tu peux garder lumineux mais CHANGE tout le reste

🎯 OBJECTIF FINAL :
Créer une photographie professionnelle qui TRANSFORME l'environnement du produit tout en respectant son intégrité absolue.
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
        imageUrl: generatedImageUrl,
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
