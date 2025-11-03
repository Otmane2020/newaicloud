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
}

async function searchCompetitorPrices(productTitle: string, productImage: string): Promise<CompetitorPrice[]> {
  // Simulate web crawling for competitor prices
  // In production, this would use a real web scraping service or API
  const competitors = [
    { url: 'https://competitor1.com', basePrice: 500 },
    { url: 'https://competitor2.com', basePrice: 550 },
    { url: 'https://competitor3.com', basePrice: 480 },
    { url: 'https://competitor4.com', basePrice: 520 },
    { url: 'https://competitor5.com', basePrice: 510 },
  ];

  return competitors.map(comp => ({
    url: comp.url,
    title: productTitle,
    price: comp.basePrice + Math.random() * 100 - 50,
    currency: 'EUR',
    similarity: 0.7 + Math.random() * 0.3,
  }));
}

async function analyzeWithAI(
  productTitle: string,
  productImage: string,
  productCost: number,
  competitorPrices: CompetitorPrice[],
  taxRate: number
): Promise<{ marketPrice: number; smartPrice: number; reasoning: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const avgCompetitorPrice = competitorPrices.reduce((sum, p) => sum + p.price, 0) / competitorPrices.length;
  
  const prompt = `Tu es un expert en pricing e-commerce. Analyse ces données et suggère un prix optimal:

Produit: "${productTitle}"
Prix de revient: ${productCost}€
Taux de taxe: ${taxRate}%
Prix concurrents (${competitorPrices.length} trouvés):
${competitorPrices.map((p, i) => `${i + 1}. ${p.price.toFixed(2)}€ (similarité: ${(p.similarity * 100).toFixed(0)}%)`).join('\n')}

Prix moyen marché: ${avgCompetitorPrice.toFixed(2)}€

Objectifs:
1. Assurer une marge nette minimale de 15% après taxes
2. Rester compétitif face aux concurrents
3. Maximiser le profit sans perdre de clients

Réponds UNIQUEMENT avec un objet JSON:
{
  "smartPrice": nombre,
  "reasoning": "explication courte en 2-3 lignes"
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
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
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

    // Extract JSON from markdown code blocks if present
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const aiResponse = JSON.parse(jsonStr);

    return {
      marketPrice: avgCompetitorPrice,
      smartPrice: aiResponse.smartPrice,
      reasoning: aiResponse.reasoning
    };
  } catch (error) {
    console.error("AI Analysis error:", error);
    // Fallback: simple calculation
    const minPrice = productCost * (1 + taxRate / 100) * 1.15; // 15% net margin
    const smartPrice = Math.max(minPrice, avgCompetitorPrice * 0.95); // 5% below market
    
    return {
      marketPrice: avgCompetitorPrice,
      smartPrice: Math.round(smartPrice * 100) / 100,
      reasoning: "Prix calculé automatiquement: 5% sous la moyenne marché avec marge minimale de 15%"
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
            product_variants(cost_price)
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
          competitorPrices,
          taxRate || 20
        );

        results.push({
          productId: product.id,
          title: product.title,
          currentPrice: product.price,
          marketPrice: analysis.marketPrice,
          smartPrice: analysis.smartPrice,
          reasoning: analysis.reasoning,
          competitorCount: competitorPrices.length,
        });

        console.log(`✅ ${product.title}: ${analysis.smartPrice}€ (marché: ${analysis.marketPrice.toFixed(2)}€)`);

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

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
