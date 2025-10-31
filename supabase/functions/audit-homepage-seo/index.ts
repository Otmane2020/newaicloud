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
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching active Shopify connection for user:', user.id);

    // Get active Shopify connection with error handling
    const { data: connection, error: connError } = await supabaseClient
      .from('shopify_connections')
      .select('store_url, access_token')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'No active Shopify connection found. Please reconnect your store.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shopUrl = connection.store_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const homepageUrl = `https://${shopUrl}`;

    console.log('Analyzing homepage SEO for:', homepageUrl);

    // Try to fetch via Shopify API first for better data
    let seoData;
    try {
      seoData = await fetchShopifySeoData(shopUrl, connection.access_token);
    } catch (shopifyError) {
      console.log('Falling back to HTML analysis:', shopifyError);
      seoData = await fetchAndAnalyzeHtml(homepageUrl);
    }

    // Calculate SEO score with improved algorithm
    const scoreResult = calculateEnhancedSeoScore(seoData.elements);
    
    // Generate AI-powered recommendations
    console.log('Generating enhanced AI recommendations...');
    const recommendations = await generateEnhancedAiRecommendations(seoData.elements, scoreResult, seoData.shopifySpecific);

    const result = {
      score: scoreResult.score,
      grade: getSeoGrade(scoreResult.score),
      breakdown: scoreResult.breakdown,
      elements: seoData.elements,
      recommendations,
      analyzedUrl: homepageUrl,
      analyzedAt: new Date().toISOString(),
      shopifySpecific: seoData.shopifySpecific || null,
    };

    // Store audit result in database for history
    await storeAuditResult(supabaseClient, user.id, result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in audit-homepage-seo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        suggestion: 'Please check your Shopify connection and try again.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchShopifySeoData(shopUrl: string, accessToken: string) {
  const apiUrl = `https://${shopUrl}/admin/api/2024-01/shop.json`;
  
  const response = await fetch(apiUrl, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status}`);
  }

  const shopData = await response.json();
  
  // Fallback to HTML analysis for detailed SEO elements
  const htmlData = await fetchAndAnalyzeHtml(`https://${shopUrl}`);
  
  return {
    elements: htmlData.elements,
    shopifySpecific: {
      shopName: shopData.shop.name,
      metaTitle: shopData.shop.meta_title,
      metaDescription: shopData.shop.meta_description,
      seoFriendly: true // Shopify generally has good SEO foundations
    }
  };
}

