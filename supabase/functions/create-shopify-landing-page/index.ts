import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    // Get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    // Get campaign data
    console.log("Fetching campaign:", campaignId);
    const { data: campaign, error: campaignError } = await supabase
      .from("ads_campaigns")
      .select("*, landing_page_html, landing_page_url")
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .single();
    
    if (campaignError) {
      console.error("Campaign fetch error:", campaignError);
      throw campaignError;
    }
    
    console.log("Campaign found:", campaign.name);
    console.log("Landing page HTML present:", !!campaign.landing_page_html);
    console.log("Landing page HTML length:", campaign.landing_page_html?.length || 0);
    
    if (!campaign.landing_page_html) {
      console.error("No landing_page_html found for campaign:", campaignId);
      throw new Error("Landing page HTML not generated yet. Please wait a few seconds and try again.");
    }

    // Get active Shopify connection
    const { data: connection, error: connectionError } = await supabase
      .from("shopify_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();
    
    if (connectionError) throw new Error("No active Shopify connection found");

    // Decrypt API token
    const { data: decryptData, error: decryptError } = await supabase.functions.invoke(
      "encrypt-shopify-token",
      {
        body: { 
          encryptedToken: connection.encrypted_api_token,
          action: "decrypt"
        }
      }
    );

    if (decryptError || !decryptData?.token) {
      throw new Error("Failed to decrypt Shopify token");
    }

    const accessToken = decryptData.token;
    const shopDomain = connection.shop_domain;

    // Create page in Shopify
    const pageTitle = `${campaign.name} - Landing Page`;
    const pageHandle = `landing-${campaign.id.substring(0, 8)}`;
    
    // Wrap the React component HTML in a simple container
    const bodyHtml = `
      <div id="landing-page-root">
        ${campaign.landing_page_html}
      </div>
      <script>
        // Add any necessary JavaScript for interactivity
        console.log('Landing page loaded');
      </script>
    `;

    const shopifyPageData = {
      page: {
        title: pageTitle,
        body_html: bodyHtml,
        handle: pageHandle,
        published: true,
        metafields: [
          {
            namespace: "custom",
            key: "campaign_id",
            value: campaignId,
            type: "single_line_text_field"
          }
        ]
      }
    };

    console.log("Creating Shopify page:", pageHandle);

    const shopifyResponse = await fetch(
      `https://${shopDomain}/admin/api/2025-01/pages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify(shopifyPageData),
      }
    );

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error("Shopify API error:", shopifyResponse.status, errorText);
      throw new Error(`Shopify API error: ${shopifyResponse.status} - ${errorText}`);
    }

    const result = await shopifyResponse.json();
    const shopifyPageUrl = `https://${shopDomain}/pages/${pageHandle}`;
    
    // Update campaign with Shopify page URL
    const { error: updateError } = await supabase
      .from("ads_campaigns")
      .update({ 
        shopify_page_url: shopifyPageUrl,
        shopify_page_id: result.page.id.toString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", campaignId);
    
    if (updateError) {
      console.error("Failed to update campaign with Shopify page URL:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        shopifyPageUrl,
        shopifyPageId: result.page.id,
        message: "Page Shopify créée avec succès"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error creating Shopify landing page:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
