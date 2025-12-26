import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get authorization header to verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the calling user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if calling user has admin role
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      console.log("[ADMIN-DELETE-USER] ❌ Unauthorized: user is not admin", callingUser.id);
      return new Response(
        JSON.stringify({ error: "Unauthorized: admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const { user_id, email } = await req.json();

    if (!user_id && !email) {
      return new Response(
        JSON.stringify({ error: "user_id or email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let targetUserId = user_id;

    // If email provided, find user_id
    if (!targetUserId && email) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const targetUser = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (!targetUser) {
        return new Response(
          JSON.stringify({ error: `User not found with email: ${email}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      targetUserId = targetUser.id;
    }

    console.log("[ADMIN-DELETE-USER] 🗑️ Starting complete user deletion for:", targetUserId);

    // 1. Delete all user data from public tables
    const deletionResults = await deleteAllUserData(supabaseAdmin, targetUserId);
    console.log("[ADMIN-DELETE-USER] ✅ User data deleted:", deletionResults);

    // 2. Delete user from auth.users using admin API
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    
    if (deleteAuthError) {
      console.error("[ADMIN-DELETE-USER] ❌ Failed to delete auth user:", deleteAuthError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to delete auth user", 
          details: deleteAuthError.message,
          dataDeleted: deletionResults 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[ADMIN-DELETE-USER] ✅ User completely deleted from auth.users:", targetUserId);

    // Log the admin action
    await supabaseAdmin.from("system_logs").insert({
      type: "critical",
      function_name: "admin-delete-user",
      message: `Admin ${callingUser.email} deleted user ${targetUserId}`,
      metadata: {
        admin_id: callingUser.id,
        admin_email: callingUser.email,
        deleted_user_id: targetUserId,
        deleted_email: email || "unknown",
        deletion_results: deletionResults,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User completely deleted",
        user_id: targetUserId,
        data_deleted: deletionResults 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ADMIN-DELETE-USER] ❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function deleteAllUserData(supabase: any, userId: string) {
  const results: Record<string, number> = {};

  // Get all stores for this user
  const { data: stores } = await supabase
    .from("shopify_connections")
    .select("id")
    .eq("user_id", userId);

  const storeIds = stores?.map((s: any) => s.id) || [];

  // Delete store-related data
  for (const storeId of storeIds) {
    // Products and related
    const { data: products } = await supabase
      .from("shopify_products")
      .select("id")
      .eq("store_id", storeId);

    if (products?.length) {
      const productIds = products.map((p: any) => p.id);
      await supabase.from("product_images").delete().in("product_id", productIds);
      await supabase.from("product_variants").delete().in("product_id", productIds);
      await supabase.from("creative_history").delete().in("product_id", productIds);
      await supabase.from("landing_page_history").delete().in("product_id", productIds);
      await supabase.from("product_image_history").delete().in("product_id", productIds);
    }
    
    await supabase.from("shopify_products").delete().eq("store_id", storeId);
    await supabase.from("shopify_collections").delete().eq("store_id", storeId);
    await supabase.from("blog_articles").delete().eq("store_id", storeId);
    await supabase.from("blog_campaigns").delete().eq("store_id", storeId);
    await supabase.from("blog_opportunities").delete().eq("store_id", storeId);
    await supabase.from("blog_netlinking").delete().eq("store_id", storeId);
    await supabase.from("chat_order_tracking").delete().eq("store_id", storeId);
    await supabase.from("content_images").delete().eq("store_id", storeId);
    await supabase.from("ai_opportunities").delete().eq("store_id", storeId);
    await supabase.from("shopify_pages").delete().eq("store_id", storeId);
  }

  results.stores = storeIds.length;

  // Delete user-level data
  const tables = [
    "shopify_connections",
    "subscriptions",
    "usage_tracking",
    "usage_tracking_history",
    "chat_sessions",
    "chat_messages",
    "chat_knowledge_base",
    "chat_settings",
    "automation_settings",
    "app_notifications",
    "user_api_keys",
    "api_usage_logs",
    "feature_usage",
    "trial_history",
    "referrals",
    "user_roles",
    "gsc_domains",
    "gsc_data_cache",
    "google_ads_campaigns",
    "google_ads_negative_keywords",
    "google_merchant_sync_settings",
    "facebook_page_connections",
    "ai_images_credits",
    "ai_images_credit_transactions",
    "ai_images_shopify_connections",
    "aeo_projects",
    "aeo_sources",
    "aeo_keyword_tracking",
    "aeo_url_tracking",
    "aeo_tracking_results",
    "ai_answers",
    "profiles",
  ];

  for (const table of tables) {
    try {
      const { count } = await supabase
        .from(table)
        .delete()
        .eq("user_id", userId)
        .select("*", { count: "exact", head: true });
      
      if (count === null) {
        // Try with seller_id for some tables
        await supabase.from(table).delete().eq("seller_id", userId);
      }
    } catch (e) {
      // Table might not have user_id column, try id for profiles
      if (table === "profiles") {
        await supabase.from(table).delete().eq("id", userId);
      }
    }
  }

  return results;
}
