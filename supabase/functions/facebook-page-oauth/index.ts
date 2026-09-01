import "../_shared/strict-ai-generation.ts";
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
      const stateParam = url.searchParams.get('state'); // Contains userId and isAdmin flag
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      console.log('Facebook OAuth callback received:', { code: !!code, state: stateParam, error });

      // Parse state to get userId and isAdmin
      let userId: string;
      let isAdmin = false;
      try {
        const stateData = JSON.parse(decodeURIComponent(stateParam || ''));
        userId = stateData.userId;
        isAdmin = stateData.isAdmin || false;
      } catch {
        userId = stateParam || ''; // Fallback if state is just userId
      }

      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://newai.sale';
      const redirectBase = isAdmin ? '/superadmin?tab=social-media' : '/social-media';

      if (error) {
        console.error('Facebook OAuth error:', error, errorDescription);
        const redirectUrl = `${frontendUrl}${redirectBase}&error=${encodeURIComponent(`${error}: ${errorDescription}`)}`;
        return Response.redirect(redirectUrl, 302);
      }

      if (!code || !userId) {
        throw new Error('Missing code or state parameter');
      }

      // Replace state variable usage with userId
      const state = userId;

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

      // Get ALL user's Facebook pages with pagination
      console.log('Fetching user pages...');
      let allPages: any[] = [];
      let nextUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}&limit=100`;
      let hasMore = true;
      
      while (hasMore) {
        const pagesResponse: Response = await fetch(nextUrl);
        const pagesData: { data?: any[], paging?: { next?: string } } = await pagesResponse.json();
        console.log('Pages batch response:', { pageCount: pagesData.data?.length, hasNext: !!pagesData.paging?.next });
        
        if (pagesData.data && pagesData.data.length > 0) {
          allPages = [...allPages, ...pagesData.data];
        }
        
        if (pagesData.paging?.next) {
          nextUrl = pagesData.paging.next;
        } else {
          hasMore = false;
        }
      }

      console.log('Total pages fetched:', allPages.length);

      if (allPages.length === 0) {
        const redirectUrl = `${frontendUrl}${redirectBase}&error=${encodeURIComponent('Aucune page Facebook trouvée. Veuillez créer une page Facebook.')}`;
        return Response.redirect(redirectUrl, 302);
      }

      // If multiple pages, store in database and redirect with session_id
      if (allPages.length > 1) {
        const pages = allPages.map((p: any) => ({
          id: p.id,
          name: p.name,
          token: p.access_token
        }));

        // Generate a unique session ID
        const sessionId = crypto.randomUUID();

        // Store pages in the temporary table
        const { error: insertError } = await supabase
          .from('oauth_pending_pages')
          .insert({
            session_id: sessionId,
            user_id: state,
            pages_data: pages,
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
          });

        if (insertError) {
          console.error('Error storing pending pages:', insertError);
          throw new Error('Failed to store pages data');
        }

        console.log('Stored', pages.length, 'pages with session_id:', sessionId);

        // Redirect with just the session ID (short URL)
        const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://newai.sale';
        const redirectUrl = `${frontendUrl}/social-callback?session=${sessionId}`;

        console.log('Multiple pages detected, redirecting to:', redirectUrl);

        return Response.redirect(redirectUrl, 302);
      }

      // Single page - proceed with connection directly
      const page = allPages[0];
        
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
              onConflict: 'user_id,account_id'
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

      // Redirect with success message (use admin redirect if applicable)
      const successMessage = instagramAccountName 
        ? `Facebook (${page.name}) et Instagram (${instagramAccountName}) connectés avec succès!`
        : `Facebook (${page.name}) connecté avec succès!`;

      const redirectUrl = `${frontendUrl}${redirectBase}&success=true&message=${encodeURIComponent(successMessage)}`;

      console.log('Single page connected, redirecting to:', redirectUrl);

      return Response.redirect(redirectUrl, 302);
    }

    // Handle initial OAuth request from frontend (POST)
    if (req.method === 'POST') {
      const body = await req.json();
      const { action } = body;

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Handle getting pending pages from session (no auth required - comes from callback page)
      if (action === 'get_pending_pages') {
        const { sessionId } = body;
        
        console.log('[FACEBOOK-OAUTH] get_pending_pages action received:', { sessionId });
        
        if (!sessionId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing sessionId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error: fetchError } = await supabase
          .from('oauth_pending_pages')
          .select('*')
          .eq('session_id', sessionId)
          .single();

        if (fetchError || !data) {
          console.error('[FACEBOOK-OAUTH] Error fetching pending pages:', fetchError);
          return new Response(
            JSON.stringify({ success: false, error: 'Session expirée ou invalide' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if session has expired
        if (new Date(data.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ success: false, error: 'Session expirée' }),
            { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('[FACEBOOK-OAUTH] Found', data.pages_data.length, 'pending pages for user:', data.user_id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            pages: data.pages_data,
            userId: data.user_id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle page selection from OAuth callback (no auth required - comes from popup)
      if (action === 'save_page') {
        const { userId, pageId, pageToken, pageName } = body;
        
        console.log('[FACEBOOK-OAUTH] save_page action received:', { userId, pageId, pageName, hasToken: !!pageToken });
        
        if (!userId || !pageId || !pageToken || !pageName) {
          console.error('[FACEBOOK-OAUTH] Missing required parameters:', { userId: !!userId, pageId: !!pageId, pageToken: !!pageToken, pageName: !!pageName });
          return new Response(
            JSON.stringify({ success: false, error: 'Paramètres manquants pour la sélection de page' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('[FACEBOOK-OAUTH] Storing page connection to database...');
        
        // Store the selected page connection
        const { data: insertData, error: insertError } = await supabase
          .from('facebook_page_connections')
          .upsert({
            user_id: userId,
            page_id: pageId,
            page_name: pageName,
            page_access_token: pageToken,
            auto_share_enabled: true,
          }, {
            onConflict: 'user_id,page_id'
          })
          .select();

        if (insertError) {
          console.error('[FACEBOOK-OAUTH] Error storing Facebook page connection:', insertError);
          return new Response(
            JSON.stringify({ success: false, error: `Erreur base de données: ${insertError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('[FACEBOOK-OAUTH] Page connection stored successfully:', insertData);

        // Fetch Instagram Business account linked to this page
        let instagramAccountName = null;
        try {
          console.log('[FACEBOOK-OAUTH] Fetching Instagram Business account for page:', pageId);
          const igResponse = await fetch(
            `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
          );
          const igData = await igResponse.json();
          console.log('[FACEBOOK-OAUTH] Instagram Business response:', igData);

          if (igData.instagram_business_account) {
            const igDetailsResponse = await fetch(
              `https://graph.facebook.com/v18.0/${igData.instagram_business_account.id}?fields=username,name&access_token=${pageToken}`
            );
            const igDetails = await igDetailsResponse.json();
            console.log('[FACEBOOK-OAUTH] Instagram details:', igDetails);
            
            instagramAccountName = igDetails.username || igDetails.name || 'Instagram Business';

            const { error: igError } = await supabase
              .from('instagram_account_connections')
              .upsert({
                user_id: userId,
                account_id: igData.instagram_business_account.id,
                account_name: instagramAccountName,
                access_token: pageToken,
                auto_share_enabled: true,
              }, {
                onConflict: 'user_id,account_id'
              });
            
            if (igError) {
              console.error('[FACEBOOK-OAUTH] Error storing Instagram:', igError);
            } else {
              console.log('[FACEBOOK-OAUTH] Instagram connected:', instagramAccountName);
            }
          } else {
            console.log('[FACEBOOK-OAUTH] No Instagram Business account linked to page:', pageName);
          }
        } catch (igError) {
          console.error('[FACEBOOK-OAUTH] Error fetching Instagram Business account:', igError);
        }

        const successMessage = instagramAccountName 
          ? `Facebook (${pageName}) et Instagram (${instagramAccountName}) connectés avec succès!`
          : `Facebook (${pageName}) connecté avec succès!`;

        return new Response(
          JSON.stringify({ 
            success: true, 
            pageName,
            instagramName: instagramAccountName,
            message: successMessage
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle cleanup of session after successful save
      if (action === 'cleanup_session') {
        const { sessionId } = body;
        
        if (sessionId) {
          await supabase
            .from('oauth_pending_pages')
            .delete()
            .eq('session_id', sessionId);
          console.log('[FACEBOOK-OAUTH] Cleaned up session:', sessionId);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle initial OAuth request (requires authentication)
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

      if (action === 'connect') {
        const { isAdmin } = body;
        const appId = Deno.env.get('FACEBOOK_APP_ID')!;
        const redirectUri = `${supabaseUrl}/functions/v1/facebook-page-oauth`;
        
        // Encode state with userId and isAdmin flag
        const stateData = JSON.stringify({ userId: user.id, isAdmin: isAdmin || false });
        const encodedState = encodeURIComponent(stateData);
        
        // Extended scope to include Instagram Business permissions
        const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
          `client_id=${appId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish&` +
          `response_type=code&` +
          `state=${encodedState}`;

        console.log('Generated Facebook auth URL for user:', user.id, 'isAdmin:', isAdmin);

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
