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

    // Helper function to try fetching data with different domain formats
    const tryFetchData = async (siteUrl: string) => {
      return await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
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
    };

    // Get list of accessible sites to find the correct format
    const sitesResponse = await fetch(
      'https://www.googleapis.com/webmasters/v3/sites',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    let matchedSiteUrl = null;
    if (sitesResponse.ok) {
      const sitesData = await sitesResponse.json();
      const availableSites = (sitesData.siteEntry || []);
      
      // Try to find exact match or domain match
      matchedSiteUrl = availableSites.find((s: any) => {
        const siteUrl = s.siteUrl.toLowerCase();
        const domainLower = domain.toLowerCase();
        return siteUrl === `https://${domainLower}/` || 
               siteUrl === `https://www.${domainLower}/` ||
               siteUrl === `http://${domainLower}/` ||
               siteUrl === `sc-domain:${domainLower}`;
      })?.siteUrl;
    }

    // If no match found, try both formats
    if (!matchedSiteUrl) {
      matchedSiteUrl = `https://${domain}/`;
    }

    // Fetch data from Google Search Console API
    let searchConsoleResponse = await tryFetchData(matchedSiteUrl);

    // If failed and we tried https://, try sc-domain: format
    if (!searchConsoleResponse.ok && matchedSiteUrl.startsWith('https://')) {
      console.log(`Failed with ${matchedSiteUrl}, trying sc-domain format`);
      matchedSiteUrl = `sc-domain:${domain}`;
      searchConsoleResponse = await tryFetchData(matchedSiteUrl);
    }

    if (!searchConsoleResponse.ok) {
      const errorText = await searchConsoleResponse.text();
      console.error('Search Console API error:', searchConsoleResponse.status, errorText);
      
      if (searchConsoleResponse.status === 403) {
        // Get list of accessible sites to provide helpful error message
        const sitesResponse = await fetch(
          'https://www.googleapis.com/webmasters/v3/sites',
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        let availableSites = [];
        if (sitesResponse.ok) {
          const sitesData = await sitesResponse.json();
          availableSites = (sitesData.siteEntry || []).map((s: any) => s.siteUrl);
        }

        if (availableSites.length === 0) {
          throw new Error(`Accès refusé à '${domain}'. Votre compte Google n'a accès à aucun domaine dans Search Console. Veuillez ajouter ${domain} dans Google Search Console ou demander l'accès au propriétaire.`);
        } else {
          throw new Error(`Accès refusé à '${domain}'. Votre compte a accès à: ${availableSites.join(', ')}. Veuillez vérifier que le bon domaine est sélectionné ou demander l'accès à ${domain}.`);
        }
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
