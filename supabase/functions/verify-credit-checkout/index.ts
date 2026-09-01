import "../_shared/strict-ai-generation.ts";
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-08-27.basil',
});
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Authentication required' }, 401);

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid session' }, 401);

    const { session_id } = await req.json();
    if (!session_id || typeof session_id !== 'string' || !session_id.startsWith('cs_')) {
      return json({ error: 'Invalid checkout session' }, 400);
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    const metadata = session.metadata || {};
    const sessionUserId = session.client_reference_id || metadata.user_id;

    if (sessionUserId !== user.id || metadata.type !== 'credit_topup') {
      return json({ error: 'Checkout does not belong to this account' }, 403);
    }

    if (session.payment_status !== 'paid') {
      return json({ paid: false, balance: null }, 200);
    }

    const credits = Number.parseInt(metadata.credits || '0', 10);
    if (!Number.isFinite(credits) || credits <= 0) {
      throw new Error('Invalid credit amount in Stripe metadata');
    }

    const { data: balance, error: creditError } = await supabase.rpc('apply_credit_transaction', {
      p_user_id: user.id,
      p_amount: credits,
      p_type: 'stripe_topup',
      p_reference_id: `stripe_checkout:${session.id}`,
      p_metadata: {
        stripe_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        package_id: metadata.package_id || null,
      },
    });

    if (creditError) throw creditError;
    return json({ paid: true, balance, added: credits });
  } catch (error) {
    console.error('verify-credit-checkout failed', error);
    return json({ error: error instanceof Error ? error.message : 'Verification failed' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
