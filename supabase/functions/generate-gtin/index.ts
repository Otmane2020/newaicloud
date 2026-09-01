import "../_shared/strict-ai-generation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isValidGTIN(value: string): boolean {
  const gtin = String(value || "").replace(/[\s-]/g, "");
  if (![8, 12, 13, 14].includes(gtin.length) || !/^\d+$/.test(gtin)) return false;
  const digits = gtin.split("").map(Number);
  const checkDigit = digits.pop()!;
  let sum = 0;
  for (let i = digits.length - 1, position = 1; i >= 0; i--, position++) {
    sum += digits[i] * (position % 2 === 1 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === checkDigit;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true, safeGtinMode: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!url || !serviceKey) throw new Error("Missing Supabase server credentials");
    const supabase = createClient(url, serviceKey);

    const { data: auth } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!auth?.user) {
      return new Response(JSON.stringify({ success: false, error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productIds = Array.isArray(body.productIds) ? body.productIds : [];
    if (!productIds.length) {
      return new Response(JSON.stringify({ success: false, error: "productIds array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    for (const productId of productIds) {
      const { data: product, error } = await supabase
        .from("shopify_products")
        .select("id,title,google_gtin")
        .eq("id", productId)
        .maybeSingle();

      if (error || !product) {
        results.push({ productId, status: "error", valid: false, error: "Product not found" });
        continue;
      }

      if (product.google_gtin && isValidGTIN(product.google_gtin)) {
        results.push({
          productId,
          gtin: product.google_gtin,
          status: "existing",
          valid: true,
          identifier_exists: true,
        });
        continue;
      }

      // A checksum-valid number is not a legitimate GTIN unless it has been
      // assigned by GS1 / the manufacturer. Never fabricate one.
      results.push({
        productId,
        gtin: null,
        status: "missing",
        valid: false,
        identifier_exists: false,
        needs_supplier_identifier: true,
        message: "No valid assigned GTIN is stored. Supply the manufacturer/GS1 identifier or use identifier_exists=false where the channel permits it.",
      });
    }

    return new Response(JSON.stringify({
      success: true,
      safeGtinMode: true,
      summary: {
        total: results.length,
        existing: results.filter((item) => item.status === "existing").length,
        missing: results.filter((item) => item.status === "missing").length,
        errors: results.filter((item) => item.status === "error").length,
      },
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-gtin failed", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
