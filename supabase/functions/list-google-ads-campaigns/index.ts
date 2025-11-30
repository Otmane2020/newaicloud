import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Check developer token early
    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    if (!developerToken) {
      console.error('[list-google-ads-campaigns] Missing GOOGLE_ADS_DEVELOPER_TOKEN');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Google Ads Developer Token not configured',
          message: 'Please add the GOOGLE_ADS_DEVELOPER_TOKEN secret in Lovable Cloud settings'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Authentication failed');
    }

    console.log('[list-google-ads-campaigns] Fetching campaigns for user:', user.id);

    // Get user's Google Ads token and customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('google_ads_oauth_token, google_ads_refresh_token, google_ads_token_expires_at, google_ads_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.google_ads_oauth_token) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Google Ads not connected',
          message: 'Please connect your Google Ads account first'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if token is expired
    let accessToken = profile.google_ads_oauth_token;
    if (profile.google_ads_token_expires_at) {
      const expiresAt = new Date(profile.google_ads_token_expires_at);
      if (expiresAt <= new Date()) {
        console.log('[list-google-ads-campaigns] Token expired, refreshing...');
        
        // Refresh token
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
        
        if (!clientId || !clientSecret) {
          throw new Error('Google OAuth credentials not configured');
        }

        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: profile.google_ads_refresh_token || '',
            grant_type: 'refresh_token',
          }),
        });

        if (!refreshResponse.ok) {
          throw new Error('Failed to refresh token');
        }

        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;
        
        // Update profile with new token
        await supabase
          .from('profiles')
          .update({
            google_ads_oauth_token: accessToken,
            google_ads_token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          })
          .eq('id', user.id);
      }
    }

    // Developer token already validated at the start

    // Get customer ID (if not in profile, try to fetch it)
    let customerId = profile.google_ads_customer_id;
    
    if (!customerId) {
      console.log('[list-google-ads-campaigns] No customer ID in profile, fetching...');
      
      // Fetch accessible customers
      const customersResponse = await fetch('https://googleads.googleapis.com/v17/customers:listAccessibleCustomers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
        },
      });

      if (!customersResponse.ok) {
        const errorText = await customersResponse.text();
        console.error('[list-google-ads-campaigns] Failed to fetch customers:', errorText);
        throw new Error('Failed to fetch Google Ads customers');
      }

      const customersData = await customersResponse.json();
      console.log('[list-google-ads-campaigns] Accessible customers:', customersData);
      
      if (customersData.resourceNames && customersData.resourceNames.length > 0) {
        // Extract customer ID from resource name (format: customers/{customer_id})
        customerId = customersData.resourceNames[0].split('/')[1];
        
        // Save to profile
        await supabase
          .from('profiles')
          .update({ google_ads_customer_id: customerId })
          .eq('id', user.id);
        
        console.log('[list-google-ads-campaigns] Saved customer ID:', customerId);
      } else {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No Google Ads accounts found',
            message: 'Your Google account does not have access to any Google Ads accounts'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }
    }

    console.log('[list-google-ads-campaigns] Using customer ID:', customerId);

    // Fetch campaigns using Google Ads API
    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros
      FROM campaign 
      WHERE campaign.status IN ('ENABLED', 'PAUSED')
      ORDER BY campaign.name
    `;

    const adsResponse = await fetch(`https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:searchStream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'login-customer-id': customerId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!adsResponse.ok) {
      const errorText = await adsResponse.text();
      console.error('[list-google-ads-campaigns] API error:', errorText);
      throw new Error(`Google Ads API error: ${errorText}`);
    }

    const adsData = await adsResponse.json();
    console.log('[list-google-ads-campaigns] Fetched campaigns:', adsData);

    // Parse and save campaigns
    const campaigns = [];
    
    if (adsData && Array.isArray(adsData)) {
      for (const result of adsData) {
        if (result.results) {
          for (const row of result.results) {
            const campaign = {
              user_id: user.id,
              campaign_id: row.campaign?.id?.toString() || '',
              name: row.campaign?.name || 'Unnamed Campaign',
              status: row.campaign?.status || 'UNKNOWN',
              advertising_channel_type: row.campaign?.advertisingChannelType || 'UNSPECIFIED',
              impressions: parseInt(row.metrics?.impressions || '0'),
              clicks: parseInt(row.metrics?.clicks || '0'),
              cost_micros: parseInt(row.metrics?.costMicros || '0'),
            };

            campaigns.push(campaign);

            // Save to database
            await supabase
              .from('google_ads_campaigns')
              .upsert(campaign, {
                onConflict: 'user_id,campaign_id',
              });
          }
        }
      }
    }

    console.log('[list-google-ads-campaigns] Saved campaigns:', campaigns.length);

    return new Response(
      JSON.stringify({
        success: true,
        campaigns,
        count: campaigns.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[list-google-ads-campaigns] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to fetch campaigns',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
