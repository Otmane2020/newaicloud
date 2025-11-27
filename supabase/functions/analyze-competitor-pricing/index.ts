import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= UTILITY FUNCTIONS =============

// Generate unique request ID for tracing
function generateRequestId(): string {
  return `REQ-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase();
}

// Global timeout wrapper for API calls
const DEFAULT_TIMEOUT_MS = 15000;

async function withTimeout<T>(promise: Promise<T>, ms: number = DEFAULT_TIMEOUT_MS, operation: string = 'operation'): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout: ${operation} exceeded ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// Sanitize competitor URLs (remove tracking params)
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'aff_id', 'gclid', 'fbclid', 'tag', 'source', 'clickid'];
    trackingParams.forEach(param => parsed.searchParams.delete(param));
    return parsed.toString();
  } catch {
    return url;
  }
}

// Fetch image as Data URI (robust version from smart-price-scanner)
async function fetchImageAsDataUri(imageUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'image/*' }
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 5 * 1024 * 1024) {
      console.warn('⚠️ Image too large (>5MB)');
      return null;
    }

    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`⚠️ Failed to fetch image: ${errorMsg}`);
    return null;
  }
}

// Calculate confidence score
function calculateConfidenceScore(
  shoppingCount: number,
  imageCount: number,
  serpCount: number,
  avgSimilarity: number | null,
  priceConsistency: number
): { score: number; breakdown: Record<string, number> } {
  const breakdown = {
    shopping: Math.min(shoppingCount * 7, 35), // 35% max for Shopping sources
    similarity: avgSimilarity ? Math.round(avgSimilarity * 25) : 0, // 25% for Vision similarity
    serp: Math.min(serpCount * 3, 15), // 15% max for SERP
    images: Math.min(imageCount * 4, 10), // 10% for image search
    consistency: Math.round(priceConsistency * 15) // 15% for price consistency
  };
  
  const score = Math.min(100, breakdown.shopping + breakdown.similarity + breakdown.serp + breakdown.images + breakdown.consistency);
  
  return { score, breakdown };
}

// ============= INTERFACES =============

interface CompetitorPrice {
  url: string;
  title: string;
  price: number;
  currency: string;
  similarity: number;
  imageUrl?: string;
  source: string;
}

interface PriceData {
  price: number;
  currency: string;
  url: string;
  title: string;
  imageUrl?: string;
  source?: 'serp' | 'image_search' | 'shopping';
}

interface ImagePriceRange {
  minPrice: number | null;
  maxPrice: number | null;
  segment?: string;
}

// ============= SEARCH FUNCTIONS =============

async function generateSearchQueries(productTitle: string, requestId: string): Promise<string[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn(`[${requestId}] ⚠️ Lovable API key not configured`);
    return [productTitle, `${productTitle} prix`, `acheter ${productTitle}`];
  }

  const prompt = `Génère 3 requêtes de recherche Google Shopping optimales pour trouver ce produit et ses prix:
"${productTitle}"

Réponds UNIQUEMENT avec un tableau JSON de 3 chaînes:
["requête 1", "requête 2", "requête 3"]`;

  try {
    const startTime = Date.now();
    const response = await withTimeout(
      fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
      }),
      10000,
      'generateSearchQueries'
    );

    if (!response.ok) {
      console.warn(`[${requestId}] ⚠️ Lovable AI error: ${response.status}`);
      return [productTitle, `${productTitle} prix`, `acheter ${productTitle}`];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    const jsonMatch = content?.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const queries = JSON.parse(jsonMatch[0]);
      console.log(`[${requestId}] 📝 Generated queries in ${Date.now() - startTime}ms:`, queries);
      return queries;
    }
    
    return [productTitle, `${productTitle} prix`, `acheter ${productTitle}`];
  } catch (error) {
    console.error(`[${requestId}] Search query generation error:`, error);
    return [productTitle, `${productTitle} prix`, `acheter ${productTitle}`];
  }
}

async function searchWithDataForSEOShopping(keyword: string, requestId: string): Promise<PriceData[]> {
  const DATAFORSEO_LOGIN = Deno.env.get('DATAFORSEO_LOGIN');
  const DATAFORSEO_PASSWORD = Deno.env.get('DATAFORSEO_PASSWORD');
  
  if (!DATAFORSEO_LOGIN || !DATAFORSEO_PASSWORD) {
    throw new Error('DataForSEO non configuré');
  }

  console.log(`[${requestId}] 🛍️ DataForSEO Shopping: "${keyword}"`);
  const startTime = Date.now();

  const endpoint = 'https://api.dataforseo.com/v3/merchant/google/products/live/advanced';
  
  const payload = [{
    keyword: keyword,
    location_code: 2250,
    language_code: "fr",
    depth: 20,
  }];

  const response = await withTimeout(
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }),
    20000,
    'DataForSEO Shopping'
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[${requestId}] ❌ DataForSEO Shopping error: ${response.status} - ${errorText}`);
    throw new Error(`DataForSEO Shopping error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.tasks?.[0]?.status_code !== 20000) {
    console.error(`[${requestId}] ❌ DataForSEO Shopping API error:`, data.tasks?.[0]?.status_message);
    throw new Error(data.tasks?.[0]?.status_message || 'DataForSEO Shopping error');
  }

  const items = data.tasks[0].result[0].items || [];
  console.log(`[${requestId}] 🛒 DataForSEO Shopping: ${items.length} products in ${Date.now() - startTime}ms`);

  const priceData: PriceData[] = [];

  for (const item of items) {
    const price = item.price || item.price_value;
    const currency = item.currency || 'EUR';
    
    if (price && item.url) {
      priceData.push({
        price: parseFloat(price),
        currency: currency,
        url: sanitizeUrl(item.url),
        title: item.title || keyword,
        imageUrl: item.thumbnail || item.image,
        source: 'shopping'
      });
    }
  }

  console.log(`[${requestId}] ✅ Extracted ${priceData.length} prices from Shopping`);
  return priceData;
}

async function searchWithDataForSEO(keyword: string, requestId: string): Promise<PriceData[]> {
  const DATAFORSEO_LOGIN = Deno.env.get('DATAFORSEO_LOGIN');
  const DATAFORSEO_PASSWORD = Deno.env.get('DATAFORSEO_PASSWORD');
  
  if (!DATAFORSEO_LOGIN || !DATAFORSEO_PASSWORD) {
    throw new Error('DataForSEO non configuré');
  }

  console.log(`[${requestId}] 🔍 DataForSEO Organic: "${keyword}"`);
  const startTime = Date.now();

  const endpoint = 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced';
  
  const payload = [{
    keyword: keyword,
    language_code: "fr",
    location_code: 2250,
    depth: 30,
  }];

  const response = await withTimeout(
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }),
    20000,
    'DataForSEO Organic'
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[${requestId}] ❌ DataForSEO error: ${response.status} - ${errorText}`);
    throw new Error(`DataForSEO error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.tasks?.[0]?.status_code !== 20000) {
    console.error(`[${requestId}] ❌ DataForSEO API error:`, data.tasks?.[0]?.status_message);
    throw new Error(data.tasks?.[0]?.status_message || 'DataForSEO error');
  }

  const items = data.tasks[0].result[0].items || [];
  console.log(`[${requestId}] 📦 DataForSEO Organic: ${items.length} results in ${Date.now() - startTime}ms`);

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
          url: sanitizeUrl(item.url || ''),
          title: item.title || '',
          imageUrl: item.images?.[0]?.url
        });
      }
    }
  }

  console.log(`[${requestId}] ✅ Extracted ${priceData.length} prices from SERP`);
  return priceData;
}

async function searchWithGoogleImages(
  imageUrl: string,
  productTitle: string,
  requestId: string
): Promise<PriceData[]> {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_CSE_API_KEY');
  const SEARCH_ENGINE_ID = Deno.env.get('GOOGLE_CSE_ID');
  
  if (!GOOGLE_API_KEY || !SEARCH_ENGINE_ID) {
    console.warn(`[${requestId}] ⚠️ Google Custom Search API not configured`);
    return [];
  }

  console.log(`[${requestId}] 🖼️ Google Image Search: "${productTitle}"`);
  const startTime = Date.now();
  
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
    const response = await withTimeout(
      fetch(`${endpoint}?${params}`),
      15000,
      'Google Images'
    );
    
    if (!response.ok) {
      console.error(`[${requestId}] ❌ Google API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const items = data.items || [];
    
    console.log(`[${requestId}] 📸 Google Images: ${items.length} matches in ${Date.now() - startTime}ms`);
    
    const priceData: PriceData[] = [];
    
    for (const item of items) {
      const pageUrl = item.image?.contextLink || item.link;
      const imgUrl = item.link;
      const snippet = item.snippet || '';
      
      const priceMatch = snippet.match(/(\d+[.,]\d{2})\s*€|€\s*(\d+[.,]\d{2})/);
      
      if (priceMatch && pageUrl) {
        const priceStr = (priceMatch[1] || priceMatch[2]).replace(/,/g, '.');
        const price = parseFloat(priceStr);
        
        if (!isNaN(price) && price > 1) {
          priceData.push({
            price,
            currency: 'EUR',
            url: sanitizeUrl(pageUrl),
            title: item.title || productTitle,
            imageUrl: imgUrl,
            source: 'image_search'
          });
        }
      }
    }
    
    console.log(`[${requestId}] ✅ Extracted ${priceData.length} prices from Images`);
    return priceData;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${requestId}] ❌ Google Image Search error: ${errorMsg}`);
    return [];
  }
}

// ============= VISION ANALYSIS =============

async function analyzeProductWithVision(
  productImage: string,
  competitorImages: string[],
  requestId: string
): Promise<{ similarities: number[] }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.warn(`[${requestId}] ⚠️ Lovable API key not configured`);
    return { similarities: [] };
  }

  console.log(`[${requestId}] 🖼️ Vision analysis: ${competitorImages.length} images`);
  const startTime = Date.now();

  const similarities: number[] = [];
  const productDataUri = await fetchImageAsDataUri(productImage);
  
  if (!productDataUri) {
    console.warn(`[${requestId}] ⚠️ Could not fetch product image`);
    return { similarities: [] };
  }

  for (const compImage of competitorImages.slice(0, 5)) {
    try {
      const compDataUri = await fetchImageAsDataUri(compImage);
      if (!compDataUri) continue;

      const response = await withTimeout(
        fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                { type: 'image_url', image_url: { url: productDataUri } },
                { type: 'image_url', image_url: { url: compDataUri } },
                { type: 'text', text: `Ces 2 produits sont-ils similaires? Réponds avec JSON: {"similarity": 0.85, "reasoning": "court"}` }
              ]
            }],
            temperature: 0.3,
            max_tokens: 200,
          }),
        }),
        15000,
        'Vision comparison'
      );

      if (!response.ok) continue;

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          similarities.push(result.similarity || 0.5);
          console.log(`[${requestId}] ✅ Similarity: ${(result.similarity * 100).toFixed(0)}%`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${requestId}] ⚠️ Vision error: ${errorMsg}`);
    }
  }

  console.log(`[${requestId}] 📊 Vision complete: ${similarities.length} similarities in ${Date.now() - startTime}ms`);
  return { similarities };
}

