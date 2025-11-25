import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConsumeRequest {
  actionType: 'article' | 'campaign';
  frequency?: 'monthly' | 'weekly' | 'daily';
  store_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Safe healthCheck handler
  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create client to verify user
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const body: ConsumeRequest = await req.json();
    const { actionType, frequency } = body;

    // Calculate cost based on action type and frequency
    let cost = 0;
    if (actionType === 'article') {
      cost = 10;
    } else if (actionType === 'campaign') {
      if (frequency === 'monthly') cost = 10;
      else if (frequency === 'weekly') cost = 40;
      else if (frequency === 'daily') cost = 300;
      else throw new Error('Invalid campaign frequency');
    } else {
      throw new Error('Invalid action type');
    }

    console.log(`[CONSUME] User ${user.id} wants to consume ${cost} optimizations for ${actionType}${frequency ? ` (${frequency})` : ''}`);

    // Admin client for updates
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Get current usage
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    const monthKey = currentMonth.toISOString().split('T')[0];

    const { data: usage } = await supabaseAdmin
      .from('usage_tracking')
      .select('*')
      .eq('seller_id', user.id)
      .eq('month', monthKey)
      .maybeSingle();

    // Get plan limits
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('current_plan_id')
      .eq('id', user.id)
      .single();

    const { data: plan } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('id', profile?.current_plan_id || 'trial')
      .single();

    if (!plan) {
      throw new Error('Plan not found');
    }

    const currentOptimizations = usage?.optimizations_count || 0;
    const maxOptimizations = plan.trial_max_optimizations || plan.max_optimizations_monthly || 0;
    const remainingOptimizations = maxOptimizations - currentOptimizations;

    console.log(`[CONSUME] Current: ${currentOptimizations}, Max: ${maxOptimizations}, Remaining: ${remainingOptimizations}`);

    // Check if user can afford
    if (remainingOptimizations < cost) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Insufficient optimization balance',
          currentBalance: remainingOptimizations,
          required: cost,
          deficit: cost - remainingOptimizations
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Consume optimizations
    const newOptimizationsCount = currentOptimizations + cost;
    const updateData: any = {
      optimizations_count: newOptimizationsCount
    };

    // Track specific consumption
    if (actionType === 'article') {
      updateData.optimizations_consumed_for_articles = (usage?.optimizations_consumed_for_articles || 0) + cost;
    } else if (actionType === 'campaign') {
      updateData.optimizations_consumed_for_campaigns = (usage?.optimizations_consumed_for_campaigns || 0) + cost;
    }

    if (usage) {
      // Update existing usage
      const { error: updateError } = await supabaseAdmin
        .from('usage_tracking')
        .update(updateData)
        .eq('id', usage.id);

      if (updateError) throw updateError;
    } else {
      // Create new usage record
      const { error: insertError } = await supabaseAdmin
        .from('usage_tracking')
        .insert({
          seller_id: user.id,
          month: monthKey,
          ...updateData
        });

      if (insertError) throw insertError;
    }

    console.log(`[CONSUME] ✅ Successfully consumed ${cost} optimizations. New total: ${newOptimizationsCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        consumed: cost,
        previousBalance: remainingOptimizations,
        newBalance: remainingOptimizations - cost,
        actionType,
        frequency
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[CONSUME] ❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
