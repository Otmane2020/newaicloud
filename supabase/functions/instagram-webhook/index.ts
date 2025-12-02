import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Handle GET requests - either webhook verification OR OAuth callback
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const verifyToken = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      // Meta webhook verification
      if (mode === 'subscribe') {
        console.log('[INSTAGRAM-WEBHOOK] Verification request:', { mode, hasToken: !!verifyToken, hasChallenge: !!challenge });
        const expectedToken = Deno.env.get('INSTAGRAM_VERIFY_TOKEN');

        if (verifyToken === expectedToken) {
          console.log('[INSTAGRAM-WEBHOOK] ✅ Verification successful');
          return new Response(challenge, { 
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
          });
        }

        console.log('[INSTAGRAM-WEBHOOK] ❌ Verification failed - token mismatch');
        return new Response('Forbidden', { status: 403 });
      }

      // OAuth callback from Instagram Business Login
      if (code) {
        console.log('[INSTAGRAM-WEBHOOK] OAuth callback received:', { hasCode: true, state });

        if (error) {
          console.error('[INSTAGRAM-WEBHOOK] OAuth error:', error);
          return new Response(
            `<html><body><script>
              window.opener.postMessage({ error: '${error}' }, '*');
              window.close();
            </script></body></html>`,
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Exchange code for access token
        const clientId = Deno.env.get('INSTAGRAM_APP_ID') || '1271678488051260';
        const clientSecret = Deno.env.get('INSTAGRAM_APP_SECRET')!;
        const redirectUri = `${supabaseUrl}/functions/v1/instagram-webhook`;

        console.log('[INSTAGRAM-WEBHOOK] Exchanging code for token...');
        
        const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code: code,
          }),
        });

        const tokenData = await tokenResponse.json();
        console.log('[INSTAGRAM-WEBHOOK] Token response:', { success: !!tokenData.access_token, user_id: tokenData.user_id });

        if (!tokenData.access_token) {
          throw new Error('Failed to get access token: ' + JSON.stringify(tokenData));
        }

        // Get long-lived token
        const longLivedResponse = await fetch(
          `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${tokenData.access_token}`
        );
        const longLivedData = await longLivedResponse.json();
        const accessToken = longLivedData.access_token || tokenData.access_token;

        // Get Instagram user info
        const userResponse = await fetch(
          `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
        );
        const userData = await userResponse.json();
        console.log('[INSTAGRAM-WEBHOOK] User data:', userData);

        if (!state) {
          throw new Error('Missing state (user_id) parameter');
        }

        // Store Instagram connection
        const { error: insertError } = await supabase
          .from('instagram_account_connections')
          .upsert({
            user_id: state,
            account_id: userData.id || tokenData.user_id,
            account_name: userData.username || 'Instagram Business',
            access_token: accessToken,
            auto_share_enabled: true,
          }, {
            onConflict: 'user_id'
          });

        if (insertError) {
          console.error('[INSTAGRAM-WEBHOOK] Error storing connection:', insertError);
          throw insertError;
        }

        console.log('[INSTAGRAM-WEBHOOK] ✅ Instagram connected successfully:', userData.username);

        return new Response(
          `<html><body><script>
            window.opener.postMessage({ 
              success: true, 
              accountName: '${userData.username || 'Instagram Business'}',
              message: 'Instagram connecté avec succès!'
            }, '*');
            window.close();
          </script></body></html>`,
          { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
        );
      }

      return new Response('Invalid request', { status: 400 });
    }

    // Handle webhook events (POST request)
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('[INSTAGRAM-WEBHOOK] Received webhook event:', JSON.stringify(body));
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method not allowed', { status: 405 });

  } catch (error: any) {
    console.error('[INSTAGRAM-WEBHOOK] Error:', error);
    return new Response(
      `<html><body><script>
        window.opener.postMessage({ error: '${error.message}' }, '*');
        window.close();
      </script></body></html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );
  }
});