async function estimatePriceRangeFromImage(
  productImage: string,
  productTitle: string,
  requestId: string
): Promise<ImagePriceRange | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.warn(`[${requestId}] ⚠️ Lovable API key not configured for image price range`);
    return null;
  }

  try {
    console.log(`[${requestId}] 🖼️ Estimating price range from image...`);
    const startTime = Date.now();

    const dataUri = await fetchImageAsDataUri(productImage);
    if (!dataUri) {
      console.warn(`[${requestId}] ⚠️ Cannot fetch product image for price estimation`);
      return null;
    }

    const response = await withTimeout(
      fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              { type: 'image_url', image_url: { url: dataUri } },
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
      }),
      15000,
      'Price range estimation'
    );

    if (!response.ok) {
      console.warn(`[${requestId}] ⚠️ AI price range estimation failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content as string | undefined;
    const jsonMatch = content?.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const minPrice = typeof parsed.minPrice === 'number' ? parsed.minPrice : null;
    const maxPrice = typeof parsed.maxPrice === 'number' ? parsed.maxPrice : null;

    console.log(`[${requestId}] ✅ Image price range in ${Date.now() - startTime}ms:`, parsed);
    return { minPrice, maxPrice, segment: parsed.segment };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${requestId}] ⚠️ Image price range estimation error: ${errorMsg}`);
    return null;
  }
}

