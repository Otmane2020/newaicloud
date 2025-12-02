import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Handle OAuth callback from Instagram (GET request)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state'); // This is the user_id
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      console.log('Instagram OAuth callback received:', { code: !!code, state, error });

      if (error) {
        console.error('Instagram OAuth error:', error, errorDescription);
        return new Response(
          `<html><body><script>
            window.opener.postMessage({ error: '${error}: ${errorDescription}' }, '*');
            window.close();
          </script></body></html>`,
          { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
        );
      }

      if (!code || !state) {
        throw new Error('Missing code or state parameter');
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Exchange code for access token
      const appId = Deno.env.get('INSTAGRAM_APP_ID')!;
      const appSecret = Deno.env.get('INSTAGRAM_APP_SECRET')!;
      const redirectUri = `${supabaseUrl}/functions/v1/instagram-oauth`;

      console.log('Exchanging code for token...');
      
      const tokenResponse = await fetch(
        `https://api.instagram.com/oauth/access_token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: appId,
            client_secret: appSecret,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code: code,
          }),
        }
      );

      const tokenData = await tokenResponse.json();
      console.log('Token exchange response:', { success: !!tokenData.access_token });

      if (!tokenData.access_token) {
        throw new Error('Failed to get access token: ' + JSON.stringify(tokenData));
      }

      // Get Instagram account info
      console.log('Fetching account info...');
      const accountResponse = await fetch(
        `https://graph.instagram.com/me?fields=id,username&access_token=${tokenData.access_token}`
      );
      
      const accountData = await accountResponse.json();
      console.log('Account response:', { username: accountData.username });

      if (!accountData.id || !accountData.username) {
        throw new Error('Failed to get Instagram account info');
      }

      // Store Instagram connection
      console.log('Storing account connection:', { username: accountData.username, userId: state });

      const { error: insertError } = await supabase
        .from('instagram_account_connections')
        .upsert({
          user_id: state,
          account_id: accountData.id,
          account_name: accountData.username,
          access_token: tokenData.access_token,
          auto_share_enabled: true,
        }, {
          onConflict: 'user_id,account_id'
        });

      if (insertError) {
        console.error('Error storing Instagram connection:', insertError);
        throw insertError;
      }

      console.log('Instagram account connected successfully');

      // Close the popup and notify parent window
      return new Response(
        `<html><body><script>
          window.opener.postMessage({ success: true, accountName: '${accountData.username}' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    // Handle initial OAuth request from frontend (POST)
    if (req.method === 'POST') {
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Unauthorized');
      }

      const { action } = await req.json();

      if (action === 'connect') {
        const appId = Deno.env.get('INSTAGRAM_APP_ID')!;
        const redirectUri = `${supabaseUrl}/functions/v1/instagram-oauth`;
        
        // Instagram Business API scopes
        const authUrl = `https://api.instagram.com/oauth/authorize?` +
          `client_id=${appId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages&` +
          `response_type=code&` +
          `state=${user.id}`;

        console.log('Generated Instagram auth URL for user:', user.id);

        return new Response(
          JSON.stringify({ authUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error('Invalid action');
    }

    throw new Error('Invalid request method');

  } catch (error: any) {
    console.error('Instagram OAuth error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
