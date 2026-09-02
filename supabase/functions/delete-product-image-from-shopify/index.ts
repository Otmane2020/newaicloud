import { createClient } from "npm:@supabase/supabase-js@2";
import { shopifyGraphQL, restIdToGid, extractNodes } from "../_shared/shopify-graphql.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCT_MEDIA_QUERY = `
  query getProductMedia($id: ID!) {
    product(id: $id) {
      id
      media(first: 250) {
        edges {
          node {
            ... on MediaImage {
              id
              alt
              image { url }
            }
          }
        }
      }
    }
  }
`;

const PRODUCT_DELETE_MEDIA_MUTATION = `
  mutation productDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
    productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
      deletedMediaIds
      deletedProductImageIds
      mediaUserErrors { field message }
    }
  }
`;

const normalizeImageUrl = (value?: string | null) => {
  if (!value) return "";
  try {
    const url = new URL(value);
    let path = decodeURIComponent(url.pathname).toLowerCase();
    path = path.replace(/_\d+x\d+(?=\.[a-z0-9]+$)/i, "");
    path = path.replace(/_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\.[a-z0-9]+$)/i, "");
    return path;
  } catch {
    return value.split("?")[0].toLowerCase();
  }
};

const filenameKey = (value?: string | null) => {
  const normalized = normalizeImageUrl(value);
  return normalized.split("/").pop()?.replace(/_\d+(?=\.[a-z0-9]+$)/i, "") || normalized;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("User not authenticated");

    const body = await req.json();
    const { productId, shopifyImageId, imageUrl } = body ?? {};
    if (!productId) throw new Error("productId is required");

    const { data: product, error: productError } = await supabase
      .from("shopify_products")
      .select("id, shopify_id, store_id, seller_id")
      .eq("id", productId)
      .single();

    if (productError || !product) throw new Error("Product not found");

    let hasAccess = product.seller_id === user.id;
    if (!hasAccess && product.store_id) {
      const { data: storeAccess } = await supabase
        .from("shopify_connections")
        .select("id")
        .eq("id", product.store_id)
        .eq("user_id", user.id)
        .maybeSingle();
      hasAccess = !!storeAccess;
    }
    if (!hasAccess) throw new Error("Product access denied");

    if (!product.shopify_id) {
      return new Response(JSON.stringify({ success: true, skipped: true, deletedCount: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let connection: { store_url: string; access_token: string } | null = null;
    if (product.store_id) {
      const { data } = await supabase
        .from("shopify_connections")
        .select("store_url, access_token")
        .eq("id", product.store_id)
        .eq("is_active", true)
        .maybeSingle();
      connection = data;
    }

    if (!connection) {
      const { data } = await supabase
        .from("shopify_connections")
        .select("store_url, access_token")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      connection = data;
    }

    if (!connection) throw new Error("Shopify connection not found");

    const productGid = restIdToGid(product.shopify_id, "Product");
    const mediaResult = await shopifyGraphQL(
      connection.store_url,
      connection.access_token,
      PRODUCT_MEDIA_QUERY,
      { id: productGid },
    );

    const media = extractNodes(mediaResult.product?.media || { edges: [] });
    const suppliedId = shopifyImageId ? String(shopifyImageId) : "";
    const suppliedUrlKey = normalizeImageUrl(imageUrl);
    const suppliedFilename = filenameKey(imageUrl);

    let target = media.find((item: any) => {
      if (!suppliedId) return false;
      if (item.id === suppliedId) return true;
      return String(item.id || "").endsWith(`/${suppliedId}`);
    });

    if (!target && imageUrl) {
      target = media.find((item: any) => {
        const remoteUrl = item.image?.url || "";
        return normalizeImageUrl(remoteUrl) === suppliedUrlKey || filenameKey(remoteUrl) === suppliedFilename;
      });
    }

    // Idempotent delete: if a complete read of Shopify media confirms that the
    // requested image is no longer there, the caller can safely remove its local row.
    if (!target) {
      return new Response(JSON.stringify({
        success: true,
        deletedCount: 0,
        alreadyAbsent: true,
        message: "Image is already absent from Shopify",
        mediaCount: media.length,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deleteResult = await shopifyGraphQL(
      connection.store_url,
      connection.access_token,
      PRODUCT_DELETE_MEDIA_MUTATION,
      { productId: productGid, mediaIds: [target.id] },
    );

    const payload = deleteResult.productDeleteMedia;
    if (payload?.mediaUserErrors?.length) {
      return new Response(JSON.stringify({
        success: false,
        error: payload.mediaUserErrors.map((e: any) => e.message).join("; "),
        userErrors: payload.mediaUserErrors,
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deletedMediaIds: string[] = payload?.deletedMediaIds || [];
    const confirmed = deletedMediaIds.includes(target.id);
    if (!confirmed) {
      return new Response(JSON.stringify({
        success: false,
        error: "Shopify did not confirm image deletion. Local image was not deleted.",
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      deletedCount: 1,
      alreadyAbsent: false,
      deletedMediaId: target.id,
      deletedProductImageIds: payload?.deletedProductImageIds || [],
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[DELETE-PRODUCT-IMAGE]", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
