import "../_shared/strict-ai-generation.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHOPIFY_API_VERSION = "2026-07";
const METAFIELD_NAMESPACE = "catalogoptimize";

const METAFIELDS_SET_MUTATION = `
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

type AttributeOverride = Record<string, string | number | null | undefined>;

type ProductRow = {
  id: string;
  shopify_id: string | number | null;
  title: string | null;
  store_id: string | null;
  ai_color: string | null;
  ai_material: string | null;
  ai_shape: string | null;
  ai_texture: string | null;
  ai_pattern: string | null;
  ai_finish: string | null;
  ai_design_elements: string | null;
  ai_background_style: string | null;
  ai_lighting_type: string | null;
  ai_condition_notes: string | null;
  ai_craftsmanship_level: string | null;
  ai_presentation_quality: number | null;
  ai_vision_confidence: number | null;
  style: string | null;
  room: string | null;
  functionality: string | null;
  characteristics: string | null;
  category: string | null;
  sub_category: string | null;
  smart_length: number | null;
  smart_length_unit: string | null;
  smart_width: number | null;
  smart_width_unit: string | null;
  smart_height: number | null;
  smart_height_unit: string | null;
  smart_depth: number | null;
  smart_depth_unit: string | null;
  smart_diameter: number | null;
  smart_diameter_unit: string | null;
  smart_weight: number | null;
  smart_weight_unit: string | null;
  smart_seat_height: number | null;
  smart_seat_height_unit: string | null;
};

type StoreConnection = {
  id: string;
  store_url: string;
  access_token: string;
};

function cleanSingleLine(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[\r\n]+/g, " · ").replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function withUnit(value: unknown, unit: unknown): string | null {
  const cleanValue = cleanSingleLine(value);
  if (!cleanValue) return null;
  const cleanUnit = cleanSingleLine(unit);
  return cleanUnit ? `${cleanValue} ${cleanUnit}` : cleanValue;
}

function productGid(shopifyId: string | number): string {
  const value = String(shopifyId);
  return value.startsWith("gid://shopify/Product/") ? value : `gid://shopify/Product/${value}`;
}

function readValue(product: ProductRow, overrides: AttributeOverride, key: keyof ProductRow): unknown {
  return Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key as string] : product[key];
}

function buildMetafields(product: ProductRow, overrides: AttributeOverride) {
  if (!product.shopify_id) return [];
  const ownerId = productGid(product.shopify_id);

  const candidates: Array<{ key: string; value: string | null; type?: string }> = [
    { key: "color", value: cleanSingleLine(readValue(product, overrides, "ai_color")) },
    { key: "material", value: cleanSingleLine(readValue(product, overrides, "ai_material")) },
    { key: "shape", value: cleanSingleLine(readValue(product, overrides, "ai_shape")) },
    { key: "texture", value: cleanSingleLine(readValue(product, overrides, "ai_texture")) },
    { key: "pattern", value: cleanSingleLine(readValue(product, overrides, "ai_pattern")) },
    { key: "finish", value: cleanSingleLine(readValue(product, overrides, "ai_finish")) },
    { key: "design_elements", value: cleanSingleLine(readValue(product, overrides, "ai_design_elements")) },
    { key: "background_style", value: cleanSingleLine(readValue(product, overrides, "ai_background_style")) },
    { key: "lighting", value: cleanSingleLine(readValue(product, overrides, "ai_lighting_type")) },
    { key: "condition_notes", value: cleanSingleLine(readValue(product, overrides, "ai_condition_notes")) },
    { key: "craftsmanship", value: cleanSingleLine(readValue(product, overrides, "ai_craftsmanship_level")) },
    { key: "presentation_quality", value: cleanSingleLine(readValue(product, overrides, "ai_presentation_quality")) },
    { key: "vision_confidence", value: cleanSingleLine(readValue(product, overrides, "ai_vision_confidence")) },
    { key: "style", value: cleanSingleLine(readValue(product, overrides, "style")) },
    { key: "category", value: cleanSingleLine(readValue(product, overrides, "category")) },
    { key: "sub_category", value: cleanSingleLine(readValue(product, overrides, "sub_category")) },
    { key: "room", value: cleanSingleLine(readValue(product, overrides, "room")) },
    { key: "functionality", value: cleanSingleLine(readValue(product, overrides, "functionality")) },
    { key: "characteristics", value: cleanSingleLine(readValue(product, overrides, "characteristics")) },
    {
      key: "length",
      value: withUnit(readValue(product, overrides, "smart_length"), readValue(product, overrides, "smart_length_unit")),
    },
    {
      key: "width",
      value: withUnit(readValue(product, overrides, "smart_width"), readValue(product, overrides, "smart_width_unit")),
    },
    {
      key: "height",
      value: withUnit(readValue(product, overrides, "smart_height"), readValue(product, overrides, "smart_height_unit")),
    },
    {
      key: "depth",
      value: withUnit(readValue(product, overrides, "smart_depth"), readValue(product, overrides, "smart_depth_unit")),
    },
    {
      key: "diameter",
      value: withUnit(readValue(product, overrides, "smart_diameter"), readValue(product, overrides, "smart_diameter_unit")),
    },
    {
      key: "weight",
      value: withUnit(readValue(product, overrides, "smart_weight"), readValue(product, overrides, "smart_weight_unit")),
    },
    {
      key: "seat_height",
      value: withUnit(readValue(product, overrides, "smart_seat_height"), readValue(product, overrides, "smart_seat_height_unit")),
    },
  ];

  return candidates
    .filter((item) => item.value)
    .map((item) => ({
      ownerId,
      namespace: METAFIELD_NAMESPACE,
      key: item.key,
      type: item.type || "single_line_text_field",
      value: item.value as string,
    }));
}