async function fetchAndAnalyzeHtml(url: string) {
  console.log('Fetching homepage HTML from:', url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout

  const htmlResponse = await fetch(url, {
    headers: { 
      'User-Agent': 'Mozilla/5.0 (compatible; NewAI-SEO-Analyzer/1.0; +https://newai.com)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    },
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!htmlResponse.ok) {
    throw new Error(`Failed to fetch homepage: ${htmlResponse.status} ${htmlResponse.statusText}`);
  }

  const html = await htmlResponse.text();
  console.log('HTML fetched successfully, length:', html.length);

  // Parse HTML and extract comprehensive SEO elements
  const elements = extractEnhancedSeoElements(html, url);
  console.log('SEO elements extracted successfully');

  return { elements, shopifySpecific: undefined };
}

interface EnhancedSeoElements {
  // Basic elements
  title: string;
  metaDescription: string;
  h1: string;
  h2s: string[];
  h3s: string[];
  
  // Images
  altsCount: number;
  totalImages: number;
  imagesWithEmptyAlt: number;
  
  // Technical SEO
  canonical: string;
  robotsMeta: string;
  viewportMeta: string;
  charsetMeta: string;
  
  // Structured Data
  hasSchema: boolean;
  schemaTypes: string[];
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
  
  // Performance & Security
  httpsEnabled: boolean;
  hasHsts: boolean;
  hasCompression: boolean;
  
  // Content Quality
  contentLength: number;
  keywordDensity: Record<string, number>;
  readabilityScore: number;
  
  // Links
  internalLinks: number;
  externalLinks: number;
  brokenLinks: number;
  
  // Mobile SEO
  isMobileFriendly: boolean;
  viewportPresent: boolean;
  
  // Advanced Metrics
  loadingSpeed: number;
  domSize: number;
}

function extractEnhancedSeoElements(html: string, url: string): EnhancedSeoElements {
  // Extract title with improved parsing
  const titleMatch = html.match(/<title[^>]*>\s*(.*?)\s*<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extract meta description with multiple patterns
  const metaDescMatch = html.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i) 
    || html.match(/<meta\s+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

  // Extract H1 (first occurrence)
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const h1 = h1Match ? h1Match[1].replace(/<[^>]*>/g, '').trim() : '';

  // Extract all H2s and H3s
  const h2Matches = html.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
  const h2s = h2Matches.map(h2 => h2.replace(/<[^>]*>/g, '').trim());
  
  const h3Matches = html.match(/<h3[^>]*>(.*?)<\/h3>/gi) || [];
  const h3s = h3Matches.map(h3 => h3.replace(/<[^>]*>/g, '').trim());

  // Enhanced image analysis
  const imgMatches = html.match(/<img[^>]*>/gi) || [];
  const totalImages = imgMatches.length;
  const imagesWithAlt = imgMatches.filter(img => /alt=["'][^"']*["']/i.test(img)).length;
  const imagesWithEmptyAlt = imgMatches.filter(img => /alt=["']\s*["']/i.test(img)).length;
  const altsCount = imagesWithAlt - imagesWithEmptyAlt;

  // Enhanced canonical and meta tags
  const canonicalMatch = html.match(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  const canonical = canonicalMatch ? canonicalMatch[1] : '';
  
  const robotsMatch = html.match(/<meta\s+name=["']robots["'][^>]*content=["']([^"']*)["']/i);
  const robotsMeta = robotsMatch ? robotsMatch[1] : '';
  
  const viewportMatch = html.match(/<meta\s+name=["']viewport["'][^>]*content=["']([^"']*)["']/i);
  const viewportMeta = viewportMatch ? viewportMatch[1] : '';
  
  const charsetMatch = html.match(/<meta[^>]*charset=["']([^"']*)["']/i);
  const charsetMeta = charsetMatch ? charsetMatch[1] : '';

  // Enhanced Schema.org detection
  const schemaMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const hasSchema = schemaMatches.length > 0;
  const schemaTypes: string[] = [];
  
  schemaMatches.forEach(schema => {
    const typeMatch = schema.match(/"@type"\s*:\s*"([^"]+)"/i);
    if (typeMatch) {
      schemaTypes.push(typeMatch[1]);
    }
  });

  // Social meta tags
  const hasOpenGraph = /<meta\s+property=["']og:/i.test(html);
  const hasTwitterCard = /<meta\s+name=["']twitter:/i.test(html);

  // Security headers (simulated - would need actual response headers)
  const httpsEnabled = url.startsWith('https://');
  const hasHsts = httpsEnabled; // Simplified

  // Content analysis
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyText = bodyMatch ? bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '')
                                                  .replace(/<style[\s\S]*?<\/style>/gi, '')
                                                  .replace(/<[^>]*>/g, ' ')
                                                  .replace(/\s+/g, ' ')
                                                  .trim() : '';
  const contentLength = bodyText.length;
  
  // Basic keyword density analysis
  const words = bodyText.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const wordCount = words.length;
  const keywordDensity: Record<string, number> = {};
  
  // Sample important words for density calculation
  const importantWords = words.filter(word => word.length > 3).slice(0, 20);
  importantWords.forEach(word => {
    const count = words.filter(w => w === word).length;
    keywordDensity[word] = (count / wordCount) * 100;
  });

  // Readability score (simplified)
  const sentences = bodyText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
  const readabilityScore = Math.max(0, 100 - (avgSentenceLength * 2));

  // Link analysis
  const linkMatches = html.match(/<a\s+[^>]*href=["']([^"']*)["']/gi) || [];
  const internalLinks = linkMatches.filter(link => {
    const hrefMatch = link.match(/href=["']([^"']*)["']/i);
    if (!hrefMatch) return false;
    const href = hrefMatch[1];
    return href.startsWith('/') || href.includes(url.replace(/^https?:\/\//, ''));
  }).length;
  
  const externalLinks = linkMatches.length - internalLinks;
  const brokenLinks = 0; // Would require actual link checking

  // Mobile friendliness
  const viewportPresent = !!viewportMeta;
  const isMobileFriendly = viewportPresent && !html.match(/<meta[^>]*name=["']viewport["'][^>]*content=["'][^"']*user-scalable=no["']/i);

  // Performance metrics (simplified)
  const domSize = (html.match(/<[^>]+>/g) || []).length;
  const loadingSpeed = Math.max(0, 100 - (domSize / 100)); // Simplified metric

  return {
    title,
    metaDescription,
    h1,
    h2s,
    h3s,
    altsCount,
    totalImages,
    imagesWithEmptyAlt,
    canonical,
    robotsMeta,
    viewportMeta,
    charsetMeta,
    hasSchema,
    schemaTypes,
    hasOpenGraph,
    hasTwitterCard,
    httpsEnabled,
    hasHsts,
    hasCompression: true, // Assumed for Shopify
    contentLength,
    keywordDensity,
    readabilityScore,
    internalLinks,
    externalLinks,
    brokenLinks,
    isMobileFriendly,
    viewportPresent,
    loadingSpeed,
    domSize,
  };
}

interface EnhancedScoreBreakdown {
  structure: number;
  content: number;
  technical: number;
  performance: number;
  mobile: number;
  bonus: number;
}

interface EnhancedSeoScoreResult {
  score: number;
  breakdown: EnhancedScoreBreakdown;
  criticalIssues: string[];
  warnings: string[];
  strengths: string[];
}

function calculateEnhancedSeoScore(elements: EnhancedSeoElements): EnhancedSeoScoreResult {
  let structureScore = 0;
  let contentScore = 0;
  let technicalScore = 0;
  let performanceScore = 0;
  let mobileScore = 0;
  let bonusScore = 0;
  
  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  const strengths: string[] = [];

  // STRUCTURE SCORING (25 points)
  // Title optimization
  if (elements.title && elements.title.length > 0) {
    if (elements.title.length <= 60) {
      structureScore += 8;
      strengths.push('title_length_optimal');
    } else {
      structureScore += 4;
      warnings.push('title_too_long');
    }
    
    // Check title keyword placement
    if (elements.title.split(' ').length >= 3) {
      structureScore += 2;
    }
  } else {
    criticalIssues.push('missing_title');
  }

  // Meta description optimization
  if (elements.metaDescription && elements.metaDescription.length > 0) {
    if (elements.metaDescription.length <= 160 && elements.metaDescription.length >= 50) {
      structureScore += 7;
      strengths.push('meta_description_optimal');
    } else {
      structureScore += 3;
      warnings.push('meta_description_length_issue');
    }
  } else {
    criticalIssues.push('missing_meta_description');
  }

  // Heading structure
  if (elements.h1 && elements.h1.length > 0) {
    structureScore += 5;
    if (elements.h1.length <= 70) {
      strengths.push('h1_optimal');
    }
  } else {
    criticalIssues.push('missing_h1');
  }

  if (elements.h2s.length >= 2) {
    structureScore += 3;
    strengths.push('good_h2_structure');
  } else if (elements.h2s.length === 0) {
    warnings.push('missing_h2');
  }

  // CONTENT SCORING (25 points)
  if (elements.contentLength >= 1000) {
    contentScore += 10;
    strengths.push('substantial_content');
  } else if (elements.contentLength >= 500) {
    contentScore += 6;
    warnings.push('content_could_be_richer');
  } else {
    contentScore += 2;
    criticalIssues.push('content_too_short');
  }

  // Image optimization
  if (elements.totalImages > 0) {
    const altPercentage = (elements.altsCount / elements.totalImages) * 100;
    if (altPercentage >= 90) {
      contentScore += 8;
      strengths.push('excellent_image_alts');
    } else if (altPercentage >= 70) {
      contentScore += 5;
      warnings.push('some_images_missing_alts');
    } else {
      contentScore += 2;
      criticalIssues.push('poor_image_alt_coverage');
    }
  }

  // Readability
  if (elements.readabilityScore >= 70) {
    contentScore += 7;
    strengths.push('good_readability');
  } else if (elements.readabilityScore >= 50) {
    contentScore += 4;
    warnings.push('readability_could_improve');
  } else {
    contentScore += 1;
  }

  // TECHNICAL SCORING (20 points)
  if (elements.canonical) {
    technicalScore += 5;
    strengths.push('canonical_present');
  } else {
    warnings.push('missing_canonical');
  }

  if (elements.httpsEnabled) {
    technicalScore += 5;
    strengths.push('https_enabled');
  } else {
    criticalIssues.push('no_https');
  }

  if (elements.hasSchema) {
    technicalScore += 5;
    strengths.push('schema_markup_present');
  } else {
    warnings.push('missing_schema');
  }

  if (elements.charsetMeta) {
    technicalScore += 2;
  }

  if (elements.robotsMeta && !elements.robotsMeta.includes('noindex')) {
    technicalScore += 3;
  }

  // PERFORMANCE SCORING (15 points)
  if (elements.loadingSpeed >= 80) {
    performanceScore += 8;
    strengths.push('good_performance');
  } else if (elements.loadingSpeed >= 60) {
    performanceScore += 5;
    warnings.push('performance_could_improve');
  } else {
    performanceScore += 2;
    criticalIssues.push('poor_performance');
  }

  if (elements.domSize < 1500) {
    performanceScore += 7;
  } else if (elements.domSize < 3000) {
    performanceScore += 4;
  } else {
    performanceScore += 1;
  }

  // MOBILE SCORING (10 points)
  if (elements.isMobileFriendly) {
    mobileScore += 6;
    strengths.push('mobile_friendly');
  } else {
    mobileScore += 2;
    criticalIssues.push('not_mobile_optimized');
  }

  if (elements.viewportPresent) {
    mobileScore += 4;
  } else {
    warnings.push('missing_viewport');
  }

  // BONUS SCORING (5 points)
  if (elements.hasOpenGraph) {
    bonusScore += 2;
    strengths.push('opengraph_present');
  } else {
    warnings.push('missing_opengraph');
  }

  if (elements.hasTwitterCard) {
    bonusScore += 2;
    strengths.push('twitter_cards_present');
  } else {
    warnings.push('missing_twitter_card');
  }

  if (elements.internalLinks >= 10) {
    bonusScore += 1;
    strengths.push('good_internal_linking');
  }

  const totalScore = Math.min(100, 
    structureScore + contentScore + technicalScore + performanceScore + mobileScore + bonusScore
  );

  return {
    score: totalScore,
    breakdown: {
      structure: structureScore,
      content: contentScore,
      technical: technicalScore,
      performance: performanceScore,
      mobile: mobileScore,
      bonus: bonusScore,
    },
    criticalIssues,
    warnings,
    strengths,
  };
}

function getSeoGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

async function generateEnhancedAiRecommendations(
  elements: EnhancedSeoElements, 
  scoreResult: EnhancedSeoScoreResult,
  shopifySpecific?: any
): Promise<string[]> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return generateEnhancedFallbackRecommendations(scoreResult, elements);
    }

    const prompt = `Tu es un expert SEO spécialisé dans l'optimisation Shopify. Analyse cette page d'accueil et génère 3 à 5 recommandations concrètes, actionnables et prioritaires en français.

SCORE SEO: ${scoreResult.score}/100 - GRADE: ${getSeoGrade(scoreResult.score)}

ÉLÉMENTS CRITIQUES À CORRIGER:
${scoreResult.criticalIssues.length > 0 ? scoreResult.criticalIssues.map(issue => `- ${getIssueDescription(issue)}`).join('\n') : 'Aucun problème critique détecté'}

PROBLÈMES IMPORTANTS:
${scoreResult.warnings.length > 0 ? scoreResult.warnings.map(warning => `- ${getIssueDescription(warning)}`).join('\n') : 'Aucun problème important détecté'}

POINTS FORTS:
${scoreResult.strengths.length > 0 ? scoreResult.strengths.map(strength => `- ${getStrengthDescription(strength)}`).join('\n') : 'Aucun point fort significatif'}

DÉTAILS DE L'ANALYSE:
- Titre: "${elements.title}" (${elements.title.length}/60 caractères)
- Meta Description: "${elements.metaDescription}" (${elements.metaDescription.length}/160 caractères)
- H1: "${elements.h1}" (${elements.h1.length} caractères)
- Structure H2: ${elements.h2s.length} sections
- Images optimisées: ${elements.altsCount}/${elements.totalImages} (${Math.round((elements.altsCount/elements.totalImages)*100)}%)
- Contenu texte: ${elements.contentLength} caractères
- Performance estimée: ${elements.loadingSpeed}/100
- Mobile Friendly: ${elements.isMobileFriendly ? 'Oui' : 'Non'}
- Schema.org: ${elements.hasSchema ? `Oui (${elements.schemaTypes.join(', ')})` : 'Non'}
- OpenGraph: ${elements.hasOpenGraph ? 'Oui' : 'Non'}
- Liens internes: ${elements.internalLinks}

Génère 3 à 5 recommandations PRÉCISES et ACTIONNABLES pour Shopify, classées par ordre de priorité. Chaque recommandation doit:
1. Être spécifique à Shopify quand c'est possible
2. Inclure une action concrète à réaliser
3. Se concentrer sur les gains les plus importants
4. Être rédigée en français clair et professionnel

Réponds UNIQUEMENT avec la liste des recommandations, sans introduction ni conclusion.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `Tu es un expert SEO Shopify français. Tu génères des recommandations concrètes, actionnables et classées par priorité. Tu te concentres sur les corrections qui auront le plus d'impact. Tu réponds uniquement avec la liste des recommandations, sans commentaires supplémentaires.` 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status, await response.text());
      return generateEnhancedFallbackRecommendations(scoreResult, elements);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || '';

    // Parse recommendations from AI response
    const recommendations = aiText
      .split('\n')
      .filter((line: string) => line.trim().length > 0)
      .filter((line: string) => /^[\d\-•▶]/.test(line.trim()))
      .map((line: string) => line.replace(/^[\d\-•▶\s.)]+/, '').trim())
      .filter((rec: string) => rec.length > 20 && rec.length < 200) // Reasonable length
      .slice(0, 5); // Max 5 recommendations

    return recommendations.length > 0 ? recommendations : generateEnhancedFallbackRecommendations(scoreResult, elements);

  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    return generateEnhancedFallbackRecommendations(scoreResult, elements);
  }
}

function getIssueDescription(issue: string): string {
  const descriptions: Record<string, string> = {
    'missing_title': 'Titre de page manquant - essentiel pour le SEO',
    'title_too_long': 'Titre trop long (risque de troncature dans les résultats)',
    'missing_meta_description': 'Meta description manquante - impacte le taux de clic',
    'meta_description_length_issue': 'Meta description trop longue ou trop courte',
    'missing_h1': 'Balise H1 manquante - structure essentielle',
    'missing_h2': 'Structure H2 manquante - organisation du contenu',
    'content_too_short': 'Contenu insuffisant - visez au moins 1000 caractères',
    'poor_image_alt_coverage': 'Images sans texte alternatif - manque d\'accessibilité et SEO',
    'no_https': 'Site non sécurisé - impacts négatifs sur le référencement',
    'missing_schema': 'Balises schema.org manquantes - rich snippets manquants',
    'missing_canonical': 'Balise canonical manquante - risque de duplicate content',
    'not_mobile_optimized': 'Site non optimisé mobile - impacts majeurs sur le SEO',
    'missing_viewport': 'Viewport manquant - problèmes d\'affichage mobile',
    'poor_performance': 'Performance faible - impacts l\'expérience utilisateur et le SEO',
    'missing_opengraph': 'OpenGraph manquant - partage social limité',
    'missing_twitter_card': 'Twitter Cards manquantes - visibilité réduite sur Twitter',
  };
  
  return descriptions[issue] || issue;
}

function getStrengthDescription(strength: string): string {
  const descriptions: Record<string, string> = {
    'title_length_optimal': 'Titre de longueur optimale pour les SERPs',
    'meta_description_optimal': 'Meta description bien rédigée et de bonne longueur',
    'h1_optimal': 'Balise H1 bien structurée',
    'good_h2_structure': 'Bonne hiérarchie avec plusieurs sections H2',
    'substantial_content': 'Contenu riche et substantiel',
    'excellent_image_alts': 'Images bien optimisées avec textes alternatifs',
    'good_readability': 'Contenu facile à lire et bien structuré',
    'canonical_present': 'Balise canonical correctement implémentée',
    'https_enabled': 'Site sécurisé avec HTTPS',
    'schema_markup_present': 'Données structurées implémentées',
    'good_performance': 'Bonnes performances de chargement',
    'mobile_friendly': 'Site optimisé pour mobile',
    'opengraph_present': 'Métadonnées sociales OpenGraph présentes',
    'twitter_cards_present': 'Cartes Twitter optimisées',
    'good_internal_linking': 'Bon maillage interne',
  };
  
  return descriptions[strength] || strength;
}

function generateEnhancedFallbackRecommendations(
  scoreResult: EnhancedSeoScoreResult, 
  elements: EnhancedSeoElements
): string[] {
  const recommendations: string[] = [];
  
  // Handle critical issues first
  if (scoreResult.criticalIssues.includes('missing_title')) {
    recommendations.push('Ajoutez immédiatement un titre de page unique incluant votre mot-clé principal (max 60 caractères) dans les paramètres Shopify');
  }
  
  if (scoreResult.criticalIssues.includes('no_https')) {
    recommendations.push('Activez HTTPS dans les paramètres de votre domaine Shopify pour sécuriser votre site et améliorer votre référencement');
  }
  
  if (scoreResult.criticalIssues.includes('missing_h1')) {
    recommendations.push('Intégrez une balise H1 principale sur votre page d\'accueil via l\'éditeur Shopify avec votre offre principale');
  }
  
  if (scoreResult.criticalIssues.includes('content_too_short')) {
    recommendations.push('Enrichissez votre page d\'accueil avec au moins 300 mots de contenu unique décrivant vos produits et valeurs');
  }
  
  // Handle important warnings
  if (scoreResult.warnings.includes('missing_meta_description')) {
    recommendations.push('Rédigez une meta description engageante (150-160 caractères) dans les paramètres SEO de Shopify pour améliorer le taux de clic');
  }
  
  if (elements.totalImages > 0 && elements.altsCount / elements.totalImages < 0.8) {
    recommendations.push('Optimisez les textes alternatifs de vos images dans la médiathèque Shopify en décrivant précisément chaque visuel');
  }
  
  if (scoreResult.warnings.includes('missing_schema')) {
    recommendations.push('Installez une application Shopify de structured data pour ajouter automatiquement les balises schema.org à vos pages');
  }
  
  if (!elements.isMobileFriendly) {
    recommendations.push('Testez et optimisez l\'affichage mobile de votre thème Shopify dans l\'éditeur de thème');
  }
  
  // Performance recommendations
  if (scoreResult.criticalIssues.includes('poor_performance') || elements.loadingSpeed < 60) {
    recommendations.push('Optimisez les images (compression WebP) et réduisez les applications Shopify non essentielles pour améliorer la vitesse');
  }
  
  // Ensure we have at least 3 recommendations
  if (recommendations.length < 3) {
    recommendations.push('Activez les balises OpenGraph dans les paramètres Shopify pour optimiser le partage sur les réseaux sociaux');
    recommendations.push('Créez un blog Shopify et publiez régulièrement du contenu lié à votre niche pour renforcer votre autorité');
    recommendations.push('Utilisez l\'outil "Liquid" de Shopify pour implémenter des breadcrumbs (fil d\'Ariane) améliorant l\'expérience utilisateur');
  }
  
  return recommendations.slice(0, 5);
}

async function storeAuditResult(supabaseClient: any, userId: string, result: any) {
  try {
    const { error } = await supabaseClient
      .from('seo_audit_history')
      .insert({
        user_id: userId,
        score: result.score,
        grade: result.grade,
        analyzed_url: result.analyzedUrl,
        breakdown: result.breakdown,
        critical_issues: result.criticalIssues,
        warnings: result.warnings,
        strengths: result.strengths,
        recommendations: result.recommendations,
      });
    
    if (error) {
      console.error('Error storing audit result:', error);
    }
  } catch (error) {
    console.error('Error storing audit history:', error);
  }
}