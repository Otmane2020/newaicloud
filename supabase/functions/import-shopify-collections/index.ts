import "../_shared/strict-ai-generation.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHOPIFY_API_VERSION = "2026-07";

type ShopifyConnection = {
  id: string;
  store_url: string;
  access_token: string | null;
  store_name?: string | null;
  is_active?: boolean | null;
};

type StoreSyncResult = {
  store_id: string;
  store_url: string;
  total: number;
  smart_collections: number;
  custom_collections: number;
  imported: number;
  deleted: number;
  errors: number;
};

const normalizeShopifyUrl = (value: string) => {
  const trimmed = value.trim().replace(/\/$/, "");
  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
};

const getNextUrl = (linkHeader: string | null): string | null => {
  if (!linkHeader) return null;
  for (const link of linkHeader.split(",")) {
    const match = link.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
};

async function fetchCollectionPages({
  shopifyUrl,
  accessToken,
  endpoint,
  responseKey,
}: {
  shopifyUrl: string;
  accessToken: string;
  endpoint: string;
  responseKey: string;
}) {
  const collections: any[] = [];
  let url: string | null = `${shopifyUrl}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}.json?limit=250`;
  let batch = 0;

  while (url) {
    batch += 1;
    console.log(`[IMPORT-COLLECTIONS] ${endpoint} batch ${batch}`);

    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Shopify ${endpoint} API error ${response.status}: ${errorText.slice(0, 500)}`,
      );
    }

    const payload = await response.json();
    const page = payload?.[responseKey] || [];
    collections.push(...page);

    const servedVersion = response.headers.get("X-Shopify-API-Version");
    if (servedVersion && servedVersion !== SHOPIFY_API_VERSION) {
      console.warn(
        `[IMPORT-COLLECTIONS] Requested Shopify ${SHOPIFY_API_VERSION}, served ${servedVersion}`,
      );
    }

    url = getNextUrl(response.headers.get("Link"));
    if (url) await new Promise((resolve) => setTimeout(resolve, 350));
  }

  return collections;
}

async function syncStoreCollections({
  supabase,
  userId,
  connection,
  syncHistoryId,
}: {
  supabase: any;
  userId: string;
  connection: ShopifyConnection;
  syncHistoryId?: string;
}): Promise<StoreSyncResult> {
  if (!connection.store_url) {
    throw new Error(`Shopify store ${connection.id} has no store URL`);
  }
  if (!connection.access_token) {
    throw new Error(`Shopify store ${connection.id} has no access token`);
  }

  const shopifyUrl = normalizeShopifyUrl(connection.store_url);
  console.log(
    `[IMPORT-COLLECTIONS] Syncing store ${connection.store_name || connection.id}: ${shopifyUrl}`,
  );

  const smartCollections = await fetchCollectionPages({
    shopifyUrl,
    accessToken: connection.access_token,
    endpoint: "smart_collections",
    responseKey: "smart_collections",
  });

  const customCollections = await fetchCollectionPages({
    shopifyUrl,
    accessToken: connection.access_token,
    endpoint: "custom_collections",
    responseKey: "custom_collections",
  });

  const byId = new Map<string, any>();
  for (const collection of [...smartCollections, ...customCollections]) {
    byId.set(String(collection.id), collection);
  }
  const allCollections = Array.from(byId.values());

  let upsertedCount = 0;
  let errorCount = 0;

  for (const collection of allCollections) {
    try {
      const imageUrl = collection.image?.src || null;
      const imageAlt = collection.image?.alt || collection.title;
      const shopifyImageId = collection.image?.id ? String(collection.image.id) : null;

      const collectionData = {
        user_id: userId,
        store_id: connection.id,
        shopify_collection_id: collection.id,
        title: collection.title,
        handle: collection.handle,
        body_html: collection.body_html || null,
        seo_title: collection.title,
        seo_description:
          collection.body_html?.replace(/<[^>]*>/g, "").substring(0, 160) ||
          `Collection ${collection.title}`,
        image_url: imageUrl,
        image_alt: imageAlt,
        shopify_image_id: shopifyImageId,
        products_count: collection.products_count || 0,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("shopify_collections")
        .upsert(collectionData, {
          onConflict: "shopify_collection_id,user_id",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error(
          `[IMPORT-COLLECTIONS] Upsert failed for ${collection.id} (${connection.id})`,
          upsertError,
        );
        errorCount += 1;
        continue;
      }

      upsertedCount += 1;

      if (syncHistoryId && upsertedCount % 5 === 0) {
        await supabase
          .from("sync_history")
          .update({ items_synced: upsertedCount, sync_type: "collections" })
          .eq("id", syncHistoryId);
      }
    } catch (error) {
      console.error(
        `[IMPORT-COLLECTIONS] Collection processing failed for ${collection.id}`,
        error,
      );
      errorCount += 1;
    }
  }

  const shopifyCollectionIds = allCollections.map((collection) => collection.id);
  const { data: existingCollections, error: fetchExistingError } = await supabase
    .from("shopify_collections")
    .select("id, shopify_collection_id, title")
    .eq("user_id", userId)
    .eq("store_id", connection.id);

  let deletedCount = 0;
  if (fetchExistingError) {
    console.warn(
      `[IMPORT-COLLECTIONS] Could not check deleted collections for ${connection.id}`,
      fetchExistingError,
    );
  } else if (existingCollections) {
    const collectionsToDelete = existingCollections.filter(
      (existing: any) => !shopifyCollectionIds.includes(existing.shopify_collection_id),
    );

    if (collectionsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("shopify_collections")
        .delete()
        .in(
          "id",
          collectionsToDelete.map((collection: any) => collection.id),
        );

      if (deleteError) {
        console.warn(
          `[IMPORT-COLLECTIONS] Could not delete stale collections for ${connection.id}`,
          deleteError,
        );
      } else {
        deletedCount = collectionsToDelete.length;
      }
    }
  }

  return {
    store_id: connection.id,
    store_url: shopifyUrl,
    total: allCollections.length,
    smart_collections: smartCollections.length,
    custom_collections: customCollections.length,
    imported: upsertedCount,
    deleted: deletedCount,
    errors: errorCount,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));

    if (body?.healthCheck === true) {
      return new Response(
        JSON.stringify({ ok: true, version: "2.0.0", shopifyApiVersion: SHOPIFY_API_VERSION }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase server configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const authHeader = req.headers.get("Authorization");
    const { serviceMode, userId: serviceModeUserId, storeId: bodyStoreId, syncHistoryId } = body;

    let userId: string;
    if (serviceMode === true && serviceModeUserId) {
      userId = serviceModeUserId;
    } else {
      if (!authHeader) throw new Error("Missing authorization header");
      const { data: { user }, error: userError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", ""),
      );
      if (userError || !user) throw new Error("Unauthorized");
      userId = user.id;
    }

    console.log("[IMPORT-COLLECTIONS] Starting v2 sync", {
      userId,
      requestedStoreId: bodyStoreId || null,
      shopifyApiVersion: SHOPIFY_API_VERSION,
    });

    let connections: ShopifyConnection[] = [];

    if (bodyStoreId) {
      const { data: selectedStore, error: selectedStoreError } = await supabase
        .from("shopify_connections")
        .select("id, store_url, store_name, access_token, is_active")
        .eq("id", bodyStoreId)
        .eq("user_id", userId)
        .maybeSingle();

      if (selectedStoreError) throw selectedStoreError;
      if (!selectedStore) throw new Error("Store not found or unauthorized");
      connections = [selectedStore as ShopifyConnection];
    } else {
      const { data: activeStores, error: activeStoresError } = await supabase
        .from("shopify_connections")
        .select("id, store_url, store_name, access_token, is_active")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (activeStoresError) throw activeStoresError;
      connections = (activeStores || []) as ShopifyConnection[];
    }

    if (connections.length === 0) {
      throw new Error("No active Shopify connection found");
    }

    const stores: StoreSyncResult[] = [];
    const storeErrors: Array<{ store_id: string; error: string }> = [];

    for (const connection of connections) {
      try {
        stores.push(
          await syncStoreCollections({
            supabase,
            userId,
            connection,
            syncHistoryId,
          }),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Shopify sync error";
        console.error(
          `[IMPORT-COLLECTIONS] Store sync failed for ${connection.id}`,
          error,
        );
        storeErrors.push({ store_id: connection.id, error: message });
      }
    }

    if (stores.length === 0) {
      throw new Error(storeErrors.map((item) => item.error).join(" | ") || "Collection sync failed");
    }

    const summary = stores.reduce(
      (total, store) => ({
        total: total.total + store.total,
        smart_collections: total.smart_collections + store.smart_collections,
        custom_collections: total.custom_collections + store.custom_collections,
        imported: total.imported + store.imported,
        deleted: total.deleted + store.deleted,
        errors: total.errors + store.errors,
      }),
      {
        total: 0,
        smart_collections: 0,
        custom_collections: 0,
        imported: 0,
        deleted: 0,
        errors: 0,
      },
    );

    return new Response(
      JSON.stringify({
        success: storeErrors.length === 0 && summary.errors === 0,
        ...summary,
        stores,
        store_errors: storeErrors,
        shopify_api_version: SHOPIFY_API_VERSION,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[IMPORT-COLLECTIONS] Fatal error", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
