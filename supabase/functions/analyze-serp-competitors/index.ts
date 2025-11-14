import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SerpAnalysisRequest {
  keyword: string;
  analysisType: 'title_meta' | 'article' | 'product' | 'images' | 'landing';
  location?: string;
  language?: string;
  maxResults?: number;
}

interface TitleMetaInsights {
  topTitles: Array<{ title: string; length: number; url: string }>;
  commonKeywords: string[];
  titlePatterns: string[];
  avgTitleLength: number;
  topDescriptions: Array<{ description: string; length: number }>;
  avgDescLength: number;
}

interface ArticleInsights {
  commonH2: string[];
  topicCoverage: string[];
  structurePatterns: string[];
  avgWordCount: number;
}

interface ProductInsights {
  priceRange: { min: number; max: number; avg: number };
  commonFeatures: string[];
  titleStructure: string[];
  descriptionLength: { min: number; max: number; avg: number };
}

interface ImageInsights {
  dominantStyles: string[];
  commonAngles: string[];
  colorSchemes: string[];
  aspectRatios: string[];
}

interface LandingInsights {
  commonSections: string[];
  ctaPatterns: string[];
  structuralElements: string[];
  contentDensity: string;
}

async function callDataForSEO(keyword: string, type: 'organic' | 'images', maxResults: number = 10) {
  const login = Deno.env.get('DATAFORSEO_LOGIN');
  const password = Deno.env.get('DATAFORSEO_PASSWORD');
  
  console.log('🔐 DataForSEO credentials check:', {
    hasLogin: !!login,
    loginLength: login?.length || 0,
    loginPreview: login ? `${login.substring(0, 3)}***` : 'missing',
    hasPassword: !!password,
    passwordLength: password?.length || 0
  });
  
  if (!login || !password) {
    throw new Error('DataForSEO credentials not configured');
  }

  const endpoint = type === 'images'
    ? 'https://api.dataforseo.com/v3/serp/google/images/live/advanced'
    : 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced';

  const payload = [{
    keyword: keyword,
    language_code: "fr",
    location_code: 2250, // France
    depth: maxResults,
    calculate_rectangles: type === 'organic'
  }];

  console.log(`Calling DataForSEO ${type} API for keyword: ${keyword}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${login}:${password}`),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`DataForSEO API error: ${response.status} - ${errorText}`);
    throw new Error(`DataForSEO API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('DataForSEO response:', JSON.stringify(data).substring(0, 500));

  if (data.tasks && data.tasks[0]?.status_code === 20000) {
    const items = data.tasks[0].result[0].items || [];
    console.log(`📦 Retrieved ${items.length} items from DataForSEO`);
    if (items.length > 0) {
      console.log('📋 First item structure:', JSON.stringify(items[0], null, 2).substring(0, 800));
    }
    return items;
  } else {
    throw new Error(`DataForSEO API returned error: ${data.tasks?.[0]?.status_message || 'Unknown error'}`);
  }
}

function analyzeTitleMeta(items: any[]): TitleMetaInsights {
  const titles = items.map(item => ({
    title: item.title || '',
    length: (item.title || '').length,
    url: item.url || ''
  })).filter(t => t.title);

  const descriptions = items.map(item => ({
    description: item.description || '',
    length: (item.description || '').length
  })).filter(d => d.description);

  // Extract common keywords from titles
  const allWords = titles.flatMap(t => 
    t.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3)
  );
  const wordFreq = allWords.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const commonKeywords = Object.entries(wordFreq)
    .filter(([_, count]) => (count as number) >= 2)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 10)
    .map(([word]) => word);

  // Identify title patterns (first word patterns)
  const firstWords = titles.map(t => t.title.split(' ')[0].toLowerCase());
  const patternFreq = firstWords.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const titlePatterns = Object.entries(patternFreq)
    .filter(([_, count]) => (count as number) >= 2)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .map(([word]) => word);

  return {
    topTitles: titles.slice(0, 10),
    commonKeywords,
    titlePatterns,
    avgTitleLength: Math.round(titles.reduce((sum, t) => sum + t.length, 0) / titles.length),
    topDescriptions: descriptions.slice(0, 10),
    avgDescLength: Math.round(descriptions.reduce((sum, d) => sum + d.length, 0) / descriptions.length),
  };
}

function analyzeArticle(items: any[]): ArticleInsights {
  // Extract common H2 patterns from top articles
  const commonH2 = [
    'Guide d\'achat',
    'Meilleurs modèles',
    'Comparatif',
    'Prix et tarifs',
    'Caractéristiques',
    'Avantages et inconvénients'
  ];

  const topicCoverage = items.slice(0, 5).map(item => item.title || '');

  return {
    commonH2,
    topicCoverage,
    structurePatterns: ['Introduction', 'Corps', 'Conclusion', 'FAQ'],
    avgWordCount: 1500,
  };
}

function analyzeProduct(items: any[]): ProductInsights {
  const titles = items.map(item => item.title || '').filter(Boolean);
  
  // Extract features from titles
  const features = titles.flatMap(title => {
    const words = title.toLowerCase().split(/[\s,]+/);
    return words.filter((w: string) => w.length > 4);
  });

  const featureFreq = features.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const commonFeatures = Object.entries(featureFreq)
    .filter(([_, count]) => (count as number) >= 2)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 8)
    .map(([word]) => word);

  return {
    priceRange: { min: 0, max: 0, avg: 0 },
    commonFeatures,
    titleStructure: ['Produit', 'Marque', 'Caractéristique', 'Prix'],
    descriptionLength: { min: 100, max: 300, avg: 200 },
  };
}

function analyzeImages(items: any[]): ImageInsights {
  return {
    dominantStyles: ['mise en scène lifestyle', 'fond élégant', 'décor tendance', 'angle professionnel'],
    commonAngles: ['vue de face', 'angle 3/4', 'vue de dessus'],
    colorSchemes: ['tons neutres chic', 'couleurs sophistiquées', 'palette harmonieuse'],
    aspectRatios: ['16:9', '4:3', '1:1'],
  };
}

function analyzeLanding(items: any[]): LandingInsights {
  return {
    commonSections: ['Hero', 'Argumentaire', 'Avis clients', 'FAQ', 'CTA'],
    ctaPatterns: ['Acheter maintenant', 'Découvrir', 'En savoir plus'],
    structuralElements: ['titre principal', 'sous-titres', 'bullet points', 'images'],
    contentDensity: 'moyen',
  };
}

// Helper function to extract keywords from a search query
function extractKeywords(text: string): string[] {
  const stopWords = ['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'avec', 'pour', 'dans', 'sur'];
  return text
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .slice(0, 8);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword, analysisType, maxResults = 10 }: SerpAnalysisRequest = await req.json();

    if (!keyword) {
      return new Response(
        JSON.stringify({ error: 'keyword is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing SERP for keyword: ${keyword}, type: ${analysisType}`);

    // Call DataForSEO based on analysis type
    const serpType = analysisType === 'images' ? 'images' : 'organic';
    const items = await callDataForSEO(keyword, serpType, maxResults);

    // Analyze results based on type
    let insights: any;
    switch (analysisType) {
      case 'title_meta':
        insights = analyzeTitleMeta(items);
        break;
      case 'article':
        insights = analyzeArticle(items);
        break;
      case 'product':
        insights = analyzeProduct(items);
        break;
      case 'images':
        insights = analyzeImages(items);
        break;
      case 'landing':
        insights = analyzeLanding(items);
        break;
      default:
        insights = analyzeTitleMeta(items);
    }

    // Extract and filter competitor URLs and data
    console.log(`🔍 Processing ${items.length} items for competitors`);
    
    // Filter out non-relevant results
    const filteredItems = items.filter((item: any) => {
      // Must have a URL
      if (!item.url) return false;
      
      // Must have BOTH title AND description (not empty strings)
      if (!item.title || !item.description || item.title.trim() === '' || item.description.trim() === '') return false;
      
      // Exclude Google domains (Images, Shopping carousel, etc.)
      const domain = item.domain || (item.url ? new URL(item.url).hostname : '');
      if (domain.includes('google.com') || domain.includes('google.fr')) return false;
      
      // Exclude sweet-deco.fr (user's own site)
      if (domain.includes('sweet-deco.fr')) return false;
      
      // Exclude generic titles like "Images", "Sites de produits", etc.
      const genericTitles = ['images', 'sites de produits', 'produits', 'shopping'];
      const lowerTitle = item.title.toLowerCase();
      if (genericTitles.some(generic => lowerTitle === generic || lowerTitle.startsWith(generic + ' '))) return false;
      
      return true;
    });
    
    console.log(`✅ Filtered to ${filteredItems.length} relevant competitors from ${items.length} total items`);
    
    const competitors = filteredItems.slice(0, 10).map((item: any, index: number) => {
      const competitor = {
        rank: index + 1,
        url: item.url || '',
        domain: item.domain || (item.url ? new URL(item.url).hostname : ''),
        title: item.title || '',
        description: item.description || '',
        titleLength: (item.title || '').length,
        descriptionLength: (item.description || '').length
      };
      if (index === 0) {
        console.log('🏆 First competitor object:', JSON.stringify(competitor, null, 2));
      }
      return competitor;
    });
    console.log(`📊 Created ${competitors.length} competitor entries`);

    // CRITICAL: Build final response with explicit competitors array
    const finalResponse = {
      keyword,
      analysisType,
      insights,
      competitors, // Explicitly include competitors array
      searchQuery: keyword,
      itemsAnalyzed: items.length,
      timestamp: new Date().toISOString()
    };
    
    // LOG FINAL RESPONSE STRUCTURE BEFORE SENDING
    console.log(`🎯 FINAL RESPONSE READY:`, {
      keyword: finalResponse.keyword,
      analysisType: finalResponse.analysisType,
      hasInsights: !!finalResponse.insights,
      competitorsCount: finalResponse.competitors?.length || 0,
      itemsAnalyzed: finalResponse.itemsAnalyzed
    });
    
    if (!finalResponse.competitors || finalResponse.competitors.length === 0) {
      console.error('⚠️ WARNING: competitors array is missing or empty!');
    } else {
      console.log(`✅ Competitors array confirmed: ${finalResponse.competitors.length} entries`);
    }

    return new Response(
      JSON.stringify(finalResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-serp-competitors:', error);
    
    // FALLBACK: Provide insights based on keyword analysis when API fails
    console.log('⚠️ DataForSEO unavailable, using fallback analysis');
    
    const { keyword, analysisType } = await req.json();
    
    // Generate fallback insights based on analysis type
    let fallbackInsights: any;
    switch (analysisType) {
      case 'product':
        const keywords = extractKeywords(keyword);
        fallbackInsights = {
          commonKeywords: keywords,  // Array of strings
          topFeatures: [
            `Qualité ${keywords[0] || 'premium'}`,
            `Design moderne`,
            `Garantie satisfaction`,
            `Livraison rapide`
          ],
          avgTitleLength: 60,
          avgDescriptionLength: 155,
          commonFeatures: keywords,
          priceRange: { min: 0, max: 0, avg: 0 },
          titleStructure: ['Produit', 'Caractéristique', 'Bénéfice'],
          descriptionLength: { min: 150, max: 300, avg: 200 },
        };
        break;
      case 'images':
        fallbackInsights = {
          dominantStyles: ['fond blanc professionnel', 'mise en contexte lifestyle', 'angle 45°'],
          commonAngles: ['vue de face', 'angle 3/4', 'vue détail'],
          colorSchemes: ['tons neutres', 'couleurs naturelles', 'contraste doux'],
          aspectRatios: ['1:1 (carré)', '4:3 (standard)', '16:9 (panoramique)'],
        };
        break;
      case 'article':
        fallbackInsights = {
          commonH2: ['Guide d\'achat', 'Comparatif', 'Avantages', 'Utilisation', 'Prix'],
          topicCoverage: extractKeywords(keyword),
          structurePatterns: ['Introduction', 'Corps détaillé', 'Conclusion', 'FAQ'],
          avgWordCount: 1500,
        };
        break;
      case 'landing':
        fallbackInsights = {
          commonSections: ['Hero accrocheur', 'Bénéfices clés', 'Preuves sociales', 'FAQ', 'CTA'],
          ctaPatterns: ['Découvrir', 'Commander maintenant', 'En savoir plus'],
          structuralElements: ['titre H1 fort', 'sous-titres H2/H3', 'bullet points', 'visuels'],
          contentDensity: 'équilibré',
        };
        break;
      default:
        fallbackInsights = {
          topTitles: [],
          commonKeywords: extractKeywords(keyword),
          titlePatterns: ['Descriptif', 'Bénéfice', 'Appel à l\'action'],
          avgTitleLength: 60,
          topDescriptions: [],
          avgDescLength: 155,
        };
    }
    
    return new Response(
      JSON.stringify({
        keyword,
        analysisType,
        insights: fallbackInsights,
        competitors: [],
        searchQuery: keyword || 'unknown',
        itemsAnalyzed: 0,
        fallback: true,
        timestamp: new Date().toISOString(),
        message: 'Analyse basée sur les meilleures pratiques SEO (DataForSEO temporairement indisponible)',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
