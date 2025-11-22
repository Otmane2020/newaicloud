import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AltTextVisionRequest {
  imageId: string;
  imageType?: "product" | "content";
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();

  // Pattern 1: ```json\n{...}\n```
  const jsonBlockMatch = cleaned.match(/```json\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }

  // Pattern 2: ```{...}```
  const codeBlockMatch = cleaned.match(/```\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Pattern 3: Remove backticks
  return cleaned.replace(/^```json?\s*|\s*```$/g, "").trim();
}

// Extract the main product name intelligently from full title
function extractProductName(title: string): string {
  if (!title) return "";

  // Clean title by taking part before first dash or comma
  let productName = title.split(/[-–—,]/)[0].trim();

  // Smart detection: keep first 2-4 words based on word length
  const words = productName.split(/\s+/).filter((w) => w.length > 0);

  // If first words are short (<=4 chars), keep more words (up to 5)
  // If words are long, keep fewer (3-4 max)
  const avgLength = words.slice(0, 3).reduce((sum, w) => sum + w.length, 0) / Math.min(3, words.length);
  const maxWords = avgLength <= 4 ? 5 : 4;

  return words.slice(0, Math.min(maxWords, words.length)).join(" ");
}

// Normalize word to its stem (basic French stemming)
function getStem(word: string): string {
  const w = word.toLowerCase().trim();

  // Remove common French suffixes
  if (w.endsWith("aux")) return w.slice(0, -3) + "al";
  if (w.endsWith("eaux")) return w.slice(0, -4) + "eau";
  if (w.endsWith("s") && w.length > 3) return w.slice(0, -1);
  if (w.endsWith("ée")) return w.slice(0, -2) + "é";
  if (w.endsWith("ées")) return w.slice(0, -3) + "é";

  return w;
}

// Tokenize text into significant words
function tokenize(text: string): string[] {
  if (!text) return [];

  const stopWords = new Set([
    "avec",
    "pour",
    "dans",
    "une",
    "des",
    "the",
    "and",
    "with",
    "for",
    "in",
    "a",
    "an",
    "of",
    "le",
    "la",
    "les",
    "un",
    "de",
    "du",
    "en",
    "ou",
    "et",
    "à",
    "au",
    "aux",
    "ce",
    "cette",
  ]);

  return text
    .toLowerCase()
    .split(/[\s,;:.!?()]+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

// Detect language automatically
function detectLanguage(text: string): "fr" | "en" {
  const frenchMarkers = ["avec", "pour", "dans", "une", "des", "le", "la", "les", "en", "de", "du"];
  const englishMarkers = ["with", "for", "in", "the", "and", "of", "this", "that"];

  let frScore = 0;
  let enScore = 0;

  const words = text.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (frenchMarkers.includes(word)) frScore++;
    if (englishMarkers.includes(word)) enScore++;
  }

  return frScore > enScore ? "fr" : "en";
}

// Universal intelligent categorization (NO HARDCODED LISTS)
interface UniversalTokens {
  descriptors: string[]; // All meaningful words
  dimensions: string[]; // Detected dimensions: 120x70, 3cm, etc.
  quantities: string[]; // Detected quantities: 2 pièces, pack de 4, etc.
}

function intelligentCategorize(words: string[]): UniversalTokens {
  const result: UniversalTokens = {
    descriptors: [],
    dimensions: [],
    quantities: [],
  };

  // Generic noise words to skip (very common, not descriptive)
  const noiseSet = new Set([
    "table",
    "basse",
    "plateau",
    "structure",
    "pieds",
    "meuble",
    "produit",
    "article",
    "image",
    "photo",
    "vue",
    "piece",
    "pièce",
    "room",
    "product",
    "item",
    "picture",
    "view",
    "interior",
    "exterior",
  ]);

  for (const word of words) {
    const stem = getStem(word);

    // Skip generic noise
    if (noiseSet.has(stem)) continue;

    // Detect dimensions: 120x70, 3cm, 45°, etc.
    if (/\d+x\d+|\d+cm|\d+mm|\d+°|[\d,]+\s?(cm|mm|m|kg|g|l|ml)/i.test(word)) {
      result.dimensions.push(word);
      continue;
    }

    // Detect quantities: 2 pièces, pack de 4, etc.
    if (/\d+\s?(pièces?|pack|set|lot)/i.test(word)) {
      result.quantities.push(word);
      continue;
    }

    // All other meaningful words are descriptors
    if (word.length > 2) {
      result.descriptors.push(word);
    }
  }

  return result;
}

function validateAltText(altText: string, productTitle?: string, minLength = 15, maxLength = 200): boolean {
  if (!altText || typeof altText !== "string") {
    return false;
  }

  const trimmed = altText.trim();
  const wordCount = trimmed.split(" ").length;

  // Length check
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    console.warn("⚠️ ALT text length invalid:", trimmed.length);
    return false;
  }

  if (wordCount < 6 || wordCount > 16) {
    console.warn("⚠️ ALT text word count invalid:", wordCount);
    return false;
  }

  // Check for corrupted text or nonsense
  if (trimmed.includes("ca dpnne ca") || trimmed.includes("undefined") || trimmed.includes("null")) {
    console.warn("⚠️ ALT text contains corrupted content");
    return false;
  }

  // Anti-copy check (allow product name but not full title)
  if (productTitle) {
    const productName = extractProductName(productTitle);
    const productNameWords = productName.toLowerCase().split(/\s+/);
    const altWords = trimmed.toLowerCase().split(/\s+/);

    // Check if product name is present (good!)
    const hasProductName = productNameWords.some((w) => altWords.includes(w));

    // Check we didn't copy FULL title (>80% similarity = bad)
    const titleWords = productTitle
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const matchingWords = titleWords.filter((w) => altWords.includes(w));
    const matchRatio = titleWords.length > 0 ? matchingWords.length / titleWords.length : 0;

    if (matchRatio > 0.8) {
      console.warn("⚠️ ALT text is too similar to full title:", matchRatio);
      return false;
    }

    if (!hasProductName) {
      console.warn("⚠️ ALT text should contain product name");
      // Just warn, don't reject
    }
  }

  return !altText.includes("```");
}

// Sleep utility for rate limiting
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Enhanced DeepSeek analysis with better product understanding
async function analyzeTitleWithDeepSeek(productTitle: string, isRegeneration: boolean = false) {
  console.log(`🤖 Starting DeepSeek analysis for: "${productTitle}"`);
  if (isRegeneration) {
    console.log(`🔄 REGENERATION MODE: Will ignore previous context and analyze only current title`);
  }
  
  const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");

  if (!deepseekApiKey) {
    console.warn("DeepSeek API key not configured, using fallback analysis");
    return extractGenericKeywords(productTitle);
  }

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `Tu es un expert e-commerce spécialisé dans l'extraction d'attributs produits pour l'optimisation SEO et l'accessibilité. Tu identifies les caractéristiques essentielles d'un produit à partir de son titre.`,
          },
          {
            role: "user",
            content: `Analyse ce titre produit et extrait les attributs SEO pertinents pour créer un texte ALT accessible.

${isRegeneration ? "⚠️ IMPORTANT: Ceci est une RÉGÉNÉRATION. Ignore tout contexte précédent et analyse UNIQUEMENT ce titre actuel.\n" : ""}Titre: "${productTitle}"

Réponds UNIQUEMENT avec un JSON valide :
{
  "product_name": "Nom principal du produit (2-4 mots max)",
  "keywords": ["mot-clé1", "mot-clé2", "mot-clé3", ...],
  "attributes": {
    "materials": ["matériau1", "matériau2"],
    "colors": ["couleur1", "couleur2"],
    "style": "style si mentionné",
    "features": ["caractéristique1", "caractéristique2"]
  },
  "product_type": "catégorie de produit"
}

RÈGLES STRICTES :
- "product_name" : extrait le nom principal (ex: "Table basse gigogne", "Chaise scandinave")
- "keywords" : 6-8 mots-clés maximum, uniquement ce qui est explicitement mentionné
- Élimine les mots marketing ("premium", "qualité", "top", "meilleur")
- Garde les attributs concrets : matériaux, couleurs, dimensions, caractéristiques techniques
- Sois concis et précis, n'invente rien`,
          },
        ],
        temperature: 0.1, // Lower temperature for more consistent extraction
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error("DeepSeek API error:", response.status);
      return extractGenericKeywords(productTitle);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    try {
      const cleaned = cleanJsonResponse(content);
      const parsed = JSON.parse(cleaned);

      // Validate and clean extracted data
      const productName = parsed.product_name || extractProductName(productTitle);
      const keywords = (parsed.keywords || []).filter((k: string) => k && k.length > 2).slice(0, 8);
      const attributes = parsed.attributes || {};

      // Combine keywords with attribute values for better coverage
      const allKeywords = [
        ...new Set([...keywords, ...(attributes.materials || []), ...(attributes.colors || [])]),
      ].slice(0, 10);

      return {
        productName,
        keywords: allKeywords,
        attributes,
        productType: parsed.product_type || "produit",
        analysis: `Type: ${parsed.product_type || "produit"} - ${allKeywords.length} attributs identifiés`,
      };
    } catch (e) {
      console.error("Failed to parse DeepSeek response:", content);
      return extractGenericKeywords(productTitle);
    }
  } catch (error) {
    console.error("DeepSeek analysis error:", error);
    return extractGenericKeywords(productTitle);
  }
}

