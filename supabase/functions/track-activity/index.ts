import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackActivityRequest {
  user_id: string;
  action_type: string;
  page: string;
  store_id?: string | null;
  metadata?: Record<string, any>;
}

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

    const { user_id, action_type, page, store_id, metadata }: TrackActivityRequest = await req.json();

    // Validate input
    if (!user_id || !action_type || !page) {
      return new Response(
        JSON.stringify({ error: "user_id, action_type et page sont requis" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Insert activity
    const { error } = await supabaseClient
      .from('user_activity')
      .insert({
        user_id,
        action_type,
        page,
        store_id: store_id || null,
        metadata: metadata || {},
        date: new Date().toISOString().split('T')[0]
      });

    if (error) {
      console.error("❌ Erreur lors de l'enregistrement de l'activité:", error);
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Activité enregistrée avec succès'
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("❌ Erreur dans track-activity:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Impossible d\'enregistrer l\'activité' 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
