import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain, days = 30 } = await req.json();

    if (!domain) {
      throw new Error("Domain is required");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Get Google OAuth token from profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('google_oauth_token, google_refresh_token, google_token_expires_at')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.google_oauth_token) {
      throw new Error("Google account not connected");
    }

    // Check if token is expired and refresh if needed
    let accessToken = profile.google_oauth_token;
    if (profile.google_token_expires_at) {
      const expiresAt = new Date(profile.google_token_expires_at);
      if (expiresAt < new Date()) {
        // Token expired, refresh it
        if (!profile.google_refresh_token) {
          throw new Error("Token expired and no refresh token available");
        }

        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
            refresh_token: profile.google_refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        if (!refreshResponse.ok) {
          throw new Error("Failed to refresh Google token");
        }

        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;

        // Update profile with new token
        await supabaseClient
          .from('profiles')
          .update({
            google_oauth_token: accessToken,
            google_token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          })
          .eq('id', user.id);
      }
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Fetch data from Google Search Console API
    const searchConsoleResponse = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent('sc-domain:' + domain)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: ['date'],
          rowLimit: 25000,
        }),
      }
    );

    if (!searchConsoleResponse.ok) {
      const errorText = await searchConsoleResponse.text();
      console.error('Search Console API error:', searchConsoleResponse.status, errorText);
      
      if (searchConsoleResponse.status === 403) {
        throw new Error("Accès refusé. Vérifiez que le domaine est ajouté dans Google Search Console.");
      }
      
      throw new Error(`Search Console API error: ${searchConsoleResponse.status}`);
    }

    const searchConsoleData = await searchConsoleResponse.json();
    
    // Process and cache the data
    const processedData = (searchConsoleData.rows || []).map((row: any) => ({
      date: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr * 100, // Convert to percentage
      position: row.position,
    }));

    // Cache the data in database
    for (const dataPoint of processedData) {
      await supabaseClient
        .from('google_search_console_data')
        .upsert({
          user_id: user.id,
          domain,
          date: dataPoint.date,
          clicks: dataPoint.clicks,
          impressions: dataPoint.impressions,
          ctr: dataPoint.ctr,
          position: dataPoint.position,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,domain,date'
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: processedData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in get-search-console-data:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