// Fallback: Generic keyword extraction
function extractGenericKeywords(title: string): {
  productName: string;
  keywords: string[];
  analysis: string;
  attributes: any;
  productType: string;
} {
  const productName = extractProductName(title);
  const tokens = tokenize(title);
  const keywords = tokens.slice(0, 8);
  const productType = title
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 3)
    .join(" ");

  return {
    productName,
    keywords,
    analysis: `Analyse générique: ${productType}`,
    attributes: {},
    productType,
  };
}

// Enhanced Vision AI analysis with better structured output
async function callVisionAI(imageUrl: string, retryCount = 0) {
  const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");

  if (!geminiApiKey) {
    throw new Error("Google Gemini API key not configured");
  }

  console.log("🔍 Calling Vision AI for pure visual analysis");
  console.log("📸 Image URL:", imageUrl.substring(0, 80) + "...");

  // Check for placeholder URLs
  if (imageUrl.includes("placeholder.com") || imageUrl.includes("via.placeholder")) {
    throw new Error("Cannot analyze placeholder images. Please use real product images.");
  }

  // Convert image to base64 efficiently
  let base64Data: string;
  if (imageUrl.startsWith("data:")) {
    base64Data = imageUrl.split(",")[1];
  } else {
    try {
      const imageResponse = await fetch(imageUrl, {
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Convert to base64 in chunks
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...Array.from(chunk));
      }
      base64Data = btoa(binary);
    } catch (fetchError) {
      console.error("Image fetch error:", fetchError);
      const errorMsg = fetchError instanceof Error ? fetchError.message : "Unknown error";
      throw new Error(`Cannot access image URL: ${imageUrl}. ${errorMsg}`);
    }
  }

  // Rate limiting
  const minDelayBetweenRequests = 6500;
  await sleep(minDelayBetweenRequests);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Tu es un expert en vision par ordinateur pour l'e-commerce.

🎯 MISSION : Analyse visuelle PURE de cette image produit.

📸 RÈGLES D'ANALYSE :
1. Décris uniquement ce qui est visible (formes, couleurs, matériaux, textures)
2. Maximum 12-16 mots descriptifs
3. Ton factuel et neutre
4. N'invente rien, ne suppose rien sur le contexte
5. Utilise uniquement des termes cohérents et naturels

🔍 ÉLÉMENTS À OBSERVER :
- Formes et structures visibles
- Couleurs précises (dans l'ordre naturel: "blanc transparent" pas "transparent blanc")
- Matériaux identifiables
- Textures apparentes
- Angle de prise de vue

📝 FORMAT DE RÉPONSE (JSON strict) :
{
  "materials": ["matériau1", "matériau2"],
  "colors": ["couleur1", "couleur2"],
  "shapes": ["forme1"],
  "textures": ["texture1"],
  "view_angle": "type de vue",
  "product_category": "catégorie détectée",
  "visual_description": "Description naturelle et structurée"
}

IMPORTANT : 
- Les couleurs dans l'ordre naturel ("blanc transparent" pas "transparent blanc")
- Pas de mots isolés sans contexte ("reposant", "trois")
- Des phrases complètes et naturelles
- Pas de texte corrompu ou d'erreurs de formatage`,
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent analysis
          maxOutputTokens: 500,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();

    // Handle rate limit with retry
    if (response.status === 429 && retryCount < 3) {
      console.warn(`Rate limit hit (attempt ${retryCount + 1}/3), retrying...`);

      let retryDelaySeconds = 30;
      try {
        const errorData = JSON.parse(errorText);
        const retryInfo = errorData.error?.details?.find((d: any) => d["@type"]?.includes("RetryInfo"));
        if (retryInfo?.retryDelay) {
          retryDelaySeconds = parseInt(retryInfo.retryDelay.replace("s", "")) || 30;
        }
      } catch {}

      console.log(`Waiting ${retryDelaySeconds}s before retry...`);
      await sleep(retryDelaySeconds * 1000);

      return callVisionAI(imageUrl, retryCount + 1);
    }

    throw new Error(`Google Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return { text };
}

// Enhanced mixing algorithm with better semantic integration and natural language
function createOptimizedAltText(
  productName: string,
  seoKeywords: string[],
  visionAnalysis: any,
  language: "fr" | "en",
): string {
  console.log("🎯 Creating optimized ALT text mix:");
  console.log("   - Product Name:", productName);
  console.log("   - SEO Keywords:", seoKeywords);
  console.log("   - Vision Analysis:", visionAnalysis);

  // Track used terms to avoid repetition
  const usedTerms = new Set<string>();

  // Start with product name
  let altText = productName;
  tokenize(productName).forEach((token: string) => usedTerms.add(getStem(token)));

  const parts: string[] = [];

  // Add shapes from vision analysis first (most descriptive)
  if (visionAnalysis.shapes && visionAnalysis.shapes.length > 0) {
    const shapes = visionAnalysis.shapes.slice(0, 1);
    const availableShapes = shapes.filter((s: string) => !usedTerms.has(getStem(s)));
    if (availableShapes.length > 0) {
      parts.push(availableShapes[0]);
      availableShapes.forEach((s: string) => usedTerms.add(getStem(s)));
    }
  }

  // Add materials from vision analysis
  if (visionAnalysis.materials && visionAnalysis.materials.length > 0) {
    const materials = visionAnalysis.materials.slice(0, 2);
    const availableMaterials = materials.filter((m: string) => !usedTerms.has(getStem(m)));
    if (availableMaterials.length > 0) {
      if (language === "fr") {
        parts.push(`en ${availableMaterials.join(" et ")}`);
      } else {
        parts.push(`in ${availableMaterials.join(" and ")}`);
      }
      availableMaterials.forEach((m: string) => usedTerms.add(getStem(m)));
    }
  }

  // Add colors from vision analysis (ensure natural order)
  if (visionAnalysis.colors && visionAnalysis.colors.length > 0) {
    const colors = visionAnalysis.colors.slice(0, 2);
    const availableColors = colors.filter((c: string) => !usedTerms.has(getStem(c)));
    if (availableColors.length > 0) {
      if (language === "fr") {
        parts.push(`coloris ${availableColors.join(" ")}`);
      } else {
        parts.push(`${availableColors.join(" ")} color`);
      }
      availableColors.forEach((c: string) => usedTerms.add(getStem(c)));
    }
  }

  // Add meaningful SEO keywords (filter out generic terms)
  const meaningfulKeywords = seoKeywords
    .filter((k) => {
      const stem = getStem(k);
      return (
        !usedTerms.has(stem) &&
        k.length > 3 &&
        !["moderne", "design", "style", "modern", "design", "reposant", "trois"].includes(stem)
      );
    })
    .slice(0, 2);

  if (meaningfulKeywords.length > 0) {
    parts.push(meaningfulKeywords.join(", "));
  }

  // Add dimensions if available
  if (visionAnalysis.dimensions && visionAnalysis.dimensions.length > 0) {
    const dim = visionAnalysis.dimensions[0];
    if (language === "fr") {
      parts.push(`dimensions ${dim}${!/cm|mm|m\b/.test(dim) ? " cm" : ""}`);
    } else {
      parts.push(`dimensions ${dim}${!/cm|mm|m\b/.test(dim) ? " cm" : ""}`);
    }
  }

  // Add view angle if relevant
  if (visionAnalysis.view_angle && !["standard", "vue standard"].includes(visionAnalysis.view_angle.toLowerCase())) {
    parts.push(visionAnalysis.view_angle);
  }

  // Construct final sentence
  if (parts.length > 0) {
    altText += `, ${parts.join(", ")}`;
  }

  // Clean up and validate
  altText = altText.replace(/\s+/g, " ").replace(/,\s*,/g, ",").replace(/,\s*$/, "").trim();

  // Remove any corrupted text or nonsense words
  altText = altText.replace(/\b(ca dpnne ca|reposant|trois|undefined|null)\b/gi, "").trim();
  altText = altText.replace(/\s+/g, " ").replace(/,\s*,/g, ",").replace(/,\s*$/, "");

  // Ensure reasonable length
  if (altText.length > 180) {
    altText = altText.substring(0, 177) + "...";
  }

  // Final validation - if text doesn't make sense, use a simpler fallback
  const wordCount = altText.split(" ").length;
  if (wordCount < 4 || altText.includes("undefined") || altText.includes("null")) {
    console.warn("⚠️ ALT text validation failed, using fallback");
    if (language === "fr") {
      altText =
        `${productName} en ${visionAnalysis.materials?.[0] || "matériau"} ${visionAnalysis.colors?.[0] || ""}`.trim();
    } else {
      altText =
        `${productName} in ${visionAnalysis.materials?.[0] || "material"} ${visionAnalysis.colors?.[0] || ""}`.trim();
    }
  }

  console.log("   - Final ALT Text:", altText);
  return altText;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageId, imageType = "product" }: AltTextVisionRequest = await req.json();

    if (!imageId) {
      return new Response(JSON.stringify({ error: "Image ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check optimization limits
    const { data: checkResult, error: checkError } = await supabaseClient.rpc("check_optimization_allowed", {
      p_user_id: user.id,
      p_resource_type: "image",
      p_resource_id: imageId,
      p_force: false,
    });

    if (checkError) {
      console.error("Error checking optimization limits:", checkError);
      return new Response(JSON.stringify({ error: "Failed to check optimization limits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!checkResult.allowed) {
      return new Response(
        JSON.stringify({
          error: checkResult.reason,
          message: checkResult.message,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get image info
    let image: any;
    let imageError: any;

    if (imageType === "content") {
      const result = await supabaseClient
        .from("content_images")
        .select("id, src, alt_text, content_type, content_id, user_id")
        .eq("id", imageId)
        .maybeSingle();

      image = result.data;
      imageError = result.error;
    } else {
      const result = await supabaseClient
        .from("product_images")
        .select("id, src, alt_text, product_id")
        .eq("id", imageId)
        .maybeSingle();

      image = result.data;
      imageError = result.error;
    }

    if (imageError || !image) {
      console.error("Image not found:", imageError);
      return new Response(JSON.stringify({ error: "Image not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get product context and store language
    let productTitle = "";
    let userId = image.user_id;
    let storeLanguage: string | null = null;

    if (imageType === "product") {
      const { data: productData, error: productError } = await supabaseClient
        .from("shopify_products")
        .select(`
          title, 
          description, 
          category, 
          seller_id,
          store:shopify_store_connections!inner(store_language)
        `)
        .eq("id", image.product_id)
        .maybeSingle();

      if (productError || !productData) {
        console.error("Product not found for image:", imageId);
        return new Response(
          JSON.stringify({
            error: "Product not found for this image",
            imageId: imageId,
            productId: image.product_id,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      productTitle = productData.title;
      userId = productData.seller_id;
      storeLanguage = (productData as any).store?.store_language || null;
      
      console.log(`🌍 Store language detected: ${storeLanguage || "not configured (will use auto-detection)"}`);
    }

    console.log(`🎯 Starting Vision AI Analysis for image: ${image.id}`);
    console.log(`📝 Product Title: ${productTitle}`);

    // Clean existing ALT text before regeneration to prevent contamination
    if (image.alt_text) {
      console.log(`🧹 Cleaning existing ALT text: "${image.alt_text}"`);
      console.log(`   (prevents old context from contaminating new generation)`);
      
      const tableName = imageType === "content" ? "content_images" : "product_images";
      await supabaseClient
        .from(tableName)
        .update({ alt_text: null })
        .eq("id", imageId);
    }

    // Step 1: Analyze title with DeepSeek for SEO keywords
    let deepSeekAnalysis = null;
    let seoKeywords: string[] = [];
    let extractedProductName = "";

    if (productTitle) {
      console.log("🧠 Step 1: DeepSeek Title Analysis");
      const isRegeneration = !!image.alt_text; // true if ALT text existed before cleaning
      deepSeekAnalysis = await analyzeTitleWithDeepSeek(productTitle, isRegeneration);
      seoKeywords = deepSeekAnalysis.keywords;
      extractedProductName = deepSeekAnalysis.productName;

      console.log("✅ DeepSeek Results:");
      console.log("   - Product Name:", extractedProductName);
      console.log("   - SEO Keywords:", seoKeywords);
      console.log("   - Analysis:", deepSeekAnalysis.analysis);
    } else {
      // For content images without product title
      extractedProductName = "Image";
    }

    // Step 2: Analyze image with Vision AI
    console.log("👁️ Step 2: Vision AI Image Analysis");
    const visionResponse = await callVisionAI(image.src);
    const visionContent = visionResponse.text;

    let visionStructured: any = null;
    let visualDescription = "";

    try {
      const cleanedJson = cleanJsonResponse(visionContent);
      visionStructured = JSON.parse(cleanedJson);
      visualDescription = visionStructured.visual_description || "";

      console.log("✅ Vision AI Results:");
      console.log("   - Materials:", visionStructured.materials);
      console.log("   - Colors:", visionStructured.colors);
      console.log("   - Shapes:", visionStructured.shapes);
      console.log("   - View Angle:", visionStructured.view_angle);
      console.log("   - Visual Description:", visualDescription);
    } catch (e) {
      console.error("Failed to parse Vision AI response:", visionContent);
      console.error("Parse error:", e);

      // Fallback: extract description directly
      const match =
        visionContent.match(/"visual_description":\s*"([^"]+)"/) || visionContent.match(/"alt_text":\s*"([^"]+)"/);
      visualDescription = match ? match[1] : "Image produit";
      visionStructured = { visual_description: visualDescription };
    }

    // Step 3: Create optimized mix
    console.log("🔀 Step 3: Creating Optimized Mix");
    
    // Use store language if available, otherwise fall back to auto-detection
    const language = (storeLanguage as "fr" | "en") || detectLanguage(productTitle + " " + visualDescription);
    console.log(`🌍 Using language: ${language} (from ${storeLanguage ? 'store config' : 'auto-detection'})`);

    let finalAltText = "";

    if (productTitle && visionStructured) {
      finalAltText = createOptimizedAltText(extractedProductName, seoKeywords, visionStructured, language);
    } else {
      // Fallback: use only visual description
      finalAltText = visualDescription;
    }

    // Validate final alt-text
    if (!validateAltText(finalAltText, productTitle)) {
      console.warn("⚠️ Final alt-text validation failed, using visual description directly");
      finalAltText = visualDescription;
    }

    // Update image with final ALT text
    const tableName = imageType === "content" ? "content_images" : "product_images";
    const { error: updateError } = await supabaseClient
      .from(tableName)
      .update({
        alt_text: finalAltText,
      })
      .eq("id", imageId);

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ ALT Text Generation Complete:`);
    console.log(`   - Final ALT Text: ${finalAltText}`);
    console.log(`   - Character Count: ${finalAltText.length}`);
    console.log(`   - Word Count: ${finalAltText.split(" ").length}`);

    // Track usage
    if (userId) {
      await supabaseClient.rpc("increment_usage", {
        p_seller_id: userId,
        p_field: "optimizations_count",
        p_increment: 3,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Vision ALT text generated successfully",
        data: {
          image_id: imageId,
          alt_text: finalAltText,
          analysis: {
            product_name: extractedProductName,
            seo_keywords: seoKeywords,
            visual_analysis: visionStructured,
            language: language,
          },
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
