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
      throw new Error("User not authenticated");
    }

    // Get all user's Shopify connections
    const { data: connections, error: connectionsError } = await supabase
      .from('shopify_connections')
      .select('id, store_url, access_token')
      .eq('user_id', user.id);

    if (connectionsError) {
      throw new Error(`Failed to fetch connections: ${connectionsError.message}`);
    }

    if (!connections || connections.length === 0) {
      console.log('No Shopify connections found for user');
      return new Response(
        JSON.stringify({ success: true, message: 'No Shopify connections found', updated: 0, connections: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    let updatedCount = 0;

    // For each connection, fetch the primary domain from Shopify
    for (const connection of connections) {
      try {
        // Extract shop name from store_url
        const shopName = connection.store_url.replace('.myshopify.com', '');
        
        // Fetch shop info from Shopify API
        const shopifyResponse = await fetch(
          `https://${shopName}.myshopify.com/admin/api/2024-01/shop.json`,
          {
            headers: {
              'X-Shopify-Access-Token': connection.access_token,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!shopifyResponse.ok) {
          console.error(`Failed to fetch shop info for ${connection.store_url}:`, shopifyResponse.status);
          continue;
        }

        const shopData = await shopifyResponse.json();
        const primaryDomain = shopData.shop?.domain || shopData.shop?.primary_domain?.host;

        if (primaryDomain) {
          // Update the public_domain field
          const { error: updateError } = await supabase
            .from('shopify_connections')
            .update({ public_domain: primaryDomain })
            .eq('id', connection.id);

          if (!updateError) {
            console.log(`✅ Updated public_domain for ${connection.store_url}: ${primaryDomain}`);
            updatedCount++;
          } else {
            console.error(`Failed to update public_domain for ${connection.id}:`, updateError);
          }
        } else {
          console.warn(`No primary domain found for ${connection.store_url}`);
        }
      } catch (error) {
        console.error(`Error processing connection ${connection.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${updatedCount} of ${connections.length} connections`,
        updated: updatedCount,
        total: connections.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in refresh-shopify-domains:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});