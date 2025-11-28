import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Patterns to detect irrelevant search terms
const NEGATIVE_PATTERNS = {
  general_ai: [
    'chatgpt', 'gpt', 'openai', 'claude', 'gemini', 'bard', 'copilot',
    'midjourney', 'dall-e', 'stable diffusion', 'ai art', 'ai image',
    'ai generator', 'ai tool', 'ai assistant', 'ai chat'
  ],
  digital_marketing: [
    'marketing agency', 'seo agency', 'digital agency', 'web agency',
    'marketing course', 'marketing training', 'marketing tutorial',
    'marketing job', 'marketing salary', 'marketing career'
  ],
  video_ai: [
    'video ai', 'ai video', 'video generator', 'video editing ai',
    'deepfake', 'video synthesis', 'video creation ai'
  ],
  website_builder: [
    'wix', 'squarespace', 'wordpress', 'webflow', 'website builder',
    'website template', 'website design', 'web design'
  ],
  free_keywords: [
    'free', 'gratuit', 'gratis', 'kostenlos', 'trial free',
    'free trial', 'free version', 'free plan'
  ],
  competitor_brands: [
    'oberlo', 'dsers', 'spocket', 'modalyst', 'dropship',
    'aliexpress', 'alibaba', 'dhgate'
  ],
  job_seekers: [
    'job', 'emploi', 'career', 'salary', 'hiring', 'intern',
    'stage', 'recrutement', 'offre emploi'
  ],
  educational: [
    'tutorial', 'course', 'learn', 'how to', 'what is',
    'definition', 'meaning', 'exemple', 'example'
  ]
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Health check
    const body = await req.text();
    if (body) {
      try {
        const parsed = JSON.parse(body);
        if (parsed.healthCheck === true) {
          return new Response(JSON.stringify({ status: 'healthy' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch { /* Not JSON or not health check */ }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get recent search terms
    const { data: searchTerms, error: fetchError } = await supabase
      .from('google_ads_search_terms')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(500);

    if (fetchError) {
      throw new Error(`Failed to fetch search terms: ${fetchError.message}`);
    }

    if (!searchTerms || searchTerms.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        suggestions: [],
        message: 'No search terms to analyze'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Analyze search terms for negative keyword suggestions
    const suggestions: Array<{
      keyword: string;
      reason: string;
      category: string;
      match_type: string;
    }> = [];

    const processedTerms = new Set<string>();

    for (const term of searchTerms) {
      const searchTerm = term.search_term?.toLowerCase() || '';
      
      if (processedTerms.has(searchTerm)) continue;
      processedTerms.add(searchTerm);

      // Check each category
      for (const [category, patterns] of Object.entries(NEGATIVE_PATTERNS)) {
        for (const pattern of patterns) {
          if (searchTerm.includes(pattern.toLowerCase())) {
            // Check if this term has low conversion rate and high cost
            const hasHighCost = term.cost_micros > 100000; // > 0.10€
            const hasLowConversion = term.conversions === 0 || term.conversion_rate < 0.01;
            
            if (hasHighCost && hasLowConversion) {
              suggestions.push({
                keyword: pattern,
                reason: getCategoryReason(category, pattern),
                category,
                match_type: 'BROAD',
              });
              break; // Don't add multiple negatives from same term
            }
          }
        }
      }

      // Also check for non-Shopify related terms with bad performance
      const shopifyKeywords = ['shopify', 'ecommerce', 'e-commerce', 'boutique', 'shop', 'store', 'produit', 'product'];
      const isShopifyRelated = shopifyKeywords.some(kw => searchTerm.includes(kw));
      
      if (!isShopifyRelated && term.clicks > 5 && term.conversions === 0 && term.cost_micros > 500000) {
        // Extract main keyword from search term (first 2 words usually)
        const words = searchTerm.split(' ').slice(0, 2).join(' ');
        if (words.length > 3 && !suggestions.some(s => s.keyword === words)) {
          suggestions.push({
            keyword: words,
            reason: `Terme non lié à Shopify avec ${term.clicks} clics sans conversion`,
            category: 'non_relevant',
            match_type: 'PHRASE',
          });
        }
      }
    }

    // Deduplicate and limit suggestions
    const uniqueSuggestions = Array.from(
      new Map(suggestions.map(s => [s.keyword, s])).values()
    ).slice(0, 50);

    // Insert suggestions into database
    if (uniqueSuggestions.length > 0) {
      const toInsert = uniqueSuggestions.map(s => ({
        user_id: user.id,
        keyword: s.keyword,
        reason: s.reason,
        match_type: s.match_type,
        is_applied: false,
      }));

      const { error: insertError } = await supabase
        .from('google_ads_negative_keywords')
        .upsert(toInsert, {
          onConflict: 'user_id,keyword',
          ignoreDuplicates: true,
        });

      if (insertError) {
        console.error('Error inserting negative keywords:', insertError);
      }
    }

    console.log(`Generated ${uniqueSuggestions.length} negative keyword suggestions for user ${user.id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      suggestions: uniqueSuggestions,
      count: uniqueSuggestions.length,
      message: `Generated ${uniqueSuggestions.length} negative keyword suggestions`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-negative-keywords:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getCategoryReason(category: string, pattern: string): string {
  const reasons: Record<string, string> = {
    general_ai: `"${pattern}" attire des utilisateurs cherchant des outils IA généraux, pas Shopify`,
    digital_marketing: `"${pattern}" cible les agences/formations marketing, pas les e-commerçants`,
    video_ai: `"${pattern}" concerne l'IA vidéo, non pertinent pour l'optimisation SEO Shopify`,
    website_builder: `"${pattern}" cible des créateurs de sites, pas des utilisateurs Shopify existants`,
    free_keywords: `"${pattern}" attire des chercheurs de solutions gratuites avec faible intention d'achat`,
    competitor_brands: `"${pattern}" est une marque concurrente ou non pertinente`,
    job_seekers: `"${pattern}" attire des chercheurs d'emploi, pas des clients potentiels`,
    educational: `"${pattern}" indique une recherche d'information, pas une intention d'achat`,
  };
  return reasons[category] || `Terme non pertinent: ${pattern}`;
}
