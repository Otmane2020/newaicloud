import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const baseUrl = 'https://newai.sale';
    const urls: SitemapUrl[] = [];

    // Static pages - high priority
    urls.push(
      { loc: `${baseUrl}/`, changefreq: 'daily', priority: 1.0 },
      { loc: `${baseUrl}/pricing`, changefreq: 'weekly', priority: 0.9 },
      { loc: `${baseUrl}/demo`, changefreq: 'weekly', priority: 0.8 },
      { loc: `${baseUrl}/features`, changefreq: 'weekly', priority: 0.8 },
    );

    // Auth pages - lower priority
    urls.push(
      { loc: `${baseUrl}/auth`, changefreq: 'monthly', priority: 0.3 },
      { loc: `${baseUrl}/signup`, changefreq: 'monthly', priority: 0.3 },
      { loc: `${baseUrl}/login`, changefreq: 'monthly', priority: 0.3 },
    );

    // Dynamic content - fetch from database
    // Blog articles (public)
    const { data: articles } = await supabase
      .from('blog_articles')
      .select('id, title, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(100);

    if (articles) {
      articles.forEach(article => {
        urls.push({
          loc: `${baseUrl}/blog/${article.id}`,
          lastmod: article.updated_at || article.published_at,
          changefreq: 'weekly',
          priority: 0.7,
        });
      });
    }

    // Products (if public)
    const { data: products } = await supabase
      .from('shopify_products')
      .select('id, handle, updated_at')
      .eq('status', 'active')
      .not('handle', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(500);

    if (products) {
      products.forEach(product => {
        if (product.handle) {
          urls.push({
            loc: `${baseUrl}/products/${product.handle}`,
            lastmod: product.updated_at,
            changefreq: 'weekly',
            priority: 0.6,
          });
        }
      });
    }

    // Collections (if public)
    const { data: collections } = await supabase
      .from('shopify_collections')
      .select('id, handle, updated_at')
      .not('handle', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (collections) {
      collections.forEach(collection => {
        if (collection.handle) {
          urls.push({
            loc: `${baseUrl}/collections/${collection.handle}`,
            lastmod: collection.updated_at,
            changefreq: 'weekly',
            priority: 0.6,
          });
        }
      });
    }

    // Generate XML sitemap
    const xml = generateSitemapXml(urls);

    console.log(`✅ Sitemap generated with ${urls.length} URLs`);

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateSitemapXml(urls: SitemapUrl[]): string {
  const urlEntries = urls.map(url => {
    let entry = `  <url>\n    <loc>${escapeXml(url.loc)}</loc>`;
    
    if (url.lastmod) {
      const date = new Date(url.lastmod).toISOString().split('T')[0];
      entry += `\n    <lastmod>${date}</lastmod>`;
    }
    
    if (url.changefreq) {
      entry += `\n    <changefreq>${url.changefreq}</changefreq>`;
    }
    
    if (url.priority !== undefined) {
      entry += `\n    <priority>${url.priority.toFixed(1)}</priority>`;
    }
    
    entry += '\n  </url>';
    return entry;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
