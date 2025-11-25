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
    const body = await req.json().catch(() => ({}));
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Fetching merchant accounts...");

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Get user's Google Merchant tokens
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('google_merchant_oauth_token, google_merchant_refresh_token, google_merchant_token_expires_at')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.google_merchant_oauth_token) {
      throw new Error("Google Merchant Center not connected");
    }

    let accessToken = profile.google_merchant_oauth_token;

    // Check if token is expired and refresh if needed
    if (profile.google_merchant_token_expires_at) {
      const expiresAt = new Date(profile.google_merchant_token_expires_at);
      const now = new Date();
      
      if (expiresAt <= now && profile.google_merchant_refresh_token) {
        console.log("Token expired, refreshing...");
        
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId!,
            client_secret: clientSecret!,
            refresh_token: profile.google_merchant_refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          accessToken = refreshData.access_token;
          
          const newExpiresAt = new Date();
          newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in);

          await supabase
            .from('profiles')
            .update({
              google_merchant_oauth_token: accessToken,
              google_merchant_token_expires_at: newExpiresAt.toISOString(),
            })
            .eq('id', user.id);
        }
      }
    }

    // Fetch merchant accounts from Google Content API
    const accountsResponse = await fetch(
      'https://shoppingcontent.googleapis.com/content/v2.1/accounts/authinfo',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      console.error('Google API error:', errorText);
      
      // Check if it's the API not enabled error
      if (accountsResponse.status === 403 && errorText.includes('Content API for Shopping has not been used')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'API_NOT_ENABLED',
            message: 'The Content API for Shopping needs to be enabled in your Google Cloud project. Please visit the Google Cloud Console to enable it.',
            activationUrl: 'https://console.developers.google.com/apis/api/shoppingcontent.googleapis.com/overview?project=741227309573'
          }),
          { 
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      throw new Error(`Failed to fetch merchant accounts: ${accountsResponse.status}`);
    }

    const accountsData = await accountsResponse.json();
    console.log('✅ Full Merchant accounts response:', JSON.stringify(accountsData, null, 2));
    console.log('📋 accountIdentifiers:', accountsData.accountIdentifiers);

    const accounts = accountsData.accountIdentifiers || [];

    // Log if no accounts found
    if (accounts.length === 0) {
      console.warn('⚠️ No merchant accounts found in response');
      return new Response(
        JSON.stringify({ 
          success: true,
          accounts: [],
          message: 'No merchant accounts found. Please create a Merchant Center account first.',
          createAccountUrl: 'https://merchants.google.com'
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`✅ Found ${accounts.length} merchant account(s)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        accounts: accounts.map((acc: any) => ({
          id: acc.merchantId || acc.aggregatorId,
          type: acc.merchantId ? 'merchant' : 'aggregator',
        }))
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in list-merchant-accounts:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
