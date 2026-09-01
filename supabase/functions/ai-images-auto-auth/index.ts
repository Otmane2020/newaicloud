import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const log = (step: string, details?: unknown) => {
  console.log(`[AI-IMAGES-AUTO-AUTH] ${step}`, details ? JSON.stringify(details) : "");
};

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shop, pending_token } = await req.json();

    if (!shop || !pending_token) {
      return new Response(
        JSON.stringify({ error: "Missing shop or pending_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log("Auto-authentication for AI Images", { shop, pending_token: pending_token.slice(0, 8) + "..." });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Verify pending_token - WITH RETRY for replication lag
    let pendingConnection = null;
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [500, 1000, 2000];

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt === 0) {
        await delay(300);
      }
      
      log(`Token lookup attempt ${attempt + 1}/${MAX_RETRIES}`);
      
      const { data, error } = await supabase
        .from("shopify_pending_connections")
        .select("*")
        .eq("pending_token", pending_token)
        .eq("shop_url", shop)
        .eq("is_claimed", false)
        .maybeSingle();
      
      if (data) {
        pendingConnection = data;
        log(`Token found on attempt ${attempt + 1}`);
        break;
      }
      
      if (attempt < MAX_RETRIES - 1) {
        const delayMs = RETRY_DELAYS[attempt] || 2000;
        log(`Token not found, retrying in ${delayMs}ms...`);
        await delay(delayMs);
      }
    }

    if (!pendingConnection) {
      log("Token invalid after all retries - likely expired or already claimed");
      return new Response(
        JSON.stringify({ 
          error: "Invalid or expired pending token. Please reinstall the app.",
          code: "TOKEN_EXPIRED"
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (new Date(pendingConnection.expires_at) < new Date()) {
      log("Token expired", { expires_at: pendingConnection.expires_at });
      return new Response(
        JSON.stringify({ 
          error: "Installation link has expired. Please reinstall the app from Shopify.",
          code: "TOKEN_EXPIRED"
        }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create unique email based on shop handle
    const shopHandle = shop.replace(".myshopify.com", "");
    const email = `${shopHandle}@ai-images.shopify.local`;
    const password = crypto.randomUUID();

    log("Generated email", { email });

    // 3. Check if user already exists
    const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = allUsers?.users.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      log("Existing user found", { userId });

      // Update password to allow login
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password
      });

      if (updateError) {
        log("Error updating password", { error: updateError });
      }
    } else {
      // 4. Create new Supabase user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          shop_url: shop,
          commercial_name: pendingConnection.commercial_name || shop,
          created_via: "ai_images_shopify_install"
        }
      });

      if (createError || !newUser.user) {
        log("Error creating user", { error: createError });
        return new Response(
          JSON.stringify({ error: "Failed to create user", details: createError?.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      log("New user created", { userId });

      // 5. Create profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        email: email,
        full_name: pendingConnection.commercial_name || shop,
        billing_provider: "shopify",
        subscription_status: "inactive",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

      if (profileError) {
        log("Error creating profile", { error: profileError });
      }

      // 6. Initialize credits for new user
      const { data: existingCredits } = await supabase
        .from("ai_images_credits")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!existingCredits) {
        await supabase.from("ai_images_credits").insert({
          user_id: userId,
          credits_balance: 5,
          total_credits_purchased: 0,
          total_credits_used: 0,
        });
        log("Initialized 5 free credits", { userId });
      }
    }

    // 7. Create ai_images_shopify_connections entry (with user_id now available)
    const { error: aiConnError } = await supabase
      .from("ai_images_shopify_connections")
      .upsert({
        user_id: userId,
        shop_domain: shop,
        shop_name: pendingConnection.commercial_name || shop,
        access_token: pendingConnection.access_token,
        scope: pendingConnection.scope || "write_products,write_files",
        is_active: true,
        installed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "shop_domain" });

    if (aiConnError) {
      log("Error creating ai_images_shopify_connections", { error: aiConnError });
    } else {
      log("AI Images connection created successfully");
    }

    // 8. Also create shopify_connections entry for StoreContext compatibility
    const storeUrl = `https://${shop}`;
    const { data: existingConn } = await supabase
      .from("shopify_connections")
      .select("id")
      .eq("store_url", storeUrl)
      .maybeSingle();

    if (!existingConn) {
      await supabase.from("shopify_connections").insert({
        user_id: userId,
        store_url: storeUrl,
        store_name: pendingConnection.commercial_name || shop,
        access_token: pendingConnection.access_token,
        is_active: true,
        connection_type: "oauth",
        connected_at: new Date().toISOString(),
      });
      log("Created shopify_connections entry");
    } else {
      await supabase
        .from("shopify_connections")
        .update({
          user_id: userId,
          access_token: pendingConnection.access_token,
          is_active: true,
        })
        .eq("id", existingConn.id);
      log("Updated shopify_connections entry");
    }

    // 9. Mark pending_connection as claimed
    await supabase
      .from("shopify_pending_connections")
      .update({ is_claimed: true, claimed_at: new Date().toISOString() })
      .eq("pending_token", pending_token);

    log("Pending connection claimed");

    // 10. Create session for the user
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_ANON_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session) {
      log("Error creating session", { error: authError });
      return new Response(
        JSON.stringify({ error: "Failed to create session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log("Session created successfully", { userId });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        shop: shop,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
