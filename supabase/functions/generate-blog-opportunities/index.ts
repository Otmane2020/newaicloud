import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[OPPS] Starting blog opportunities generation');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[OPPS] User authenticated: ${user.id}`);

    // Get products
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: products, error: productsError } = await supabaseAdmin
      .from('shopify_products')
      .select('id, title, category, product_type, price, vendor, tags, description')
      .eq('seller_id', user.id);

    if (productsError) {
      console.error('[OPPS] Error fetching products:', productsError);
      throw productsError;
    }

    if (!products || products.length === 0) {
      console.log('[OPPS] No products found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          opportunities: [],
          message: 'No products found. Import products first.' 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[OPPS] Found ${products.length} products`);

    // Analyze product catalog
    const categoryMap = new Map<string, number>();
    const priceRanges = { low: 0, medium: 0, high: 0 };
    
    products.forEach(product => {
      const category = product.category || product.product_type || 'Général';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      
      const price = parseFloat(product.price) || 0;
      if (price < 50) priceRanges.low++;
      else if (price < 200) priceRanges.medium++;
      else priceRanges.high++;
    });

    const categories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Build prompt for Lovable AI
    const prompt = `Analyse ce catalogue e-commerce et génère 6-8 opportunités d'articles de blog SEO.

📊 STATISTIQUES DU CATALOGUE :
- Total produits : ${products.length}
- Prix bas (<50€) : ${priceRanges.low}
- Prix moyen (50-200€) : ${priceRanges.medium}  
- Prix haut (>200€) : ${priceRanges.high}

📁 CATÉGORIES PRINCIPALES :
${categories.map(([cat, count]) => `- ${cat} : ${count} produits`).join('\n')}

🎯 TYPES D'ARTICLES DEMANDÉS :
1. Guides d'achat comparatifs
2. Tutoriels pratiques
3. Sélections thématiques
4. Conseils d'experts
5. Tendances du marché

Tu dois retourner un objet JSON avec cette structure EXACTE :
{
  "opportunities": [
    {
      "title": "Guide d'achat : Comment choisir...",
      "description": "Description captivante de 2-3 phrases",
      "category": "${categories[0]?.[0] || 'Général'}",
      "type": "guide",
      "keywords": ["mot-clé 1", "mot-clé 2", "mot-clé 3"],
      "seoScore": 85,
      "difficulty": "medium"
    }
  ]
}

RÈGLES STRICTES :
- Retourner UNIQUEMENT du JSON valide (pas de markdown, pas de backticks)
- Minimum 6 opportunités, maximum 8
- Titres accrocheurs avec mots-clés SEO
- Descriptions courtes et percutantes
- Keywords pertinents pour chaque article`;

    console.log('[OPPS] Calling Lovable AI...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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
            content: 'Tu es un expert en marketing de contenu et SEO. Tu génères des opportunités d\'articles de blog pertinents basés sur un catalogue produits. Tu réponds UNIQUEMENT en JSON valide, sans markdown ni backticks.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[OPPS] AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('[OPPS] AI response received');

    const generatedText = aiData.choices[0].message.content;
    console.log('[OPPS] Raw AI response:', generatedText.substring(0, 200));

    // Parse JSON response
    let cleanedText = generatedText.trim();
    
    // Remove markdown code blocks if present
    if (cleanedText.includes('```json')) {
      cleanedText = cleanedText.split('```json')[1].split('```')[0].trim();
    } else if (cleanedText.includes('```')) {
      cleanedText = cleanedText.split('```')[1].split('```')[0].trim();
    }

    const parsed = JSON.parse(cleanedText);

    if (!parsed.opportunities || !Array.isArray(parsed.opportunities)) {
      throw new Error('Invalid AI response format: missing opportunities array');
    }

    if (parsed.opportunities.length === 0) {
      throw new Error('No opportunities generated by AI');
    }

    console.log(`[OPPS] Successfully generated ${parsed.opportunities.length} opportunities`);

    // Map products to opportunities based on category
    const opportunitiesWithProducts = parsed.opportunities.map((opp: any) => {
      const relatedProducts = products
        .filter(p => {
          const prodCategory = (p.category || p.product_type || '').toLowerCase();
          const oppCategory = (opp.category || '').toLowerCase();
          return prodCategory.includes(oppCategory) || oppCategory.includes(prodCategory);
        })
        .slice(0, 5)
        .map(p => p.id);

      return {
        ...opp,
        id: crypto.randomUUID(),
        productsCount: relatedProducts.length,
        productIds: relatedProducts,
        primaryKeywords: opp.keywords || [],
        secondaryKeywords: [],
        metaDescription: opp.description,
        estimatedWordCount: 1500,
        seoScore: opp.seoScore || 75,
        difficulty: opp.difficulty || 'medium'
      };
    });

    console.log('[OPPS] Opportunities enriched with product IDs');

    return new Response(
      JSON.stringify({ 
        success: true, 
        opportunities: opportunitiesWithProducts 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[OPPS] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});