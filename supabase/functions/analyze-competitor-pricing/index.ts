import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompetitorPrice {
  url: string;
  title: string;
  price: number;
  currency: string;
  similarity: number;
  imageUrl?: string;
  source: string;
}

async function generateSearchQueries(productTitle: string): Promise<string[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const prompt = `Génère 3 requêtes de recherche Google optimales pour trouver ce produit en ligne:
"${productTitle}"

Réponds UNIQUEMENT avec un tableau JSON de 3 chaînes de caractères, sans markdown:
["requête 1", "requête 2", "requête 3"]`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return [productTitle, `${productTitle} prix`, `acheter ${productTitle}`];

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return [productTitle, `${productTitle} prix`, `acheter ${productTitle}`];
  } catch (error) {
    console.error("Search query generation error:", error);
    return [productTitle, `${productTitle} prix`, `acheter ${productTitle}`];
  }
}

async function searchCompetitorPrices(
  productTitle: string, 
  productImage: string
): Promise<CompetitorPrice[]> {
  const GOOGLE_CSE_API_KEY = Deno.env.get("GOOGLE_CSE_API_KEY");
  const GOOGLE_CSE_ID = Deno.env.get("GOOGLE_CSE_ID");
  
  if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_ID) {
    console.warn("⚠️ Google Custom Search API non configurée");
    return [];
  }

  console.log(`🔍 Searching competitors for: ${productTitle}`);

  // Generate optimized search queries
  const queries = await generateSearchQueries(productTitle);
  console.log(`📝 Generated queries:`, queries);

  const allCompetitors: CompetitorPrice[] = [];

  // Limit to 2 queries to save quota (100 requests/day max)
  for (const query of queries.slice(0, 2)) {
    try {
      const searchUrl = new URL("https://www.googleapis.com/customsearch/v1");
      searchUrl.searchParams.set("key", GOOGLE_CSE_API_KEY);
      searchUrl.searchParams.set("cx", GOOGLE_CSE_ID);
      searchUrl.searchParams.set("q", query);
      searchUrl.searchParams.set("num", "10");
      searchUrl.searchParams.set("gl", "fr"); // France

      const response = await fetch(searchUrl.toString());
      
      if (!response.ok) {
        console.error(`❌ Google Search API error: ${response.status}`);
        if (response.status === 429) {
          console.warn("⚠️ Quota Google dépassé");
        }
        continue;
      }

      const data = await response.json();
      const items = data.items || [];

      console.log(`📦 Found ${items.length} results for: "${query}"`);

      for (const item of items) {
        // Extract price from snippet or title
        const text = `${item.title} ${item.snippet}`;
        const priceMatch = text.match(/(\d+[,\s]*\d*)\s*€|€\s*(\d+[,\s]*\d*)/);
        
        if (!priceMatch) continue; // Skip if no price found

        const priceStr = (priceMatch[1] || priceMatch[2]).replace(/[\s,]/g, '.');
        const price = parseFloat(priceStr);
        
        if (isNaN(price) || price < 1) continue; // Invalid price

        // Try to get image from pagemap
        let imageUrl: string | undefined;
        try {
          const pagemap = item.pagemap || {};
          const cseImage = pagemap.cse_image?.[0]?.src;
          const metatags = pagemap.metatags?.[0];
          imageUrl = cseImage || metatags?.["og:image"] || metatags?.["twitter:image"];
        } catch (e) {
          // No image found
        }

        // Compare images if both available
        let similarity = 0.8; // Default similarity
        if (productImage && imageUrl) {
          try {
            similarity = await compareProductImages(productImage, imageUrl);
            console.log(`🖼️ Image similarity: ${(similarity * 100).toFixed(0)}% for ${item.link}`);
          } catch (e) {
            console.warn("⚠️ Image comparison failed, using default similarity");
          }
        }

        // Only keep competitors with good similarity
        if (similarity >= 0.6) {
          allCompetitors.push({
            url: item.link,
            title: item.title,
            price,
            currency: "EUR",
            similarity,
            imageUrl,
            source: new URL(item.link).hostname,
          });
        }
      }

      // Small delay between queries
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`❌ Error searching for "${query}":`, error);
    }
  }

  // Sort by similarity and remove duplicates
  const uniqueCompetitors = allCompetitors
    .filter((c, index, self) => 
      index === self.findIndex(t => t.url === c.url)
    )
    .sort((a, b) => b.similarity - a.similarity);

  console.log(`✅ Total unique competitors found: ${uniqueCompetitors.length}`);

  return uniqueCompetitors;
}

async function compareProductImages(
  productImage: string,
  competitorImage: string
): Promise<number> {
  if (!productImage || !competitorImage) return 0.8; // Default similarity

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return 0.8;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: productImage } },
            { type: "image_url", image_url: { url: competitorImage } },
            { 
              type: "text", 
              text: "Ces deux produits sont-ils identiques ou très similaires? Réponds uniquement avec un score de 0.0 à 1.0" 
            }
          ]
        }]
      }),
    });

    if (!response.ok) return 0.8;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const score = parseFloat(content);
    
    return isNaN(score) ? 0.8 : Math.max(0, Math.min(1, score));
  } catch (error) {
    console.error("Image comparison error:", error);
    return 0.8;
  }
}

function calculateNetMargin(
  salesPrice: number,
  costPrice: number,
  shippingCost: number,
  taxRate: number
): number {
  // Formule: (prix vente - livraison) / (1 + TVA) - coût revient
  const priceExcludingTax = (salesPrice - shippingCost) / (1 + taxRate / 100);
  const netMargin = priceExcludingTax - costPrice;
  return netMargin;
}

