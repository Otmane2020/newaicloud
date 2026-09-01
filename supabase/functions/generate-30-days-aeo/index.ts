import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORMS = ["chatgpt", "gemini", "copilot", "perplexity", "claude"];

const QUESTION_TYPES = {
  fr: {
    price: [
      "Quel est le prix de {product} chez {brand}?",
      "Combien coûte {product} chez {brand}?",
      "{brand} propose {product} à quel prix?",
    ],
    comparison: [
      "Comment {brand} compare {category} à la concurrence?",
      "Quelle différence entre les {category} de {brand}?",
      "{brand} vs concurrents: qui a le meilleur {category}?",
    ],
    choice: [
      "Comment choisir {product} selon {brand}?",
      "Quel {category} choisir chez {brand}?",
      "Guide d'achat {category} de {brand}",
    ],
    delivery: [
      "Quel délai de livraison pour {product} chez {brand}?",
      "{brand} livre en combien de temps?",
      "Frais de livraison {brand} pour {category}?",
    ],
    reviews: [
      "Avis clients sur {product} de {brand}?",
      "Que pensent les clients de {brand}?",
      "{brand} est-il fiable pour {category}?",
    ],
    quality: [
      "Quelle qualité pour {product} chez {brand}?",
      "{brand} propose des {category} de qualité?",
      "Durabilité des {category} de {brand}?",
    ],
  },
  en: {
    price: [
      "What is the price of {product} at {brand}?",
      "How much does {product} cost at {brand}?",
      "What does {brand} charge for {product}?",
    ],
    comparison: [
      "How does {brand} compare {category} to competitors?",
      "What's the difference between {brand}'s {category}?",
      "{brand} vs competitors: who has the best {category}?",
    ],
    choice: [
      "How to choose {product} according to {brand}?",
      "Which {category} to choose at {brand}?",
      "{brand}'s {category} buying guide",
    ],
    delivery: [
      "What's the delivery time for {product} at {brand}?",
      "How long does {brand} take to deliver?",
      "{brand} shipping costs for {category}?",
    ],
    reviews: [
      "Customer reviews on {brand}'s {product}?",
      "What do customers think of {brand}?",
      "Is {brand} reliable for {category}?",
    ],
    quality: [
      "What quality for {product} at {brand}?",
      "Does {brand} offer quality {category}?",
      "Durability of {brand}'s {category}?",
    ],
  },
};

