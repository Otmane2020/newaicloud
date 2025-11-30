import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  user_id: string;
}

interface ShopifyConnection {
  id: string;
  user_id: string;
  store_url: string;
  access_token: string;
  is_active: boolean;
}

interface SyncSettings {
  import_types: string[];
}

interface SyncHistory {
  id: string;
  user_id: string;
  sync_type: string;
  content_types: string[];
  status: string;
}

interface FunctionResultData {
  totalImported?: number;
  imported?: number;
  count?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate environment variables
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("❌ Missing required environment variables");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    // Validate request method
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      });
    }

    // Parse and validate request body
    let requestBody: RequestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError);
      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { user_id } = requestBody;

    if (!user_id || typeof user_id !== "string") {
      return new Response(JSON.stringify({ error: "Valid user_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("🚀 Starting auto-sync for user:", user_id);

    // Check if there's already a running sync for this user
    const { data: runningSyncs, error: runningCheckError } = await supabase
      .from("sync_history")
      .select("id, started_at")
      .eq("user_id", user_id)
      .eq("status", "running")
      .gte("started_at", new Date(Date.now() - 120000).toISOString()); // Last 2 minutes

    if (runningCheckError) {
      console.error("❌ Error checking for running syncs:", runningCheckError);
    } else if (runningSyncs && runningSyncs.length > 0) {
      console.log("⚠️ Sync already running for user:", user_id, "- Skipping duplicate");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Sync already in progress",
          sync_id: runningSyncs[0].id
        }), 
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409, // Conflict
        }
      );
    }

    // Get active Shopify connection
    const { data: connection, error: connectionError } = (await supabase
      .from("shopify_connections")
      .select("*")
      .eq("user_id", user_id)
      .eq("is_active", true)
      .maybeSingle()) as { data: ShopifyConnection | null; error: any };

    if (connectionError) {
      console.error("❌ Database error fetching connection:", connectionError);
      throw new Error("Failed to fetch Shopify connection");
    }

    if (!connection) {
      console.log("⚠️ No active Shopify connection found for user:", user_id);
      return new Response(JSON.stringify({ success: true, message: "No Shopify connection to sync" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get sync settings
    const { data: settings, error: settingsError } = (await supabase
      .from("shopify_sync_settings")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle()) as { data: SyncSettings | null; error: any };

    if (settingsError) {
      console.error("❌ Database error fetching settings:", settingsError);
      throw new Error("Failed to fetch sync settings");
    }

    const importTypes = settings?.import_types || ["products", "collections", "pages", "articles", "images"];

    // Clean the shop name
    const cleanShopName = (connection.store_url || "")
      .replace(/^https?:\/\//, "")
      .replace(/\.myshopify\.com.*$/, "")
      .replace(/\/$/, "");

    // Create sync history entry - 🔥 FIX: Use "products" instead of "import" so frontend recognizes the type
    const { data: historyEntry, error: historyError } = (await supabase
      .from("sync_history")
      .insert({
        user_id: user_id,
        store_id: connection.id,
        sync_type: "products",    // ✅ Frontend recognizes this type (not "import")
        items_synced: 0,          // ✅ Explicit initial value
        content_types: importTypes,
        status: "running",
      })
      .select()
      .single()) as { data: SyncHistory | null; error: any };

    if (historyError || !historyEntry) {
      console.error("❌ Failed to create sync history entry:", historyError);
      throw new Error("Failed to create sync history");
    }

    console.log("📝 Created sync history entry:", historyEntry.id);

    // Launch sync in background
    const startTime = Date.now();
    let totalImported = 0;
    let hasErrors = false;
    const errorMessages: string[] = [];

    // Helper function to update sync_history with current progress
    const updateSyncProgress = async (syncType: string, itemsSynced: number) => {
      try {
        await supabase
          .from("sync_history")
          .update({ 
            sync_type: syncType,
            items_synced: itemsSynced,
            duration_ms: Date.now() - startTime
          })
          .eq("id", historyEntry.id);
        console.log(`📊 Progress updated: ${syncType} - ${itemsSynced} items`);
      } catch (err) {
        console.error(`⚠️ Failed to update progress:`, err);
      }
    };

    // Import based on selected types
    for (const type of importTypes) {
      try {
        console.log(`📥 Importing ${type}...`);

        // 🔥 FIX: Update sync_type AND items_synced BEFORE import so frontend knows current step
        // This allows progress bar to advance (products=20%, collections=50%, etc.)
        await supabase
          .from("sync_history")
          .update({ 
            sync_type: type,
            items_synced: totalImported,  // 🔥 CRITICAL: Include current count so frontend shows progress
            duration_ms: Date.now() - startTime
          })
          .eq("id", historyEntry.id);
        console.log(`📊 Starting ${type} import... (${totalImported} items so far)`);

        // 🔥 FIX: Pass syncHistoryId to all import functions for live progress updates
        const baseBody = {
          storeId: connection.id,
          shopName: cleanShopName,
          serviceMode: true,
          userId: user_id,
          syncHistoryId: historyEntry.id,  // 🔥 NEW: Enable live progress updates
        };

        let result;
        switch (type) {
          case "products":
            result = await supabase.functions.invoke<FunctionResultData>("import-products", {
              body: {
                ...baseBody,
                apiSecret: connection.access_token,
              },
            });
            break;
          case "collections":
            result = await supabase.functions.invoke<FunctionResultData>("import-shopify-collections", {
              body: baseBody,
            });
            break;
          case "pages":
            result = await supabase.functions.invoke<FunctionResultData>("import-shopify-pages", {
              body: baseBody,
            });
            break;
          case "articles":
            result = await supabase.functions.invoke<FunctionResultData>("import-shopify-articles", {
              body: {
                ...baseBody,
                authToken: connection.access_token,
              },
            });
            break;
        case "images":
            result = await supabase.functions.invoke<FunctionResultData>("import-content-images", {
              body: {
                storeId: connection.id,
                serviceMode: true,
                userId: user_id,
                syncHistoryId: historyEntry.id,
                types: ["collections", "pages", "articles", "homepage"],
              },
            });
            break;
          default:
            console.warn(`⚠️ Unknown import type: ${type}`);
            continue;
        }

        // Process result from import function
        if (result.error) {
          const errorMsg = `${type}: ${result.error.message || JSON.stringify(result.error)}`;
          console.error(`❌ ${errorMsg}`);
          errorMessages.push(errorMsg);
          hasErrors = true;
        } else if (result.data) {
          const importedCount = result.data.totalImported || result.data.imported || result.data.count || 0;
          totalImported += importedCount;
          console.log(`✅ ${type} import completed: ${importedCount} items`);
          await updateSyncProgress(type, totalImported);
        }
      } catch (error) {
        const errorMsg = `${type}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`❌ ${errorMsg}`);
        errorMessages.push(errorMsg);
        hasErrors = true;
      }
    }

    // 🔥 CRITICAL: After all imports, sync product-collection relationships
    console.log("🔗 [AUTO-SYNC] Syncing product-collection relationships...");
    try {
      await supabase
        .from("sync_history")
        .update({ 
          sync_type: "linking",
          items_synced: totalImported,
          duration_ms: Date.now() - startTime
        })
        .eq("id", historyEntry.id);

      const syncResult = await supabase.functions.invoke("sync-product-collections", {
        body: {
          storeId: connection.id,
          userId: user_id,
        },
      });

      if (syncResult.error) {
        console.error("❌ Error syncing product-collections:", syncResult.error);
        errorMessages.push(`sync-product-collections: ${syncResult.error.message}`);
      } else {
        console.log("✅ Product-collection sync complete:", syncResult.data);
      }
    } catch (syncError) {
      console.error("❌ Exception in sync-product-collections:", syncError);
      errorMessages.push(`sync-product-collections: ${syncError instanceof Error ? syncError.message : String(syncError)}`);
    }

    // 🔥 Update products_count for all collections after sync
    console.log("📊 [AUTO-SYNC] Updating collection products_count...");
    try {
      const { data: allCollections } = await supabase
        .from("shopify_collections")
        .select("id")
        .eq("user_id", user_id)
        .eq("store_id", connection.id);

      if (allCollections && allCollections.length > 0) {
        for (const col of allCollections) {
          const { count } = await supabase
            .from("shopify_products")
            .select("id", { count: "exact", head: true })
            .contains("collection_ids", [col.id])
            .eq("seller_id", user_id);

          if (count !== null) {
            await supabase
              .from("shopify_collections")
              .update({ products_count: count, updated_at: new Date().toISOString() })
              .eq("id", col.id);
          }
        }
        console.log(`✅ Updated products_count for ${allCollections.length} collections`);
      }
    } catch (countError) {
      console.error("❌ Exception updating products_count:", countError);
    }

    const duration = Date.now() - startTime;

    // Update history with final status and sync_type
    try {
      await supabase
        .from("sync_history")
        .update({
          status: hasErrors ? "failed" : "success",
          sync_type: "completed", // Important: set to "completed" for frontend detection
          store_id: connection.id,
          items_synced: totalImported,
          duration_ms: duration,
          completed_at: new Date().toISOString(),
          error_message: hasErrors ? errorMessages.join("; ") : null,
        })
        .eq("id", historyEntry.id);
    } catch (updateError) {
      console.error("❌ Failed to update sync history:", updateError);
    }

    // Update last import timestamp
    try {
      await supabase
        .from("shopify_sync_settings")
        .update({ last_import_at: new Date().toISOString() })
        .eq("user_id", user_id);
    } catch (timestampError) {
      console.error("❌ Failed to update last import timestamp:", timestampError);
    }

    console.log(`✅ Auto-sync completed: ${totalImported} items imported in ${Math.round(duration / 1000)}s`);

    return new Response(
      JSON.stringify({
        success: true,
        sync_id: historyEntry.id,
        items_synced: totalImported,
        duration_ms: duration,
        has_errors: hasErrors,
        errors: hasErrors ? errorMessages : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("❌ Auto-sync error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
