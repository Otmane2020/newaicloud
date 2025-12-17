import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ✅ VERSION AEO GÉNÉRIQUE MULTI-MÉTIERS
 * Moteur universel qui fonctionne pour N'IMPORTE QUEL métier :
 * - E-commerce (meubles, mode, électronique...)
 * - Services (avocats, artisans, restaurants...)
 * - SaaS, Santé, BTP, etc.
 * 
 * Logique basée sur les INTENTIONS (price, duration, criteria, comparison)
 * plutôt que sur des catégories hardcodées.
 */

type Platform = 'chatgpt' | 'gemini' | 'copilot';
type Lang = 'fr' | 'en';
type QueryType = 'direct' | 'list' | 'comparison';
type IntentType = 'price' | 'duration' | 'dimensions' | 'criteria' | 'comparison' | 'howto' | 'best';

interface Product {
  id: string;
  title: string;
  product_type?: string | null;
  vendor?: string | null;
  tags?: string | null;
  body_html?: string | null;
  seo_description?: string | null;
}

interface AiAnswer {
  platform: Platform;
  query_type: QueryType;
  question: string;
  direct_answer: string;
  answer_confidence: number;
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

// Platform-specific configurations for AEO
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

/**
 * ✅ INTENT TEMPLATES - Génériques pour tous métiers
 * Chaque intention génère une structure de question/réponse adaptable
 */
const INTENT_TEMPLATES = {
  price: {
    fr: {
      questionPattern: (category: string) => `Combien coûte ${category} ?`,
      answerPattern: (category: string, details: string) => 
        `${category} coûte en moyenne ${details}. Le prix varie selon la qualité et les options.`
    },
    en: {
      questionPattern: (category: string) => `How much does ${category} cost?`,
      answerPattern: (category: string, details: string) => 
        `${category} costs on average ${details}. Price varies based on quality and options.`
    }
  },
  duration: {
    fr: {
      questionPattern: (category: string) => `Combien de temps pour ${category} ?`,
      answerPattern: (category: string, details: string) => 
        `${category} prend généralement ${details}. Ce délai peut varier selon la complexité.`
    },
    en: {
      questionPattern: (category: string) => `How long does ${category} take?`,
      answerPattern: (category: string, details: string) => 
        `${category} typically takes ${details}. This timeframe may vary based on complexity.`
    }
  },
  dimensions: {
    fr: {
      questionPattern: (category: string) => `Quelles dimensions pour ${category} ?`,
      answerPattern: (category: string, details: string) => 
        `${category} mesure généralement ${details}. Prévoir l'espace nécessaire avant l'achat.`
    },
    en: {
      questionPattern: (category: string) => `What dimensions for ${category}?`,
      answerPattern: (category: string, details: string) => 
        `${category} typically measures ${details}. Allow necessary space before purchase.`
    }
  },
  criteria: {
    fr: {
      questionPattern: (category: string) => `Comment choisir ${category} ?`,
      answerPattern: (category: string, details: string) => 
        `Les 3 critères clés pour choisir ${category} sont : ${details}.`
    },
    en: {
      questionPattern: (category: string) => `How to choose ${category}?`,
      answerPattern: (category: string, details: string) => 
        `The 3 key criteria for choosing ${category} are: ${details}.`
    }
  },
  comparison: {
    fr: {
      questionPattern: (category: string) => `Comment comparer les ${category} ?`,
      answerPattern: (category: string, details: string) => 
        `Pour comparer les ${category}, évaluez : ${details}.`
    },
    en: {
      questionPattern: (category: string) => `How to compare ${category}?`,
      answerPattern: (category: string, details: string) => 
        `To compare ${category}, evaluate: ${details}.`
    }
  },
  howto: {
    fr: {
      questionPattern: (category: string) => `Comment utiliser ${category} ?`,
      answerPattern: (category: string, details: string) => 
        `Pour utiliser ${category} : ${details}.`
    },
    en: {
      questionPattern: (category: string) => `How to use ${category}?`,
      answerPattern: (category: string, details: string) => 
        `To use ${category}: ${details}.`
    }
  },
  best: {
    fr: {
      questionPattern: (category: string) => `Quel est le meilleur ${category} ?`,
      answerPattern: (category: string, details: string) => 
        `Le meilleur ${category} dépend de vos besoins : ${details}.`
    },
    en: {
      questionPattern: (category: string) => `What is the best ${category}?`,
      answerPattern: (category: string, details: string) => 
        `The best ${category} depends on your needs: ${details}.`
    }
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
 * ✅ Déterminer les intentions pertinentes selon le type de catégorie
 */
function getRelevantIntents(category: string, products: Product[]): IntentType[] {
  const categoryLower = category.toLowerCase();
  const productText = products.map(p => `${p.title} ${p.body_html || ''}`).join(' ').toLowerCase();
  
  // Indices de métier détectés
  const isPhysicalProduct = /meuble|chaise|table|lit|canapé|matelas|vêtement|électronique|appareil/i.test(categoryLower + ' ' + productText);
  const isService = /service|conseil|consultation|formation|coaching|avocat|artisan|rénovation/i.test(categoryLower + ' ' + productText);
  const isSoftware = /logiciel|software|saas|app|application|abonnement/i.test(categoryLower + ' ' + productText);
  const isFood = /restaurant|café|food|nourriture|plat|menu/i.test(categoryLower + ' ' + productText);
  
  const intents: IntentType[] = [];
  
  // Toujours pertinents
  intents.push('criteria', 'best');
  
  // Prix - presque toujours pertinent
  intents.push('price');
  
  // Selon le type
  if (isPhysicalProduct) {
    intents.push('dimensions', 'comparison');
  }
  
  if (isService || isSoftware) {
    intents.push('duration', 'howto');
  }
  
  if (products.length >= 2) {
    intents.push('comparison');
  }
  
  // Dédupliquer
  return [...new Set(intents)];
}

/**
 * ✅ Scoring AEO réel
 * Critères : longueur ≤140, chiffres, affirmatif, pas de "dépend"
 */
function computeCitationScoreAEO(
  answer: string,
  platform: Platform,
  queryType: QueryType
): number {
  let score = 50;

  const preferredLength = PLATFORM_CONFIGS[platform].preferredAnswerLength;
  if (answer.length <= preferredLength) score += 20;
  
  // Contient des chiffres = +20
  if (/\d/.test(answer)) score += 20;
  
  // Pas de "dépend" / "depends" = +10
  if (!answer.toLowerCase().includes('dépend') && !answer.toLowerCase().includes('depend')) score += 10;
  
  // Réponse directe = +10
  if (queryType === 'direct') score += 10;
  
  // Unités de mesure = +5
  if (/cm|kg|€|\$|%|mm|m²|jour|semaine|mois|year|week|day|month/.test(answer)) score += 5;
  
  // Affirmation forte = +5
  if (answer.includes('est ') || answer.includes(' is ') || answer.includes('coûte') || answer.includes('costs') || answer.includes('prend') || answer.includes('takes')) score += 5;

  const weight = PLATFORM_CONFIGS[platform].citationWeight;
  return Math.min(100, Math.round(score * weight));
}

/**
 * ✅ Appel à l'IA pour générer des réponses contextuelles
 */
async function generateAIAnswer(
  category: string,
  products: Product[],
  intent: IntentType,
  lang: Lang
): Promise<{ question: string; answer: string; details: string }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  // Construire le contexte produits
  const productContext = products.slice(0, 5).map(p => ({
    title: p.title,
    type: p.product_type,
    vendor: p.vendor
  }));

  const systemPrompt = lang === 'fr' 
    ? `Tu es un expert AEO (Answer Engine Optimization). Génère des réponses EXACTES, COURTES et CITABLES pour les IA comme ChatGPT.

RÈGLES STRICTES :
- Maximum 2 phrases
- Inclure des CHIFFRES concrets (prix, dimensions, durées)
- Ton affirmatif, PAS de "ça dépend"
- Réponse factuelle et vérifiable
- Adapte-toi au contexte métier des produits`
    : `You are an AEO (Answer Engine Optimization) expert. Generate EXACT, SHORT and CITABLE answers for AIs like ChatGPT.

STRICT RULES:
- Maximum 2 sentences
- Include concrete NUMBERS (prices, dimensions, durations)
- Affirmative tone, NO "it depends"
- Factual and verifiable answer
- Adapt to the business context of products`;

  const intentDescription = {
    price: lang === 'fr' ? 'le prix/coût' : 'the price/cost',
    duration: lang === 'fr' ? 'la durée/délai' : 'the duration/timeframe',
    dimensions: lang === 'fr' ? 'les dimensions/taille' : 'the dimensions/size',
    criteria: lang === 'fr' ? 'les critères de choix' : 'the selection criteria',
    comparison: lang === 'fr' ? 'la comparaison' : 'the comparison',
    howto: lang === 'fr' ? 'comment utiliser/faire' : 'how to use/do',
    best: lang === 'fr' ? 'le meilleur choix' : 'the best choice'
  };

  const userPrompt = lang === 'fr'
    ? `Catégorie: "${category}"
Produits exemple: ${JSON.stringify(productContext)}
Intention: ${intentDescription[intent]}

Génère:
1. Une question naturelle que les gens posent à ChatGPT sur "${category}" concernant ${intentDescription[intent]}
2. Une réponse AEO (max 2 phrases, avec chiffres)

Format JSON:
{"question": "...", "answer": "...", "details": "données chiffrées utilisées"}`
    : `Category: "${category}"
Example products: ${JSON.stringify(productContext)}
Intent: ${intentDescription[intent]}

Generate:
1. A natural question people ask ChatGPT about "${category}" regarding ${intentDescription[intent]}
2. An AEO answer (max 2 sentences, with numbers)

JSON format:
{"question": "...", "answer": "...", "details": "numerical data used"}`;

  try {
    if (LOVABLE_API_KEY) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        // Parser le JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              question: parsed.question || INTENT_TEMPLATES[intent][lang].questionPattern(category),
              answer: parsed.answer || INTENT_TEMPLATES[intent][lang].answerPattern(category, 'données variables'),
              details: parsed.details || ''
            };
          } catch {
            console.log('JSON parse failed, using fallback');
          }
        }
      }
    }
  } catch (error) {
    console.error('AI generation error:', error);
  }

  // Fallback avec templates
  const template = INTENT_TEMPLATES[intent][lang];
  const fallbackDetails = getFallbackDetails(intent, lang);
  
  return {
    question: template.questionPattern(category),
    answer: template.answerPattern(category, fallbackDetails),
    details: fallbackDetails
  };
}

