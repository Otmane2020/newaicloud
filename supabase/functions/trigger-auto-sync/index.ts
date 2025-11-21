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

  // ✅ Extract Authorization header for forwarding to import functions
  const authHeader = req.headers.get("Authorization");
  console.log("🔑 [trigger-auto-sync] Authorization header present:", !!authHeader);

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

    // Create sync history entry
    const { data: historyEntry, error: historyError } = (await supabase
      .from("sync_history")
      .insert({
        user_id: user_id,
        store_id: connection.id,
        sync_type: "import",
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

    // ✅ Prepare common headers for forwarding user token
    const commonHeaders: { [key: string]: string } | undefined = authHeader 
      ? { Authorization: authHeader } 
      : undefined;
    console.log("📤 [trigger-auto-sync] Will forward headers to import functions:", commonHeaders ? Object.keys(commonHeaders) : 'none');

    // Import based on selected types
    for (const type of importTypes) {
      try {
        console.log(`📥 Importing ${type}...`);

        const baseBody = {
          storeId: connection.id,
          shopName: cleanShopName,
        };

        let result;
        switch (type) {
          case "products":
            result = await supabase.functions.invoke<FunctionResultData>("import-products", {
              headers: commonHeaders,
              body: {
                ...baseBody,
                apiSecret: connection.access_token,
              },
            });
            break;
          case "collections":
            result = await supabase.functions.invoke<FunctionResultData>("import-shopify-collections", {
              headers: commonHeaders,
              body: baseBody,
            });
            break;
          case "pages":
            result = await supabase.functions.invoke<FunctionResultData>("import-shopify-pages", {
              headers: commonHeaders,
              body: baseBody,
            });
            break;
          case "articles":
            result = await supabase.functions.invoke<FunctionResultData>("import-shopify-articles", {
              headers: commonHeaders,
              body: {
                ...baseBody,
                authToken: connection.access_token,
              },
            });
            break;
          case "images":
            result = await supabase.functions.invoke<FunctionResultData>("import-content-images", {
              headers: commonHeaders,
              body: {
                storeId: connection.id,
                types: ["collections", "pages", "articles", "homepage"],
              },
            });
            break;
          default:
            console.warn(`⚠️ Unknown import type: ${type}`);
            continue;
        }

        if (result.error) {
          const errorMsg = `Error importing ${type}: ${result.error.message || JSON.stringify(result.error)}`;
          console.error(`❌ ${errorMsg}`);
          errorMessages.push(errorMsg);
          hasErrors = true;
        } else if (result.data) {
          // Safely count imported items
          const importedCount = result.data.totalImported || result.data.imported || result.data.count || 0;
          totalImported += importedCount;
          console.log(`✅ ${type} import completed: ${importedCount} items`);
        }
      } catch (error) {
        const errorMsg = `Error importing ${type}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`❌ ${errorMsg}`);
        errorMessages.push(errorMsg);
        hasErrors = true;
      }
    }

    const duration = Date.now() - startTime;

    // Update history
    try {
      await supabase
        .from("sync_history")
        .update({
          status: hasErrors ? "failed" : "success",
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
