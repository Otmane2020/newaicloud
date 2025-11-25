import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkCheckResult {
  id: string;
  is_broken: boolean;
  http_status_code: number | null;
  error_message: string | null;
}

async function checkLink(url: string): Promise<{ status: number | null; error: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkChecker/1.0)',
      },
    });

    clearTimeout(timeout);
    return { status: response.status, error: null };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { status: null, error: 'Timeout: Connection took too long' };
    }
    return { status: null, error: error.message || 'Unknown error' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Safe HealthCheck handler
  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { link_ids } = body;

    console.log(`Checking links for user ${user.id}`);

    // Fetch links to check
    let query = supabaseClient
      .from('blog_netlinking')
      .select('id, target_url')
      .eq('user_id', user.id);

    if (link_ids && Array.isArray(link_ids) && link_ids.length > 0) {
      query = query.in('id', link_ids);
    }

    const { data: links, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    if (!links || links.length === 0) {
      return new Response(
        JSON.stringify({ success: true, total: 0, broken: 0, working: 0, results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${links.length} links to check`);

    // Check links in batches of 10
    const batchSize = 10;
    const results: LinkCheckResult[] = [];
    
    for (let i = 0; i < links.length; i += batchSize) {
      const batch = links.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (link) => {
          const { status, error } = await checkLink(link.target_url);
          const isBroken = status === null || status >= 400;
          
          return {
            id: link.id,
            is_broken: isBroken,
            http_status_code: status,
            error_message: error || (status && status >= 400 ? `HTTP ${status}` : null),
          };
        })
      );
      results.push(...batchResults);
    }

    // Update database
    const now = new Date().toISOString();
    for (const result of results) {
      const updateData: any = {
        is_broken: result.is_broken,
        last_checked_at: now,
        http_status_code: result.http_status_code,
        error_message: result.error_message,
      };

      // Set broken_since if newly broken, or clear it if fixed
      if (result.is_broken) {
        // Only set broken_since if it wasn't already broken
        const { data: currentLink } = await supabaseClient
          .from('blog_netlinking')
          .select('is_broken, broken_since')
          .eq('id', result.id)
          .single();

        if (currentLink && !currentLink.is_broken) {
          updateData.broken_since = now;
        }
      } else {
        updateData.broken_since = null;
      }

      await supabaseClient
        .from('blog_netlinking')
        .update(updateData)
        .eq('id', result.id);
    }

    const summary = {
      total: results.length,
      broken: results.filter((r) => r.is_broken).length,
      working: results.filter((r) => !r.is_broken).length,
    };

    console.log(`Check complete: ${summary.broken} broken, ${summary.working} working out of ${summary.total}`);

    return new Response(
      JSON.stringify({ success: true, ...summary, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error checking broken links:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});