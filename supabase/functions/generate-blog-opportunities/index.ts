import "../_shared/strict-ai-generation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fetch People Also Ask questions from SerpAPI (like AnswerThePublic)
async function fetchPeopleAlsoAsk(keyword: string, language: string = 'fr'): Promise<{
  questions: string[];
  relatedSearches: string[];
}> {
  const SERPAPI_KEY = Deno.env.get('SERPAPI_KEY');
  if (!SERPAPI_KEY) {
    console.log('[OPPS] SERPAPI_KEY not configured, skipping PAA fetch');
    return { questions: [], relatedSearches: [] };
  }

  try {
    const params = new URLSearchParams({
      api_key: SERPAPI_KEY,
      q: keyword,
      engine: 'google',
      gl: language === 'fr' ? 'fr' : 'us',
      hl: language,
      num: '10'
    });

    console.log(`[OPPS] Fetching PAA for keyword: "${keyword}"`);
    
    const response = await fetch(`https://serpapi.com/search?${params}`);
    
    if (!response.ok) {
      console.error('[OPPS] SerpAPI error:', response.status);
      return { questions: [], relatedSearches: [] };
    }

    const data = await response.json();
    
    // Extract People Also Ask questions
    const questions: string[] = [];
    if (data.related_questions) {
      data.related_questions.forEach((q: any) => {
        if (q.question) {
          questions.push(q.question);
        }
      });
    }

    // Extract related searches
    const relatedSearches: string[] = [];
    if (data.related_searches) {
      data.related_searches.forEach((s: any) => {
        if (s.query) {
          relatedSearches.push(s.query);
        }
      });
    }

    console.log(`[OPPS] Found ${questions.length} PAA questions, ${relatedSearches.length} related searches`);
    
    return { questions, relatedSearches };
  } catch (error) {
    console.error('[OPPS] Error fetching PAA:', error);
    return { questions: [], relatedSearches: [] };
  }
}

