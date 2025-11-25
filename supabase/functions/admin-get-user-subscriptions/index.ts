import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Vérifier que l'utilisateur est admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .single();
    
    if (roleError || !roleData) {
      throw new Error("Unauthorized - Admin access required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Récupérer tous les utilisateurs
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, email, stripe_customer_id, current_plan_id')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    // Pour chaque utilisateur, récupérer ses infos Stripe
    const userSubscriptions = await Promise.all(
      profiles.map(async (profile) => {
        if (!profile.email) {
          return {
            userId: profile.id,
            email: profile.email,
            subscriptions: [],
            hasStripeData: false
          };
        }

        try {
          // Chercher le customer Stripe
          const customers = await stripe.customers.list({
            email: profile.email,
            limit: 1,
          });

          if (customers.data.length === 0) {
            return {
              userId: profile.id,
              email: profile.email,
              subscriptions: [],
              hasStripeData: false
            };
          }

          const customerId = customers.data[0].id;
          
          // Récupérer les abonnements
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all',
            limit: 10,
          });

          return {
            userId: profile.id,
            email: profile.email,
            customerId,
            subscriptions: subscriptions.data.map((sub: any) => ({
              id: sub.id,
              status: sub.status,
              currentPeriodEnd: sub.current_period_end,
              planId: sub.items.data[0]?.price.id,
              productId: sub.items.data[0]?.price.product,
              amount: sub.items.data[0]?.price.unit_amount,
              currency: sub.items.data[0]?.price.currency,
              interval: sub.items.data[0]?.price.recurring?.interval,
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            })),
            hasStripeData: true
          };
        } catch (error) {
          console.error(`Error fetching Stripe data for ${profile.email}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return {
            userId: profile.id,
            email: profile.email,
            subscriptions: [],
            hasStripeData: false,
            error: errorMessage
          };
        }
      })
    );

    return new Response(JSON.stringify({ users: userSubscriptions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in admin-get-user-subscriptions:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
