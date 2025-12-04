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
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://newai.sale';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle OAuth callback (GET request)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state'); // Contains user_id and isAdmin flag
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      console.log('[GSC-OAUTH] Callback received:', { code: !!code, state, error });

      if (error) {
        console.error('[GSC-OAUTH] Error:', error, errorDescription);
        const redirectUrl = `${frontendUrl}/superadmin?tab=gsc&error=${encodeURIComponent(`${error}: ${errorDescription}`)}`;
        return Response.redirect(redirectUrl, 302);
      }

      if (!code || !state) {
        throw new Error('Missing code or state parameter');
      }

      // Parse state to get userId and isAdmin
      let userId: string;
      let isAdmin = false;
      try {
        const stateData = JSON.parse(decodeURIComponent(state));
        userId = stateData.userId;
        isAdmin = stateData.isAdmin || false;
      } catch {
        userId = state; // Fallback if state is just userId
      }

      const redirectUri = `${supabaseUrl}/functions/v1/google-gsc-oauth`;

      // Exchange code for tokens
      console.log('[GSC-OAUTH] Exchanging code for tokens...');
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();
      console.log('[GSC-OAUTH] Token response:', { success: !!tokenData.access_token });

      if (!tokenData.access_token) {
        throw new Error('Failed to get access token: ' + JSON.stringify(tokenData));
      }

      // Store tokens in profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          google_access_token: tokenData.access_token,
          google_refresh_token: tokenData.refresh_token || null,
          google_token_expires_at: tokenData.expires_in 
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() 
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('[GSC-OAUTH] Error storing tokens:', updateError);
        throw updateError;
      }

      console.log('[GSC-OAUTH] Tokens stored for user:', userId);

      // Fetch and store GSC domains
      try {
        const sitesResponse = await fetch(
          'https://www.googleapis.com/webmasters/v3/sites',
          {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          }
        );
        const sitesData = await sitesResponse.json();
        console.log('[GSC-OAUTH] Sites response:', sitesData);

        if (sitesData.siteEntry && sitesData.siteEntry.length > 0) {
          // Insert domains
          for (const site of sitesData.siteEntry) {
            const domain = site.siteUrl.replace('sc-domain:', '').replace('https://', '').replace('http://', '').replace(/\/$/, '');
            
            const { error: domainError } = await supabase
              .from('google_search_console_domains')
              .upsert({
                user_id: userId,
                domain: domain,
                verified: site.permissionLevel !== 'siteUnverified',
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id,domain'
              });

            if (domainError) {
              console.error('[GSC-OAUTH] Error storing domain:', domain, domainError);
            } else {
              console.log('[GSC-OAUTH] Domain stored:', domain);
            }
          }
        }
      } catch (siteError) {
        console.error('[GSC-OAUTH] Error fetching sites:', siteError);
        // Don't fail the whole flow
      }

      // Redirect back to SuperAdmin GSC tab
      const redirectTo = isAdmin 
        ? `${frontendUrl}/superadmin?tab=gsc&success=true&message=${encodeURIComponent('Google Search Console connecté avec succès!')}`
        : `${frontendUrl}/dashboard?success=true`;

      console.log('[GSC-OAUTH] Redirecting to:', redirectTo);
      return Response.redirect(redirectTo, 302);
    }

    // Handle POST request - Generate OAuth URL
    if (req.method === 'POST') {
      const body = await req.json();
      const { action, isAdmin } = body;

      if (action === 'connect') {
        // Get user from auth header
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: { Authorization: req.headers.get('Authorization')! },
          },
        });

        const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

        if (userError || !user) {
          throw new Error('Unauthorized');
        }

        const redirectUri = `${supabaseUrl}/functions/v1/google-gsc-oauth`;
        const state = encodeURIComponent(JSON.stringify({ userId: user.id, isAdmin: isAdmin || false }));
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${googleClientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent('https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/indexing')}&` +
          `access_type=offline&` +
          `prompt=consent&` +
          `state=${state}`;

        console.log('[GSC-OAUTH] Generated auth URL for user:', user.id);

        return new Response(
          JSON.stringify({ authUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error('Invalid action');
    }

    throw new Error('Invalid request method');

  } catch (error: any) {
    console.error('[GSC-OAUTH] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
