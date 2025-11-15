import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { 
      productId, 
      currentTitle, 
      description, 
      productType,
      vendor,
      language = 'fr'
    } = await req.json();

    if (!productId || !currentTitle) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: productId and currentTitle" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🎯 [TITLE_SERP] Optimizing title for product: ${currentTitle.substring(0, 50)}...`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // 🔍 Analyze SERP competitors for this product type
    const serpPrompt = `Analysez les titres produits SERP performants pour optimiser ce titre e-commerce.

PRODUIT ACTUEL :
- Titre : ${currentTitle}
${description ? `- Description : ${description.substring(0, 200)}` : ''}
${productType ? `- Type : ${productType}` : ''}
${vendor ? `- Marque : ${vendor}` : ''}

OBJECTIF :
Créer un titre produit optimisé pour Shopify qui :
1. Respecte les meilleures pratiques SERP (45-60 caractères)
2. Inclut les mots-clés principaux identifiés dans les top résultats
3. Met en avant la valeur unique du produit
4. Reste naturel et attractif pour l'achat
5. Utilise la marque si pertinent
6. Évite le keyword stuffing

FORMAT DE RÉPONSE (CRITIQUE) :
Retourne UNIQUEMENT le nouveau titre optimisé, sans guillemets, sans explication, sans formatage markdown.
Exemple : Canapé 3 Places Scandinave Beige - Tissu Premium

RÈGLES STRICTES :
- Maximum 60 caractères
- Pas de guillemets autour du titre
- Pas de préfixe ou suffixe (pas de "Titre:", "Réponse:", etc.)
- Langage : ${language === 'fr' ? 'Français' : 'English'}
- Pas d'emojis, pas de symboles spéciaux
- Capitalisation appropriée (majuscules pour mots importants)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu es un expert en optimisation SEO e-commerce spécialisé dans les titres produits performants. Tu retournes UNIQUEMENT le titre optimisé, sans aucun formatage supplémentaire." },
          { role: "user", content: serpPrompt }
        ],
        temperature: 0.7,
        max_tokens: 100
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded. Please try again in a few seconds." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    let optimizedTitle = data.choices?.[0]?.message?.content?.trim();

    if (!optimizedTitle) {
      console.error("❌ No title generated");
      throw new Error("Failed to generate optimized title");
    }

    // Clean up the response (remove quotes, markdown, etc.)
    optimizedTitle = optimizedTitle
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/^\*\*|\*\*$/g, '') // Remove markdown bold
      .replace(/^Titre\s*:\s*/i, '') // Remove "Titre:" prefix
      .replace(/^Réponse\s*:\s*/i, '') // Remove "Réponse:" prefix
      .trim();

    // Validate length (max 60 characters for SEO)
    if (optimizedTitle.length > 60) {
      console.warn(`⚠️ Title too long (${optimizedTitle.length} chars), truncating...`);
      optimizedTitle = optimizedTitle.substring(0, 57) + '...';
    }

    console.log(`✅ [TITLE_SERP] Original: "${currentTitle.substring(0, 40)}..."`);
    console.log(`✅ [TITLE_SERP] Optimized: "${optimizedTitle}"`);

    // Update product title in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current optimization count
    const { data: productData, error: fetchError } = await supabase
      .from("shopify_products")
      .select("optimization_count")
      .eq("id", productId)
      .single();

    if (fetchError) {
      console.error("❌ Failed to fetch product:", fetchError);
      throw fetchError;
    }

    // Update product with optimized title and increment optimization count
    const { error: updateError } = await supabase
      .from("shopify_products")
      .update({
        title: optimizedTitle,
        optimization_count: (productData.optimization_count || 0) + 1,
        last_optimization_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", productId);

    if (updateError) {
      console.error("❌ Failed to update product title:", updateError);
      throw updateError;
    }

    console.log("✅ [TITLE_SERP] Product title updated in database");

    return new Response(
      JSON.stringify({
        success: true,
        originalTitle: currentTitle,
        optimizedTitle: optimizedTitle,
        characterCount: optimizedTitle.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ [TITLE_SERP] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
