import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.info(`[AI-IMAGES-QUICK-LOGIN] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shop } = await req.json();
    
    if (!shop) {
      log("Missing shop parameter");
      return new Response(
        JSON.stringify({ error: "Missing shop parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log("Quick login request", { shop });

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Find the AI Images connection for this shop
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("ai_images_shopify_connections")
      .select("user_id, shop_domain, shop_name")
      .eq("shop_domain", shop)
      .eq("is_active", true)
      .single();

    if (connectionError || !connection) {
      log("No active connection found", { shop, error: connectionError });
      return new Response(
        JSON.stringify({ error: "No active connection found for this shop" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log("Connection found", { userId: connection.user_id, shopName: connection.shop_name });

    // Get the user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      connection.user_id
    );

    if (userError || !userData.user) {
      log("User not found", { userId: connection.user_id, error: userError });
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a temporary password and update user
    const tempPassword = crypto.randomUUID() + "-AI" + Date.now();
    
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      connection.user_id,
      { password: tempPassword }
    );

    if (updateError) {
      log("Failed to update user password", { error: updateError });
      return new Response(
        JSON.stringify({ error: "Failed to prepare session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sign in with the temporary password
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: userData.user.email!,
      password: tempPassword
    });

    if (signInError || !signInData.session) {
      log("Sign in failed", { error: signInError });
      return new Response(
        JSON.stringify({ error: "Failed to create session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log("Session created successfully", { userId: connection.user_id });

    return new Response(
      JSON.stringify({ 
        success: true,
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log("Unexpected error", { error: String(error) });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