async function analyzeWithAI(
  productTitle: string,
  productImage: string,
  productCost: number,
  shippingCost: number,
  competitorPrices: CompetitorPrice[],
  taxRate: number
): Promise<{ marketPrice: number | null; smartPrice: number | null; reasoning: string; competitors: CompetitorPrice[] }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  // CRITICAL: Ne calculer un prix QUE si on a de vrais concurrents
  if (!competitorPrices || competitorPrices.length < 3) {
    console.warn(`⚠️ Pas assez de concurrents trouvés (${competitorPrices.length}/3 minimum)`);
    return {
      marketPrice: null,
      smartPrice: null,
      reasoning: "Analyse impossible: aucune donnée concurrente trouvée. Intégrez une API de recherche web (SerpAPI) pour obtenir des prix réels.",
      competitors: []
    };
  }

  // Sort by similarity and take top 10
  const top10Competitors = competitorPrices
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10);

  const avgCompetitorPrice = top10Competitors.reduce((sum, p) => sum + p.price, 0) / top10Competitors.length;
  
  const prompt = `Tu es un expert en pricing e-commerce. Analyse ces données et suggère un prix optimal:

Produit: "${productTitle}"
Prix de revient: ${productCost}€
Frais de livraison: ${shippingCost}€
Taux de taxe (TVA): ${taxRate}%

CALCUL MARGE NETTE: (Prix vente - ${shippingCost}€) / ${1 + taxRate/100} - ${productCost}€

Prix concurrents trouvés (${top10Competitors.length}):
${top10Competitors.map((p, i) => `${i + 1}. ${p.source}: ${p.price.toFixed(2)}€ (similarité: ${(p.similarity * 100).toFixed(0)}%)`).join('\n')}

Prix moyen marché: ${avgCompetitorPrice.toFixed(2)}€

Objectifs:
1. Assurer une marge nette minimale de 15%
2. Rester compétitif (idéalement -3% à -5% sous la moyenne marché)
3. Maximiser le profit sans perdre de clients

Réponds UNIQUEMENT avec un objet JSON (sans markdown):
{
  "smartPrice": nombre,
  "reasoning": "explication courte en 2-3 lignes sur la stratégie de prix"
}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit atteint. Réessayez dans quelques instants.");
      }
      if (response.status === 402) {
        throw new Error("Crédits épuisés. Ajoutez des crédits à votre workspace Lovable.");
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error("No AI response");

    let jsonStr = content;
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const aiResponse = JSON.parse(jsonStr);

    return {
      marketPrice: avgCompetitorPrice,
      smartPrice: aiResponse.smartPrice,
      reasoning: aiResponse.reasoning,
      competitors: top10Competitors
    };
  } catch (error) {
    console.error("AI Analysis error:", error);
    // PLUS DE FALLBACK - Si l'analyse échoue, on retourne null
    return {
      marketPrice: null,
      smartPrice: null,
      reasoning: `Erreur d'analyse IA: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      competitors: top10Competitors
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 [ANALYZE-PRICING] Starting AI price analysis...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) throw new Error('Unauthorized');

    const { productIds, taxRate } = await req.json();

    if (!productIds || productIds.length === 0) {
      throw new Error('No products specified');
    }

    console.log(`📊 Analyzing ${productIds.length} products...`);

    const results = [];

    for (const productId of productIds) {
      try {
        // Get product details
        const { data: product, error: productError } = await supabase
          .from('shopify_products')
          .select(`
            id,
            title,
            image_url,
            price,
            cost_price,
            shipping_cost,
            product_variants!product_id(cost_price)
          `)
          .eq('id', productId)
          .single();

        if (productError || !product) {
          console.warn(`⚠️ Product ${productId} not found`);
          continue;
        }

        // Get average cost if multiple variants
        const variants = (product as any).product_variants || [];
        const avgCost = variants.length > 0
          ? variants.reduce((sum: number, v: any) => sum + (v.cost_price || 0), 0) / variants.length
          : product.cost_price || 0;

        const shippingCost = product.shipping_cost || 5.99;

        console.log(`🔍 Analyzing: ${product.title}`);

        // Search competitor prices
        const competitorPrices = await searchCompetitorPrices(
          product.title,
          product.image_url || ''
        );

        console.log(`📈 Found ${competitorPrices.length} competitor prices`);

        // Analyze with AI
        const analysis = await analyzeWithAI(
          product.title,
          product.image_url || '',
          avgCost,
          shippingCost,
          competitorPrices,
          taxRate || 20
        );

        // Calculate net margin SEULEMENT si smartPrice existe
        const netMargin = analysis.smartPrice 
          ? calculateNetMargin(analysis.smartPrice, avgCost, shippingCost, taxRate || 20)
          : null;

        results.push({
          productId: product.id,
          title: product.title,
          currentPrice: product.price,
          costPrice: avgCost,
          shippingCost,
          marketPrice: analysis.marketPrice,
          smartPrice: analysis.smartPrice,
          netMargin: netMargin ? Math.round(netMargin * 100) / 100 : null,
          reasoning: analysis.reasoning,
          competitors: analysis.competitors,
          competitorCount: analysis.competitors.length,
        });

        if (analysis.smartPrice) {
          console.log(`✅ ${product.title}: ${analysis.smartPrice}€ (marché: ${analysis.marketPrice?.toFixed(2)}€, marge: ${netMargin?.toFixed(2)}€)`);
        } else {
          console.log(`⚠️ ${product.title}: Analyse impossible - pas de concurrents trouvés`);
        }

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error analyzing product ${productId}:`, error);
        results.push({
          productId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`🎉 Analysis complete: ${results.length} products processed`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        total: productIds.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ [ANALYZE-PRICING] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
