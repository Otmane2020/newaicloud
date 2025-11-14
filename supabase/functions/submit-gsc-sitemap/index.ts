import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { siteUrl, sitemapUrl } = await req.json();

    if (!siteUrl || !sitemapUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing siteUrl or sitemapUrl parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate sitemap URL format
    try {
      new URL(sitemapUrl);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid sitemap URL format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('[GSC Submit] 📤 Submitting sitemap:', sitemapUrl, 'for site:', siteUrl);

    // Get Google access token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('google_access_token, google_refresh_token, google_token_expires_at')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.google_access_token) {
      console.error('[GSC Submit] ❌ No Google token found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'NO_GOOGLE_AUTH',
          message: 'Google Search Console not connected' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let accessToken = profile.google_access_token;

    // Refresh token if expired
    if (profile.google_token_expires_at && new Date(profile.google_token_expires_at) < new Date()) {
      console.log('[GSC Submit] 🔄 Refreshing expired token...');
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          refresh_token: profile.google_refresh_token!,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh Google token');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      await supabase
        .from('profiles')
        .update({
          google_access_token: accessToken,
          google_token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq('id', user.id);
    }

    // Encode URLs for API call
    const encodedSiteUrl = encodeURIComponent(siteUrl);
    const encodedSitemapUrl = encodeURIComponent(sitemapUrl);

    // Call Google Search Console API to submit sitemap
    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/sitemaps/${encodedSitemapUrl}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[GSC Submit] ❌ API error:', errorData);
      return new Response(
        JSON.stringify({
          success: false,
          error: errorData.error?.message || 'Failed to submit sitemap',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    console.log('[GSC Submit] ✅ Sitemap submitted successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sitemap submitted successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[GSC Submit] ❌ Error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