// ============= PRICING CALCULATIONS =============

function calculateNetMargin(
  salesPrice: number,
  costPrice: number,
  shippingCost: number,
  taxRate: number
): number {
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
  productType: string | null = null,
  requestId: string = 'UNKNOWN'
): Promise<{ marketPrice: number | null; smartPrice: number | null; reasoning: string; competitors: CompetitorPrice[] }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  const totalCost = costPrice + shippingCost;
  const minPriceWithMargin = totalCost * 1.3;

  if (!competitorPrices || competitorPrices.length === 0) {
    const costMarkup = 2.5;
    const smartPrice = Math.round(totalCost * costMarkup * 100) / 100;
    
    return {
      marketPrice: null,
      smartPrice: smartPrice,
      reasoning: `Prix calculé sans concurrents trouvés. Coûts: ${totalCost.toFixed(2)}€ + marge ${((costMarkup - 1) * 100).toFixed(0)}% = ${smartPrice.toFixed(2)}€. Aucune donnée concurrente disponible.`,
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
    const startTime = Date.now();
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

    const response = await withTimeout(
      fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 500,
        }),
      }),
      20000,
      'AI pricing analysis'
    );

    if (!response.ok) throw new Error(`AI error: ${response.status}`);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const jsonMatch = content?.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error("Invalid format");

    const aiResponse = JSON.parse(jsonMatch[0]);
    const finalPrice = Math.max(aiResponse.smartPrice, minPriceWithMargin);

    console.log(`[${requestId}] 🤖 AI analysis complete in ${Date.now() - startTime}ms`);

    return {
      marketPrice: avgCompetitorPrice,
      smartPrice: Math.round(finalPrice * 100) / 100,
      reasoning: aiResponse.reasoning,
      competitors: top10
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${requestId}] ❌ AI analysis failed: ${errorMsg}`);
    
    if (competitorPrices.length > 0) {
      const avgPrice = competitorPrices.reduce((sum, c) => sum + c.price, 0) / competitorPrices.length;
      const smartPrice = Math.max(avgPrice, minPriceWithMargin);
      
      return {
        marketPrice: avgPrice,
        smartPrice: Math.round(smartPrice * 100) / 100,
        reasoning: `Prix moyen marché (${competitorPrices.length} concurrents) avec marge minimum. IA indisponible.`,
        competitors: competitorPrices.slice(0, 10)
      };
    }
    
    const emergencyPrice = Math.round(minPriceWithMargin * 1.5 * 100) / 100;
    return {
      marketPrice: null,
      smartPrice: emergencyPrice,
      reasoning: `Prix d'urgence: coûts ${totalCost.toFixed(2)}€ + marge 50%. Analyse échouée.`,
      competitors: []
    };
  }
}

