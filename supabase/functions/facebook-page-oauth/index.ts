import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

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
    
    // Handle OAuth callback from Facebook (GET request)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state'); // This is the user_id
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      console.log('Facebook OAuth callback received:', { code: !!code, state, error });

      if (error) {
        console.error('Facebook OAuth error:', error, errorDescription);
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
      const appId = Deno.env.get('FACEBOOK_APP_ID')!;
      const appSecret = Deno.env.get('FACEBOOK_APP_SECRET')!;
      const redirectUri = `${supabaseUrl}/functions/v1/facebook-page-oauth`;

      console.log('Exchanging code for token...');
      
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `client_id=${appId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `client_secret=${appSecret}&` +
        `code=${code}`
      );

      const tokenData = await tokenResponse.json();
      console.log('Token exchange response:', { success: !!tokenData.access_token });

      if (!tokenData.access_token) {
        throw new Error('Failed to get access token: ' + JSON.stringify(tokenData));
      }

      // Get user's Facebook pages
      console.log('Fetching user pages...');
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`
      );

      const pagesData = await pagesResponse.json();
      console.log('Pages response:', { pageCount: pagesData.data?.length });

      if (!pagesData.data || pagesData.data.length === 0) {
        return new Response(
          `<html><body><script>
            window.opener.postMessage({ error: 'No Facebook pages found. Please create a Facebook Page first.' }, '*');
            window.close();
          </script></body></html>`,
          { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
        );
      }

      // Store the first page connection
      const page = pagesData.data[0];
      console.log('Storing page connection:', { pageName: page.name, userId: state });

      const { error: insertError } = await supabase
        .from('facebook_page_connections')
        .upsert({
          user_id: state,
          page_id: page.id,
          page_name: page.name,
          page_access_token: page.access_token,
          auto_share_enabled: true,
        }, {
          onConflict: 'user_id,page_id'
        });

      if (insertError) {
        console.error('Error storing Facebook page connection:', insertError);
        throw insertError;
      }

      console.log('Facebook page connected successfully');

      // Close the popup and notify parent window
      return new Response(
        `<html><body><script>
          window.opener.postMessage({ success: true, pageName: '${page.name}' }, '*');
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
        const appId = Deno.env.get('FACEBOOK_APP_ID')!;
        const redirectUri = `${supabaseUrl}/functions/v1/facebook-page-oauth`;
        
        const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
          `client_id=${appId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=pages_manage_posts,pages_read_engagement,pages_show_list&` +
          `response_type=code&` +
          `state=${user.id}`;

        console.log('Generated Facebook auth URL for user:', user.id);

        return new Response(
          JSON.stringify({ authUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error('Invalid action');
    }

    throw new Error('Invalid request method');

  } catch (error: any) {
    console.error('Facebook OAuth error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
