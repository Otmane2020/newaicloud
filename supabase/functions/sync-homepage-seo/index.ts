import "../_shared/strict-ai-generation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTERNAL_MARKERS = [
  "boutique e-commerce réelle",
  "nom exact de la boutique",
  "url de la boutique",
  "secteur d'activité détecté",
  "contenu réel de la page",
  "produits réels de la boutique",
  "rappel critique",
  "exact store name",
  "store url",
  "detected business",
  "real homepage content",
  "use only the information",
  ".myshopify.com",
];

function normalizeSeo(value: unknown, maxLength: number) {
  const clean = String(value || "")
    .replace(/```(?:json)?/gi, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return clean.slice(0, maxLength).trim();
}

function isUnsafeSeo(value: string) {
  const lower = value.toLowerCase();
  return INTERNAL_MARKERS.some((marker) => lower.includes(marker));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { storeId } = body;
    const seoTitle = normalizeSeo(body.seoTitle, 60);
    const seoDescription = normalizeSeo(body.seoDescription, 160);

    if (!storeId || typeof storeId !== "string") {
      return json({ error: "storeId is required" }, 400);
    }
    if (!seoTitle || !seoDescription) {
      return json({ error: "SEO title and meta description are required" }, 400);
    }
    if (isUnsafeSeo(seoTitle) || isUnsafeSeo(seoDescription)) {
      return json({
        error: "Unsafe homepage SEO rejected. Internal prompt/store metadata cannot be synced to Shopify.",
      }, 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: connection, error: connError } = await supabaseClient
      .from("shopify_connections")
      .select("*")
      .eq("id", storeId)
      .eq("user_id", user.id)
      .single();

    if (connError || !connection) {
      return json({ error: "No active Shopify connection. Please connect your store first." }, 404);
    }

    const shopUrl = `https://${connection.store_url}/admin/api/2025-01/shop.json`;
    const shopResponse = await fetch(shopUrl, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": connection.access_token,
        "Content-Type": "application/json",
      },
    });

    if (!shopResponse.ok) {
      const errorText = await shopResponse.text();
      throw new Error(`Failed to get shop: ${shopResponse.status} - ${errorText}`);
    }

    const shopData = await shopResponse.json();
    const shopId = shopData.shop.id;
    const graphqlUrl = `https://${connection.store_url}/admin/api/2025-01/graphql.json`;
    const mutation = `
      mutation UpdateShopMetafields($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id namespace key value }
          userErrors { field message }
        }
      }
    `;

    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": connection.access_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          metafields: [
            {
              ownerId: `gid://shopify/Shop/${shopId}`,
              namespace: "global",
              key: "title_tag",
              value: seoTitle,
              type: "single_line_text_field",
            },
            {
              ownerId: `gid://shopify/Shop/${shopId}`,
              namespace: "global",
              key: "description_tag",
              value: seoDescription,
              type: "multi_line_text_field",
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update shop SEO: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const userErrors = result.data?.metafieldsSet?.userErrors || [];
    if (userErrors.length > 0) {
      throw new Error(`Metafield update failed: ${userErrors.map((e: any) => e.message).join(", ")}`);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { error: saveError } = await supabaseAdmin
      .from("homepage_seo")
      .upsert({
        user_id: user.id,
        store_id: storeId,
        seo_title: seoTitle,
        seo_description: seoDescription,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,store_id" });
    if (saveError) throw saveError;

    return json({
      success: true,
      message: "Homepage SEO synced to Shopify successfully",
      seo: { title: seoTitle, description: seoDescription },
    });
  } catch (error) {
    console.error("[SYNC-HOMEPAGE] Error:", error);
    return json({
      error: error instanceof Error ? error.message : "Unknown error",
      details: "Failed to sync homepage SEO to Shopify",
    }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
