import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get abandoned users from profiles with their emails from auth.users
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, subscription_status, current_plan_id, has_used_trial, onboarding_completed, created_at')
      .eq('subscription_status', 'inactive')
      .is('current_plan_id', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (profileError) throw profileError;

    // Get emails from auth.users using admin API
    const abandonedUsers = [];
    
    for (const profile of profiles || []) {
      const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(profile.id);
      
      if (!userError && userData?.user) {
        const hoursSinceSignup = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60);
        abandonedUsers.push({
          ...profile,
          email: userData.user.email || 'unknown',
          hours_since_signup: hoursSinceSignup
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      users: abandonedUsers,
      count: abandonedUsers.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error getting abandoned users:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
