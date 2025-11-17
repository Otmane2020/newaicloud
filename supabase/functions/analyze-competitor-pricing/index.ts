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
  if (!LOVABLE_API_KEY) {
    console.warn('⚠️ Lovable API key not configured');
    return [productTitle, `${productTitle} prix`, `acheter ${productTitle}`];
  }

  const prompt = `Génère 3 requêtes de recherche Google Shopping optimales pour trouver ce produit et ses prix:
"${productTitle}"

Réponds UNIQUEMENT avec un tableau JSON de 3 chaînes:
["requête 1", "requête 2", "requête 3"]`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      console.warn(`⚠️ Lovable AI error: ${response.status}`);
      return [productTitle, `${productTitle} prix`, `acheter ${productTitle}`];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    const jsonMatch = content?.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const queries = JSON.parse(jsonMatch[0]);
      console.log(`📝 Generated queries:`, queries);
      return queries;
    }
    
    return [productTitle, `${productTitle} prix`, `acheter ${productTitle}`];
  } catch (error) {
    console.error("Search query generation error:", error);
    return [productTitle, `${productTitle} prix`, `acheter ${productTitle}`];
  }
}

// Nouvelle fonction: Recherche avec DataForSEO
async function searchWithDataForSEO(keyword: string): Promise<PriceData[]> {
  const DATAFORSEO_LOGIN = Deno.env.get('DATAFORSEO_LOGIN');
  const DATAFORSEO_PASSWORD = Deno.env.get('DATAFORSEO_PASSWORD');
  
  if (!DATAFORSEO_LOGIN || !DATAFORSEO_PASSWORD) {
    throw new Error('DataForSEO non configuré');
  }

  console.log(`🔍 DataForSEO: Searching for "${keyword}"`);

  const endpoint = 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced';
  
  const payload = [{
    keyword: keyword,
    language_code: "fr",
    location_code: 2250, // France
    depth: 30,
  }];

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ DataForSEO error: ${response.status} - ${errorText}`);
    throw new Error(`DataForSEO error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.tasks?.[0]?.status_code !== 20000) {
    console.error('❌ DataForSEO API error:', data.tasks?.[0]?.status_message);
    throw new Error(data.tasks?.[0]?.status_message || 'DataForSEO error');
  }

  const items = data.tasks[0].result[0].items || [];
  console.log(`📦 DataForSEO returned ${items.length} results`);

  const priceData: PriceData[] = [];

  for (const item of items) {
    const text = `${item.title || ''} ${item.description || ''}`;
    const priceMatch = text.match(/(\d+[,\s]*\d*)\s*€|€\s*(\d+[,\s]*\d*)/);
    
    if (priceMatch) {
      const priceStr = (priceMatch[1] || priceMatch[2]).replace(/[\s,]/g, '.');
      const price = parseFloat(priceStr);
      
      if (!isNaN(price) && price > 1) {
        priceData.push({
          price,
          currency: 'EUR',
          url: item.url || '',
          title: item.title || '',
          imageUrl: item.images?.[0]?.url
        });
      }
    }
  }

  console.log(`✅ Extracted ${priceData.length} prices from DataForSEO`);
  return priceData;
}

interface PriceData {
  price: number;
  currency: string;
  url: string;
  title: string;
  imageUrl?: string;
}

