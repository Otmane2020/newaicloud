// Phase 2C: Health Check pour Google APIs
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const checks = {
      google_client_id: !!Deno.env.get("GOOGLE_CLIENT_ID"),
      google_client_secret: !!Deno.env.get("GOOGLE_CLIENT_SECRET"),
      timestamp: new Date().toISOString(),
    };

    const allConfigured = checks.google_client_id && checks.google_client_secret;

    return new Response(
      JSON.stringify({
        healthy: allConfigured,
        checks,
        message: allConfigured 
          ? "All Google API credentials are configured" 
          : "Missing Google API credentials",
      }),
      {
        status: allConfigured ? 200 : 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Health check error:", error);
    return new Response(
      JSON.stringify({ 
        healthy: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
