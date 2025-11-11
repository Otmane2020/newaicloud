import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[TRIGGER-HOURLY-SYNC] ========================================');
    console.log('[TRIGGER-HOURLY-SYNC] Triggered at:', new Date().toISOString());
    console.log('[TRIGGER-HOURLY-SYNC] Calling scheduled-sync function...');
    console.log('[TRIGGER-HOURLY-SYNC] ========================================');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the scheduled-sync function
    const { data, error } = await supabase.functions.invoke('scheduled-sync', {
      body: {},
    });

    if (error) {
      console.error('[TRIGGER-HOURLY-SYNC] Error calling scheduled-sync:', error);
      throw error;
    }

    console.log('[TRIGGER-HOURLY-SYNC] ✅ Successfully triggered scheduled-sync');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Hourly sync triggered successfully',
        data,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[TRIGGER-HOURLY-SYNC] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
