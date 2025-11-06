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
    const { merchantAccountId } = await req.json();

    if (!merchantAccountId) {
      return new Response(
        JSON.stringify({ error: "merchantAccountId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Get Google Merchant token
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("google_merchant_oauth_token, google_merchant_refresh_token, google_merchant_token_expires_at")
      .eq("id", user.id)
      .single();

    if (!profile?.google_merchant_oauth_token) {
      throw new Error("Not connected to Google Merchant Center");
    }

    // Check if token needs refresh
    let accessToken = profile.google_merchant_oauth_token;
    if (profile.google_merchant_token_expires_at) {
      const expiresAt = new Date(profile.google_merchant_token_expires_at);
      if (expiresAt < new Date()) {
        console.log("Token expired, refreshing...");
        accessToken = await refreshToken(profile.google_merchant_refresh_token, supabaseClient, user.id);
      }
    }

    // Get feed URL from project
    const feedUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/shopping-feed?format=xml`;

    console.log("Creating datafeed in Google Merchant Center:", { merchantAccountId, feedUrl });

    // Create datafeed in Google Merchant Center
    const datafeedResponse = await fetch(
      `https://shoppingcontent.googleapis.com/content/v2.1/${merchantAccountId}/datafeeds`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Lovable Product Feed",
          contentType: "products",
          attributeLanguage: "fr",
          targetCountry: "FR",
          fetchSchedule: {
            timeZone: "Europe/Paris",
            hour: 6,
            weekday: "monday",
          },
          format: {
            fileEncoding: "utf-8",
            quotingMode: "value quoting",
          },
          fileName: feedUrl,
        }),
      }
    );

    if (!datafeedResponse.ok) {
      const errorText = await datafeedResponse.text();
      console.error("Datafeed creation failed:", datafeedResponse.status, errorText);
      throw new Error(`Failed to create datafeed: ${errorText}`);
    }

    const datafeed = await datafeedResponse.json();
    console.log("✅ Datafeed created:", datafeed.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        datafeedId: datafeed.id,
        message: "Flux créé avec succès dans Google Merchant Center"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-google-merchant-feed:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function refreshToken(refreshToken: string, supabaseClient: any, userId: string): Promise<string> {
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const tokens = await response.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabaseClient
    .from("profiles")
    .update({
      google_merchant_oauth_token: tokens.access_token,
      google_merchant_token_expires_at: expiresAt,
    })
    .eq("id", userId);

  return tokens.access_token;
}
