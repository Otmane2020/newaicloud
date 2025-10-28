import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PerformanceMetric {
  user_id: string;
  function_name: string;
  operation: string;
  duration_ms: number;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, function_name, operation, duration_ms, metadata } = await req.json();

    if (!user_id || !function_name || !operation || duration_ms === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Sauvegarder les métriques en base
    const { error } = await supabase.from("performance_metrics").insert({
      user_id,
      function_name,
      operation,
      duration_ms: Math.round(duration_ms),
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error inserting metric:", error);
      throw error;
    }

    console.log(`📊 Metric logged: ${function_name}.${operation} = ${duration_ms}ms`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error logging metric:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
