import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  id: string;
  title: string;
  product_type?: string;
  vendor?: string;
  tags?: string;
}

interface AiOpportunity {
  platform: 'chatgpt' | 'gemini' | 'copilot';
  query_type: string;
  question: string;
  suggested_title: string;
  suggested_structure: any;
  citation_potential: number;
  product_ids: string[];
  keywords: string[];
  difficulty: string;
}

// Platform-specific question patterns
const PLATFORM_PATTERNS = {
  chatgpt: {
    name: 'ChatGPT',
    queryTypes: [
      { type: 'comparison', template: 'What is the best {category} between {products}?', fr: 'Quel est le meilleur {category} entre {products} ?' },
      { type: 'recommendation', template: 'Can you recommend a {category} for {use_case}?', fr: 'Peux-tu me recommander un {category} pour {use_case} ?' },
      { type: 'faq', template: 'What should I consider when buying a {category}?', fr: 'Que dois-je considérer lors de l\'achat d\'un {category} ?' },
      { type: 'howto', template: 'How to choose the right {category}?', fr: 'Comment choisir le bon {category} ?' },
    ],
    style: 'conversational',
    citationWeight: 0.9
  },
  gemini: {
    name: 'Gemini',
    queryTypes: [
      { type: 'guide', template: 'Complete guide to buying {category}', fr: 'Guide complet pour acheter {category}' },
      { type: 'comparison', template: '{product1} vs {product2}: which one to choose?', fr: '{product1} vs {product2} : lequel choisir ?' },
      { type: 'review', template: 'Detailed review of {category} products', fr: 'Avis détaillé sur les produits {category}' },
      { type: 'faq', template: 'FAQ: Everything about {category}', fr: 'FAQ : Tout savoir sur {category}' },
    ],
    style: 'factual',
    citationWeight: 0.85
  },
  copilot: {
    name: 'Copilot',
    queryTypes: [
      { type: 'howto', template: 'Step by step: How to use {category}', fr: 'Étape par étape : Comment utiliser {category}' },
      { type: 'comparison', template: 'Shopping comparison: Best {category} deals', fr: 'Comparatif shopping : Meilleures offres {category}' },
      { type: 'review', template: 'Product review: {product} - Is it worth it?', fr: 'Avis produit : {product} - Vaut-il le coup ?' },
      { type: 'recommendation', template: 'Top {category} recommendations for {year}', fr: 'Top recommandations {category} pour {year}' },
    ],
    style: 'practical',
    citationWeight: 0.8
  }
};

function detectLanguage(products: Product[]): 'en' | 'fr' {
  const titles = products.map(p => p.title.toLowerCase()).join(' ');
  const frenchIndicators = ['de', 'le', 'la', 'les', 'pour', 'avec', 'en', 'du', 'des'];
  const frenchCount = frenchIndicators.filter(w => titles.includes(` ${w} `)).length;
  return frenchCount >= 2 ? 'fr' : 'en';
}

function groupProductsByCategory(products: Product[]): Record<string, Product[]> {
  const groups: Record<string, Product[]> = {};
  
  for (const product of products) {
    const category = product.product_type || product.vendor || 'General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(product);
  }
  
  return groups;
}

