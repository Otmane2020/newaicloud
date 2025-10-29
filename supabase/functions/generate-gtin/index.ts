import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getSupabaseClient(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials");
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

// Calculate GTIN checksum (Luhn algorithm for GTIN-13)
function calculateGTINChecksum(partialGtin: string): string {
  const digits = partialGtin.split('').map(Number);
  let sum = 0;
  
  for (let i = 0; i < digits.length; i++) {
    const digit = digits[i];
    // Multiply odd positions (from right) by 3
    const multiplier = (digits.length - i) % 2 === 0 ? 3 : 1;
    sum += digit * multiplier;
  }
  
  const checksum = (10 - (sum % 10)) % 10;
  return checksum.toString();
}

// Generate GTIN based on country code
function generateGTIN(countryCode: string, productId: string): string {
  // GS1 prefix by country
  const countryPrefixes: { [key: string]: string } = {
    'FR': '30', // France
    'US': '00', // USA
    'GB': '50', // UK
    'DE': '40', // Germany
    'ES': '84', // Spain
    'IT': '80', // Italy
    'NL': '87', // Netherlands
    'BE': '54', // Belgium
    'CH': '76', // Switzerland
  };
  
  const prefix = countryPrefixes[countryCode] || '30'; // Default to France
  
  // Generate a unique number based on product ID hash
  const hash = productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const uniqueNumber = (hash % 9999999999).toString().padStart(10, '0');
  
  // GTIN-13 format: [Country Prefix (2-3 digits)][Company Prefix (variable)][Product Code][Checksum]
  const partialGtin = prefix + uniqueNumber;
  const checksum = calculateGTINChecksum(partialGtin);
  
  return partialGtin + checksum;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = getSupabaseClient(authHeader);
    
    const { productIds, countryCode = 'FR' } = await req.json();
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "productIds array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];
    
    for (const productId of productIds) {
      try {
        // Check if GTIN already exists
        const { data: product } = await supabase
          .from('shopify_products')
          .select('google_gtin')
          .eq('id', productId)
          .single();
        
        if (product?.google_gtin) {
          results.push({ productId, gtin: product.google_gtin, status: 'existing' });
          continue;
        }
        
        // Generate new GTIN
        const gtin = generateGTIN(countryCode, productId);
        
        // Update product with generated GTIN
        const { error: updateError } = await supabase
          .from('shopify_products')
          .update({ google_gtin: gtin })
          .eq('id', productId);
        
        if (updateError) throw updateError;
        
        results.push({ productId, gtin, status: 'generated' });
      } catch (error) {
        console.error(`Error generating GTIN for product ${productId}:`, error);
        results.push({ 
          productId, 
          error: error instanceof Error ? error.message : 'Unknown error', 
          status: 'error' 
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-gtin:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
