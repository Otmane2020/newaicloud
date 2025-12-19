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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const baseUrl = 'https://aeoreply.com';
    const urls: SitemapUrl[] = [];

    // Fetch all published AEO answers
    const { data: answers, error } = await supabase
      .from('ai_answers')
      .select('id, slug, brand_name, updated_at, published_at, citation_potential')
      .eq('is_published', true)
      .not('slug', 'is', null)
      .not('brand_name', 'is', null)
      .order('published_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Error fetching answers:', error);
      throw error;
    }

    if (answers) {
      answers.forEach(answer => {
        // Calculate priority based on citation potential (0.5 to 1.0)
        const priority = Math.min(1.0, Math.max(0.5, (answer.citation_potential || 50) / 100));
        
        urls.push({
          loc: `${baseUrl}/${answer.brand_name}/answers/${answer.slug}`,
          lastmod: answer.updated_at || answer.published_at,
          changefreq: 'weekly',
          priority: Math.round(priority * 10) / 10,
        });
      });
    }

    // Generate XML sitemap
    const xml = generateSitemapXml(urls);

    console.log(`✅ sitemap-answers.xml generated with ${urls.length} AEO answers`);

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('❌ Error generating sitemap-answers:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>${escapeXml(message)}</error>`,
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
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