function generateOpportunities(
  products: Product[], 
  platform: 'chatgpt' | 'gemini' | 'copilot',
  language: 'en' | 'fr'
): AiOpportunity[] {
  const opportunities: AiOpportunity[] = [];
  const config = PLATFORM_PATTERNS[platform];
  const categories = groupProductsByCategory(products);
  const year = new Date().getFullYear();
  
  for (const [category, categoryProducts] of Object.entries(categories)) {
    if (categoryProducts.length < 1) continue;
    
    for (const queryPattern of config.queryTypes) {
      // Generate question from template
      let question = language === 'fr' ? queryPattern.fr : queryPattern.template;
      question = question
        .replace('{category}', category)
        .replace('{products}', categoryProducts.slice(0, 3).map(p => p.title).join(', '))
        .replace('{product}', categoryProducts[0]?.title || category)
        .replace('{product1}', categoryProducts[0]?.title || 'Product A')
        .replace('{product2}', categoryProducts[1]?.title || 'Product B')
        .replace('{use_case}', language === 'fr' ? 'un usage quotidien' : 'daily use')
        .replace('{year}', year.toString());
      
      // Generate suggested article title
      const titlePrefixes = {
        comparison: language === 'fr' ? 'Comparatif' : 'Comparison',
        recommendation: language === 'fr' ? 'Guide d\'achat' : 'Buying Guide',
        guide: language === 'fr' ? 'Guide complet' : 'Complete Guide',
        howto: language === 'fr' ? 'Comment' : 'How to',
        faq: 'FAQ',
        review: language === 'fr' ? 'Avis' : 'Review',
      };
      
      const suggested_title = `${titlePrefixes[queryPattern.type as keyof typeof titlePrefixes] || ''}: ${category} - ${language === 'fr' ? 'Optimisé pour' : 'Optimized for'} ${config.name}`;
      
      // Generate structure optimized for AI citation
      const suggested_structure = {
        introduction: language === 'fr' 
          ? 'Introduction concise avec réponse directe (2-3 phrases)' 
          : 'Concise introduction with direct answer (2-3 sentences)',
        sections: [
          { title: language === 'fr' ? 'Points clés' : 'Key Points', format: 'bullet_list' },
          { title: language === 'fr' ? 'Analyse détaillée' : 'Detailed Analysis', format: 'paragraphs' },
          { title: language === 'fr' ? 'Tableau comparatif' : 'Comparison Table', format: 'table' },
          { title: 'FAQ', format: 'qa_pairs' },
        ],
        conclusion: language === 'fr' 
          ? 'Résumé actionnable avec recommandation claire' 
          : 'Actionable summary with clear recommendation',
        citationOptimizations: [
          language === 'fr' ? 'Phrases courtes et factuelles' : 'Short, factual sentences',
          language === 'fr' ? 'Données chiffrées quand possible' : 'Numerical data when possible',
          language === 'fr' ? 'Structure en liste à puces' : 'Bullet point structure',
          language === 'fr' ? 'FAQ avec questions naturelles' : 'FAQ with natural questions',
        ]
      };
      
      // Calculate citation potential
      const basePotential = 60;
      const categoryBonus = categoryProducts.length >= 3 ? 15 : categoryProducts.length >= 2 ? 10 : 5;
      const typeBonus = ['comparison', 'faq', 'howto'].includes(queryPattern.type) ? 15 : 10;
      const citation_potential = Math.min(100, Math.round(
        (basePotential + categoryBonus + typeBonus) * config.citationWeight
      ));
      
      // Determine difficulty
      const difficulty = categoryProducts.length >= 5 ? 'hard' : categoryProducts.length >= 2 ? 'medium' : 'easy';
      
      // Extract keywords
      const keywords = [
        category.toLowerCase(),
        ...categoryProducts.slice(0, 3).map(p => p.title.split(' ')[0].toLowerCase()),
        queryPattern.type,
        config.name.toLowerCase()
      ].filter((v, i, a) => a.indexOf(v) === i);
      
      opportunities.push({
        platform,
        query_type: queryPattern.type,
        question,
        suggested_title,
        suggested_structure,
        citation_potential,
        product_ids: categoryProducts.slice(0, 5).map(p => p.id),
        keywords,
        difficulty
      });
    }
  }
  
  // Sort by citation potential and limit to 3 per day for faster loading
  return opportunities
    .sort((a, b) => b.citation_potential - a.citation_potential)
    .slice(0, 3);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { storeId, platform, refresh = false } = await req.json();

    if (!storeId) {
      return new Response(JSON.stringify({ error: 'storeId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const platforms: ('chatgpt' | 'gemini' | 'copilot')[] = platform 
      ? [platform] 
      : ['chatgpt', 'gemini', 'copilot'];

    // Check cache if not refreshing
    if (!refresh) {
      const { data: cached } = await supabase
        .from('ai_opportunities')
        .select('*')
        .eq('user_id', user.id)
        .eq('store_id', storeId)
        .in('platform', platforms)
        .order('citation_potential', { ascending: false });

      if (cached && cached.length > 0) {
        console.log(`✅ Returning ${cached.length} cached AI opportunities`);
        return new Response(JSON.stringify({ 
          success: true, 
          opportunities: cached,
          cached: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      // Clear existing opportunities for refresh
      await supabase
        .from('ai_opportunities')
        .delete()
        .eq('user_id', user.id)
        .eq('store_id', storeId)
        .in('platform', platforms);
    }

    // Fetch products
    const { data: products, error: productsError } = await supabase
      .from('shopify_products')
      .select('id, title, product_type, vendor, tags')
      .eq('seller_id', user.id)
      .eq('store_id', storeId)
      .limit(100);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch products' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        opportunities: [],
        message: 'No products found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const language = detectLanguage(products);
    console.log(`🌐 Detected language: ${language}, Products: ${products.length}`);

    // Generate opportunities for each platform
    const allOpportunities: any[] = [];
    
    for (const p of platforms) {
      const opportunities = generateOpportunities(products, p, language);
      console.log(`✨ Generated ${opportunities.length} opportunities for ${p}`);
      
      // Insert into database
      for (const opp of opportunities) {
        const { data: inserted, error: insertError } = await supabase
          .from('ai_opportunities')
          .insert({
            user_id: user.id,
            store_id: storeId,
            platform: opp.platform,
            query_type: opp.query_type,
            question: opp.question,
            suggested_title: opp.suggested_title,
            suggested_structure: opp.suggested_structure,
            citation_potential: opp.citation_potential,
            product_ids: opp.product_ids,
            keywords: opp.keywords,
            difficulty: opp.difficulty,
            status: 'pending'
          })
          .select()
          .single();

        if (!insertError && inserted) {
          allOpportunities.push(inserted);
        }
      }
    }

    console.log(`✅ Total opportunities generated: ${allOpportunities.length}`);

    return new Response(JSON.stringify({ 
      success: true, 
      opportunities: allOpportunities,
      cached: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-ai-query-opportunities:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
