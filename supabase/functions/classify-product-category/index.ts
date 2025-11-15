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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");

    if (!deepseekApiKey) {
      throw new Error("DEEPSEEK_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl!, supabaseKey!);
    const { productTitle, productDescription, productType, imageUrl } = await req.json();

    if (!productTitle) {
      throw new Error("Product title is required");
    }

    console.log(`🔍 Classifying product: ${productTitle}`);

    // Fetch all taxonomy data
    console.log("📚 Loading Google Product Taxonomy...");
    const { data: taxonomy, error: taxonomyError } = await supabase
      .from("google_product_taxonomy")
      .select("id, full_path, level1, level2, level3")
      .order("id");

    if (taxonomyError) throw taxonomyError;

    console.log(`✅ Loaded ${taxonomy.length} categories`);

    // Create a concise taxonomy summary for the AI
    const taxonomySummary = taxonomy
      .map((t) => `${t.id}|${t.full_path}`)
      .join("\n");

    // Construct prompt for DeepSeek
    const prompt = `Tu es un expert Google Shopping spécialisé dans la classification de produits.

📦 PRODUIT À CLASSIFIER :
- Titre : ${productTitle}
- Description : ${productDescription || "Non fournie"}
- Type : ${productType || "Non spécifié"}

📋 TAXONOMIE GOOGLE PRODUCT CATEGORY :
${taxonomySummary}

🎯 TA MISSION :
Analyse ce produit et trouve la catégorie Google Product Category LA PLUS PERTINENTE ET SPÉCIFIQUE.

⚠️ RÈGLES CRITIQUES :
1. Choisis TOUJOURS la catégorie LA PLUS SPÉCIFIQUE possible (niveau le plus profond)
2. Privilégie les catégories avec le plus grand nombre de niveaux (ex: level1 > level2 > level3 > level4)
3. Si hésitation, choisis la catégorie la plus détaillée
4. Le score de confiance doit être entre 0 et 100

📤 FORMAT DE RÉPONSE (JSON strict) :
{
  "gpc_id": <code numérique exact>,
  "gpc_path": "<chemin complet exact depuis la taxonomie>",
  "confidence": <score 0-100>
}

RÉPONDS UNIQUEMENT EN JSON, RIEN D'AUTRE.`;

    // Call DeepSeek API
    console.log("🤖 Calling DeepSeek AI...");
    const deepseekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
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
            content: "Tu es un expert en classification de produits pour Google Shopping. Tu réponds UNIQUEMENT en JSON strict.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error("DeepSeek API error:", errorText);
      throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
    }

    const deepseekData = await deepseekResponse.json();
    const aiResponse = deepseekData.choices[0].message.content;

    console.log("🤖 AI Response:", aiResponse);

    // Parse JSON response
    let classification: CategoryClassification;
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = aiResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      classification = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
      throw new Error("Invalid AI response format");
    }

    // Validate the classification
    const isValid = taxonomy.some(
      (t) => t.id === classification.gpc_id && t.full_path === classification.gpc_path
    );

    if (!isValid) {
      console.warn("⚠️ AI returned invalid category, using fallback");
      // Fallback to a generic category
      const fallback = taxonomy.find((t) => t.level1 && !t.level2) || taxonomy[0];
      classification = {
        gpc_id: fallback.id,
        gpc_path: fallback.full_path,
        confidence: 30,
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