/**
 * ✅ Détails de fallback génériques mais utiles
 */
function getFallbackDetails(intent: IntentType, lang: Lang): string {
  const details: Record<IntentType, { fr: string; en: string }> = {
    price: { 
      fr: '50€ à 500€ selon la gamme', 
      en: '$50 to $500 depending on range' 
    },
    duration: { 
      fr: '1 à 4 semaines', 
      en: '1 to 4 weeks' 
    },
    dimensions: { 
      fr: 'dimensions standard adaptées à votre espace', 
      en: 'standard dimensions suited to your space' 
    },
    criteria: { 
      fr: 'qualité (40%), prix (30%), avis clients (30%)', 
      en: 'quality (40%), price (30%), customer reviews (30%)' 
    },
    comparison: { 
      fr: 'prix, qualité des matériaux, garantie', 
      en: 'price, material quality, warranty' 
    },
    howto: { 
      fr: 'suivre les instructions, vérifier la compatibilité', 
      en: 'follow instructions, check compatibility' 
    },
    best: { 
      fr: 'rapport qualité-prix, durabilité, avis clients', 
      en: 'value for money, durability, customer reviews' 
    }
  };
  
  return details[intent][lang];
}

/**
 * ✅ Génération des bullets de support contextuels
 */
function generateSupportingBullets(category: string, intent: IntentType, lang: Lang): string[] {
  const genericBullets = {
    fr: [
      `Vérifier les caractéristiques avant l'achat`,
      `Comparer plusieurs options`,
      `Lire les avis clients récents`,
      `Vérifier la garantie et le SAV`,
      `Demander conseil si besoin`
    ],
    en: [
      `Check specifications before purchase`,
      `Compare multiple options`,
      `Read recent customer reviews`,
      `Check warranty and support`,
      `Ask for advice if needed`
    ]
  };
  
  return genericBullets[lang];
}

