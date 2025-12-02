import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { action, code, state } = await req.json();

    if (action === 'connect') {
      // Generate Instagram OAuth URL
      const appId = Deno.env.get('FACEBOOK_APP_ID'); // Instagram uses Facebook's OAuth
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-oauth`;
      
      const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${redirectUri}&scope=user_profile,user_media&response_type=code&state=${user.id}`;
      
      console.log('Generated Instagram auth URL for user:', user.id);
      
      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'callback' && code) {
      // Exchange code for access token
      const appId = Deno.env.get('FACEBOOK_APP_ID');
      const appSecret = Deno.env.get('FACEBOOK_APP_SECRET');
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-oauth`;

      const tokenResponse = await fetch(
        `https://api.instagram.com/oauth/access_token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: appId!,
            client_secret: appSecret!,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code: code,
          }),
        }
      );

      const tokenData = await tokenResponse.json();
      console.log('Instagram token exchange response:', tokenData);

      if (tokenData.access_token) {
        // Get Instagram account info
        const accountResponse = await fetch(
          `https://graph.instagram.com/me?fields=id,username&access_token=${tokenData.access_token}`
        );
        const accountData = await accountResponse.json();
        console.log('Instagram account data:', accountData);

        // Store connection in database
        const { error: insertError } = await supabaseClient
          .from('instagram_account_connections')
          .upsert({
            user_id: state, // state contains user_id
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

        console.log('Instagram account connected successfully for user:', state);

        return new Response(
          JSON.stringify({ success: true, account: accountData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error('Failed to get Instagram access token');
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('Error in instagram-oauth:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
