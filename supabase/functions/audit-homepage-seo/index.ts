import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Pass the token explicitly to getUser
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized');
    }

    console.log('Fetching active Shopify connection for user:', user.id);

    // Get active Shopify connection
    const { data: connection, error: connError } = await supabaseClient
      .from('shopify_connections')
      .select('shop_url')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'No active Shopify connection found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shopUrl = connection.shop_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const homepageUrl = `https://${shopUrl}`;

    console.log('Fetching homepage HTML from:', homepageUrl);

    // Fetch homepage HTML with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const htmlResponse = await fetch(homepageUrl, {
      headers: { 'User-Agent': 'NewAI SEO Analyzer Bot' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!htmlResponse.ok) {
      throw new Error(`Failed to fetch homepage: ${htmlResponse.status}`);
    }

    const html = await htmlResponse.text();
    console.log('HTML fetched, length:', html.length);

    // Parse HTML and extract SEO elements
    const elements = extractSeoElements(html);
    console.log('Elements extracted:', elements);

    // Calculate SEO score
    const scoreResult = calculateHomepageSeoScore(elements);

    // Generate AI recommendations
    console.log('Generating AI recommendations...');
    const recommendations = await generateAiRecommendations(elements, scoreResult);

    const result = {
      ...scoreResult,
      elements,
      recommendations,
      analyzedUrl: homepageUrl,
      analyzedAt: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in audit-homepage-seo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface SeoElements {
  title: string;
  metaDescription: string;
  h1: string;
  h2s: string[];
  altsCount: number;
  totalImages: number;
  canonical: string;
  hasSchema: boolean;
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
  httpsEnabled: boolean;
  contentLength: number;
  internalLinks: number;
  externalLinks: number;
}

function extractSeoElements(html: string): SeoElements {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extract meta description
  const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

  // Extract H1 (first occurrence)
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const h1 = h1Match ? h1Match[1].replace(/<[^>]*>/g, '').trim() : '';

  // Extract all H2s
  const h2Matches = html.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
  const h2s = h2Matches.map(h2 => h2.replace(/<[^>]*>/g, '').trim());

  // Count images and alts
  const imgMatches = html.match(/<img[^>]*>/gi) || [];
  const totalImages = imgMatches.length;
  const altsCount = imgMatches.filter(img => /alt=["'][^"']+["']/i.test(img)).length;

  // Extract canonical
  const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
  const canonical = canonicalMatch ? canonicalMatch[1] : '';

  // Check for Schema.org JSON-LD
  const hasSchema = /<script[^>]*type=["']application\/ld\+json["'][^>]*>/i.test(html);

  // Check for OpenGraph
  const hasOpenGraph = /<meta\s+property=["']og:/i.test(html);

  // Check for Twitter Card
  const hasTwitterCard = /<meta\s+name=["']twitter:/i.test(html);

  // HTTPS is assumed since we fetch with https://
  const httpsEnabled = true;

  // Extract body text length
  const bodyMatch = html.match(/<body[^>]*>(.*?)<\/body>/is);
  const bodyText = bodyMatch ? bodyMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';
  const contentLength = bodyText.length;

  // Count links (approximate)
  const linkMatches = html.match(/<a\s+[^>]*href=["']([^"']*)["']/gi) || [];
  const internalLinks = linkMatches.filter(link => !link.includes('http://') && !link.includes('https://')).length;
  const externalLinks = linkMatches.length - internalLinks;

  return {
    title,
    metaDescription,
    h1,
    h2s,
    altsCount,
    totalImages,
    canonical,
    hasSchema,
    hasOpenGraph,
    hasTwitterCard,
    httpsEnabled,
    contentLength,
    internalLinks,
    externalLinks,
  };
}

interface ScoreBreakdown {
  structure: number;
  content: number;
  technical: number;
  bonus: number;
}

interface SeoScoreResult {
  score: number;
  breakdown: ScoreBreakdown;
  issues: string[];
}

function calculateHomepageSeoScore(elements: SeoElements): SeoScoreResult {
  let structureScore = 0;
  let contentScore = 0;
  let technicalScore = 0;
  let bonusScore = 0;
  const issues: string[] = [];

  // Structure (30 points)
  if (elements.title && elements.title.length > 0 && elements.title.length <= 60) {
    structureScore += 10;
  } else if (!elements.title || elements.title.length === 0) {
    issues.push('missing_title');
  } else {
    issues.push('title_too_long');
  }

  if (elements.metaDescription && elements.metaDescription.length > 0 && elements.metaDescription.length <= 160) {
    structureScore += 10;
  } else if (!elements.metaDescription || elements.metaDescription.length === 0) {
    issues.push('missing_meta_description');
  } else {
    issues.push('meta_description_too_long');
  }

  if (elements.h1 && elements.h1.length > 0) {
    structureScore += 10;
  } else {
    issues.push('missing_h1');
  }

  // Content (30 points)
  if (elements.h2s.length > 0) {
    contentScore += 10;
  } else {
    issues.push('missing_h2');
  }

  if (elements.totalImages > 0 && elements.altsCount === elements.totalImages) {
    contentScore += 10;
  } else if (elements.altsCount > 0) {
    contentScore += 5;
    issues.push('missing_alt_texts');
  } else if (elements.totalImages > 0) {
    issues.push('no_alt_texts');
  }

  if (elements.contentLength > 500) {
    contentScore += 10;
  } else {
    issues.push('content_too_short');
  }

  // Technical (25 points)
  if (elements.canonical) {
    technicalScore += 5;
  } else {
    issues.push('missing_canonical');
  }

  if (elements.httpsEnabled) {
    technicalScore += 10;
  } else {
    issues.push('no_https');
  }

  if (elements.hasSchema) {
    technicalScore += 10;
  } else {
    issues.push('missing_schema');
  }

  // Bonus (15 points)
  if (elements.hasOpenGraph) {
    bonusScore += 5;
  } else {
    issues.push('missing_opengraph');
  }

  if (elements.hasTwitterCard) {
    bonusScore += 5;
  } else {
    issues.push('missing_twitter_card');
  }

  if (elements.internalLinks > 5) {
    bonusScore += 5;
  } else {
    issues.push('few_internal_links');
  }

  const totalScore = structureScore + contentScore + technicalScore + bonusScore;

  return {
    score: totalScore,
    breakdown: {
      structure: structureScore,
      content: contentScore,
      technical: technicalScore,
      bonus: bonusScore,
    },
    issues,
  };
}

async function generateAiRecommendations(elements: SeoElements, scoreResult: SeoScoreResult): Promise<string[]> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return generateFallbackRecommendations(scoreResult.issues);
    }

    const prompt = `Tu es un expert SEO. Analyse cette page d'accueil et génère 3 à 5 recommandations concrètes et actionnables en français.

Score SEO actuel : ${scoreResult.score}/100

Éléments analysés :
- Titre : ${elements.title ? `"${elements.title}" (${elements.title.length} caractères)` : 'Absent'}
- Meta description : ${elements.metaDescription ? `"${elements.metaDescription}" (${elements.metaDescription.length} caractères)` : 'Absente'}
- H1 : ${elements.h1 ? `"${elements.h1}"` : 'Absent'}
- H2 trouvés : ${elements.h2s.length}
- Images avec ALT : ${elements.altsCount}/${elements.totalImages}
- Canonical : ${elements.canonical ? 'Présent' : 'Absent'}
- Schema.org : ${elements.hasSchema ? 'Présent' : 'Absent'}
- OpenGraph : ${elements.hasOpenGraph ? 'Présent' : 'Absent'}
- Twitter Card : ${elements.hasTwitterCard ? 'Présent' : 'Absent'}

Problèmes détectés : ${scoreResult.issues.join(', ')}

Génère 3 à 5 recommandations concrètes pour améliorer le SEO, ordonnées par priorité (du plus critique au moins critique). Chaque recommandation doit être courte (1 phrase) et actionnable.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un expert SEO qui génère des recommandations claires et actionnables en français.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return generateFallbackRecommendations(scoreResult.issues);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || '';

    // Parse recommendations from AI response (expecting numbered list or bullet points)
    const recommendations = aiText
      .split('\n')
      .filter((line: string) => line.trim().length > 0)
      .filter((line: string) => /^[\d\-•]/.test(line.trim()))
      .map((line: string) => line.replace(/^[\d\-•.)\s]+/, '').trim())
      .filter((rec: string) => rec.length > 10);

    return recommendations.length > 0 ? recommendations : generateFallbackRecommendations(scoreResult.issues);

  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    return generateFallbackRecommendations(scoreResult.issues);
  }
}

function generateFallbackRecommendations(issues: string[]): string[] {
  const recommendationMap: Record<string, string> = {
    missing_title: 'Ajoutez un titre de page unique et descriptif (max 60 caractères)',
    title_too_long: 'Raccourcissez le titre de la page à 60 caractères maximum',
    missing_meta_description: 'Créez une meta description engageante (max 160 caractères)',
    meta_description_too_long: 'Réduisez la meta description à 160 caractères maximum',
    missing_h1: 'Ajoutez une balise H1 unique avec votre mot-clé principal',
    missing_h2: 'Structurez votre contenu avec des balises H2 pour les sections importantes',
    missing_alt_texts: 'Complétez les attributs ALT manquants sur vos images',
    no_alt_texts: 'Ajoutez des descriptions ALT à toutes vos images pour le SEO et l\'accessibilité',
    content_too_short: 'Enrichissez le contenu textuel de votre page (minimum 500 caractères)',
    missing_canonical: 'Ajoutez une balise canonical pour éviter le contenu dupliqué',
    no_https: 'Activez HTTPS pour sécuriser votre site (requis par Google)',
    missing_schema: 'Implémentez des données structurées Schema.org pour améliorer votre présence dans les SERP',
    missing_opengraph: 'Ajoutez des balises OpenGraph pour optimiser le partage sur les réseaux sociaux',
    missing_twitter_card: 'Intégrez des Twitter Cards pour améliorer l\'affichage sur Twitter',
    few_internal_links: 'Ajoutez plus de liens internes pour améliorer le maillage de votre site',
  };

  const recommendations: string[] = [];
  const criticalIssues = ['missing_title', 'missing_h1', 'missing_meta_description', 'no_https'];
  const importantIssues = ['missing_alt_texts', 'no_alt_texts', 'missing_schema', 'content_too_short'];

  // Add critical recommendations first
  for (const issue of issues) {
    if (criticalIssues.includes(issue) && recommendationMap[issue]) {
      recommendations.push(recommendationMap[issue]);
    }
  }

  // Add important recommendations
  for (const issue of issues) {
    if (importantIssues.includes(issue) && recommendationMap[issue] && recommendations.length < 5) {
      recommendations.push(recommendationMap[issue]);
    }
  }

  // Add remaining recommendations
  for (const issue of issues) {
    if (!criticalIssues.includes(issue) && !importantIssues.includes(issue) && recommendationMap[issue] && recommendations.length < 5) {
      recommendations.push(recommendationMap[issue]);
    }
  }

  return recommendations.length > 0 ? recommendations : ['Continuez à optimiser votre contenu et surveillez régulièrement vos performances SEO'];
}
