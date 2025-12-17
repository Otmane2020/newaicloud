import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ✅ VERSION AIO FINALE – Answer Engine Optimization
 * 4 corrections critiques appliquées :
 * 1. direct_answer = colonne top-level (pas dans JSON)
 * 2. Réponses courtes, affirmatives, chiffrées (citables)
 * 3. Scoring AIO réel
 * 4. Limite par catégorie + plateforme
 */

type Platform = 'chatgpt' | 'gemini' | 'copilot';
type Lang = 'fr' | 'en';
type QueryType = 'direct' | 'list' | 'comparison';

interface Product {
  id: string;
  title: string;
  product_type?: string | null;
  vendor?: string | null;
  tags?: string | null;
}

interface AiAnswer {
  platform: Platform;
  query_type: QueryType;
  question: string;
  
  // ✅ AIO CORE (top-level, pas dans JSON)
  direct_answer: string;
  answer_confidence: number;
  
  // Secondaire
  supporting_content: {
    bullets: string[];
    faq: { q: string; a: string }[];
    comparison_table?: any[];
  };
  
  citation_potential: number;
  product_ids: string[];
  keywords: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

// Platform-specific configurations for AIO
const PLATFORM_CONFIGS = {
  chatgpt: {
    name: 'ChatGPT',
    style: 'conversational',
    preferredAnswerLength: 140,
    citationWeight: 0.95,
    queryTypes: ['direct', 'comparison', 'list'] as const
  },
  gemini: {
    name: 'Gemini',
    style: 'factual',
    preferredAnswerLength: 160,
    citationWeight: 0.90,
    queryTypes: ['direct', 'list', 'comparison'] as const
  },
  copilot: {
    name: 'Copilot',
    style: 'practical',
    preferredAnswerLength: 150,
    citationWeight: 0.85,
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

/**
 * ✅ CORRECTION 3 — Scoring AIO réel
 * Critères : longueur ≤140, chiffres, affirmatif, pas de "dépend"
 */
function computeCitationScoreAIO(
  answer: string,
  platform: Platform,
  queryType: QueryType
): number {
  let score = 50;

  // ≤ 140 caractères = +20
  if (answer.length <= 140) score += 20;
  
  // Contient des chiffres = +20
  if (/\d/.test(answer)) score += 20;
  
  // Pas de "dépend" / "depends" = +10
  if (!answer.toLowerCase().includes('dépend') && !answer.toLowerCase().includes('depend')) score += 10;
  
  // Réponse directe = +10
  if (queryType === 'direct') score += 10;
  
  // Unités de mesure = +5
  if (/cm|kg|€|\$|%|mm|m²/.test(answer)) score += 5;
  
  // Affirmation forte = +5
  if (answer.includes('est ') || answer.includes(' is ') || answer.includes('mesure') || answer.includes('measures')) score += 5;

  const weight = PLATFORM_CONFIGS[platform].citationWeight;
  return Math.min(100, Math.round(score * weight));
}

/**
 * ✅ CORRECTION 2 — Réponses courtes, affirmatives, chiffrées
 * Format AIO : ≤ 2 phrases, chiffres, affirmation, pas de "dépend de"
 */
function generateDirectAnswer(
  category: string,
  products: Product[],
  lang: Lang,
  queryType: QueryType
): string {
  const catLower = category.toLowerCase();
  
  if (queryType === 'direct') {
    return lang === 'fr'
      ? `Une ${catLower} idéale pour 6 personnes mesure entre 160 et 180 cm. En dessous de 160 cm, l'espace devient insuffisant.`
      : `An ideal ${catLower} for 6 people measures between 160 and 180 cm. Below 160 cm, space becomes insufficient.`;
  }
  
  if (queryType === 'comparison' && products.length >= 2) {
    return lang === 'fr'
      ? `${products[0]?.title} est plus abordable (rapport qualité-prix), tandis que ${products[1]?.title} offre une meilleure durabilité grâce à ses matériaux.`
      : `${products[0]?.title} is more affordable (value for money), while ${products[1]?.title} offers better durability thanks to its materials.`;
  }
  
  if (queryType === 'comparison') {
    return lang === 'fr'
      ? `Pour comparer les ${catLower}, évaluez 3 critères : prix au m² (30%), qualité matériaux (40%), avis clients (30%).`
      : `To compare ${catLower}, evaluate 3 criteria: price per sqm (30%), material quality (40%), customer reviews (30%).`;
  }
  
  // list type
  return lang === 'fr'
    ? `Les 3 critères clés pour choisir une ${catLower} sont : dimensions (160-180 cm), matériau (bois massif ou métal), et stabilité (pieds renforcés).`
    : `The 3 key criteria to choose a ${catLower} are: dimensions (160-180 cm), material (solid wood or metal), and stability (reinforced legs).`;
}

function generateAiQuery(category: string, queryType: QueryType, lang: Lang): string {
  const catLower = category.toLowerCase();
  
  if (queryType === 'direct') {
    return lang === 'fr'
      ? `Quelle taille idéale pour une ${catLower} ?`
      : `What is the ideal size for a ${catLower}?`;
  }
  
  if (queryType === 'comparison') {
    return lang === 'fr'
      ? `Comment comparer les ${catLower} ?`
      : `How to compare ${catLower}?`;
  }
  
  // list type
  return lang === 'fr'
    ? `Quels sont les critères pour choisir une ${catLower} ?`
    : `What are the criteria for choosing a ${catLower}?`;
}

function generateSupportingBullets(category: string, lang: Lang): string[] {
  return lang === 'fr'
    ? [
        `Mesurer l'espace disponible (prévoir 60 cm autour)`,
        `Vérifier la capacité (6 personnes = 160 cm minimum)`,
        `Privilégier bois massif ou métal pour la durabilité`,
        `Comparer les garanties (5 ans minimum)`,
        `Lire les avis récents (< 6 mois)`
      ]
    : [
        `Measure available space (allow 60 cm around)`,
        `Check capacity (6 people = 160 cm minimum)`,
        `Prefer solid wood or metal for durability`,
        `Compare warranties (5 years minimum)`,
        `Read recent reviews (< 6 months)`
      ];
}

function generateFaq(category: string, directAnswer: string, lang: Lang): { q: string; a: string }[] {
  const catLower = category.toLowerCase();
  
  return lang === 'fr'
    ? [
        { q: `Quelle taille pour une ${catLower} 6 personnes ?`, a: `Une ${catLower} pour 6 personnes mesure 160 à 180 cm de long.` },
        { q: `Quel budget pour une ${catLower} de qualité ?`, a: `Budget moyen : 400€ à 900€ selon matériaux et marque.` },
        { q: `Quelle durée de vie pour une ${catLower} ?`, a: `10 à 20 ans avec entretien régulier (bois : huiler 1x/an).` }
      ]
    : [
        { q: `What size for a 6-person ${catLower}?`, a: `A 6-person ${catLower} measures 160 to 180 cm long.` },
        { q: `What budget for a quality ${catLower}?`, a: `Average budget: $400 to $900 depending on materials and brand.` },
        { q: `How long does a ${catLower} last?`, a: `10 to 20 years with regular maintenance (wood: oil once a year).` }
      ];
}

/* -------------------- CORE AIO GENERATION -------------------- */

function generateAioAnswers(
  products: Product[],
  platform: Platform,
  lang: Lang
): AiAnswer[] {
  const categories = groupByCategory(products);
  const config = PLATFORM_CONFIGS[platform];
  const results: AiAnswer[] = [];

  for (const [category, items] of Object.entries(categories)) {
    if (items.length === 0) continue;

    // Generate one answer per query type for each category
    for (const queryType of config.queryTypes) {
      // ✅ ANSWER FIRST - Generate the citable answer
      const direct_answer = generateDirectAnswer(category, items, lang, queryType);
      const question = generateAiQuery(category, queryType, lang);
      
      // ✅ CORRECTION 3 — AIO scoring réel
      const citation_potential = computeCitationScoreAIO(direct_answer, platform, queryType);
      
      // Determine difficulty
      const difficulty: 'easy' | 'medium' | 'hard' = items.length >= 5 ? 'hard' : items.length >= 2 ? 'medium' : 'easy';
      
      // Extract keywords
      const keywords = [
        category.toLowerCase(),
        ...items.slice(0, 3).map(p => p.title.split(' ')[0].toLowerCase()),
        queryType,
        platform,
        lang === 'fr' ? 'guide' : 'guide',
        lang === 'fr' ? 'taille' : 'size'
      ].filter((v, i, a) => a.indexOf(v) === i && v.length > 2);

      results.push({
        platform,
        query_type: queryType,
        question,
        direct_answer,              // ✅ TOP-LEVEL
        answer_confidence: 0.85,
        supporting_content: {
          bullets: generateSupportingBullets(category, lang),
          faq: generateFaq(category, direct_answer, lang)
        },
        citation_potential,
        product_ids: items.slice(0, 5).map(p => p.id),
        keywords,
        difficulty,
        category
      });
    }
  }

  return results;
}

/**
 * ✅ CORRECTION 4 — Limite par catégorie + plateforme
 * 2 answers max par catégorie, triés par citation_potential
 */
function limitPerCategory(answers: AiAnswer[], maxPerCategory: number = 2): AiAnswer[] {
  const grouped: Record<string, AiAnswer[]> = {};
  
  for (const answer of answers) {
    const key = answer.category;
    grouped[key] ??= [];
    grouped[key].push(answer);
  }
  
  const finalResults: AiAnswer[] = [];
  
  for (const category of Object.keys(grouped)) {
    const categoryAnswers = grouped[category]
      .sort((a, b) => b.citation_potential - a.citation_potential)
      .slice(0, maxPerCategory);
    
    finalResults.push(...categoryAnswers);
  }
  
  return finalResults.sort((a, b) => b.citation_potential - a.citation_potential);
}

/* -------------------- ARTICLE GENERATOR -------------------- */

/**
 * ✅ LIVRABLE 2 — Génération d'article à partir du direct_answer
 * L'article est construit AUTOUR du direct_answer, pas l'inverse
 */
function generateArticleFromAnswer(
  question: string,
  directAnswer: string,
  supporting: { bullets: string[]; faq: { q: string; a: string }[] },
  lang: Lang
): string {
  const keyPointsTitle = lang === 'fr' ? 'Points essentiels' : 'Key points';
  const faqTitle = 'FAQ';
  
  return `<h1>${question}</h1>

<p><strong>${directAnswer}</strong></p>

<h2>${keyPointsTitle}</h2>
<ul>
${supporting.bullets.map((b: string) => `  <li>${b}</li>`).join('\n')}
</ul>

<h2>${faqTitle}</h2>
${supporting.faq.map((f: { q: string; a: string }) => `<h3>${f.q}</h3>
<p>${f.a}</p>`).join('\n\n')}`;
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

    const { storeId, platform, refresh = false, generateArticle = false } = await req.json();

    if (!storeId) {
      return new Response(JSON.stringify({ error: 'storeId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const platforms: Platform[] = platform 
      ? [platform] 
      : ['chatgpt', 'gemini', 'copilot'];

    // Check cache in ai_answers table if not refreshing
    if (!refresh) {
      const { data: cached } = await supabase
        .from('ai_answers')
        .select('*')
        .eq('user_id', user.id)
        .eq('store_id', storeId)
        .in('platform', platforms)
        .order('citation_potential', { ascending: false });

      if (cached && cached.length > 0) {
        console.log(`✅ Returning ${cached.length} cached AIO answers`);
        return new Response(JSON.stringify({ 
          success: true, 
          opportunities: cached,
          cached: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      // Clear existing answers for refresh
      await supabase
        .from('ai_answers')
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

    // Generate AIO answers for each platform
    const allAnswers: any[] = [];
    
    for (const p of platforms) {
      const rawAnswers = generateAioAnswers(products, p, language);
      
      // ✅ CORRECTION 4 — Limite par catégorie (2 par catégorie)
      const answers = limitPerCategory(rawAnswers, 2);
      
      console.log(`✨ Generated ${answers.length} AIO answers for ${p}`);
      
      // ✅ CORRECTION 1 — Insert into ai_answers with direct_answer as top-level
      for (const answer of answers) {
        const insertData: any = {
          user_id: user.id,
          store_id: storeId,
          platform: answer.platform,
          query_type: answer.query_type,
          question: answer.question,
          direct_answer: answer.direct_answer,        // ✅ TOP-LEVEL
          answer_confidence: answer.answer_confidence,
          supporting_content: answer.supporting_content,
          citation_potential: answer.citation_potential,
          product_ids: answer.product_ids,
          keywords: answer.keywords,
          difficulty: answer.difficulty,
          status: 'pending'
        };

        const { data: inserted, error: insertError } = await supabase
          .from('ai_answers')
          .insert(insertData)
          .select()
          .single();

        if (!insertError && inserted) {
          // ✅ LIVRABLE 2 — Generate article if requested
          if (generateArticle) {
            const articleHtml = generateArticleFromAnswer(
              answer.question,
              answer.direct_answer,
              answer.supporting_content,
              language
            );
            inserted.generated_article = articleHtml;
          }
          
          allAnswers.push(inserted);
        } else if (insertError) {
          console.error('Insert error:', insertError);
        }
      }
    }

    console.log(`✅ Total AIO answers generated: ${allAnswers.length}`);

    // ✅ LIVRABLE 3 — Example of what ChatGPT would cite
    const exampleCitation = language === 'fr'
      ? {
          question: "Quelle taille idéale pour une table à manger 6 personnes ?",
          your_answer: "Une table à manger idéale pour 6 personnes mesure entre 160 et 180 cm. En dessous de 160 cm, l'espace devient insuffisant.",
          chatgpt_cites: "Pour 6 personnes, une table à manger doit mesurer entre 160 et 180 cm afin d'assurer un espace confortable."
        }
      : {
          question: "What is the ideal size for a 6-person dining table?",
          your_answer: "An ideal dining table for 6 people measures between 160 and 180 cm. Below 160 cm, space becomes insufficient.",
          chatgpt_cites: "For 6 people, a dining table should measure between 160 and 180 cm to ensure comfortable space."
        };

    return new Response(JSON.stringify({ 
      success: true, 
      opportunities: allAnswers,
      cached: false,
      aio_example: exampleCitation
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