// ============= MAIN HANDLER =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse body safely for healthCheck
  const body = await req.json().catch(() => ({}));

  // HealthCheck handler
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    console.log(`[${requestId}] 🤖 [ANALYZE-PRICING] Enhanced analysis: DataForSEO + Gemini Vision`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const DATAFORSEO_LOGIN = Deno.env.get('DATAFORSEO_LOGIN');
    const DATAFORSEO_PASSWORD = Deno.env.get('DATAFORSEO_PASSWORD');

    if (!LOVABLE_API_KEY) {
      console.warn(`[${requestId}] ⚠️ LOVABLE_API_KEY not configured`);
    }
    if (!DATAFORSEO_LOGIN || !DATAFORSEO_PASSWORD) {
      console.warn(`[${requestId}] ⚠️ DataForSEO credentials not configured`);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) throw new Error('Unauthorized');

    const { productIds, variantId, taxRate = 0, debugImageOnly = false } = body;

    if (!productIds || productIds.length === 0) {
      throw new Error('No products specified');
    }

    console.log(`[${requestId}] 📊 Analyzing ${productIds.length} products${variantId ? ' (variant-specific)' : ''}`);

    const results = [];

    for (const productId of productIds) {
      try {
        const query = supabase
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
          console.warn(`[${requestId}] ⚠️ Product ${productId} not found`);
          continue;
        }

        // Si on analyse une variante spécifique
        if (variantId) {
          const variant = ((product as any).product_variants || []).find((v: any) => v.id === variantId);
          
          if (!variant) {
            console.warn(`[${requestId}] ⚠️ Variant ${variantId} not found`);
            continue;
          }

          console.log(`[${requestId}] 🔍 Analyzing variant: ${product.title} - ${variant.option1 || ''}`);
          
          const variantTitle = `${product.title} ${variant.option1 || ''} ${variant.option2 || ''} ${variant.option3 || ''}`.trim();
          const variantImageUrl = variant.image_url || product.image_url;
          const variantPrice = variant.price;
          const variantCost = variant.cost_price || 0;
          const shippingCost = product.shipping_cost || 5.99;

          console.log(`[${requestId}] 💰 Costs - Variant: ${variantCost}€, Shipping: ${shippingCost}€`);

          let imagePriceRange: ImagePriceRange | null = null;
          if (variantImageUrl) {
            try {
              imagePriceRange = await estimatePriceRangeFromImage(variantImageUrl, variantTitle, requestId);
            } catch (error) {
              console.error(`[${requestId}] ⚠️ Image price range estimation failed`);
            }
          }

          if (debugImageOnly) {
            results.push({
              productId,
              variantId,
              imagePriceRange: imagePriceRange || { minPrice: null, maxPrice: null, segment: 'N/A' }
            });
            continue;
          }

          const queries = await generateSearchQueries(variantTitle, requestId);
          const allPriceData: PriceData[] = [];
          
          console.log(`[${requestId}] 🛍️ Starting DataForSEO Shopping Search...`);
          for (const q of queries.slice(0, 2)) {
            try {
              const shoppingPrices = await searchWithDataForSEOShopping(q, requestId);
              shoppingPrices.forEach(p => p.source = 'shopping');
              allPriceData.push(...shoppingPrices);
              await new Promise(resolve => setTimeout(resolve, 1200));
            } catch (error) {
              console.error(`[${requestId}] ❌ Shopping failed for "${q}"`);
            }
          }

          if (variantImageUrl) {
            console.log(`[${requestId}] 🖼️ Starting Google Image Search...`);
            try {
              const imageResults = await searchWithGoogleImages(variantImageUrl, variantTitle, requestId);
              allPriceData.push(...imageResults);
              await new Promise(resolve => setTimeout(resolve, 800));
            } catch (error) {
              console.error(`[${requestId}] ❌ Image Search failed`);
            }
          }

          for (const q of queries.slice(0, 1)) {
            try {
              const serpPrices = await searchWithDataForSEO(q, requestId);
              serpPrices.forEach(p => p.source = 'serp');
              allPriceData.push(...serpPrices);
              await new Promise(resolve => setTimeout(resolve, 1200));
            } catch (error) {
              console.error(`[${requestId}] ❌ SERP failed for "${q}"`);
            }
          }

          const uniquePrices = Array.from(
            new Map(allPriceData.map(p => [sanitizeUrl(p.url), p])).values()
          );

          console.log(`[${requestId}] 📈 Total unique prices: ${uniquePrices.length}`);

          const visionResults: { similarities: number[] } = { similarities: [] };
          const competitorImages = uniquePrices.filter(p => p.imageUrl).map(p => p.imageUrl!);

          if (variantImageUrl && competitorImages.length > 0) {
            console.log(`[${requestId}] 🖼️ Vision analysis for ${competitorImages.length} images`);
            try {
              const result = await analyzeProductWithVision(variantImageUrl, competitorImages, requestId);
              visionResults.similarities = result.similarities;
            } catch (error) {
              console.error(`[${requestId}] ⚠️ Vision failed`);
            }
          }

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
                url: sanitizeUrl(data.url),
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

          console.log(`[${requestId}] ✅ ${competitorPrices.length} relevant competitors`);

          const analysis = await analyzeWithAI(
            variantTitle,
            variantCost,
            shippingCost,
            competitorPrices,
            taxRate || 20,
            imagePriceRange,
            null,
            requestId
          );

          const netMargin = analysis.smartPrice 
            ? calculateNetMargin(analysis.smartPrice, variantCost, shippingCost, taxRate || 20)
            : null;

          // Calculate confidence score
          const shoppingCount = competitorPrices.filter(c => c.source?.includes('🛍️')).length;
          const imageCount = competitorPrices.filter(c => c.source?.includes('🖼️')).length;
          const serpCount = competitorPrices.filter(c => !c.source?.includes('🛍️') && !c.source?.includes('🖼️')).length;
          const avgSimilarity = visionResults.similarities.length > 0
            ? visionResults.similarities.reduce((a, b) => a + b, 0) / visionResults.similarities.length
            : null;
          
          const prices = competitorPrices.map(c => c.price);
          const priceConsistency = prices.length > 1 
            ? 1 - (Math.max(...prices) - Math.min(...prices)) / (Math.max(...prices) + 1)
            : 0.5;
          
          const confidence = calculateConfidenceScore(shoppingCount, imageCount, serpCount, avgSimilarity, priceConsistency);

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
              avgSimilarity: avgSimilarity ? Math.round(avgSimilarity * 100) / 100 : null
            },
            confidence: confidence
          });

          console.log(`[${requestId}] ✅ ${variantTitle}: Smart ${analysis.smartPrice}€, Confidence ${confidence.score}%`);
          continue;
        }

        // Analyse du produit normal
        const variants = (product as any).product_variants || [];
        const avgCost = variants.length > 0
          ? variants.reduce((sum: number, v: any) => sum + (v.cost_price || 0), 0) / variants.length
          : product.cost_price || 0;

        const shippingCost = product.shipping_cost || 5.99;

        console.log(`[${requestId}] 🔍 Analyzing: ${product.title}`);
        console.log(`[${requestId}] 💰 Costs - Product: ${avgCost}€, Shipping: ${shippingCost}€`);

        let imagePriceRange: ImagePriceRange | null = null;
        if (product.image_url) {
          try {
            imagePriceRange = await estimatePriceRangeFromImage(product.image_url, product.title, requestId);
          } catch (error) {
            console.error(`[${requestId}] ⚠️ Image price range estimation failed`);
          }
        }

        const queries = await generateSearchQueries(product.title, requestId);
        const allPriceData: PriceData[] = [];
        
        console.log(`[${requestId}] 🛍️ Starting DataForSEO Shopping Search...`);
        for (const q of queries.slice(0, 2)) {
          try {
            const shoppingPrices = await searchWithDataForSEOShopping(q, requestId);
            shoppingPrices.forEach(p => p.source = 'shopping');
            allPriceData.push(...shoppingPrices);
            await new Promise(resolve => setTimeout(resolve, 1200));
          } catch (error) {
            console.error(`[${requestId}] ❌ Shopping failed for "${q}"`);
          }
        }

        if (product.image_url) {
          console.log(`[${requestId}] 🖼️ Starting Google Image Search...`);
          try {
            const imageResults = await searchWithGoogleImages(product.image_url, product.title, requestId);
            allPriceData.push(...imageResults);
            await new Promise(resolve => setTimeout(resolve, 800));
          } catch (error) {
            console.error(`[${requestId}] ❌ Image Search failed`);
          }
        }

        for (const q of queries.slice(0, 1)) {
          try {
            const serpPrices = await searchWithDataForSEO(q, requestId);
            serpPrices.forEach(p => p.source = 'serp');
            allPriceData.push(...serpPrices);
            await new Promise(resolve => setTimeout(resolve, 1200));
          } catch (error) {
            console.error(`[${requestId}] ❌ SERP failed for "${q}"`);
          }
        }

        const uniquePrices = Array.from(
          new Map(allPriceData.map(p => [sanitizeUrl(p.url), p])).values()
        );

        console.log(`[${requestId}] 📈 Total unique prices: ${uniquePrices.length}`);

        const visionResults: { similarities: number[] } = { similarities: [] };
        const competitorImages = uniquePrices.filter(p => p.imageUrl).map(p => p.imageUrl!);

        if (product.image_url && competitorImages.length > 0) {
          console.log(`[${requestId}] 🖼️ Vision analysis for ${competitorImages.length} images`);
          try {
            const result = await analyzeProductWithVision(product.image_url, competitorImages, requestId);
            visionResults.similarities = result.similarities;
          } catch (error) {
            console.error(`[${requestId}] ⚠️ Vision failed`);
          }
        }

        const competitorPrices: CompetitorPrice[] = uniquePrices
          .map((data, index) => {
            let baseSimilarity = visionResults.similarities[index] ||
              (data.source === 'shopping' ? 0.95 :
               data.source === 'image_search' ? 0.8 : 0.7);

            if (imagePriceRange && imagePriceRange.minPrice && imagePriceRange.maxPrice) {
              const min = imagePriceRange.minPrice;
              const max = imagePriceRange.maxPrice;

              if (data.price < min * 0.5) {
                baseSimilarity *= 0.4;
              } else if (data.price < min) {
                baseSimilarity *= 0.7;
              } else if (data.price >= min && data.price <= max * 1.2) {
                baseSimilarity *= 1.1;
              }
            }

            return {
              url: sanitizeUrl(data.url),
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

        console.log(`[${requestId}] ✅ ${competitorPrices.length} relevant competitors`);

        const analysis = await analyzeWithAI(
          product.title,
          avgCost,
          shippingCost,
          competitorPrices,
          taxRate || 20,
          imagePriceRange,
          null,
          requestId
        );

        const netMargin = analysis.smartPrice 
          ? calculateNetMargin(analysis.smartPrice, avgCost, shippingCost, taxRate || 20)
          : null;

        // Calculate confidence score
        const shoppingCount = competitorPrices.filter(c => c.source?.includes('🛍️')).length;
        const imageCount = competitorPrices.filter(c => c.source?.includes('🖼️')).length;
        const serpCount = competitorPrices.filter(c => !c.source?.includes('🛍️') && !c.source?.includes('🖼️')).length;
        const avgSimilarity = visionResults.similarities.length > 0
          ? visionResults.similarities.reduce((a, b) => a + b, 0) / visionResults.similarities.length
          : null;
        
        const prices = competitorPrices.map(c => c.price);
        const priceConsistency = prices.length > 1 
          ? 1 - (Math.max(...prices) - Math.min(...prices)) / (Math.max(...prices) + 1)
          : 0.5;
        
        const confidence = calculateConfidenceScore(shoppingCount, imageCount, serpCount, avgSimilarity, priceConsistency);

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
            avgSimilarity: avgSimilarity ? Math.round(avgSimilarity * 100) / 100 : null
          },
          confidence: confidence
        });

        console.log(`[${requestId}] ✅ ${product.title}: Smart ${analysis.smartPrice}€, Confidence ${confidence.score}%`);
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (productError: unknown) {
        const errorMsg = productError instanceof Error ? productError.message : 'Unknown error';
        console.error(`[${requestId}] ❌ Failed to analyze product ${productId}: ${errorMsg}`);
        results.push({
          productId,
          error: errorMsg,
          marketPrice: null,
          smartPrice: null,
          reasoning: 'Échec de l\'analyse',
          competitors: [],
          confidence: { score: 0, breakdown: {} }
        });
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[${requestId}] ✅ Analysis complete: ${results.length} products in ${totalTime}ms`);

    return new Response(
      JSON.stringify({
        success: results.length > 0,
        requestId,
        results,
        summary: {
          total: productIds.length,
          analyzed: results.filter(r => !r.error).length,
          failed: results.filter(r => r.error).length,
          totalTimeMs: totalTime
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${requestId}] ❌ [ANALYZE-PRICING] Fatal error: ${errorMsg}`);
    return new Response(
      JSON.stringify({
        success: false,
        requestId,
        error: errorMsg
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