/**
 * ✅ Génération FAQ contextuelle
 */
function generateFaq(
  category: string, 
  directAnswer: string, 
  intent: IntentType,
  lang: Lang
): { q: string; a: string }[] {
  const template = INTENT_TEMPLATES[intent][lang];
  
  return lang === 'fr'
    ? [
        { q: template.questionPattern(category), a: directAnswer },
        { q: `Où acheter ${category} de qualité ?`, a: `Privilégiez les vendeurs avec garantie et avis positifs.` },
        { q: `Quelle garantie pour ${category} ?`, a: `Une garantie minimum de 2 ans est recommandée.` }
      ]
    : [
        { q: template.questionPattern(category), a: directAnswer },
        { q: `Where to buy quality ${category}?`, a: `Choose sellers with warranty and positive reviews.` },
        { q: `What warranty for ${category}?`, a: `A minimum 2-year warranty is recommended.` }
      ];
}

/* -------------------- CORE AEO GENERATION -------------------- */

async function generateAeoAnswers(
  products: Product[],
  platform: Platform,
  lang: Lang
): Promise<AiAnswer[]> {
  const categories = groupByCategory(products);
  const config = PLATFORM_CONFIGS[platform];
  const results: AiAnswer[] = [];

  for (const [category, items] of Object.entries(categories)) {
    if (items.length === 0) continue;

    // Déterminer les intentions pertinentes pour cette catégorie
    const intents = getRelevantIntents(category, items);
    
    // Générer une réponse par intention (max 3 pour éviter trop de requêtes)
    for (const intent of intents.slice(0, 3)) {
      // Mapper l'intent vers un queryType
      const queryType: QueryType = 
        intent === 'comparison' ? 'comparison' :
        intent === 'criteria' || intent === 'howto' ? 'list' : 'direct';

      // ✅ Utiliser l'IA pour générer une réponse contextuelle
      const aiGenerated = await generateAIAnswer(category, items, intent, lang);
      
      const direct_answer = aiGenerated.answer;
      const question = aiGenerated.question;
      
      // Scoring AEO
      const citation_potential = computeCitationScoreAEO(direct_answer, platform, queryType);
      
      // Difficulty
      const difficulty: 'easy' | 'medium' | 'hard' = items.length >= 5 ? 'hard' : items.length >= 2 ? 'medium' : 'easy';
      
      // Keywords
      const keywords = [
        category.toLowerCase(),
        ...items.slice(0, 3).map(p => p.title.toLowerCase().split(' ').slice(0, 3).join(' ')),
        intent,
        queryType,
        platform
      ].filter((v, i, a) => a.indexOf(v) === i && v.length > 2);

      results.push({
        platform,
        query_type: queryType,
        question,
        direct_answer,
        answer_confidence: 0.85,
        supporting_content: {
          bullets: generateSupportingBullets(category, intent, lang),
          faq: generateFaq(category, direct_answer, intent, lang)
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
 * ✅ Limite par catégorie + plateforme
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
        console.log(`✅ Returning ${cached.length} cached AEO answers`);
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

    // Fetch products with more context
    const { data: products, error: productsError } = await supabase
      .from('shopify_products')
      .select('id, title, product_type, vendor, tags, body_html, seo_description')
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

    // Generate AEO answers for each platform
    const allAnswers: any[] = [];
    
    for (const p of platforms) {
      const rawAnswers = await generateAeoAnswers(products, p, language);
      
      // Limite par catégorie (2 par catégorie)
      const answers = limitPerCategory(rawAnswers, 2);
      
      console.log(`✨ Generated ${answers.length} AEO answers for ${p}`);
      
      // Insert into ai_answers
      for (const answer of answers) {
        const insertData: any = {
          user_id: user.id,
          store_id: storeId,
          platform: answer.platform,
          query_type: answer.query_type,
          question: answer.question,
          direct_answer: answer.direct_answer,
          answer_confidence: answer.answer_confidence,
          supporting_content: answer.supporting_content,
          citation_potential: answer.citation_potential,
          product_ids: answer.product_ids,
          keywords: answer.keywords,
          difficulty: answer.difficulty,
          category: answer.category,
          status: 'pending'
        };

        const { data: inserted, error: insertError } = await supabase
          .from('ai_answers')
          .insert(insertData)
          .select()
          .single();

        if (!insertError && inserted) {
          allAnswers.push(inserted);
        } else if (insertError) {
          console.error('Insert error:', insertError);
        }
      }
    }

    console.log(`✅ Total AEO answers generated: ${allAnswers.length}`);

    return new Response(JSON.stringify({ 
      success: true, 
      opportunities: allAnswers,
      cached: false,
      engine: 'generic-multi-industry'
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