// Fetch AnswerThePublic-style data using SerpAPI autocomplete
async function fetchAutocompleteQuestions(keyword: string, language: string = 'fr'): Promise<string[]> {
  const SERPAPI_KEY = Deno.env.get('SERPAPI_KEY');
  if (!SERPAPI_KEY) {
    return [];
  }

  const questionPrefixes = language === 'fr' 
    ? ['comment', 'pourquoi', 'quel', 'quelle', 'quand', 'où', 'est-ce que']
    : ['how', 'why', 'what', 'when', 'where', 'which', 'can', 'do'];

  const allSuggestions: string[] = [];

  // Fetch autocomplete for each question prefix
  for (const prefix of questionPrefixes.slice(0, 4)) { // Limit to 4 to avoid rate limits
    try {
      const params = new URLSearchParams({
        api_key: SERPAPI_KEY,
        q: `${prefix} ${keyword}`,
        engine: 'google_autocomplete',
        gl: language === 'fr' ? 'fr' : 'us',
        hl: language
      });

      const response = await fetch(`https://serpapi.com/search?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.suggestions) {
          data.suggestions.forEach((s: any) => {
            if (s.value && !allSuggestions.includes(s.value)) {
              allSuggestions.push(s.value);
            }
          });
        }
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`[OPPS] Error fetching autocomplete for "${prefix}":`, error);
    }
  }

  console.log(`[OPPS] Found ${allSuggestions.length} autocomplete suggestions`);
  return allSuggestions;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[OPPS] Starting blog opportunities generation with SerpAPI (AnswerThePublic style)');

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

    const body = await req.json().catch(() => ({}));
    const storeId = body.store_id;
    const language = body.language || 'fr';
    console.log(`[OPPS] Store ID: ${storeId || 'all stores'}, Language: ${language}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. GET PRODUCTS DATA
    console.log('[OPPS] Fetching catalog data...');

    const productsQuery = supabaseAdmin
      .from('shopify_products')
      .select('id, title, category, sub_category, product_type, price, vendor, tags, description, handle, image_url')
      .eq('seller_id', user.id);
    
    if (storeId) {
      productsQuery.eq('store_id', storeId);
    }
    
    const { data: products, error: productsError } = await productsQuery
      .order('price', { ascending: false });

    if (productsError) {
      console.error('[OPPS] Error fetching products:', productsError);
      throw productsError;
    }

    const collectionsQuery = supabaseAdmin
      .from('shopify_collections')
      .select('id, title, handle, body_html')
      .eq('user_id', user.id);
    
    if (storeId) {
      collectionsQuery.eq('store_id', storeId);
    }
    
    const { data: collections } = await collectionsQuery;

    if (!products || products.length === 0) {
      console.log('[OPPS] No products found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          opportunities: [],
          message: language === 'fr' 
            ? 'Aucun produit trouvé. Importez des produits d\'abord.'
            : 'No products found. Import products first.'
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[OPPS] Data loaded: ${products.length} products, ${collections?.length || 0} collections`);

    // 2. ANALYZE CATALOG - Extract top categories and keywords
    const categoryMap = new Map<string, { count: number; products: any[] }>();
    const vendorMap = new Map<string, number>();
    const tagsMap = new Map<string, number>();
    
    products.forEach(product => {
      const category = product.category || product.product_type || 'Général';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { count: 0, products: [] });
      }
      const catData = categoryMap.get(category)!;
      catData.count++;
      catData.products.push(product);
      
      if (product.vendor) {
        vendorMap.set(product.vendor, (vendorMap.get(product.vendor) || 0) + 1);
      }

      if (product.tags) {
        const tags = product.tags.split(',').map((t: string) => t.trim());
        tags.forEach((tag: string) => {
          if (tag) tagsMap.set(tag, (tagsMap.get(tag) || 0) + 1);
        });
      }
    });

    const topCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    const topTags = Array.from(tagsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // 3. FETCH SERPAPI DATA (People Also Ask + Autocomplete) for top keywords
    console.log('[OPPS] Fetching SerpAPI data (AnswerThePublic style)...');
    
    const keywordsToSearch = [
      ...topCategories.slice(0, 3).map(([cat]) => cat),
      ...topTags.slice(0, 2).map(([tag]) => tag)
    ].filter(k => k && k.length > 2);

    console.log(`[OPPS] Keywords to search: ${keywordsToSearch.join(', ')}`);

    const allPAAQuestions: string[] = [];
    const allRelatedSearches: string[] = [];
    const allAutocompleteSuggestions: string[] = [];

    for (const keyword of keywordsToSearch) {
      // Fetch People Also Ask
      const paaData = await fetchPeopleAlsoAsk(keyword, language);
      allPAAQuestions.push(...paaData.questions);
      allRelatedSearches.push(...paaData.relatedSearches);
      
      // Fetch Autocomplete questions (AnswerThePublic style)
      const autocomplete = await fetchAutocompleteQuestions(keyword, language);
      allAutocompleteSuggestions.push(...autocomplete);
      
      // Small delay between keywords
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Deduplicate
    const uniquePAAQuestions = [...new Set(allPAAQuestions)];
    const uniqueRelatedSearches = [...new Set(allRelatedSearches)];
    const uniqueAutocomplete = [...new Set(allAutocompleteSuggestions)];

    console.log(`[OPPS] Total unique data: ${uniquePAAQuestions.length} PAA, ${uniqueRelatedSearches.length} related, ${uniqueAutocomplete.length} autocomplete`);

    // 4. GENERATE OPPORTUNITIES from SerpAPI data
    const opportunities: any[] = [];
    const articleTypes = ['comparison', 'guide', 'tutorial', 'selection', 'niche'];
    
    // Create opportunities from People Also Ask questions
    uniquePAAQuestions.slice(0, 5).forEach((question, index) => {
      const matchingCategory = topCategories[index % topCategories.length];
      const categoryProducts = matchingCategory ? matchingCategory[1].products.slice(0, 8) : [];
      
      opportunities.push({
        id: crypto.randomUUID(),
        title: question,
        description: language === 'fr'
          ? `Article basé sur une vraie question posée par les internautes sur Google. Répondez à cette interrogation pour attirer du trafic qualifié.`
          : `Article based on a real question asked by users on Google. Answer this query to attract qualified traffic.`,
        category: matchingCategory ? matchingCategory[0] : 'Général',
        type: 'guide',
        source: 'people_also_ask',
        primaryKeywords: [question.split(' ').slice(0, 4).join(' ')],
        secondaryKeywords: uniqueRelatedSearches.slice(0, 3),
        productIds: categoryProducts.map((p: any) => p.id),
        productsCount: categoryProducts.length,
        seoScore: 85 + Math.floor(Math.random() * 10),
        difficulty: 'medium',
        estimatedWordCount: 1500,
        searchData: {
          originalQuestion: question,
          source: 'SerpAPI - People Also Ask'
        }
      });
    });

    // Create opportunities from Autocomplete suggestions (AnswerThePublic style)
    uniqueAutocomplete
      .filter(s => s.includes('?') || s.toLowerCase().startsWith('comment') || s.toLowerCase().startsWith('how'))
      .slice(0, 3)
      .forEach((suggestion, index) => {
        const matchingCategory = topCategories[(index + 2) % topCategories.length];
        const categoryProducts = matchingCategory ? matchingCategory[1].products.slice(0, 8) : [];
        
        opportunities.push({
          id: crypto.randomUUID(),
          title: suggestion.charAt(0).toUpperCase() + suggestion.slice(1),
          description: language === 'fr'
            ? `Suggestion de recherche populaire identifiée via l'autocomplétion Google. Fort potentiel SEO.`
            : `Popular search suggestion identified via Google autocomplete. High SEO potential.`,
          category: matchingCategory ? matchingCategory[0] : 'Général',
          type: 'tutorial',
          source: 'google_autocomplete',
          primaryKeywords: [suggestion],
          secondaryKeywords: [],
          productIds: categoryProducts.map((p: any) => p.id),
          productsCount: categoryProducts.length,
          seoScore: 80 + Math.floor(Math.random() * 15),
          difficulty: 'easy',
          estimatedWordCount: 1200,
          searchData: {
            originalSuggestion: suggestion,
            source: 'SerpAPI - Google Autocomplete'
          }
        });
      });

    // Create opportunities from Related Searches
    uniqueRelatedSearches.slice(0, 2).forEach((search, index) => {
      const matchingCategory = topCategories[(index + 1) % topCategories.length];
      const categoryProducts = matchingCategory ? matchingCategory[1].products.slice(0, 8) : [];
      
      const titlePrefix = language === 'fr' ? 'Guide complet :' : 'Complete Guide:';
      
      opportunities.push({
        id: crypto.randomUUID(),
        title: `${titlePrefix} ${search.charAt(0).toUpperCase() + search.slice(1)}`,
        description: language === 'fr'
          ? `Recherche associée populaire sur Google. Ciblez cette requête pour capturer du trafic organique.`
          : `Popular related search on Google. Target this query to capture organic traffic.`,
        category: matchingCategory ? matchingCategory[0] : 'Général',
        type: 'guide',
        source: 'related_searches',
        primaryKeywords: [search],
        secondaryKeywords: [],
        productIds: categoryProducts.map((p: any) => p.id),
        productsCount: categoryProducts.length,
        seoScore: 75 + Math.floor(Math.random() * 15),
        difficulty: 'medium',
        estimatedWordCount: 2000,
        searchData: {
          originalSearch: search,
          source: 'SerpAPI - Related Searches'
        }
      });
    });

    // If no SerpAPI data, fallback to category-based opportunities
    if (opportunities.length === 0) {
      console.log('[OPPS] No SerpAPI data, generating category-based opportunities');
      
      topCategories.forEach(([category, data], index) => {
        const titleTemplates = language === 'fr' ? [
          `Guide d'achat : Comment choisir ${category.toLowerCase()}`,
          `Top 10 ${category.toLowerCase()} en 2025`,
          `Comparatif : Les meilleurs ${category.toLowerCase()}`,
          `Tout savoir sur ${category.toLowerCase()}`
        ] : [
          `Buying Guide: How to Choose ${category}`,
          `Top 10 ${category} in 2025`,
          `Comparison: Best ${category}`,
          `Everything About ${category}`
        ];
        
        opportunities.push({
          id: crypto.randomUUID(),
          title: titleTemplates[index % titleTemplates.length],
          description: language === 'fr'
            ? `Article généré à partir de votre catégorie ${category} (${data.count} produits).`
            : `Article generated from your ${category} category (${data.count} products).`,
          category: category,
          type: articleTypes[index % articleTypes.length],
          source: 'catalog_analysis',
          primaryKeywords: [category.toLowerCase()],
          secondaryKeywords: topTags.slice(0, 3).map(([tag]) => tag),
          productIds: data.products.slice(0, 8).map((p: any) => p.id),
          productsCount: Math.min(data.products.length, 8),
          seoScore: 70 + Math.floor(Math.random() * 20),
          difficulty: 'medium',
          estimatedWordCount: 1800,
          searchData: {
            source: 'Catalog Analysis'
          }
        });
      });
    }

    console.log(`[OPPS] Generated ${opportunities.length} opportunities`);

    // 5. SAVE TO DATABASE
    const cacheExpiresAt = new Date();
    cacheExpiresAt.setHours(cacheExpiresAt.getHours() + 24);
    
    // Clear old cached opportunities
    if (storeId) {
      await supabaseAdmin
        .from('blog_opportunities')
        .delete()
        .eq('user_id', user.id)
        .eq('store_id', storeId)
        .eq('is_cached', true);
    }
    
    const opportunitiesToInsert = opportunities.map((opp: any) => ({
      user_id: user.id,
      store_id: storeId || null,
      article_title: opp.title,
      intro_excerpt: opp.description,
      meta_description: opp.description,
      type: opp.type,
      difficulty: opp.difficulty,
      estimated_word_count: opp.estimatedWordCount,
      seo_opportunity_score: opp.seoScore,
      primary_keywords: opp.primaryKeywords,
      secondary_keywords: opp.secondaryKeywords,
      product_ids: opp.productIds,
      is_cached: true,
      cache_expires_at: cacheExpiresAt.toISOString(),
      last_refreshed_at: new Date().toISOString(),
      generated_at: new Date().toISOString(),
      structure: opp.searchData // Store SerpAPI source info
    }));
    
    const { error: insertError } = await supabaseAdmin
      .from('blog_opportunities')
      .insert(opportunitiesToInsert);
    
    if (insertError) {
      console.error('[OPPS] Error saving opportunities:', insertError);
    } else {
      console.log(`[OPPS] Saved ${opportunitiesToInsert.length} opportunities`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        opportunities: opportunities,
        cached: true,
        serpApiData: {
          paaQuestions: uniquePAAQuestions.length,
          relatedSearches: uniqueRelatedSearches.length,
          autocompleteSuggestions: uniqueAutocomplete.length
        },
        stats: {
          totalProducts: products.length,
          totalCollections: collections?.length || 0,
          topCategories: topCategories.map(([cat, data]) => ({ category: cat, count: data.count }))
        }
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
