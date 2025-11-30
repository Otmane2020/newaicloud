import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeUrl, accessToken } = await req.json();

    if (!storeUrl || !accessToken) {
      throw new Error("Missing required parameters: storeUrl and accessToken");
    }

    // Validate credentials by calling Shopify API
    console.log(`[VALIDATE-SHOPIFY] Validating credentials for store: ${storeUrl}`);
    
    const shopInfoResponse = await fetch(`https://${storeUrl}/admin/api/2025-01/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!shopInfoResponse.ok) {
      const errorText = await shopInfoResponse.text();
      console.error(`[VALIDATE-SHOPIFY] Validation failed: ${shopInfoResponse.status} - ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid credentials",
          statusCode: shopInfoResponse.status 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const shopInfo = await shopInfoResponse.json();
    console.log(`[VALIDATE-SHOPIFY] Credentials valid for shop: ${shopInfo.shop?.name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        shop: shopInfo.shop 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[VALIDATE-SHOPIFY] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
