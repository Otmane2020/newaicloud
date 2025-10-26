import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY")!;

    if (!deepseekKey) throw new Error("DeepSeek API key not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log("🚀 Starting Daily Blog Opportunities Generation...");

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token!);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load products for this user
    const { data: products, error: fetchError } = await supabase
      .from("shopify_products")
      .select("id, title, category, product_type, vendor, tags, description, price, seller_id")
      .eq("seller_id", user.id)
      .limit(500);

    if (fetchError) throw fetchError;
    
    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Aucun produit trouvé. Importez des produits pour générer des opportunités." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Found ${products.length} products`);

    // Analyze catalog to generate opportunities
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    const productTypes = [...new Set(products.map(p => p.product_type).filter(Boolean))];
    const vendors = [...new Set(products.map(p => p.vendor).filter(Boolean))];

    const analysisPrompt = `Tu es un expert SEO e-commerce spécialisé en meubles et décoration. 

Analyse ce catalogue et génère 8 opportunités d'articles de blog variées et pertinentes:

CATALOGUE:
- ${products.length} produits au total
- Catégories: ${categories.join(", ")}
- Types: ${productTypes.join(", ")}
- Marques: ${vendors.slice(0, 5).join(", ")}

Pour chaque opportunité, fournis:
{
  "article_title": "Titre accrocheur et optimisé SEO (50-70 caractères)",
  "meta_description": "Description engageante (150-160 caractères)",
  "intro_excerpt": "Phrase d'accroche captivante",
  "type": "category-guide|comparison|trend|buying-guide|focus",
  "primary_keywords": ["mot-clé 1", "mot-clé 2"],
  "secondary_keywords": ["mot-clé 3", "mot-clé 4"],
  "estimated_word_count": 2000,
  "difficulty": "easy|medium|hard",
  "seo_opportunity_score": 85,
  "structure": {
    "h2_sections": ["Section 1", "Section 2", "Section 3", "Section 4"]
  },
  "target_category": "catégorie principale ciblée"
}

RÈGLES:
- Varier les types d'articles (guides, comparatifs, tendances)
- Titres accrocheurs qui donnent envie de cliquer
- Focus sur la valeur pour le lecteur
- SEO naturel, pas de keyword stuffing
- Au moins 4 sections H2 par article

Réponds UNIQUEMENT avec un JSON valide:
{
  "opportunities": [...]
}`;

    console.log("🤖 Calling DeepSeek for opportunities analysis...");

    const deepseekResponse = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${deepseekKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "Tu es un expert SEO e-commerce. Réponds UNIQUEMENT en JSON valide sans markdown."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!deepseekResponse.ok) {
      throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
    }

    const result = await deepseekResponse.json();
    const aiContent = result.choices[0].message.content.trim();
    
    // Extract JSON from response
    let opportunitiesData;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      opportunitiesData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiContent);
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      opportunitiesData = { opportunities: generateFallbackOpportunities(products, categories) };
    }

    const opportunities = opportunitiesData.opportunities?.slice(0, 8) || [];
    console.log(`📊 ${opportunities.length} opportunities generated`);

    const createdOpportunities = [];

    // Insert each opportunity into database
    for (const opp of opportunities) {
      try {
        // Find related products
        const relatedProducts = findRelatedProducts(products, opp);
        const productIds = relatedProducts.map(p => p.id);

        const { data: inserted, error: insertError } = await supabase
          .from("blog_opportunities")
          .insert({
            user_id: user.id,
            article_title: opp.article_title,
            meta_description: opp.meta_description,
            intro_excerpt: opp.intro_excerpt,
            type: opp.type,
            primary_keywords: opp.primary_keywords,
            secondary_keywords: opp.secondary_keywords,
            estimated_word_count: opp.estimated_word_count || 2000,
            difficulty: opp.difficulty || "medium",
            seo_opportunity_score: opp.seo_opportunity_score || 80,
            structure: opp.structure,
            product_ids: productIds,
            language: "fr",
            status: "identified",
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error inserting opportunity:", insertError);
          continue;
        }

        createdOpportunities.push(inserted);
      } catch (err) {
        console.error("Error processing opportunity:", err);
      }
    }

    console.log(`✅ ${createdOpportunities.length} opportunities saved to database`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${createdOpportunities.length} opportunités d'articles générées`,
        opportunities: createdOpportunities,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("💥 Error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper functions
function generateFallbackOpportunities(products: any[], categories: string[]) {
  const cat = categories[0] || "Produits";
  return [
    {
      article_title: `Guide Complet pour Choisir ${cat} en 2024`,
      meta_description: `Découvrez nos conseils d'expert et les meilleurs ${cat.toLowerCase()} du moment.`,
      intro_excerpt: `Notre guide vous aide à choisir le ${cat.toLowerCase()} parfait pour votre intérieur.`,
      type: "category-guide",
      primary_keywords: [cat, "guide", "achat"],
      secondary_keywords: ["comparaison", "meilleur", "tendances"],
      estimated_word_count: 2000,
      difficulty: "medium",
      seo_opportunity_score: 80,
      structure: {
        h2_sections: [
          "Introduction : Pourquoi bien choisir",
          "Les critères essentiels",
          "Notre sélection des meilleurs produits",
          "Conclusion et recommandations",
        ],
      },
      target_category: cat,
    },
  ];
}

function findRelatedProducts(products: any[], opportunity: any) {
  const keywords = [
    ...(opportunity.primary_keywords || []),
    ...(opportunity.secondary_keywords || []),
    opportunity.target_category || "",
  ].map(kw => kw.toLowerCase());

  if (!keywords.length) return products.slice(0, 8);

  return products
    .filter(p => {
      const text = [
        p.title,
        p.category,
        p.product_type,
        p.vendor,
        ...(p.tags?.split(",") || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return keywords.some(kw => text.includes(kw));
    })
    .slice(0, 8);
}
