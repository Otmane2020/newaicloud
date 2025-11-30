import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get user's Google Ads credentials - support BOTH column patterns
    // SuperAdmin uses: google_oauth_token, google_refresh_token
    // User flow uses: google_ads_oauth_token, google_ads_refresh_token
    const { data: profile } = await supabase
      .from('profiles')
      .select('google_ads_oauth_token, google_ads_refresh_token, google_ads_customer_id, google_ads_token_expires_at, google_oauth_token, google_refresh_token, google_token_expires_at')
      .eq('id', user.id)
      .single();

    // Use google_ads_* columns first, fall back to google_* columns (SuperAdmin)
    const oauthToken = profile?.google_ads_oauth_token || profile?.google_oauth_token;
    const refreshToken = profile?.google_ads_refresh_token || profile?.google_refresh_token;
    const tokenExpiresAt = profile?.google_ads_token_expires_at || profile?.google_token_expires_at;

    if (!oauthToken || !profile?.google_ads_customer_id) {
      return new Response(JSON.stringify({ 
        error: 'Google Ads not connected',
        message: 'Please connect your Google Ads account first and enter your Customer ID'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let accessToken = oauthToken;

    // Check if token needs refresh
    if (tokenExpiresAt) {
      const expiresAt = new Date(tokenExpiresAt);
      if (expiresAt <= new Date() && refreshToken) {
        // Refresh the token
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
        
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId!,
            client_secret: clientSecret!,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        const refreshData = await refreshResponse.json();
        if (refreshData.access_token) {
          accessToken = refreshData.access_token;
          const expiresIn = refreshData.expires_in || 3600;
          const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

          // Update the appropriate token column based on which one was used
          const updateData = profile?.google_ads_oauth_token 
            ? { google_ads_oauth_token: accessToken, google_ads_token_expires_at: newExpiresAt.toISOString() }
            : { google_oauth_token: accessToken, google_token_expires_at: newExpiresAt.toISOString() };

          await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', user.id);
        }
      }
    }

    const customerId = profile.google_ads_customer_id.replace(/-/g, '');
    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');

    // Calculate date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '');

    // Query Google Ads API for search terms
    const query = `
      SELECT 
        search_term_view.search_term,
        campaign.name,
        campaign.id,
        ad_group.name,
        ad_group.id,
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_from_interactions_rate,
        metrics.conversions_value,
        segments.date,
        search_term_view.status
      FROM search_term_view
      WHERE segments.date BETWEEN '${formatDate(startDate)}' AND '${formatDate(endDate)}'
      ORDER BY metrics.impressions DESC
      LIMIT 500
    `;

    const googleAdsResponse = await fetch(
      `https://googleads.googleapis.com/v15/customers/${customerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!googleAdsResponse.ok) {
      const errorText = await googleAdsResponse.text();
      console.error('Google Ads API error:', errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch search terms',
        details: errorText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const responseData = await googleAdsResponse.json();
    const searchTerms: any[] = [];

    // Parse the streaming response
    for (const batch of responseData) {
      if (batch.results) {
        for (const result of batch.results) {
          searchTerms.push({
            user_id: user.id,
            search_term: result.searchTermView?.searchTerm || '',
            campaign_id: result.campaign?.id || '',
            campaign_name: result.campaign?.name || '',
            adgroup_id: result.adGroup?.id || '',
            adgroup_name: result.adGroup?.name || '',
            clicks: result.metrics?.clicks || 0,
            impressions: result.metrics?.impressions || 0,
            ctr: result.metrics?.ctr || 0,
            avg_cpc: (result.metrics?.averageCpc || 0) / 1000000,
            cost_micros: result.metrics?.costMicros || 0,
            conversions: result.metrics?.conversions || 0,
            conversion_rate: result.metrics?.conversionsFromInteractionsRate || 0,
            conversion_value: result.metrics?.conversionsValue || 0,
            date: result.segments?.date || new Date().toISOString().split('T')[0],
            match_type: result.searchTermView?.status || 'UNKNOWN',
          });
        }
      }
    }

    // Upsert search terms to database
    if (searchTerms.length > 0) {
      const { error: upsertError } = await supabase
        .from('google_ads_search_terms')
        .upsert(searchTerms, {
          onConflict: 'user_id,search_term,date',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error('Database error:', upsertError);
      }
    }

    console.log(`Imported ${searchTerms.length} search terms for user ${user.id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      imported: searchTerms.length,
      message: `Successfully imported ${searchTerms.length} search terms`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in import-google-ads-search-terms:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
