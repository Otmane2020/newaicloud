import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ✅ VERSION CORRIGÉE – AIO (Answer-First)
 * Objectif : générer des ANSWERS citables par ChatGPT / Gemini / Copilot
 * (et NON des idées d'articles SEO génériques)
 */

type Platform = 'chatgpt' | 'gemini' | 'copilot';
type Lang = 'fr' | 'en';

interface Product {
  id: string;
  title: string;
  product_type?: string | null;
  vendor?: string | null;
  tags?: string | null;
}

interface AiAnswerOpportunity {
  platform: Platform;
  query_type: 'direct' | 'list' | 'comparison';
  question: string;
  suggested_title: string;
  suggested_structure: {
    direct_answer: string;           // ⚠️ CE QUE L'IA VA CITER
    answer_confidence: number;       // 0 → 1
    supporting_content: {
      bullets: string[];
      faq: { q: string; a: string }[];
      comparison_table?: any[];
    };
  };
  citation_potential: number;        // score AIO réel
  product_ids: string[];
  keywords: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

// Platform-specific configurations for Answer-First approach
const PLATFORM_CONFIGS = {
  chatgpt: {
    name: 'ChatGPT',
    style: 'conversational',
    preferredAnswerLength: 150, // caractères
    citationWeight: 0.9,
    queryTypes: ['direct', 'comparison', 'list'] as const
  },
  gemini: {
    name: 'Gemini',
    style: 'factual',
    preferredAnswerLength: 180,
    citationWeight: 0.85,
    queryTypes: ['direct', 'list', 'comparison'] as const
  },
  copilot: {
    name: 'Copilot',
    style: 'practical',
    preferredAnswerLength: 160,
    citationWeight: 0.8,
    queryTypes: ['list', 'direct', 'comparison'] as const
  }
};

/* -------------------- HELPERS -------------------- */

function detectLanguage(products: Product[]): Lang {
  const text = products.map(p => p.title.toLowerCase()).join(' ');
  const frenchIndicators = [' de ', ' le ', ' la ', ' les ', ' pour ', ' avec ', ' en ', ' du ', ' des ', ' une ', ' un '];
  const frenchCount = frenchIndicators.filter(w => text.includes(w)).length;
  return frenchCount >= 2 ? 'fr' : 'en';
}

function groupByCategory(products: Product[]): Record<string, Product[]> {
  return products.reduce<Record<string, Product[]>>((acc, p) => {
    const key = p.product_type || p.vendor || 'general';
    acc[key] ??= [];
    acc[key].push(p);
    return acc;
  }, {});
}

function computeCitationScore(answer: string, hasNumbers: boolean, isShort: boolean): number {
  let score = 60;
  if (isShort) score += 15;           // réponse courte (≤180 chars)
  if (hasNumbers) score += 15;        // contient des chiffres
  if (answer.includes('est') || answer.includes('is')) score += 5;  // réponse affirmative
  if (answer.includes('cm') || answer.includes('kg') || answer.includes('€') || answer.includes('$')) score += 5; // unités de mesure
  return Math.min(100, score);
}

function generateDirectAnswer(category: string, products: Product[], lang: Lang, queryType: string): string {
  const productCount = products.length;
  const firstProduct = products[0]?.title || category;
  
  if (queryType === 'direct') {
    return lang === 'fr'
      ? `La ${category.toLowerCase()} idéale dépend principalement de l'espace disponible, du nombre d'utilisateurs et du matériau. En moyenne, les modèles les plus polyvalents mesurent entre 160 et 180 cm de long.`
      : `The ideal ${category.toLowerCase()} mainly depends on available space, number of users, and material. Most versatile models are between 160 and 180 cm long.`;
  }
  
  if (queryType === 'comparison') {
    if (productCount >= 2) {
      return lang === 'fr'
        ? `Entre ${products[0]?.title} et ${products[1]?.title}, le premier offre un meilleur rapport qualité-prix tandis que le second se distingue par sa durabilité et son design premium.`
        : `Between ${products[0]?.title} and ${products[1]?.title}, the first offers better value for money while the second stands out for its durability and premium design.`;
    }
    return lang === 'fr'
      ? `Pour comparer les ${category.toLowerCase()}, évaluez principalement : le prix au m², la qualité des matériaux et les avis clients vérifiés.`
      : `To compare ${category.toLowerCase()}, mainly evaluate: price per sqm, material quality, and verified customer reviews.`;
  }
  
  // list type
  return lang === 'fr'
    ? `Les 3 critères essentiels pour choisir une ${category.toLowerCase()} : 1) Dimensions adaptées à l'espace, 2) Matériaux durables (bois massif, métal), 3) Style cohérent avec la décoration.`
    : `The 3 essential criteria for choosing a ${category.toLowerCase()}: 1) Dimensions suited to your space, 2) Durable materials (solid wood, metal), 3) Style consistent with decor.`;
}

function generateSupportingBullets(category: string, lang: Lang): string[] {
  return lang === 'fr'
    ? [
        `Mesurer l'espace disponible avant l'achat`,
        `Vérifier le nombre de places assises nécessaires`,
        `Choisir un matériau facile d'entretien`,
        `Comparer les garanties fabricant`,
        `Lire les avis clients récents`
      ]
    : [
        `Measure available space before purchasing`,
        `Check required seating capacity`,
        `Choose easy-to-maintain materials`,
        `Compare manufacturer warranties`,
        `Read recent customer reviews`
      ];
}

function generateFaq(category: string, directAnswer: string, lang: Lang): { q: string; a: string }[] {
  return lang === 'fr'
    ? [
        { q: `Quelle taille choisir pour une ${category.toLowerCase()} ?`, a: directAnswer },
        { q: `Quel budget prévoir pour une ${category.toLowerCase()} de qualité ?`, a: `Le budget moyen pour une ${category.toLowerCase()} de qualité varie entre 300€ et 800€ selon les matériaux et la marque.` },
        { q: `Combien de temps dure une ${category.toLowerCase()} ?`, a: `Une ${category.toLowerCase()} de qualité peut durer 10 à 20 ans avec un entretien approprié.` }
      ]
    : [
        { q: `What size should I choose for a ${category.toLowerCase()}?`, a: directAnswer },
        { q: `What budget for a quality ${category.toLowerCase()}?`, a: `The average budget for a quality ${category.toLowerCase()} ranges from $300 to $800 depending on materials and brand.` },
        { q: `How long does a ${category.toLowerCase()} last?`, a: `A quality ${category.toLowerCase()} can last 10 to 20 years with proper maintenance.` }
      ];
}

function generateAiQuery(category: string, queryType: string, platform: Platform, lang: Lang): string {
  const config = PLATFORM_CONFIGS[platform];
  
  if (queryType === 'direct') {
    return lang === 'fr'
      ? `Quelle est la meilleure ${category.toLowerCase()} ?`
      : `What is the best ${category.toLowerCase()}?`;
  }
  
  if (queryType === 'comparison') {
    return lang === 'fr'
      ? `Comparatif : quelle ${category.toLowerCase()} choisir ?`
      : `Comparison: which ${category.toLowerCase()} to choose?`;
  }
  
  // list type
  return lang === 'fr'
    ? `Quels sont les critères pour choisir une ${category.toLowerCase()} ?`
    : `What are the criteria for choosing a ${category.toLowerCase()}?`;
}

function generateSuggestedTitle(category: string, queryType: string, platform: Platform, lang: Lang): string {
  const config = PLATFORM_CONFIGS[platform];
  
  const prefixes = {
    direct: lang === 'fr' ? 'Guide expert' : 'Expert Guide',
    comparison: lang === 'fr' ? 'Comparatif' : 'Comparison',
    list: lang === 'fr' ? 'Les critères essentiels' : 'Essential Criteria'
  };
  
  return `${prefixes[queryType as keyof typeof prefixes]}: ${category} - ${lang === 'fr' ? 'Optimisé pour' : 'Optimized for'} ${config.name}`;
}

/* -------------------- CORE GENERATION -------------------- */

function generateAiAnswerOpportunities(
  products: Product[],
  platform: Platform,
  lang: Lang
): AiAnswerOpportunity[] {
  const categories = groupByCategory(products);
  const config = PLATFORM_CONFIGS[platform];
  const results: AiAnswerOpportunity[] = [];

  for (const [category, items] of Object.entries(categories)) {
    if (items.length === 0) continue;

    // Generate one opportunity per query type for each category
    for (const queryType of config.queryTypes) {
      // ✅ ANSWER FIRST - Generate the citable answer
      const direct_answer = generateDirectAnswer(category, items, lang, queryType);
      const ai_query = generateAiQuery(category, queryType, platform, lang);
      const suggested_title = generateSuggestedTitle(category, queryType, platform, lang);
      
      // Calculate citation score based on answer quality
      const isShort = direct_answer.length <= 180;
      const hasNumbers = /\d/.test(direct_answer);
      const citation_potential = Math.round(computeCitationScore(direct_answer, hasNumbers, isShort) * config.citationWeight);
      
      // Determine difficulty
      const difficulty: 'easy' | 'medium' | 'hard' = items.length >= 5 ? 'hard' : items.length >= 2 ? 'medium' : 'easy';
      
      // Extract keywords
      const keywords = [
        category.toLowerCase(),
        ...items.slice(0, 3).map(p => p.title.split(' ')[0].toLowerCase()),
        queryType,
        platform,
        lang === 'fr' ? 'guide' : 'guide',
        lang === 'fr' ? 'comparatif' : 'comparison'
      ].filter((v, i, a) => a.indexOf(v) === i && v.length > 2);

      results.push({
        platform,
        query_type: queryType,
        question: ai_query,
        suggested_title,
        suggested_structure: {
          direct_answer,           // ⚠️ CE QUE L'IA VA CITER
          answer_confidence: 0.85,
          supporting_content: {
            bullets: generateSupportingBullets(category, lang),
            faq: generateFaq(category, direct_answer, lang)
          }
        },
        citation_potential,
        product_ids: items.slice(0, 5).map(p => p.id),
        keywords,
        difficulty
      });
    }
  }

  // ⚠️ Return only top 3 most citable opportunities per day
  return results
    .sort((a, b) => b.citation_potential - a.citation_potential)
    .slice(0, 3);
}

/* -------------------- HTTP SERVER -------------------- */

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

    const platforms: Platform[] = platform 
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
        console.log(`✅ Returning ${cached.length} cached AI Answer opportunities`);
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

    // Generate Answer-First opportunities for each platform
    const allOpportunities: any[] = [];
    
    for (const p of platforms) {
      const opportunities = generateAiAnswerOpportunities(products, p, language);
      console.log(`✨ Generated ${opportunities.length} Answer-First opportunities for ${p}`);
      
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
        } else if (insertError) {
          console.error('Insert error:', insertError);
        }
      }
    }

    console.log(`✅ Total Answer-First opportunities generated: ${allOpportunities.length}`);

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
