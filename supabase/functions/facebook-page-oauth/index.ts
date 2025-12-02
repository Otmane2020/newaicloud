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

      // Now fetch the Instagram Business account linked to this page
      let instagramAccountName = null;
      try {
        console.log('Fetching Instagram Business account for page:', page.id);
        const igResponse = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        const igData = await igResponse.json();
        console.log('Instagram Business account response:', igData);

        if (igData.instagram_business_account) {
          // Get Instagram account details
          const igDetailsResponse = await fetch(
            `https://graph.facebook.com/v18.0/${igData.instagram_business_account.id}?fields=username,name&access_token=${page.access_token}`
          );
          const igDetails = await igDetailsResponse.json();
          console.log('Instagram account details:', igDetails);

          instagramAccountName = igDetails.username || igDetails.name || 'Instagram Business';

          // Store Instagram connection (using page_access_token for Instagram Business API)
          const { error: igInsertError } = await supabase
            .from('instagram_account_connections')
            .upsert({
              user_id: state,
              account_id: igData.instagram_business_account.id,
              account_name: instagramAccountName,
              access_token: page.access_token, // Use page token for Instagram Business API
              auto_share_enabled: true,
            }, {
              onConflict: 'user_id'
            });

          if (igInsertError) {
            console.error('Error storing Instagram connection:', igInsertError);
          } else {
            console.log('Instagram Business account connected successfully:', instagramAccountName);
          }
        } else {
          console.log('No Instagram Business account linked to this Facebook page');
        }
      } catch (igError) {
        console.error('Error fetching Instagram Business account:', igError);
        // Don't fail the whole flow if Instagram fetch fails
      }

      // Close the popup and notify parent window
      const successMessage = instagramAccountName 
        ? `Facebook (${page.name}) et Instagram (${instagramAccountName}) connectés avec succès!`
        : `Facebook (${page.name}) connecté avec succès!`;

      return new Response(
        `<html><body><script>
          window.opener.postMessage({ 
            success: true, 
            pageName: '${page.name}',
            instagramName: ${instagramAccountName ? `'${instagramAccountName}'` : 'null'},
            message: '${successMessage}'
          }, '*');
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
        
        // Extended scope to include Instagram Business permissions
        const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
          `client_id=${appId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish&` +
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
