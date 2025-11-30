import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // -------------------------
    // AUTH
    // -------------------------
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user;

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -------------------------
    // LOAD PROFILE
    // -------------------------
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "google_ads_oauth_token, google_ads_refresh_token, google_ads_customer_id, google_ads_token_expires_at, google_oauth_token, google_refresh_token, google_token_expires_at",
      )
      .eq("id", user.id)
      .single();

    if (!profile?.google_ads_customer_id) {
      return new Response(
        JSON.stringify({
          error: "Google Ads not connected",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let accessToken = profile.google_ads_oauth_token || profile.google_oauth_token;
    const refreshToken = profile.google_ads_refresh_token || profile.google_refresh_token;
    const tokenExpiresAt = profile.google_ads_token_expires_at || profile.google_token_expires_at;

    // -------------------------
    // REFRESH TOKEN IF NEEDED
    // -------------------------
    if (tokenExpiresAt) {
      const exp = new Date(tokenExpiresAt);
      if (exp <= new Date() && refreshToken) {
        const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
        const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

        const r = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        });

        const newTok = await r.json();
        if (newTok.access_token) {
          accessToken = newTok.access_token;

          const expiresAt = new Date(Date.now() + (newTok.expires_in || 3600) * 1000).toISOString();

          await supabase
            .from("profiles")
            .update({
              google_ads_oauth_token: accessToken,
              google_ads_token_expires_at: expiresAt,
            })
            .eq("id", user.id);
        }
      }
    }

    // -------------------------
    // GOOGLE ADS QUERY
    // -------------------------
    const developerToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN")!;
    const customerId = profile.google_ads_customer_id.replace(/-/g, "");

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const f = (d: Date) => d.toISOString().split("T")[0].replace(/-/g, "");

    const query = `
      SELECT
        search_term_view.search_term,
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        metrics.average_cpc_micros,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_from_interactions_rate,
        metrics.conversions_value,
        segments.date,
        search_term_view.status
      FROM search_term_view
      WHERE segments.date BETWEEN '${f(startDate)}' AND '${f(endDate)}'
      ORDER BY metrics.impressions DESC
      LIMIT 500
    `;

    const finalUrl = `https://googleads.googleapis.com/v17/customers/${customerId}:searchStream`;
    console.log('[import-google-ads-search-terms] FINAL URL:', finalUrl);

    const googleAdsResponse = await fetch(finalUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": developerToken,
          "login-customer-id": customerId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      },
    );

    if (!googleAdsResponse.ok) {
      const errorText = await googleAdsResponse.text();
      console.error(errorText);
      return new Response(JSON.stringify({ error: "Google Ads API error", details: errorText }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // -------------------------
    // FIX: STREAMING PARSE
    // -------------------------
    const reader = googleAdsResponse.body?.getReader();
    const decoder = new TextDecoder();

    const searchTerms: any[] = [];
    let buffer = "";

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);

        if (!line) continue;

        const batch = JSON.parse(line);

        if (!batch.results) continue;

        for (const r of batch.results) {
          searchTerms.push({
            user_id: user.id,

            search_term: r.searchTermView?.searchTerm || "",
            match_type: r.searchTermView?.status || "UNKNOWN",

            campaign_id: r.campaign?.id || "",
            campaign_name: r.campaign?.name || "",

            adgroup_id: r.adGroup?.id || "",
            adgroup_name: r.adGroup?.name || "",

            clicks: r.metrics?.clicks || 0,
            impressions: r.metrics?.impressions || 0,
            ctr: r.metrics?.ctr || 0,

            avg_cpc: (r.metrics?.averageCpcMicros || 0) / 1_000_000,
            cost_micros: r.metrics?.costMicros || 0,

            conversions: r.metrics?.conversions || 0,
            conversion_rate: r.metrics?.conversionsFromInteractionsRate || 0,
            conversion_value: r.metrics?.conversionsValue || 0,

            date: r.segments?.date,
          });
        }
      }
    }

    // -------------------------
    // UPSERT DB
    // -------------------------
    if (searchTerms.length > 0) {
      const { error } = await supabase.from("google_ads_search_terms").upsert(searchTerms, {
        onConflict: "user_id,search_term,date",
      });

      if (error) console.error("DB error:", error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: searchTerms.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    console.error(err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