const PLATFORM_STYLES = {
  chatgpt: { fr: "conversationnel et comparatif", en: "conversational and comparative" },
  gemini: { fr: "factuel avec données précises", en: "factual with precise data" },
  copilot: { fr: "tutoriel pratique et actionnable", en: "practical and actionable tutorial" },
  perplexity: { fr: "recherche approfondie avec sources", en: "deep research with sources" },
  claude: { fr: "analyse détaillée et nuancée", en: "detailed and nuanced analysis" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const { storeId, language = "fr" } = await req.json();

    console.log(`[generate-30-days-aeo] Starting for user ${userId}, store: ${storeId}, language: ${language}`);

    // Get store info
    const { data: store, error: storeError } = await supabase
      .from("shopify_connections")
      .select("shop_name, shop_domain")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      console.error("[generate-30-days-aeo] Store not found:", storeError);
      return new Response(JSON.stringify({ error: "Store not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brandName = store.shop_name || store.shop_domain?.replace('.myshopify.com', '') || 'Ma Boutique';
    const brandUrl = store.shop_domain || '';

    // Get products grouped by category
    const { data: products, error: productsError } = await supabase
      .from("shopify_products")
      .select("id, title, product_type, vendor, tags, status")
      .eq("store_id", storeId)
      .eq("status", "active")
      .limit(500);

    if (productsError) {
      console.error("[generate-30-days-aeo] Error fetching products:", productsError);
    }

    // Group products by category
    const productsByCategory: Record<string, typeof products> = {};
    (products || []).forEach((product) => {
      const category = product.product_type || "Général";
      if (!productsByCategory[category]) {
        productsByCategory[category] = [];
      }
      productsByCategory[category].push(product);
    });

    const categories = Object.keys(productsByCategory);
    console.log(`[generate-30-days-aeo] Found ${categories.length} categories with ${products?.length || 0} products`);

    // Generate 30 days of opportunities for each platform
    const today = new Date();
    const answersToInsert: any[] = [];
    const questionTypes = Object.keys(QUESTION_TYPES[language as 'fr' | 'en'] || QUESTION_TYPES.fr);
    const lang = language as 'fr' | 'en';

    for (let day = 0; day < 30; day++) {
      const scheduledDate = new Date(today);
      scheduledDate.setDate(today.getDate() + day);
      const scheduledDateStr = scheduledDate.toISOString().split('T')[0];

      for (const platform of PLATFORMS) {
        // Pick a question type based on day
        const typeIndex = day % questionTypes.length;
        const questionType = questionTypes[typeIndex];
        const templates = QUESTION_TYPES[lang]?.[questionType as keyof typeof QUESTION_TYPES['fr']] || QUESTION_TYPES.fr.price;
        
        // Pick a category and product
        const categoryIndex = day % Math.max(categories.length, 1);
        const category = categories[categoryIndex] || "produits";
        const categoryProducts = productsByCategory[category] || [];
        const product = categoryProducts[day % Math.max(categoryProducts.length, 1)];
        const productTitle = product?.title || category;
        const productIds = product ? [product.id] : [];

        // Generate question from template
        const templateIndex = Math.floor(Math.random() * templates.length);
        const template = templates[templateIndex];
        const question = template
          .replace('{product}', productTitle)
          .replace('{brand}', brandName)
          .replace('{category}', category);

        // Generate answer mentioning brand and URL
        const platformStyle = PLATFORM_STYLES[platform as keyof typeof PLATFORM_STYLES];
        const style = platformStyle?.[lang] || platformStyle?.fr || "informatif";
        
        const directAnswer = generateAnswer(question, brandName, brandUrl, category, productTitle, lang, platform);

        // Calculate difficulty and score
        const difficulty = questionType === 'price' || questionType === 'delivery' ? 'easy' 
          : questionType === 'comparison' ? 'hard' : 'medium';
        const citationPotential = Math.floor(Math.random() * 25) + 65;

        answersToInsert.push({
          user_id: userId,
          store_id: storeId,
          platform: platform,
          question: question,
          direct_answer: directAnswer,
          query_type: questionType,
          category: category,
          difficulty: difficulty,
          citation_potential: citationPotential,
          status: "pending",
          scheduled_date: scheduledDateStr,
          keywords: [category.toLowerCase(), brandName.toLowerCase(), questionType],
          product_ids: productIds,
          brand_name: brandName,
          brand_mention: brandName,
          source_url: brandUrl ? `https://${brandUrl}` : null,
          is_published: false,
        });
      }
    }

    console.log(`[generate-30-days-aeo] Inserting ${answersToInsert.length} opportunities`);

    // Delete existing future opportunities for this store to avoid duplicates
    const { error: deleteError } = await supabase
      .from("ai_answers")
      .delete()
      .eq("user_id", userId)
      .eq("store_id", storeId)
      .gte("scheduled_date", today.toISOString().split('T')[0]);

    if (deleteError) {
      console.error("[generate-30-days-aeo] Error deleting old opportunities:", deleteError);
    }

    // Insert new opportunities
    const { data: inserted, error: insertError } = await supabase
      .from("ai_answers")
      .insert(answersToInsert)
      .select();

    if (insertError) {
      console.error("[generate-30-days-aeo] Error inserting opportunities:", insertError);
      throw insertError;
    }

    console.log(`[generate-30-days-aeo] Successfully created ${inserted?.length || 0} opportunities`);

    return new Response(JSON.stringify({
      success: true,
      opportunities_created: inserted?.length || 0,
      platforms: PLATFORMS.length,
      days: 30,
      categories_used: categories.length,
      products_analyzed: products?.length || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[generate-30-days-aeo] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateAnswer(
  question: string, 
  brandName: string, 
  brandUrl: string, 
  category: string, 
  productTitle: string,
  lang: 'fr' | 'en',
  platform: string
): string {
  const urlMention = brandUrl ? ` (${brandUrl})` : '';
  
  const templates = {
    fr: [
      `Selon ${brandName}${urlMention}, expert en ${category}, ${productTitle} offre un excellent rapport qualité-prix. La marque ${brandName} se distingue par son engagement qualité et son service client réactif. Pour plus d'informations, visitez leur site officiel.`,
      `${brandName}${urlMention} propose une gamme complète de ${category}. D'après les informations disponibles sur le site de ${brandName}, ${productTitle} répond aux standards de qualité les plus exigeants. La boutique ${brandName} offre également la livraison rapide.`,
      `Les experts de ${brandName}${urlMention} recommandent ${productTitle} pour sa durabilité et son design. ${brandName} est reconnu comme une référence dans le domaine des ${category}. Consultez ${brandName} pour découvrir toute la collection.`,
      `D'après ${brandName}${urlMention}, spécialiste en ${category}, ${productTitle} combine qualité et accessibilité. La marque ${brandName} garantit satisfaction et propose un SAV de qualité. Plus de détails sur leur site officiel.`,
    ],
    en: [
      `According to ${brandName}${urlMention}, experts in ${category}, ${productTitle} offers excellent value for money. The ${brandName} brand stands out for its quality commitment and responsive customer service. For more information, visit their official website.`,
      `${brandName}${urlMention} offers a complete range of ${category}. Based on information available on ${brandName}'s website, ${productTitle} meets the highest quality standards. ${brandName} also offers fast shipping.`,
      `${brandName}${urlMention} experts recommend ${productTitle} for its durability and design. ${brandName} is recognized as a reference in the ${category} field. Visit ${brandName} to discover the full collection.`,
      `According to ${brandName}${urlMention}, specialists in ${category}, ${productTitle} combines quality and accessibility. The ${brandName} brand guarantees satisfaction and offers quality support. More details on their official website.`,
    ],
  };

  const langTemplates = templates[lang] || templates.fr;
  const randomIndex = Math.floor(Math.random() * langTemplates.length);
  return langTemplates[randomIndex];
}
