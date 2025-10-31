import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LinkData {
  url: string;
  anchorText: string;
  linkType: 'internal' | 'external';
  targetType: 'product' | 'collection' | 'page' | 'external';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Authenticate user
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

    const requestBody = await req.json();
    const { article_ids } = requestBody;

    // Use service role client for database operations
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log('🔗 Starting netlinking extraction...');

    // Fetch articles to analyze
    let articlesQuery = supabaseServiceClient
      .from('blog_articles')
      .select('id, title, content, user_id, store_id')
      .eq('user_id', user.id);

    if (article_ids && Array.isArray(article_ids) && article_ids.length > 0) {
      articlesQuery = articlesQuery.in('id', article_ids);
      console.log(`📄 Analyzing ${article_ids.length} specific article(s)`);
    } else {
      console.log('📄 Analyzing all articles');
    }

    const { data: articles, error: articlesError } = await articlesQuery;

    if (articlesError) {
      console.error('❌ Error fetching articles:', articlesError);
      throw articlesError;
    }

    if (!articles || articles.length === 0) {
      console.log('⚠️ No articles found to analyze');
      return new Response(
        JSON.stringify({ success: true, message: 'No articles found', count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Found ${articles.length} article(s) to analyze`);

    // Get store URL for internal link detection
    const { data: stores } = await supabaseServiceClient
      .from('shopify_connections')
      .select('id, store_url')
      .eq('user_id', user.id);

    const storeDomains = stores?.map(s => {
      const url = s.store_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      return { id: s.id, domain: url };
    }) || [];

    console.log(`🏪 User has ${storeDomains.length} store(s)`);

    let totalLinksExtracted = 0;

    // Process each article
    for (const article of articles) {
      console.log(`\n📝 Processing article: ${article.title}`);
      
      if (!article.content) {
        console.log('  ⚠️ No content, skipping');
        continue;
      }

      const links = extractLinksFromHtml(article.content);
      console.log(`  🔍 Found ${links.length} link(s)`);

      if (links.length === 0) continue;

      // Classify each link
      const classifiedLinks = links.map(link => classifyLink(link, storeDomains));

      // Calculate SEO score for each link
      const linksWithScores = classifiedLinks.map(link => ({
        ...link,
        seoScore: calculateSeoScore(link, article.content)
      }));

      // Insert into blog_netlinking
      for (const link of linksWithScores) {
        const { error: insertError } = await supabaseServiceClient
          .from('blog_netlinking')
          .upsert({
            user_id: user.id,
            article_id: article.id,
            target_url: link.url,
            anchor_text: link.anchorText,
            link_type: link.linkType,
            click_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,article_id,target_url',
            ignoreDuplicates: false
          });

        if (insertError) {
          console.error(`  ❌ Error inserting link ${link.url}:`, insertError);
        } else {
          totalLinksExtracted++;
        }
      }

      console.log(`  ✅ Saved ${linksWithScores.length} link(s)`);
    }

    console.log(`\n✨ Extraction complete! Total links: ${totalLinksExtracted}`);

    return new Response(
      JSON.stringify({
        success: true,
        count: totalLinksExtracted,
        articles_processed: articles.length,
        message: `Successfully extracted ${totalLinksExtracted} links from ${articles.length} article(s)`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Error extracting netlinking:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Extract all links from HTML content
function extractLinksFromHtml(html: string): LinkData[] {
  const links: LinkData[] = [];
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    const anchorText = match[2].replace(/<[^>]*>/g, '').trim(); // Remove HTML tags from anchor

    // Skip empty or invalid links
    if (!url || url === '#' || url.startsWith('javascript:')) continue;

    links.push({
      url,
      anchorText: anchorText || url,
      linkType: 'external', // Will be updated in classifyLink
      targetType: 'external' // Will be updated in classifyLink
    });
  }

  return links;
}

// Classify link as internal/external and determine target type
function classifyLink(
  link: LinkData, 
  storeDomains: Array<{ id: string; domain: string }>
): LinkData {
  const url = link.url.toLowerCase();
  
  // Check if internal link
  let isInternal = false;
  for (const store of storeDomains) {
    if (url.includes(store.domain.toLowerCase()) || 
        url.startsWith('/') || 
        url.startsWith('./') || 
        url.startsWith('../')) {
      isInternal = true;
      break;
    }
  }

  link.linkType = isInternal ? 'internal' : 'external';

  // Determine target type
  if (isInternal) {
    if (url.includes('/products/') || url.includes('/product/')) {
      link.targetType = 'product';
    } else if (url.includes('/collections/') || url.includes('/collection/')) {
      link.targetType = 'collection';
    } else if (url.includes('/pages/') || url.includes('/page/')) {
      link.targetType = 'page';
    }
  }

  return link;
}

// Calculate SEO score based on various factors
function calculateSeoScore(link: LinkData, articleContent: string): number {
  let score = 50; // Base score

  // Internal links are better for SEO
  if (link.linkType === 'internal') {
    score += 20;
  }

  // Descriptive anchor text is better
  const anchorLength = link.anchorText.length;
  if (anchorLength > 10 && anchorLength < 60) {
    score += 15;
  } else if (anchorLength >= 3) {
    score += 5;
  }

  // Avoid generic anchor text
  const genericTerms = ['cliquez ici', 'click here', 'lien', 'link', 'ici', 'here'];
  const isGeneric = genericTerms.some(term => 
    link.anchorText.toLowerCase().includes(term)
  );
  if (isGeneric) {
    score -= 20;
  }

  // Check if link is in early part of content (better for SEO)
  const linkPosition = articleContent.indexOf(link.url);
  const contentLength = articleContent.length;
  if (linkPosition > 0 && linkPosition < contentLength * 0.3) {
    score += 10;
  }

  // Product links in relevant content are valuable
  if (link.targetType === 'product' && link.linkType === 'internal') {
    score += 5;
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}
