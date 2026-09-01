import "../_shared/strict-ai-generation.ts";
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

const baseUrl = 'https://catalogoptimize.com';

const catalogSeoPaths = [
  '/shopify-catalog-optimization',
  '/ai-product-catalog-optimization',
  '/shopify-product-optimization',
  '/google-shopping-feed-optimization',
  '/product-data-enrichment',
  '/bulk-product-description-generator',
  '/shopify-image-optimization',
  '/shopify-variant-management',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const urls: SitemapUrl[] = [
      { loc: `${baseUrl}/`, changefreq: 'daily', priority: 1.0 },
      { loc: `${baseUrl}/demo`, changefreq: 'weekly', priority: 0.8 },
      { loc: `${baseUrl}/documentation`, changefreq: 'monthly', priority: 0.6 },
      { loc: `${baseUrl}/privacy`, changefreq: 'yearly', priority: 0.3 },
      { loc: `${baseUrl}/terms`, changefreq: 'yearly', priority: 0.3 },
      ...catalogSeoPaths.map((path) => ({
        loc: `${baseUrl}${path}`,
        changefreq: 'weekly' as const,
        priority: 0.8,
      })),
    ];

    // Public content articles.
    const { data: blogArticles, error: blogError } = await supabase
      .from('promotional_articles')
      .select('id, slug, updated_at, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (blogError) {
      console.warn('Sitemap: unable to load promotional articles', blogError.message);
    }

    if (blogArticles) {
      blogArticles.forEach((article) => {
        urls.push({
          loc: `${baseUrl}/blog-newai/${article.slug || article.id}`,
          lastmod: article.updated_at || article.created_at,
          changefreq: 'weekly',
          priority: 0.6,
        });
      });
    }

    const xml = generateSitemapXml(urls);

    console.log(`✅ CatalogOptimize sitemap generated with ${urls.length} URLs`);

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
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
  const uniqueUrls = Array.from(new Map(urls.map((url) => [url.loc, url])).values());

  const urlEntries = uniqueUrls.map((url) => {
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
