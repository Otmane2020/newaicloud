import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { 
        auth: { 
          persistSession: false,
          autoRefreshToken: false
        } 
      }
    );

    // Créer l'utilisateur super admin
    const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
      email: 'superadmin@newai.sale',
      password: 'SuperAdmin2024!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Super Admin'
      }
    });

    if (userError) {
      // Si l'utilisateur existe déjà, ce n'est pas une erreur critique
      if (userError.message.includes('already registered')) {
        // Récupérer l'utilisateur existant
        const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
        const existingUser = existingUsers?.users.find(u => u.email === 'superadmin@newai.sale');
        
        if (existingUser) {
          // Assurer que le rôle admin est assigné
          const { error: roleError } = await supabaseClient
            .from('user_roles')
            .upsert({
              user_id: existingUser.id,
              role: 'admin'
            }, {
              onConflict: 'user_id,role'
            });

          if (roleError && !roleError.message.includes('duplicate')) {
            throw roleError;
          }

          return new Response(JSON.stringify({ 
            success: true,
            message: 'Super admin déjà existant, rôle confirmé',
            userId: existingUser.id 
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }
      throw userError;
    }

    // Assigner le rôle admin
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: userData.user.id,
        role: 'admin'
      });

    if (roleError && !roleError.message.includes('duplicate')) {
      throw roleError;
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Super admin créé avec succès',
      userId: userData.user.id,
      email: userData.user.email,
      defaultPassword: 'SuperAdmin2024! (À CHANGER IMMÉDIATEMENT)'
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in create-super-admin function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
