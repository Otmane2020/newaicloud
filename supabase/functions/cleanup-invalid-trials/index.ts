import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧹 Starting cleanup-invalid-trials');

    // Trouver tous les profils avec 'trialing' SANS stripe_customer_id
    const { data: invalidProfiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, subscription_status, stripe_customer_id')
      .eq('subscription_status', 'trialing')
      .is('stripe_customer_id', null);

    if (fetchError) throw fetchError;

    console.log(`📋 Found ${invalidProfiles?.length || 0} invalid trial profiles`);

    const results = {
      found: invalidProfiles?.length || 0,
      cleaned: 0,
      errors: [] as string[],
    };

    for (const profile of invalidProfiles || []) {
      try {
        console.log(`🔄 Cleaning invalid trial for ${profile.email}`);

        // Reset à 'inactive' et supprimer trial_ends_at
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'inactive',
            trial_ends_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (updateError) throw updateError;

        results.cleaned++;
        console.log(`✅ Cleaned profile ${profile.email}`);
      } catch (error) {
        console.error(`❌ Error cleaning ${profile.email}:`, error);
        results.errors.push(`${profile.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('✅ Cleanup complete:', results);

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in cleanup-invalid-trials:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