// Analyse visuelle avec Gemini Vision
async function analyzeProductWithVision(
  productImage: string,
  competitorImages: string[]
): Promise<{ similarities: number[] }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.warn('⚠️ Lovable API key not configured');
    return { similarities: [] };
  }

  console.log(`🖼️ Analyzing ${competitorImages.length} images with Vision`);

  const similarities: number[] = [];

  for (const compImage of competitorImages.slice(0, 5)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const [prodResp, compResp] = await Promise.all([
        fetch(productImage, { signal: controller.signal }),
        fetch(compImage, { signal: controller.signal })
      ]);
      clearTimeout(timeoutId);

      if (!prodResp.ok || !compResp.ok) continue;

      const [prodBuffer, compBuffer] = await Promise.all([
        prodResp.arrayBuffer(),
        compResp.arrayBuffer()
      ]);

      if (prodBuffer.byteLength > 5 * 1024 * 1024 || compBuffer.byteLength > 5 * 1024 * 1024) continue;

      const prodBase64 = btoa(String.fromCharCode(...new Uint8Array(prodBuffer)));
      const compBase64 = btoa(String.fromCharCode(...new Uint8Array(compBuffer)));

      const prodMimeType = prodResp.headers.get('content-type') || 'image/jpeg';
      const compMimeType = compResp.headers.get('content-type') || 'image/jpeg';

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${prodMimeType};base64,${prodBase64}` } },
              { type: 'image_url', image_url: { url: `data:${compMimeType};base64,${compBase64}` } },
              { type: 'text', text: `Ces 2 produits sont-ils similaires? Réponds avec JSON: {"similarity": 0.85, "reasoning": "court"}` }
            ]
          }],
          temperature: 0.3,
          max_tokens: 200,
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          similarities.push(result.similarity || 0.5);
          console.log(`✅ Similarity: ${(result.similarity * 100).toFixed(0)}%`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 800));

    } catch (error: any) {
      console.error('⚠️ Vision error:', error.name === 'AbortError' ? 'Timeout' : error.message);
    }
  }

  return { similarities };
}

// Supprimé - remplacé par searchWithDataForSEO + analyzeProductWithVision

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
  costPrice: number,
  shippingCost: number,
  competitorPrices: CompetitorPrice[],
  taxRate: number
): Promise<{ marketPrice: number | null; smartPrice: number | null; reasoning: string; competitors: CompetitorPrice[] }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  const totalCost = costPrice + shippingCost;
  const minPriceWithMargin = totalCost * 1.3;

  if (!competitorPrices || competitorPrices.length === 0) {
    const smartPrice = Math.round(minPriceWithMargin * 1.5 * 100) / 100;
    return {
      marketPrice: null,
      smartPrice: smartPrice,
      reasoning: `Prix sans concurrents. Coûts ${totalCost.toFixed(2)}€ + marge 50%.`,
      competitors: []
    };
  }

  if (!LOVABLE_API_KEY) {
    const avgPrice = competitorPrices.reduce((sum, c) => sum + c.price, 0) / competitorPrices.length;
    return {
      marketPrice: avgPrice,
      smartPrice: Math.max(avgPrice, minPriceWithMargin),
      reasoning: "Prix moyen marché",
      competitors: competitorPrices.slice(0, 10)
    };
  }

  try {
    const avgCompetitorPrice = competitorPrices.reduce((sum, c) => sum + c.price, 0) / competitorPrices.length;
    const top10 = competitorPrices.slice(0, 10);

    const list = top10.map((c, i) => `${i + 1}. ${c.title.substring(0, 60)} - ${c.price.toFixed(2)}€ (${(c.similarity * 100).toFixed(0)}%)`).join('\n');

    const prompt = `Pricing expert. Recommande prix optimal.

PRODUIT: "${productTitle}"
COÛTS: ${totalCost.toFixed(2)}€ | Min+30%: ${minPriceWithMargin.toFixed(2)}€
MARCHÉ: Moy ${avgCompetitorPrice.toFixed(2)}€ | Min ${Math.min(...competitorPrices.map(c => c.price)).toFixed(2)}€ | Max ${Math.max(...competitorPrices.map(c => c.price)).toFixed(2)}€

TOP 10:
${list}

JSON: {"smartPrice": 89.90, "reasoning": "stratégie"}
smartPrice ≥ ${minPriceWithMargin.toFixed(2)}€`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 500,
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${response.status}`);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const jsonMatch = content?.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error("Invalid format");

    const aiResponse = JSON.parse(jsonMatch[0]);
    const finalPrice = Math.max(aiResponse.smartPrice, minPriceWithMargin);

    return {
      marketPrice: avgCompetitorPrice,
      smartPrice: Math.round(finalPrice * 100) / 100,
      reasoning: aiResponse.reasoning,
      competitors: top10
    };
  } catch (error) {
    const avgPrice = competitorPrices.reduce((sum, c) => sum + c.price, 0) / competitorPrices.length;
    return {
      marketPrice: avgPrice,
      smartPrice: Math.max(avgPrice, minPriceWithMargin),
      reasoning: `Fallback: moyenne marché`,
      competitors: competitorPrices.slice(0, 10)
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 [ANALYZE-PRICING] Enhanced analysis: DataForSEO + Gemini Vision');
    
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

    console.log(`📊 Analyzing ${productIds.length} products with SERP + Vision...`);

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

        console.log(`\n🔍 Analyzing: ${product.title}`);
        console.log(`💰 Costs - Product: ${avgCost}€, Shipping: ${shippingCost}€`);

        // Étape 1: Générer requêtes optimisées
        const queries = await generateSearchQueries(product.title);

        // Étape 2: Recherche SERP avec DataForSEO
        const allPriceData: PriceData[] = [];
        
        for (const query of queries.slice(0, 2)) {
          try {
            const serpPrices = await searchWithDataForSEO(query);
            allPriceData.push(...serpPrices);
            await new Promise(resolve => setTimeout(resolve, 1200));
          } catch (error) {
            console.error(`❌ DataForSEO failed for "${query}":`, error);
          }
        }

        console.log(`📈 Total prices found: ${allPriceData.length}`);

        // Étape 3: Analyse visuelle avec Gemini
        const visionResults: { similarities: number[] } = { similarities: [] };
        const competitorImages = allPriceData.filter(p => p.imageUrl).map(p => p.imageUrl!);

        if (product.image_url && competitorImages.length > 0) {
          console.log(`🖼️ Vision analysis for ${competitorImages.length} images`);
          try {
            const result = await analyzeProductWithVision(product.image_url, competitorImages);
            visionResults.similarities = result.similarities;
            console.log(`✅ Vision: ${visionResults.similarities.length} calculated`);
          } catch (error) {
            console.error('⚠️ Vision failed:', error);
          }
        }

        // Étape 4: Combiner SERP + Vision
        const competitorPrices: CompetitorPrice[] = allPriceData
          .map((data, index) => ({
            url: data.url,
            title: data.title,
            price: data.price,
            currency: data.currency,
            similarity: visionResults.similarities[index] || 0.7,
            imageUrl: data.imageUrl,
            source: new URL(data.url).hostname
          }))
          .filter(c => c.similarity >= 0.5)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 15);

        console.log(`✅ ${competitorPrices.length} relevant competitors`);

        // Étape 5: Analyse AI finale
        const analysis = await analyzeWithAI(
          product.title,
          avgCost,
          shippingCost,
          competitorPrices,
          taxRate || 20
        );

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
          visionAnalysis: {
            analyzedImages: visionResults.similarities.length,
            avgSimilarity: visionResults.similarities.length > 0
              ? Math.round(visionResults.similarities.reduce((a, b) => a + b, 0) / visionResults.similarities.length * 100) / 100
              : null
          }
        });

        console.log(`✅ ${product.title}:`);
        console.log(`   Smart: ${analysis.smartPrice}€, Market: ${analysis.marketPrice?.toFixed(2)}€, Margin: ${netMargin?.toFixed(2)}€`);

        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error analyzing product ${productId}:`, error);
        results.push({
          productId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`\n✅ Analysis complete: ${results.length} products`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: productIds.length,
          analyzed: results.filter(r => !r.error).length,
          failed: results.filter(r => r.error).length
        }
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
