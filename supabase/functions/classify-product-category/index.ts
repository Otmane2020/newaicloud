import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CategoryClassification {
  gpc_id: number;
  gpc_path: string;
  confidence: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Safe HealthCheck handler
  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");

    if (!deepseekApiKey) {
      throw new Error("DEEPSEEK_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl!, supabaseKey!);
    const { productTitle, productDescription, productType, imageUrl } = body;

    if (!productTitle) {
      throw new Error("Product title is required");
    }

    console.log(`🔍 Classifying product: ${productTitle}`);

    // STEP 1: Extract keywords and general category with DeepSeek
    console.log("🤖 Step 1: Extracting keywords and general category...");
    const extractionPrompt = `Analyse ce produit et extrais les informations clés pour la classification Google Shopping.

📦 PRODUIT :
- Titre : ${productTitle}
- Description : ${productDescription || "Non fournie"}
- Type : ${productType || "Non spécifié"}

🎯 INSTRUCTIONS CRITIQUES :
1. **TYPE DE PRODUIT** : Identifie le TYPE PRINCIPAL du produit (ex: "table basse", "chaise", "lampe", "t-shirt")
   - PAS les détails de style (ignorer "design moderne", "noir et blanc", etc.)
   - PAS les caractéristiques (ignorer "avec tiroir", "pliable", etc.)
   - JUSTE le type de produit de base

2. **CATÉGORIE** : La catégorie principale (Meubles, Vêtements, Électronique, etc.)

3. **SOUS-CATÉGORIE** : Le type spécifique si pertinent

📤 FORMAT JSON strict :
{
  "product_type": "type de produit principal en 2-3 mots max",
  "category": "Catégorie principale",
  "subcategory": "Sous-catégorie ou null"
}

✅ EXEMPLE CORRECT :
Produit: "Table Basse 80x40 – Design Moderne Noir et Blanc avec Tiroir"
→ {"product_type": "table basse", "category": "Meubles", "subcategory": "Tables"}

❌ MAUVAIS EXEMPLE :
→ {"product_type": "design moderne noir blanc tiroir", ...} ← TROP GÉNÉRIQUE !

RÉPONDS UNIQUEMENT EN JSON.`;

    const extractionResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "Tu es un expert en classification de produits. Tu réponds UNIQUEMENT en JSON strict.",
          },
          {
            role: "user",
            content: extractionPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!extractionResponse.ok) {
      const errorText = await extractionResponse.text();
      console.error("DeepSeek extraction error:", errorText);
      throw new Error(`DeepSeek API error: ${extractionResponse.status}`);
    }

    const extractionData = await extractionResponse.json();
    const extractionText = extractionData.choices[0].message.content;
    
    console.log("🤖 Extraction result:", extractionText);

    let extracted;
    try {
      const cleanedExtraction = extractionText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      extracted = JSON.parse(cleanedExtraction);
    } catch (parseError) {
      console.error("Failed to parse extraction:", extractionText);
      throw new Error("Invalid extraction format");
    }

    // STEP 2: SQL search for relevant categories
    console.log("🔍 Step 2: Searching relevant categories in database...");
    console.log("📊 Extracted data:", JSON.stringify(extracted));

    const normalizedProductType = extracted.product_type?.toLowerCase() || "";
    const productWords = normalizedProductType.split(/\s+/).filter((w: string) => w.length > 2);

    console.log("🔍 Product words:", productWords);
    console.log("🔍 Category filter:", extracted.category);

    // Build search query with strict category filtering
    let query = supabase
      .from("google_product_taxonomy")
      .select("id, full_path, level1, level2, level3, level4, level5, depth")
      .eq("level1", extracted.category) // Filter by main category first (e.g., "Meubles")
      .gte("depth", 2);

    // Add AND conditions for each product word (all must match)
    for (const word of productWords) {
      query = query.ilike("full_path", `%${word}%`);
    }

    query = query.order("depth", { ascending: false }).limit(15);
    
    let { data: relevantCategories, error: searchError } = await query;

    if (searchError) throw searchError;

    console.log(`✅ Found ${relevantCategories?.length || 0} relevant categories`);

    if (!relevantCategories || relevantCategories.length === 0) {
      console.warn("⚠️ No categories found with strict filter, trying fallback with textSearch...");
      
      // Fallback: use full-text search on the entire product type
      const { data: fallbackCategories, error: fallbackError } = await supabase
        .from("google_product_taxonomy")
        .select("id, full_path, level1, level2, level3, level4, level5, depth")
        .textSearch("full_path", normalizedProductType, { type: "websearch" })
        .not("level1", "in", '("Adulte","Entreprise et industrie","Animaux")')
        .gte("depth", 2)
        .order("depth", { ascending: false })
        .limit(10);
      
      if (fallbackError || !fallbackCategories || fallbackCategories.length === 0) {
        console.error("⚠️ Fallback search also failed, using generic category");
        const { data: genericCategories } = await supabase
          .from("google_product_taxonomy")
          .select("id, full_path")
          .eq("level1", extracted.category)
          .eq("depth", 1)
          .limit(1);
        
        if (!genericCategories || genericCategories.length === 0) {
          throw new Error("No categories found in taxonomy");
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            classification: {
              gpc_id: genericCategories[0].id,
              gpc_path: genericCategories[0].full_path,
              confidence: 20,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log(`✅ Fallback found ${fallbackCategories.length} categories`);
      // Use fallback categories for final selection
      relevantCategories = fallbackCategories;
    }

    // At this point, relevantCategories is guaranteed to be non-null and non-empty

    // STEP 3: Final selection with DeepSeek
    console.log("🤖 Step 3: Final category selection...");
    
    const categoriesSummary = relevantCategories
      .map((c) => `${c.id}|${c.full_path}`)
      .join("\n");

    const finalPrompt = `Choisis LA MEILLEURE catégorie Google Shopping pour ce produit.

📦 PRODUIT :
- Titre : ${productTitle}
- Description : ${productDescription || "Non fournie"}

📋 CATÉGORIES DISPONIBLES (10 meilleures correspondances) :
${categoriesSummary}

🎯 CHOISIS :
La catégorie LA PLUS SPÉCIFIQUE et PERTINENTE.

📤 FORMAT JSON strict :
{
  "gpc_id": <ID numérique exact>,
  "gpc_path": "<chemin complet exact>",
  "confidence": <score 0-100>
}

RÉPONDS UNIQUEMENT EN JSON.`;

    const finalResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "Tu es un expert en classification Google Shopping. Tu réponds UNIQUEMENT en JSON strict.",
          },
          {
            role: "user",
            content: finalPrompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 200,
      }),
    });

    if (!finalResponse.ok) {
      const errorText = await finalResponse.text();
      console.error("DeepSeek final selection error:", errorText);
      throw new Error(`DeepSeek API error: ${finalResponse.status}`);
    }

    const finalData = await finalResponse.json();
    const finalText = finalData.choices[0].message.content;

    console.log("🤖 Final selection:", finalText);

    let classification: CategoryClassification;
    try {
      const cleanedFinal = finalText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      classification = JSON.parse(cleanedFinal);
    } catch (parseError) {
      console.error("Failed to parse final selection:", finalText);
      throw new Error("Invalid final selection format");
    }

    // Validate the classification exists in our search results
    const isValid = relevantCategories.some(
      (c) => c.id === classification.gpc_id && c.full_path === classification.gpc_path
    );

    if (!isValid) {
      console.warn("⚠️ AI returned category not in search results, using first result");
      classification = {
        gpc_id: relevantCategories[0].id,
        gpc_path: relevantCategories[0].full_path,
        confidence: 50,
      };
    }

    console.log(`✅ Classification: ${classification.gpc_path} (confidence: ${classification.confidence}%)`);

    return new Response(
      JSON.stringify({
        success: true,
        classification,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Classification error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
