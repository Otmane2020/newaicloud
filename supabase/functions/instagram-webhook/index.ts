import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Handle Meta webhook verification (GET request)
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const verifyToken = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      console.log('[INSTAGRAM-WEBHOOK] Verification request:', { mode, hasToken: !!verifyToken, hasChallenge: !!challenge });

      const expectedToken = Deno.env.get('INSTAGRAM_VERIFY_TOKEN');

      // Meta webhook verification
      if (mode === 'subscribe' && verifyToken === expectedToken) {
        console.log('[INSTAGRAM-WEBHOOK] ✅ Verification successful');
        // Return ONLY the challenge value as plain text (NOT JSON)
        return new Response(challenge, { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      console.log('[INSTAGRAM-WEBHOOK] ❌ Verification failed - token mismatch');
      return new Response('Forbidden', { status: 403 });
    }

    // Handle webhook events (POST request)
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('[INSTAGRAM-WEBHOOK] Received webhook event:', JSON.stringify(body));

      // Process Instagram webhook events here if needed
      // For now, just acknowledge receipt

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method not allowed', { status: 405 });

  } catch (error: any) {
    console.error('[INSTAGRAM-WEBHOOK] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