async function setShopifyMetafields(store: StoreConnection, metafields: Array<Record<string, string>>) {
  // Shopify metafieldsSet accepts at most 25 metafields. A single enriched product
  // currently exports at most 17, but keep chunking here for future attributes.
  let exported = 0;

  for (let i = 0; i < metafields.length; i += 25) {
    const chunk = metafields.slice(i, i + 25);
    const response = await fetch(`https://${store.store_url}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": store.access_token,
      },
      body: JSON.stringify({
        query: METAFIELDS_SET_MUTATION,
        variables: { metafields: chunk },
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`Shopify API ${response.status}: ${JSON.stringify(payload)}`);
    }
    if (payload?.errors?.length) {
      throw new Error(payload.errors.map((error: { message?: string }) => error.message || "GraphQL error").join(", "));
    }

    const userErrors = payload?.data?.metafieldsSet?.userErrors || [];
    if (userErrors.length) {
      throw new Error(userErrors.map((error: { message?: string }) => error.message || "Metafield error").join(", "));
    }

    exported += payload?.data?.metafieldsSet?.metafields?.length || chunk.length;
  }

  return exported;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.slice("Bearer ".length);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const productIds = Array.isArray(body.productIds)
      ? [...new Set(body.productIds.filter((id: unknown) => typeof id === "string" && id.length > 0))].slice(0, 100)
      : [];
    const overrides: Record<string, AttributeOverride> = body.overrides && typeof body.overrides === "object"
      ? body.overrides
      : {};

    if (productIds.length === 0) {
      return new Response(JSON.stringify({ error: "No products selected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: products, error: productError } = await supabase
      .from("shopify_products")
      .select(`
        id, shopify_id, title, store_id,
        ai_color, ai_material, ai_shape, ai_texture, ai_pattern, ai_finish, ai_design_elements,
        ai_background_style, ai_lighting_type, ai_condition_notes, ai_craftsmanship_level,
        ai_presentation_quality, ai_vision_confidence,
        style, room, functionality, characteristics, category, sub_category,
        smart_length, smart_length_unit, smart_width, smart_width_unit,
        smart_height, smart_height_unit, smart_depth, smart_depth_unit,
        smart_diameter, smart_diameter_unit, smart_weight, smart_weight_unit,
        smart_seat_height, smart_seat_height_unit
      `)
      .eq("seller_id", userData.user.id)
      .in("id", productIds);

    if (productError) throw productError;
    if (!products?.length) {
      return new Response(JSON.stringify({ error: "No authorized Shopify products found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storeIds = [...new Set(products.map((product) => product.store_id).filter(Boolean))] as string[];
    const storesById = new Map<string, StoreConnection>();

    if (storeIds.length) {
      const { data: stores, error: storeError } = await supabase
        .from("shopify_connections")
        .select("id, store_url, access_token")
        .eq("user_id", userData.user.id)
        .eq("is_active", true)
        .in("id", storeIds);

      if (storeError) throw storeError;
      (stores || []).forEach((store) => storesById.set(store.id, store as StoreConnection));
    }

    const { data: fallbackStore } = await supabase
      .from("shopify_connections")
      .select("id, store_url, access_token")
      .eq("user_id", userData.user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const results: Array<{ productId: string; title: string | null; success: boolean; attributes: number; error?: string }> = [];
    let productsExported = 0;
    let attributesExported = 0;

    for (const product of products as ProductRow[]) {
      try {
        const store = (product.store_id ? storesById.get(product.store_id) : null) || (fallbackStore as StoreConnection | null);
        if (!store) throw new Error("No active Shopify connection found");
        if (!product.shopify_id) throw new Error("Missing Shopify product ID");

        const metafields = buildMetafields(product, overrides[product.id] || {});
        if (!metafields.length) {
          results.push({ productId: product.id, title: product.title, success: true, attributes: 0 });
          continue;
        }

        const count = await setShopifyMetafields(store, metafields);
        productsExported += 1;
        attributesExported += count;
        results.push({ productId: product.id, title: product.title, success: true, attributes: count });
      } catch (error) {
        results.push({
          productId: product.id,
          title: product.title,
          success: false,
          attributes: 0,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const failed = results.filter((result) => !result.success).length;

    return new Response(JSON.stringify({
      success: failed === 0,
      products_exported: productsExported,
      attributes_exported: attributesExported,
      failed,
      namespace: METAFIELD_NAMESPACE,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[EXPORT-SHOPIFY-ATTRIBUTES]", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unable to export Shopify attributes",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
