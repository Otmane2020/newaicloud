import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Demo account configuration (password handled securely server-side)
const DEMO_CONFIG = {
  email: 'store-demo-20240334@shopify.newai.sale',
  // The password is stored as a secret - NEVER exposed to client
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[demo-login] Starting demo login flow');
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[demo-login] Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Get demo password from secrets (stored securely)
    // For now, we'll use a magic link approach which is more secure
    
    // Generate a magic link for the demo account
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: DEMO_CONFIG.email,
      options: {
        redirectTo: `${req.headers.get('origin') || 'https://newai.sale'}/dashboard`,
      }
    });

    if (linkError) {
      console.error('[demo-login] Error generating magic link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate demo session', details: linkError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[demo-login] Magic link generated successfully');
    console.log('[demo-login] Link data:', JSON.stringify(linkData, null, 2));

    // Use the action_link directly - it contains everything needed
    const actionLink = linkData.properties?.action_link;
    
    if (!actionLink) {
      console.error('[demo-login] No action link in response');
      return new Response(
        JSON.stringify({ error: 'Failed to generate demo token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the verification URL that the client can use
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Demo session ready',
        verifyUrl: actionLink
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('[demo-login] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: 'Demo login failed', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
