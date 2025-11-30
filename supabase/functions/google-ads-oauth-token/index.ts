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
    console.log("[google-ads-oauth-token] Function invoked");
    const { code, redirectUri } = await req.json();
    console.log("[google-ads-oauth-token] Received code and redirectUri:", redirectUri);

    if (!code || !redirectUri) {
      throw new Error("Code and redirectUri are required");
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error("[google-ads-oauth-token] Missing credentials - clientId:", !!clientId, "clientSecret:", !!clientSecret);
      throw new Error("Google OAuth credentials not configured");
    }

    // Exchange code for tokens
    console.log("[google-ads-oauth-token] Exchanging code for tokens...");
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenText = await tokenResponse.text();
    console.log("[google-ads-oauth-token] Token response status:", tokenResponse.status);
    
    if (!tokenResponse.ok) {
      console.error('[google-ads-oauth-token] Token exchange error:', tokenText);
      throw new Error(`Failed to exchange authorization code: ${tokenText}`);
    }

    const tokenData = JSON.parse(tokenText);
    const { access_token, refresh_token, expires_in } = tokenData;
    console.log("[google-ads-oauth-token] Got tokens - access_token:", !!access_token, "refresh_token:", !!refresh_token);

    // Try to get user info (optional - continue even if this fails)
    let userEmail: string | null = null;
    try {
      console.log("[google-ads-oauth-token] Fetching user info...");
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        userEmail = userInfo.email;
        console.log("[google-ads-oauth-token] Got user email:", userEmail);
      } else {
        console.warn("[google-ads-oauth-token] Failed to fetch user info, continuing without email");
      }
    } catch (userInfoError) {
      console.warn("[google-ads-oauth-token] Error fetching user info:", userInfoError);
      // Continue without email - it's not critical
    }

    // Get user from auth header
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
      console.error("[google-ads-oauth-token] User auth error:", userError);
      throw new Error("User not authenticated");
    }

    console.log("[google-ads-oauth-token] User authenticated:", user.id);

    // Calculate token expiry
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (expires_in || 3600));

    // Update profile with tokens
    const updateData: Record<string, unknown> = {
      google_ads_oauth_token: access_token,
      google_ads_refresh_token: refresh_token,
      google_ads_token_expires_at: expiresAt.toISOString(),
    };
    
    if (userEmail) {
      updateData.google_ads_email = userEmail;
    }

    console.log("[google-ads-oauth-token] Updating profile for user:", user.id);
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('[google-ads-oauth-token] Error updating profile:', updateError);
      throw updateError;
    }

    console.log("[google-ads-oauth-token] Profile updated successfully");
    return new Response(
      JSON.stringify({ success: true, email: userEmail }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[google-ads-oauth-token] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
