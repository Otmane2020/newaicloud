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

// Nouvelle fonction: Recherche Google Shopping avec DataForSEO
async function searchWithDataForSEOShopping(keyword: string): Promise<PriceData[]> {
  const DATAFORSEO_LOGIN = Deno.env.get('DATAFORSEO_LOGIN');
  const DATAFORSEO_PASSWORD = Deno.env.get('DATAFORSEO_PASSWORD');
  
  if (!DATAFORSEO_LOGIN || !DATAFORSEO_PASSWORD) {
    throw new Error('DataForSEO non configuré');
  }

  console.log(`🛍️ DataForSEO Shopping: Searching for "${keyword}"`);

  const endpoint = 'https://api.dataforseo.com/v3/merchant/google/products/live/advanced';
  
  const payload = [{
    keyword: keyword,
    location_code: 2250, // France
    language_code: "fr",
    depth: 20,
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
    console.error(`❌ DataForSEO Shopping error: ${response.status} - ${errorText}`);
    throw new Error(`DataForSEO Shopping error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.tasks?.[0]?.status_code !== 20000) {
    console.error('❌ DataForSEO Shopping API error:', data.tasks?.[0]?.status_message);
    throw new Error(data.tasks?.[0]?.status_message || 'DataForSEO Shopping error');
  }

  const items = data.tasks[0].result[0].items || [];
  console.log(`🛒 DataForSEO Shopping returned ${items.length} products`);

  const priceData: PriceData[] = [];

  for (const item of items) {
    const price = item.price || item.price_value;
    const currency = item.currency || 'EUR';
    
    if (price && item.url) {
      priceData.push({
        price: parseFloat(price),
        currency: currency,
        url: item.url,
        title: item.title || keyword,
        imageUrl: item.thumbnail || item.image,
        source: 'shopping'
      });
    }
  }

  console.log(`✅ Extracted ${priceData.length} prices from DataForSEO Shopping`);
  return priceData;
}

// Recherche SERP organique avec DataForSEO
async function searchWithDataForSEO(keyword: string): Promise<PriceData[]> {
  const DATAFORSEO_LOGIN = Deno.env.get('DATAFORSEO_LOGIN');
  const DATAFORSEO_PASSWORD = Deno.env.get('DATAFORSEO_PASSWORD');
  
  if (!DATAFORSEO_LOGIN || !DATAFORSEO_PASSWORD) {
    throw new Error('DataForSEO non configuré');
  }

  console.log(`🔍 DataForSEO Organic: Searching for "${keyword}"`);

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
  source?: 'serp' | 'image_search' | 'shopping';
}

// Google Image Search for visual product matching
async function searchWithGoogleImages(
  imageUrl: string,
  productTitle: string
): Promise<PriceData[]> {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_CSE_API_KEY');
  const SEARCH_ENGINE_ID = Deno.env.get('GOOGLE_CSE_ID');
  
  if (!GOOGLE_API_KEY || !SEARCH_ENGINE_ID) {
    console.warn('⚠️ Google Custom Search API not configured');
    return [];
  }

  console.log(`🖼️ Google Image Search for: ${productTitle}`);
  
  const endpoint = `https://www.googleapis.com/customsearch/v1`;
  const params = new URLSearchParams({
    key: GOOGLE_API_KEY,
    cx: SEARCH_ENGINE_ID,
    q: productTitle,
    searchType: 'image',
    imgSize: 'large',
    num: '10',
    safe: 'active'
  });

  try {
    const response = await fetch(`${endpoint}?${params}`);
    
    if (!response.ok) {
      console.error(`❌ Google API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const items = data.items || [];
    
    console.log(`📸 Found ${items.length} visual matches`);
    
    const priceData: PriceData[] = [];
    
    for (const item of items) {
      const pageUrl = item.image?.contextLink || item.link;
      const imageUrl = item.link;
      const snippet = item.snippet || '';
      
      // Extract price from snippet or title
      const priceMatch = snippet.match(/(\d+[.,]\d{2})\s*€|€\s*(\d+[.,]\d{2})/);
      
      if (priceMatch && pageUrl) {
        const priceStr = (priceMatch[1] || priceMatch[2]).replace(/,/g, '.');
        const price = parseFloat(priceStr);
        
        if (!isNaN(price) && price > 1) {
          priceData.push({
            price,
            currency: 'EUR',
            url: pageUrl,
            title: item.title || productTitle,
            imageUrl: imageUrl,
            source: 'image_search'
          });
        }
      }
    }
    
    console.log(`✅ Extracted ${priceData.length} prices from Google Images`);
    return priceData;
  } catch (error) {
    console.error('❌ Google Image Search error:', error);
    return [];
  }
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

interface ImagePriceRange {
  minPrice: number | null;
  maxPrice: number | null;
  segment?: string;
}

// Estimation de la gamme de prix à partir de la photo (simulation recherche par image)
async function estimatePriceRangeFromImage(
  productImage: string,
  productTitle: string
): Promise<ImagePriceRange | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.warn('⚠️ Lovable API key not configured for image price range');
    return null;
  }

  try {
    console.log('🖼️ Estimating price range from product image...');

    const imgResp = await fetch(productImage);
    if (!imgResp.ok) {
      console.warn('⚠️ Cannot fetch product image for price estimation');
      return null;
    }

    const buffer = await imgResp.arrayBuffer();
    if (buffer.byteLength > 5 * 1024 * 1024) {
      console.warn('⚠️ Product image too large for price estimation');
      return null;
    }

    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const mimeType = imgResp.headers.get('content-type') || 'image/jpeg';

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
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            {
              type: 'text',
              text: `Ce produit est potentiellement HAUT DE GAMME.
Titre: "${productTitle}"

Simule une recherche Google par photo (Google Lens) pour des produits SIMILAIRES.
Devine la GAMME DE PRIX réaliste en euros pour ce type de produit sur le marché français.

Réponds UNIQUEMENT avec un JSON de la forme:
{"segment": "milieu de gamme" | "haut de gamme" | "luxe", "minPrice": 500, "maxPrice": 1200}`,
            },
          ],
        }],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.warn('⚠️ AI price range estimation failed with status', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content as string | undefined;
    const jsonMatch = content?.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const minPrice = typeof parsed.minPrice === 'number' ? parsed.minPrice : null;
    const maxPrice = typeof parsed.maxPrice === 'number' ? parsed.maxPrice : null;

    console.log('✅ Image-based price range:', parsed);
    return { minPrice, maxPrice, segment: parsed.segment };
  } catch (error) {
    console.error('⚠️ Image price range estimation error:', error);
    return null;
  }
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
  taxRate: number,
  imagePriceRange: ImagePriceRange | null = null,
  productType: string | null = null
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

    const list = top10.map((c, i) => {
      const sourceEmoji = c.source?.includes('🛍️') ? '[SHOPPING]' : c.source?.includes('🖼️') ? '[IMAGE]' : '[SERP]';
      return `${i + 1}. ${sourceEmoji} ${c.title.substring(0, 50)} - ${c.price.toFixed(2)}€ (${(c.similarity * 100).toFixed(0)}%)`;
    }).join('\n');

    const shoppingCount = top10.filter(c => c.source?.includes('🛍️')).length;
    const imageCount = top10.filter(c => c.source?.includes('🖼️')).length;

    const prompt = `Expert pricing. Recommande prix optimal pour produit HAUT DE GAMME.

PRODUIT: "${productTitle}"
COÛTS: ${totalCost.toFixed(2)}€ | Min+30%: ${minPriceWithMargin.toFixed(2)}€
MARCHÉ: Moy ${avgCompetitorPrice.toFixed(2)}€ | Min ${Math.min(...competitorPrices.map(c => c.price)).toFixed(2)}€ | Max ${Math.max(...competitorPrices.map(c => c.price)).toFixed(2)}€${imagePriceRange && imagePriceRange.minPrice && imagePriceRange.maxPrice ? `

🎯 ANALYSE IMAGE (Google Lens):
Segment détecté: ${imagePriceRange.segment?.toUpperCase() || 'NON DÉFINI'}
Gamme de prix estimée: ${imagePriceRange.minPrice.toFixed(2)}€ - ${imagePriceRange.maxPrice.toFixed(2)}€
⚠️ Cette estimation basée sur l'image du produit indique le niveau de gamme et la fourchette de prix attendue.` : ''}

SOURCES DE PRIX (par fiabilité):
- 🛍️ Google Shopping (${shoppingCount}): HAUTE FIABILITÉ - prix réels produits similaires
- 🖼️ Image Search (${imageCount}): FIABILITÉ MOYENNE - basé sur visuel
- SERP organique: FAIBLE FIABILITÉ - peut inclure produits gamme différente

TOP 10 CONCURRENTS:
${list}

⚠️ RÈGLES DE PRICING HAUT DE GAMME:
1. Privilégie les prix [SHOPPING] qui sont les plus précis${imagePriceRange && imagePriceRange.segment ? `
2. Le segment détecté "${imagePriceRange.segment}" suggère un positionnement ${imagePriceRange.segment === 'luxe' ? 'très premium' : imagePriceRange.segment === 'haut de gamme' ? 'haut de gamme' : 'standard'}` : ''}
3. Pour un produit HAUT DE GAMME, le prix doit être significativement au-dessus de la moyenne
4. Vise les concurrents dans la fourchette HAUTE (top 30%)${imagePriceRange && imagePriceRange.maxPrice ? `
5. Prix conseillé entre ${(imagePriceRange.minPrice || 0).toFixed(2)}€ et ${imagePriceRange.maxPrice.toFixed(2)}€ selon analyse image` : ''}

JSON: {"smartPrice": 89.90, "reasoning": "Positionnement haut de gamme: [analyse des concurrents haut de gamme] + [justification du prix]"}
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

    const { productIds, variantId, taxRate = 0, debugImageOnly = false } = await req.json();

    if (!productIds || productIds.length === 0) {
      throw new Error('No products specified');
    }

    console.log(`📊 Analyzing ${productIds.length} products${variantId ? ' (variant-specific)' : ''} with SERP + Vision...`);

    const results = [];

    for (const productId of productIds) {
      try {
        // Get product details
        let query = supabase
          .from('shopify_products')
          .select(`
            id,
            title,
            image_url,
            price,
            cost_price,
            shipping_cost,
            product_type,
            product_variants!product_id(id, cost_price, price, image_url, title, option1, option2, option3)
          `)
          .eq('id', productId);

        const { data: product, error: productError } = await query.single();

        if (productError || !product) {
          console.warn(`⚠️ Product ${productId} not found`);
          continue;
        }

        // Si on analyse une variante spécifique
        if (variantId) {
          const variant = ((product as any).product_variants || []).find((v: any) => v.id === variantId);
          
          if (!variant) {
            console.warn(`⚠️ Variant ${variantId} not found`);
            continue;
          }

          console.log(`\n🔍 Analyzing variant: ${product.title} - ${variant.option1}${variant.option2 ? ' / ' + variant.option2 : ''}${variant.option3 ? ' / ' + variant.option3 : ''}`);
          
          const variantTitle = `${product.title} ${variant.option1 || ''} ${variant.option2 || ''} ${variant.option3 || ''}`.trim();
          const variantImageUrl = variant.image_url || product.image_url;
          const variantPrice = variant.price;
          const variantCost = variant.cost_price || 0;
          const shippingCost = product.shipping_cost || 5.99;

          console.log(`💰 Costs - Variant: ${variantCost}€, Shipping: ${shippingCost}€`);

          // Estimation de la gamme de prix à partir de la PHOTO (simulation recherche par image)
          let imagePriceRange: ImagePriceRange | null = null;
          if (variantImageUrl) {
            try {
              imagePriceRange = await estimatePriceRangeFromImage(variantImageUrl, variantTitle);
            } catch (error) {
              console.error('⚠️ Image price range estimation failed:', error);
            }
          }

          // Si mode debug image only, retourner uniquement l'estimation
          if (debugImageOnly) {
            results.push({
              productId,
              variantId,
              imagePriceRange: imagePriceRange || { minPrice: null, maxPrice: null, segment: 'N/A' }
            });
            continue;
          }

          // Étape 1: Générer requêtes optimisées pour la variante
          const queries = await generateSearchQueries(variantTitle);

          // Étape 2: PRIORITÉ - Recherche Google Shopping avec DataForSEO
          const allPriceData: PriceData[] = [];
          
          console.log('🛍️ Starting DataForSEO Google Shopping Search (Priority)...');
          for (const query of queries.slice(0, 2)) {
            try {
              const shoppingPrices = await searchWithDataForSEOShopping(query);
              shoppingPrices.forEach(p => p.source = 'shopping');
              allPriceData.push(...shoppingPrices);
              console.log(`✅ Found ${shoppingPrices.length} prices from Shopping for "${query}"`);
              await new Promise(resolve => setTimeout(resolve, 1200));
            } catch (error) {
              console.error(`❌ DataForSEO Shopping failed for "${query}":`, error);
            }
          }

          // Étape 3: Recherche par image
          if (variantImageUrl) {
            console.log('🖼️ Starting Google Image Search (complementary)...');
            try {
              const imageResults = await searchWithGoogleImages(variantImageUrl, variantTitle);
              allPriceData.push(...imageResults);
              await new Promise(resolve => setTimeout(resolve, 800));
            } catch (error) {
              console.error('❌ Google Image Search failed:', error);
            }
          }

          // Étape 4: Recherche SERP organique (fallback)
          for (const query of queries.slice(0, 1)) {
            try {
              const serpPrices = await searchWithDataForSEO(query);
              serpPrices.forEach(p => p.source = 'serp');
              allPriceData.push(...serpPrices);
              await new Promise(resolve => setTimeout(resolve, 1200));
            } catch (error) {
              console.error(`❌ DataForSEO Organic failed for "${query}":`, error);
            }
          }

          // Dédupliquer par URL
          const uniquePrices = Array.from(
            new Map(allPriceData.map(p => [p.url, p])).values()
          );

          console.log(`📈 Total unique prices found: ${uniquePrices.length}`);

          // Analyse visuelle
          const visionResults: { similarities: number[] } = { similarities: [] };
          const competitorImages = uniquePrices.filter(p => p.imageUrl).map(p => p.imageUrl!);

          if (variantImageUrl && competitorImages.length > 0) {
            console.log(`🖼️ Vision analysis for ${competitorImages.length} images`);
            try {
              const result = await analyzeProductWithVision(variantImageUrl, competitorImages);
              visionResults.similarities = result.similarities;
              console.log(`✅ Vision: ${visionResults.similarities.length} calculated`);
            } catch (error) {
              console.error('⚠️ Vision failed:', error);
            }
          }

          // Combiner les résultats
          const competitorPrices: CompetitorPrice[] = uniquePrices
            .map((data, index) => {
              let baseSimilarity = visionResults.similarities[index] ||
                (data.source === 'shopping' ? 0.95 :
                 data.source === 'image_search' ? 0.8 : 0.7);

              if (imagePriceRange && imagePriceRange.minPrice && imagePriceRange.maxPrice) {
                const min = imagePriceRange.minPrice;
                const max = imagePriceRange.maxPrice;

                if (data.price < min * 0.7) {
                  baseSimilarity *= 0.4;
                } else if (data.price < min) {
                  baseSimilarity *= 0.7;
                } else if (data.price >= min && data.price <= max * 1.2) {
                  baseSimilarity *= 1.1;
                }
              }

              return {
                url: data.url,
                title: data.title,
                price: data.price,
                currency: data.currency,
                similarity: Math.min(baseSimilarity, 1.0),
                imageUrl: data.imageUrl,
                source: `${data.source}${
                  data.source === 'shopping' ? ' 🛍️' : 
                  data.source === 'image_search' ? ' 🖼️' : ''
                }`
              } as CompetitorPrice;
            })
            .filter(c => c.similarity >= 0.5)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 15);

          console.log(`✅ ${competitorPrices.length} relevant competitors`);

          // Analyse AI finale
          const analysis = await analyzeWithAI(
            variantTitle,
            variantCost,
            shippingCost,
            competitorPrices,
            taxRate || 20,
            imagePriceRange
          );

          const netMargin = analysis.smartPrice 
            ? calculateNetMargin(analysis.smartPrice, variantCost, shippingCost, taxRate || 20)
            : null;

          results.push({
            productId: productId,
            variantId: variantId,
            title: variantTitle,
            currentPrice: variantPrice,
            costPrice: variantCost,
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

          console.log(`✅ ${variantTitle}:`);
          console.log(`   Smart: ${analysis.smartPrice}€, Market: ${analysis.marketPrice?.toFixed(2)}€, Margin: ${netMargin?.toFixed(2)}€`);

          continue;
        }

        // Sinon, analyse du produit normal (code existant)
        // Get average cost if multiple variants
        const variants = (product as any).product_variants || [];
        const avgCost = variants.length > 0
          ? variants.reduce((sum: number, v: any) => sum + (v.cost_price || 0), 0) / variants.length
          : product.cost_price || 0;

        const shippingCost = product.shipping_cost || 5.99;

        console.log(`\n🔍 Analyzing: ${product.title}`);
        console.log(`💰 Costs - Product: ${avgCost}€, Shipping: ${shippingCost}€`);

        // Estimation de la gamme de prix à partir de la PHOTO (simulation recherche par image)
        let imagePriceRange: ImagePriceRange | null = null;
        if (product.image_url) {
          try {
            imagePriceRange = await estimatePriceRangeFromImage(product.image_url, product.title);
          } catch (error) {
            console.error('⚠️ Image price range estimation failed:', error);
          }
        }

        // Étape 1: Générer requêtes optimisées (titre + contexte global)
        const queries = await generateSearchQueries(product.title);

        // Étape 2: PRIORITÉ - Recherche Google Shopping avec DataForSEO (le plus précis pour le pricing)
        const allPriceData: PriceData[] = [];
        
        console.log('🛍️ Starting DataForSEO Google Shopping Search (Priority)...');
        for (const query of queries.slice(0, 2)) {
          try {
            const shoppingPrices = await searchWithDataForSEOShopping(query);
            // Mark Shopping results with highest priority
            shoppingPrices.forEach(p => p.source = 'shopping');
            allPriceData.push(...shoppingPrices);
            console.log(`✅ Found ${shoppingPrices.length} prices from Shopping for "${query}"`);
            await new Promise(resolve => setTimeout(resolve, 1200));
          } catch (error) {
            console.error(`❌ DataForSEO Shopping failed for "${query}":`, error);
          }
        }

        // Étape 3: Recherche par image avec Google Custom Search (complémentaire)
        if (product.image_url) {
          console.log('🖼️ Starting Google Image Search (complementary)...');
          try {
            const imageResults = await searchWithGoogleImages(product.image_url, product.title);
            allPriceData.push(...imageResults);
            await new Promise(resolve => setTimeout(resolve, 800));
          } catch (error) {
            console.error('❌ Google Image Search failed:', error);
          }
        }

        // Étape 4: Recherche SERP organique avec DataForSEO (fallback)
        for (const query of queries.slice(0, 1)) {
          try {
            const serpPrices = await searchWithDataForSEO(query);
            // Mark SERP results with lower priority
            serpPrices.forEach(p => p.source = 'serp');
            allPriceData.push(...serpPrices);
            await new Promise(resolve => setTimeout(resolve, 1200));
          } catch (error) {
            console.error(`❌ DataForSEO Organic failed for "${query}":`, error);
          }
        }

        // Dédupliquer par URL
        const uniquePrices = Array.from(
          new Map(allPriceData.map(p => [p.url, p])).values()
        );

        console.log(`📈 Total unique prices found: ${uniquePrices.length} (${allPriceData.filter(p => p.source === 'shopping').length} from Shopping, ${allPriceData.filter(p => p.source === 'image_search').length} from images, ${allPriceData.filter(p => p.source === 'serp').length} from SERP)`);

        // Étape 4: Analyse visuelle avec Gemini
        const visionResults: { similarities: number[] } = { similarities: [] };
        const competitorImages = uniquePrices.filter(p => p.imageUrl).map(p => p.imageUrl!);

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

        // Étape 5: Combiner Shopping + Image Search + SERP + Vision + estimation prix par photo
        const competitorPrices: CompetitorPrice[] = uniquePrices
          .map((data, index) => {
            // Prioriser les résultats Shopping (0.95) > Image Search (0.8) > SERP (0.7)
            let baseSimilarity = visionResults.similarities[index] ||
              (data.source === 'shopping' ? 0.95 :
               data.source === 'image_search' ? 0.8 : 0.7);

            // Ajuster la similarité selon la fourchette de prix estimée à partir de la PHOTO
            if (imagePriceRange && imagePriceRange.minPrice && imagePriceRange.maxPrice) {
              const min = imagePriceRange.minPrice;
              const max = imagePriceRange.maxPrice;

              if (data.price < min * 0.5) {
                // Beaucoup moins cher que ce que la photo suggère → probablement entrée/milieu de gamme
                baseSimilarity *= 0.4;
              } else if (data.price < min) {
                // Un peu en dessous de la gamme attendue
                baseSimilarity *= 0.7;
              } else if (data.price >= min && data.price <= max * 1.2) {
                // Dans ou proche de la fourchette attendue → booster légèrement
                baseSimilarity *= 1.1;
              }
            }

            return {
              url: data.url,
              title: data.title,
              price: data.price,
              currency: data.currency,
              similarity: Math.min(1, baseSimilarity),
              imageUrl: data.imageUrl,
              source: `${new URL(data.url).hostname}${
                data.source === 'shopping' ? ' 🛍️' : 
                data.source === 'image_search' ? ' 🖼️' : ''
              }`
            } as CompetitorPrice;
          })
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
          taxRate || 20,
          imagePriceRange
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
