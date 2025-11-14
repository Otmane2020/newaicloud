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

    const { articleId, url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing url parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('[GSC Indexing] 📝 Requesting indexing for:', url);

    // Get Google access token from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('google_access_token, google_refresh_token, google_token_expires_at')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.google_access_token) {
      console.error('[GSC Indexing] ❌ No Google token found');
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
      console.log('[GSC Indexing] 🔄 Refreshing expired token...');
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

      // Update token in database
      await supabase
        .from('profiles')
        .update({
          google_access_token: accessToken,
          google_token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq('id', user.id);
    }

    // Call Google Indexing API
    const indexingResponse = await fetch(
      'https://indexing.googleapis.com/v3/urlNotifications:publish',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          type: 'URL_UPDATED',
        }),
      }
    );

    const responseData = await indexingResponse.json();

    // Determine status based on response
    let status = 'success';
    let errorMessage = null;

    if (!indexingResponse.ok) {
      console.error('[GSC Indexing] ❌ Indexing failed:', responseData);
      
      // Check for quota exceeded
      if (responseData.error?.code === 429 || responseData.error?.message?.includes('quota')) {
        status = 'quota_exceeded';
        errorMessage = 'Daily quota exceeded (200 requests/day)';
      } else {
        status = 'failed';
        errorMessage = responseData.error?.message || 'Indexing request failed';
      }
    }

    // Store result in database
    const { error: insertError } = await supabase
      .from('gsc_indexing_requests')
      .insert({
        user_id: user.id,
        article_id: articleId || null,
        url: url,
        status: status,
        response_data: responseData,
        error_message: errorMessage,
      });

    if (insertError) {
      console.error('[GSC Indexing] ❌ Failed to store request:', insertError);
    }

    console.log('[GSC Indexing] ✅ Status:', status);

    return new Response(
      JSON.stringify({
        success: status === 'success',
        status: status,
        message: errorMessage || 'Indexing request submitted successfully',
        data: responseData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[GSC Indexing] ❌ Error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
