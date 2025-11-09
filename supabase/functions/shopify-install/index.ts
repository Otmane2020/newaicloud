import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Valide le HMAC envoyé par Shopify lors de l'installation
 */
async function validateHmac(params: Record<string, string>, secret: string): Promise<boolean> {
  const { hmac, ...rest } = params;
  
  if (!hmac) {
    console.error('[HMAC] No HMAC provided');
    return false;
  }

  // Créer la chaîne de requête sans le HMAC
  const sortedParams = Object.keys(rest)
    .sort()
    .map(key => `${key}=${rest[key]}`)
    .join('&');

  console.log('[HMAC] Params to verify:', sortedParams);

  // Calculer le HMAC avec Web Crypto API
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(sortedParams);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hash = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const isValid = hash === hmac;
  console.log('[HMAC] Validation result:', isValid);
  
  return isValid;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SHOPIFY-INSTALL] Request received');

    const { hmac, host, shop, timestamp, allParams } = await req.json();

    console.log('[SHOPIFY-INSTALL] Parameters:', {
      hasHmac: !!hmac,
      hasHost: !!host,
      hasShop: !!shop,
      hasTimestamp: !!timestamp,
      shop,
    });

    if (!shop || !hmac || !timestamp) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const apiSecret = Deno.env.get("SHOPIFY_API_SECRET");
    const apiKey = Deno.env.get("SHOPIFY_API_KEY");

    if (!apiSecret || !apiKey) {
      console.error('[SHOPIFY-INSTALL] Missing API credentials');
      return new Response(
        JSON.stringify({ error: "Configuration error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Valider le HMAC
    const isValidHmac = await validateHmac(allParams, apiSecret);
    
    if (!isValidHmac) {
      console.error('[SHOPIFY-INSTALL] Invalid HMAC');
      return new Response(
        JSON.stringify({ error: "Invalid HMAC signature" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Vérifier que le timestamp n'est pas trop vieux (max 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp);
    
    if (now - requestTime > 300) {
      console.error('[SHOPIFY-INSTALL] Timestamp too old');
      return new Response(
        JSON.stringify({ error: "Request expired" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Rediriger vers la page d'installation qui lancera automatiquement l'OAuth
    const appUrl = "https://newai.sale";
    const installUrl = `${appUrl}/shopify/install?shop=${encodeURIComponent(shop)}`;

    console.log('[SHOPIFY-INSTALL] Redirecting to install page:', installUrl);

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": installUrl,
      },
    });
  } catch (error) {
    console.error("[SHOPIFY-INSTALL] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
