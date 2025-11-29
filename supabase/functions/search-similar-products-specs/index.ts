import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  productTitle: string;
  imageUrl?: string;
  productType?: string;
}

interface SimilarProduct {
  source: string;
  url: string;
  title: string;
  weight?: string;
  dimensions?: {
    length?: string;
    width?: string;
    height?: string;
    depth?: string;
    diameter?: string;
  };
  confidence: number;
}

interface SearchResponse {
  similarProducts: SimilarProduct[];
  averageWeight?: string;
  averageDimensions?: {
    length?: string;
    width?: string;
    height?: string;
  };
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
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
    const { productTitle, imageUrl, productType }: SearchRequest = body;

    if (!productTitle) {
      throw new Error("productTitle is required");
    }

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_CSE_API_KEY');
    const GOOGLE_CSE_ID = Deno.env.get('GOOGLE_CSE_ID');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
      console.warn('Google Custom Search API not configured, skipping SERP search');
      return new Response(
        JSON.stringify({ 
          similarProducts: [], 
          confidence: 0,
          error: 'Google API not configured'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Searching for similar products:', productTitle);

    // Build search query
    const searchQuery = `"${productTitle}" ${productType || ''} dimensions poids caractéristiques techniques`.trim();
    
    // Search with Google Custom Search API
    const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
    searchUrl.searchParams.set('key', GOOGLE_API_KEY);
    searchUrl.searchParams.set('cx', GOOGLE_CSE_ID);
    searchUrl.searchParams.set('q', searchQuery);
    searchUrl.searchParams.set('num', '10');

    console.log('📡 Calling Google Custom Search API...');
    const searchResponse = await fetch(searchUrl.toString());
    
    if (!searchResponse.ok) {
      // Handle quota/permission errors gracefully - return empty result instead of failing
      console.warn(`⚠️ Google API error: ${searchResponse.status} ${searchResponse.statusText}`);
      return new Response(
        JSON.stringify({ 
          similarProducts: [], 
          confidence: 0,
          warning: `Google API error: ${searchResponse.statusText} (likely quota exceeded)`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchData = await searchResponse.json();
    const items = searchData.items || [];

    if (items.length === 0) {
      console.log('❌ No search results found');
      return new Response(
        JSON.stringify({ 
          similarProducts: [], 
          confidence: 0,
          message: 'No results found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Found ${items.length} search results`);

    // Extract specs using AI
    const extractPrompt = `Analyse les résultats de recherche suivants et extrait les spécifications techniques (dimensions et poids) pour chaque produit similaire.

Produit recherché: ${productTitle}

Résultats de recherche:
${items.map((item: any, i: number) => `
${i + 1}. ${item.title}
   URL: ${item.link}
   Snippet: ${item.snippet}
   ${item.pagemap?.metatags?.[0]?.['og:description'] || ''}
`).join('\n')}

Réponds UNIQUEMENT en JSON valide avec ce format:
{
  "products": [
    {
      "source": "nom du site",
      "url": "URL du produit",
      "title": "titre du produit",
      "weight": "poids avec unité (ex: 28kg)" ou null,
      "dimensions": {
        "length": "longueur avec unité (ex: 120cm)" ou null,
        "width": "largeur avec unité" ou null,
        "height": "hauteur avec unité" ou null,
        "depth": "profondeur avec unité" ou null,
        "diameter": "diamètre avec unité" ou null
      },
      "confidence": 0.85
    }
  ]
}

Instructions:
- N'extrait QUE les dimensions EXPLICITEMENT mentionnées dans le texte
- Inclus TOUJOURS l'unité (cm, kg, etc.)
- Si aucune dimension n'est trouvée, mets null
- confidence entre 0 et 1 selon la clarté des infos`;

    if (LOVABLE_API_KEY) {
      console.log('🤖 Calling AI to extract specifications...');
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'Tu es un expert en extraction de spécifications techniques de produits. Réponds UNIQUEMENT en JSON valide.'
            },
            {
              role: 'user',
              content: extractPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const aiContent = aiData.choices?.[0]?.message?.content || '';
        
        // Parse AI response
        let parsedData;
        try {
          // Try to extract JSON from markdown code blocks
          const jsonMatch = aiContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
          parsedData = JSON.parse(jsonStr);
        } catch (e) {
          console.error('Failed to parse AI response:', e);
          parsedData = { products: [] };
        }

        const similarProducts = parsedData.products || [];
        
        // Calculate averages
        const validWeights = similarProducts
          .map((p: SimilarProduct) => p.weight)
          .filter((w: string | undefined) => w)
          .map((w: string) => parseFloat(w.replace(/[^\d.]/g, '')))
          .filter((w: number) => !isNaN(w));

        const validLengths = similarProducts
          .map((p: SimilarProduct) => p.dimensions?.length)
          .filter((l: string | undefined) => l)
          .map((l: string) => parseFloat(l.replace(/[^\d.]/g, '')))
          .filter((l: number) => !isNaN(l));

        const validWidths = similarProducts
          .map((p: SimilarProduct) => p.dimensions?.width)
          .filter((w: string | undefined) => w)
          .map((w: string) => parseFloat(w.replace(/[^\d.]/g, '')))
          .filter((w: number) => !isNaN(w));

        const validHeights = similarProducts
          .map((p: SimilarProduct) => p.dimensions?.height)
          .filter((h: string | undefined) => h)
          .map((h: string) => parseFloat(h.replace(/[^\d.]/g, '')))
          .filter((h: number) => !isNaN(h));

        const avgWeight = validWeights.length >= 3
          ? `${(validWeights.reduce((a: number, b: number) => a + b, 0) / validWeights.length).toFixed(1)}kg`
          : undefined;

        const avgLength = validLengths.length >= 3
          ? `${(validLengths.reduce((a: number, b: number) => a + b, 0) / validLengths.length).toFixed(0)}cm`
          : undefined;

        const avgWidth = validWidths.length >= 3
          ? `${(validWidths.reduce((a: number, b: number) => a + b, 0) / validWidths.length).toFixed(0)}cm`
          : undefined;

        const avgHeight = validHeights.length >= 3
          ? `${(validHeights.reduce((a: number, b: number) => a + b, 0) / validHeights.length).toFixed(0)}cm`
          : undefined;

        const overallConfidence = similarProducts.length >= 3
          ? similarProducts.reduce((sum: number, p: SimilarProduct) => sum + p.confidence, 0) / similarProducts.length
          : 0.3;

        const response: SearchResponse = {
          similarProducts,
          averageWeight: avgWeight,
          averageDimensions: {
            length: avgLength,
            width: avgWidth,
            height: avgHeight,
          },
          confidence: overallConfidence,
        };

        console.log('✅ SERP search completed:', {
          productsFound: similarProducts.length,
          confidence: overallConfidence,
          hasWeight: !!avgWeight,
          hasDimensions: !!(avgLength || avgWidth || avgHeight),
        });

        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback: return raw search results without AI extraction
    const fallbackProducts: SimilarProduct[] = items.slice(0, 5).map((item: any) => ({
      source: new URL(item.link).hostname,
      url: item.link,
      title: item.title,
      confidence: 0.3,
    }));

    return new Response(
      JSON.stringify({
        similarProducts: fallbackProducts,
        confidence: 0.3,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-similar-products-specs:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        similarProducts: [],
        confidence: 0,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
