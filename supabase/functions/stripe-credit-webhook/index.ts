import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-08-27.basil',
});
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_CREDITS_WEBHOOK_SECRET');
  if (!signature || !webhookSecret) {
    return new Response('Webhook signature configuration missing', { status: 400 });
  }

  try {
    const rawBody = await req.text();
    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      await creditCheckout(event.data.object as Stripe.Checkout.Session);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('stripe-credit-webhook failed', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Webhook failed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }
});

async function creditCheckout(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  if (metadata.type !== 'credit_topup' || session.payment_status !== 'paid') return;

  const userId = session.client_reference_id || metadata.user_id;
  const credits = Number.parseInt(metadata.credits || '0', 10);
  if (!userId || !Number.isFinite(credits) || credits <= 0) {
    throw new Error('Invalid credit checkout metadata');
  }

  const { error } = await supabase.rpc('apply_credit_transaction', {
    p_user_id: userId,
    p_amount: credits,
    p_type: 'stripe_topup',
    p_reference_id: `stripe_checkout:${session.id}`,
    p_metadata: {
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      package_id: metadata.package_id || null,
    },
  });

  if (error) throw error;
}
