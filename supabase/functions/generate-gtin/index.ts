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

// Calculate GTIN checksum using the correct GS1 algorithm
function calculateGTIN13Checksum(partialGtin: string): string {
  if (partialGtin.length !== 12) {
    throw new Error("Partial GTIN must be 12 digits for GTIN-13");
  }

  const digits = partialGtin.split("").map(Number);
  let sum = 0;

  // For GTIN-13: Multiply by 1 for odd positions, by 3 for even positions (counting from left)
  for (let i = 0; i < digits.length; i++) {
    const multiplier = i % 2 === 0 ? 1 : 3; // Odd positions (1st, 3rd, etc.) get 1, even get 3
    sum += digits[i] * multiplier;
  }

  const checksum = (10 - (sum % 10)) % 10;
  return checksum.toString();
}

// Validate existing GTIN
function isValidGTIN(gtin: string): boolean {
  if (!gtin || gtin.length < 8 || gtin.length > 14) return false;

  const cleanGtin = gtin.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(cleanGtin)) return false;

  // Pad to 14 digits for calculation
  const paddedGtin = cleanGtin.padStart(14, "0");
  const digits = paddedGtin.split("").map(Number);
  const checkDigit = digits.pop()!;

  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const multiplier = i % 2 === 0 ? 3 : 1; // For GTIN: even positions (from left) get 3, odd get 1
    sum += digits[i] * multiplier;
  }

  const calculatedCheck = (10 - (sum % 10)) % 10;
  return calculatedCheck === checkDigit;
}

// Generate proper GTIN-13 based on country code and product ID
function generateGTIN13(countryCode: string, productId: string, index: number = 0): string {
  // GS1 Country Prefixes (first 2-3 digits)
  const countryPrefixes: { [key: string]: string } = {
    FR: "300", // France (300-379)
    US: "000", // USA & Canada (000-139)
    GB: "500", // UK (500-509)
    DE: "400", // Germany (400-440)
    ES: "840", // Spain (840-849)
    IT: "800", // Italy (800-839)
    NL: "870", // Netherlands (870-879)
    BE: "540", // Belgium (540-549)
    CH: "760", // Switzerland (760-769)
    CA: "000", // Canada shares with US
    AU: "930", // Australia
  };

  // Get prefix - default to France if not found
  let prefix = countryPrefixes[countryCode] || "300";

  // Ensure we have a 3-digit prefix for GTIN-13
  if (prefix.length === 2) {
    prefix = prefix + "0";
  }

  // Generate company/product portion (9 digits)
  // Use product ID hash + index to ensure uniqueness
  const hash = productId.split("").reduce((acc, char, idx) => {
    return acc + char.charCodeAt(0) * (idx + 1);
  }, 0);

  // Create a unique 9-digit number combining hash and index
  const baseNumber = (hash + index * 1000) % 1000000000;
  const companyProductPart = baseNumber.toString().padStart(9, "0");

  // Combine prefix and company/product part (12 digits total)
  const partialGtin = prefix + companyProductPart;

  if (partialGtin.length !== 12) {
    throw new Error(`Generated partial GTIN must be 12 digits, got ${partialGtin.length}`);
  }

  // Calculate checksum
  const checksum = calculateGTIN13Checksum(partialGtin);

  return partialGtin + checksum;
}

// Alternative: Generate GTIN-8 for smaller products
function generateGTIN8(productId: string, index: number = 0): string {
  const hash = productId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseNumber = (hash + index * 100) % 10000000;
  const partialGtin = baseNumber.toString().padStart(7, "0");

  // Calculate GTIN-8 checksum (same algorithm but different length)
  const digits = partialGtin.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const multiplier = i % 2 === 0 ? 3 : 1;
    sum += digits[i] * multiplier;
  }
  const checksum = (10 - (sum % 10)) % 10;

  return partialGtin + checksum.toString();
}

// Main GTIN generation function
function generateGTIN(
  countryCode: string,
  productId: string,
  index: number = 0,
  type: "gtin-13" | "gtin-8" = "gtin-13",
): string {
  if (type === "gtin-8") {
    return generateGTIN8(productId, index);
  } else {
    return generateGTIN13(countryCode, productId, index);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = getSupabaseClient(authHeader);

    const { productIds, countryCode = "FR", gtinType = "gtin-13" } = await req.json();

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return new Response(JSON.stringify({ error: "productIds array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];
    const usedGtins = new Set<string>();

    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];

      try {
        // Check if GTIN already exists and is valid
        const { data: product } = await supabase
          .from("shopify_products")
          .select("google_gtin, title")
          .eq("id", productId)
          .single();

        if (product?.google_gtin && isValidGTIN(product.google_gtin)) {
          results.push({
            productId,
            gtin: product.google_gtin,
            status: "existing",
            valid: true,
          });
          usedGtins.add(product.google_gtin);
          continue;
        }

        // If existing GTIN is invalid, generate new one
        let attempts = 0;
        let newGtin: string = '';
        let isUnique = false;

        while (attempts < 10 && !isUnique) {
          newGtin = generateGTIN(countryCode, productId, i + attempts, gtinType as any);

          // Check if this GTIN is already used in this batch
          if (!usedGtins.has(newGtin)) {
            // Check if GTIN exists in database
            const { data: existingProduct } = await supabase
              .from("shopify_products")
              .select("id")
              .eq("google_gtin", newGtin)
              .single();

            if (!existingProduct) {
              isUnique = true;
              usedGtins.add(newGtin);
            }
          }
          attempts++;
        }

        if (!isUnique || !newGtin) {
          throw new Error("Could not generate unique GTIN after 10 attempts");
        }

        // Validate the generated GTIN before saving
        if (!isValidGTIN(newGtin)) {
          throw new Error("Generated invalid GTIN: " + newGtin);
        }

        // Update product with generated GTIN
        const { error: updateError } = await supabase
          .from("shopify_products")
          .update({
            google_gtin: newGtin,
            updated_at: new Date().toISOString(),
          })
          .eq("id", productId);

        if (updateError) throw updateError;

        results.push({
          productId,
          gtin: newGtin!,
          status: "generated",
          valid: true,
          type: gtinType,
        });
      } catch (error) {
        console.error(`Error generating GTIN for product ${productId}:`, error);
        results.push({
          productId,
          error: error instanceof Error ? error.message : "Unknown error",
          status: "error",
          valid: false,
        });
      }
    }

    // Generate summary
    const summary = {
      total: results.length,
      generated: results.filter((r) => r.status === "generated").length,
      existing: results.filter((r) => r.status === "existing").length,
      errors: results.filter((r) => r.status === "error").length,
      countryCode,
      gtinType,
    };

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in generate-gtin:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
