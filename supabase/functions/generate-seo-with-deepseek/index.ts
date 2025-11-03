import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Product {
  id: string;
  title: string;
  description?: string;
  product_type?: string;
  category?: string;
  sub_category?: string;
  ai_color?: string;
  ai_material?: string;
  style?: string;
  vendor?: string;
  tags?: string;
  seller_id: string;
  optimization_count?: number;
  product_images?: Array<{ src: string; position: number }>;
}

interface VisionAnalysis {
  visualAttributes: {
    primaryColor: string;
    secondaryColors: string[];
    materials: string[];
    style: string;
    room: string;
    mood: string;
    technicalDetails: string[];
  };
  confidence: number;
}

interface SeoResult {
  seo_title: string;
  seo_description: string;
  keywords?: string[];
  character_count?: {
    title: number;
    description: number;
  };
}

// Enhanced DeepSeek caller with retry logic
async function callDeepSeek(messages: any[], maxTokens = 500, retries = 3): Promise<any> {
  const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");

  if (!deepseekApiKey) {
    throw new Error("DeepSeek API key not configured");
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${deepseekApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages,
          temperature: 0.7,
          max_tokens: maxTokens,
          stream: false,
        }),
      });

      if (!response.ok) {
        if (response.status === 429 && attempt < retries) {
          // Rate limited, wait and retry
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt}`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        const errorText = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.log(`Attempt ${attempt} failed, retrying...`, error);
    }
  }
}

// Enhanced SEO content validator
function validateSeoContent(seoTitle: string, seoDescription: string): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Title validation
  if (seoTitle.length < 30) {
    issues.push(`Titre SEO trop court: ${seoTitle.length} caractères (minimum 30 recommandé)`);
  }
  if (seoTitle.length > 65) {
    issues.push(`Titre SEO trop long: ${seoTitle.length} caractères (maximum 65 recommandé)`);
  }

  // Description validation
  if (seoDescription.length < 120) {
    issues.push(`Description SEO trop courte: ${seoDescription.length} caractères (minimum 120 recommandé)`);
  }
  if (seoDescription.length > 165) {
    issues.push(`Description SEO trop longue: ${seoDescription.length} caractères (maximum 165 recommandé)`);
  }

  // Content quality checks
  if (!seoTitle.match(/[a-zA-ZÀ-ÿ]/)) {
    issues.push("Le titre SEO ne contient pas de texte valide");
  }
  if (!seoDescription.match(/[a-zA-ZÀ-ÿ]/)) {
    issues.push("La description SEO ne contient pas de texte valide");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

// Enhanced product data extractor
function extractProductKeywords(product: Product): string[] {
  const keywords: string[] = [];

  // Extract from title
  if (product.title) {
    keywords.push(
      ...product.title
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3),
    );
  }

  // Extract from product type and category
  if (product.product_type) keywords.push(product.product_type.toLowerCase());
  if (product.category) keywords.push(product.category.toLowerCase());
  if (product.sub_category) keywords.push(product.sub_category.toLowerCase());

  // Extract from attributes
  if (product.ai_color) keywords.push(product.ai_color.toLowerCase());
  if (product.ai_material) keywords.push(product.ai_material.toLowerCase());
  if (product.style) keywords.push(product.style.toLowerCase());
  if (product.vendor) keywords.push(product.vendor.toLowerCase());

  // Extract from tags
  if (product.tags) {
    keywords.push(...product.tags.split(",").map((tag) => tag.trim().toLowerCase()));
  }

  // Remove duplicates and short words
  return [...new Set(keywords)].filter((word) => word.length > 2);
}

// Enhanced vision context builder
function buildVisionContext(visionData: VisionAnalysis | null): string {
  if (!visionData?.visualAttributes) return "";

  const attrs = visionData.visualAttributes;
  return `

**ANALYSE VISUELLE IA (À intégrer naturellement dans le SEO):**
- Couleur principale: ${attrs.primaryColor}
- Couleurs secondaires: ${attrs.secondaryColors?.join(", ") || "Non détectées"}
- Matériaux identifiés: ${attrs.materials?.join(", ") || "Non spécifiés"}
- Style visuel: ${attrs.style}
- Contexte d'usage: ${attrs.room || "Non spécifié"}
- Ambiance: ${attrs.mood}
- Détails techniques visibles: ${attrs.technicalDetails?.join(", ") || "Aucun"}
- Confiance de l'analyse: ${(visionData.confidence * 100).toFixed(0)}%

**CONSIGNES IMPORTANTES:**
- Intégrez ces attributs visuels naturellement dans le titre et la description
- Utilisez les couleurs et matériaux comme mots-clés supplémentaires
- Mettez en avant le style et l'ambiance détectés
- Rendez la description plus immersive grâce aux détails visuels`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Validate request method
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Méthode non autorisée. Utilisez POST." }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Parse request body with validation
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Corps de requête JSON invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { productId } = requestBody;

    if (!productId) {
      return new Response(JSON.stringify({ error: "ID produit requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[SEO-GENERATION] Début pour le produit: ${productId}`);

    // Fetch product with enhanced error handling
    const { data: product, error: productError } = await supabaseClient
      .from("shopify_products")
      .select("*, optimization_count, product_images(src, position)")
      .eq("id", productId)
      .maybeSingle();

    if (productError) {
      console.error("[SEO-GENERATION] Erreur base de données:", productError);
      throw new Error("Erreur lors de la récupération du produit");
    }

    if (!product) {
      return new Response(JSON.stringify({ error: "Produit non trouvé" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enhanced trial and subscription check
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("subscription_status, trial_used_optimizations")
      .eq("id", product.seller_id)
      .single();

    const currentOptimizations = product.optimization_count || 0;

    if (profile?.subscription_status === "trialing") {
      const trialOptimizationsUsed = profile.trial_used_optimizations || 0;

      if (trialOptimizationsUsed >= 5) {
        // Limite d'essai: 5 optimisations
        return new Response(
          JSON.stringify({
            error: "trial_limit_reached",
            message:
              "Vous avez atteint la limite d'optimisations de votre essai. Activez votre abonnement pour continuer.",
            limit: 5,
            used: trialOptimizationsUsed,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    console.log(`[SEO-GENERATION] Génération SEO avec DeepSeek pour: ${product.title}`);

    // Enhanced Vision AI analysis
    let visionData: VisionAnalysis | null = null;
    const featuredImage = product.product_images?.find((img: any) => img.position === 0) || product.product_images?.[0];

    if (featuredImage?.src) {
      console.log("[SEO-GENERATION] Tentative d'analyse visuelle IA");

      try {
        const visionResponse = await supabaseClient.functions.invoke("analyze-image-with-vision", {
          body: {
            imageUrl: featuredImage.src,
            productContext: {
              title: product.title,
              category: product.category,
              type: product.product_type,
              existingAttributes: {
                color: product.ai_color,
                material: product.ai_material,
                style: product.style,
              },
            },
          },
        });

        if (!visionResponse.error && visionResponse.data) {
          visionData = visionResponse.data;
          console.log("[SEO-GENERATION] Analyse visuelle réussie");
        } else {
          console.log("[SEO-GENERATION] Analyse visuelle échouée, continuation sans:", visionResponse.error);
        }
      } catch (visionError) {
        console.log("[SEO-GENERATION] Erreur analyse visuelle, continuation sans:", visionError);
      }
    }

    // Enhanced usage limits check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: limitsData, error: limitsError } = await supabaseClient.functions.invoke("check-usage-limits", {
      headers: {
        Authorization: authHeader,
      },
    });

    if (limitsError || !limitsData) {
      console.error("[SEO-GENERATION] Erreur vérification limites:", limitsError);
      return new Response(JSON.stringify({ error: "Impossible de vérifier les limites d'utilisation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérification améliorée des limites
    const optimizationsNeeded = 2; // titre + description
    const remainingOptimizations = limitsData.limits.max_optimizations - limitsData.usage.optimizations_count;

    if (!limitsData.canUseOptimizations || remainingOptimizations < optimizationsNeeded) {
      return new Response(
        JSON.stringify({
          error: "limite_optimisations_atteinte",
          message: `Limite d'optimisations atteinte. Il vous reste ${remainingOptimizations} optimisation(s).`,
          limitReached: true,
          usage: limitsData.usage,
          limits: limitsData.limits,
          shouldForcePayment: limitsData.shouldForcePayment,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get store language
    let storeLanguage = 'fr';
    if (product.store_id) {
      const { data: storeData } = await supabaseClient
        .from('shopify_connections')
        .select('store_language')
        .eq('id', product.store_id)
        .single();
      
      if (storeData?.store_language) {
        storeLanguage = storeData.store_language;
      }
    }

    console.log(`[SEO-GENERATION] Using language: ${storeLanguage}`);

    // Enhanced SEO prompt generation
    const productKeywords = extractProductKeywords(product);
    const visionContext = buildVisionContext(visionData);

    const enhancedSeoPrompt = getSeoPrompt(storeLanguage, 'product', {
      title: product.title,
      description: product.description,
      product_type: product.product_type,
      category: product.category,
      sub_category: product.sub_category,
      ai_color: product.ai_color,
      ai_material: product.ai_material,
      style: product.style,
      vendor: product.vendor,
      tags: product.tags,
      keywords: productKeywords,
      visionContext: visionContext
    });

    const systemRole = getSystemRole(storeLanguage, 'product');
    
    const response = await callDeepSeek(
      [
        { role: "system", content: systemRole },
        { role: "user", content: enhancedSeoPrompt }
      ],
      1000,
      3
    );

    let seoContent = response.choices[0].message.content;
    
    // Clean JSON response
    if (seoContent.startsWith('```json')) {
      seoContent = seoContent.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
    } else if (seoContent.startsWith('```')) {
      seoContent = seoContent.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const parsed = JSON.parse(seoContent);
    const { seo_title, seo_description } = parsed;

    // Validate
    const validation = validateSeoContent(seo_title, seo_description);
    if (!validation.isValid) {
      console.warn("[SEO-GENERATION] Validation issues:", validation.issues);
    }

    console.log("[SEO-GENERATION] SEO généré avec succès");
        {
          role: "user",
          content: enhancedSeoPrompt,
        },
      ],
      400,
    ); // Augmentation des tokens pour plus de qualité

    const seoContent = seoResponse.choices[0].message.content;
    console.log("[SEO-GENERATION] Réponse DeepSeek reçue");

    let seoResult: SeoResult;

    try {
      // Strip markdown code blocks if present
      let cleanedContent = seoContent.trim();
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      
      const parsed = JSON.parse(cleanedContent);

      // Validation du contenu généré
      const validation = validateSeoContent(parsed.seo_title, parsed.seo_description);

      if (!validation.isValid) {
        console.warn("[SEO-GENERATION] Problèmes de validation SEO:", validation.issues);
        // On continue malgré les warnings, mais on les log
      }

      seoResult = {
        seo_title: parsed.seo_title || product.title.substring(0, 60),
        seo_description: parsed.seo_description || product.description?.substring(0, 160) || "",
        keywords: productKeywords,
        character_count: {
          title: parsed.seo_title?.length || 0,
          description: parsed.seo_description?.length || 0,
        },
      };
    } catch (e) {
      console.error("[SEO-GENERATION] Échec parsing JSON:", seoContent);
      // Fallback basique
      seoResult = {
        seo_title: product.title.substring(0, 60),
        seo_description:
          product.description?.substring(0, 160) ||
          "Découvrez ce produit de qualité. Livraison rapide et service client exceptionnel.",
        keywords: productKeywords,
      };
    }

    // Enhanced product update with more metadata
    const updateData: any = {
      seo_title: seoResult.seo_title,
      seo_description: seoResult.seo_description,
      enrichment_status: "enriched",
      seo_synced_to_shopify: false,
      optimization_count: currentOptimizations + 1,
      last_optimization_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update product in database
    const { error: updateError } = await supabaseClient.from("shopify_products").update(updateData).eq("id", productId);

    if (updateError) {
      console.error("[SEO-GENERATION] Erreur mise à jour produit:", updateError);
      throw updateError;
    }

    // Enhanced usage tracking
    try {
      await supabaseClient.rpc("increment_usage", {
        p_seller_id: product.seller_id,
        p_field: "optimizations_count",
        p_increment: 2,
      });

      // Track trial optimizations if applicable
      if (profile?.subscription_status === "trialing") {
        await supabaseClient
          .from("profiles")
          .update({
            trial_used_optimizations: (profile.trial_used_optimizations || 0) + 2,
            updated_at: new Date().toISOString(),
          })
          .eq("id", product.seller_id);
      }
    } catch (trackingError) {
      console.error("[SEO-GENERATION] Erreur tracking usage:", trackingError);
      // Ne pas bloquer la réponse pour une erreur de tracking
    }

    console.log(`[SEO-GENERATION] SEO généré avec succès pour ${productId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "SEO généré avec succès",
        data: {
          product_id: productId,
          product_title: product.title,
          seo_title: seoResult.seo_title,
          seo_description: seoResult.seo_description,
          character_count: seoResult.character_count,
          vision_used: !!visionData,
          optimization_count: currentOptimizations + 1,
          keywords: seoResult.keywords?.slice(0, 5), // Retourner les 5 premiers mots-clés
        },
        metadata: {
          generated_at: new Date().toISOString(),
          model: "deepseek-chat",
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[SEO-GENERATION] Erreur générale:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Une erreur inconnue est survenue",
        code: error instanceof Error && error.message.includes("API") ? "api_error" : "internal_error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
