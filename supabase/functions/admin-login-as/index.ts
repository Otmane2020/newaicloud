import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
    const body = await req.json();
    
    // Health check
    if (body?.healthCheck) {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { targetUserId, targetEmail } = body;

    if (!targetUserId && !targetEmail) {
      return new Response(
        JSON.stringify({ error: "targetUserId ou targetEmail requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authorization header to verify admin status
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the requesting user is an admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Utilisateur non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin
    const { data: isAdmin, error: roleError } = await userClient.rpc("has_role", {
      _user_id: requestingUser.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Accès administrateur requis" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get target user email if only ID provided
    let email = targetEmail;
    if (!email && targetUserId) {
      const { data: userData, error: fetchError } = await adminClient.auth.admin.getUserById(targetUserId);
      if (fetchError || !userData.user) {
        return new Response(
          JSON.stringify({ error: "Utilisateur cible non trouvé" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      email = userData.user.email;
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email de l'utilisateur cible non trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate magic link for the target user
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: `${req.headers.get("origin") || "https://newai.sale"}/dashboard`,
      },
    });

    if (linkError) {
      console.error("Error generating magic link:", linkError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la génération du lien", details: linkError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the impersonation for audit
    await adminClient.from("system_logs").insert({
      type: "admin_action",
      function_name: "admin-login-as",
      message: `Admin ${requestingUser.email} se connecte en tant que ${email}`,
      user_id: requestingUser.id,
      metadata: {
        admin_email: requestingUser.email,
        target_email: email,
        target_user_id: targetUserId,
      },
    });

    console.log(`✅ Admin ${requestingUser.email} generated login link for ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        loginUrl: linkData.properties?.action_link,
        email: email,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in admin-login-as:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
