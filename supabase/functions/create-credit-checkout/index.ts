import "../_shared/strict-ai-generation.ts";
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') || '';
const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' });
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!stripeSecret) throw new Error('Stripe is not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Authentication required' }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid session' }, 401);

    const { package_id } = await req.json();
    if (!package_id || typeof package_id !== 'string') {
      return json({ error: 'package_id is required' }, 400);
    }

    const { data: creditPackage, error: packageError } = await supabase
      .from('credit_packages')
      .select('id, name, credits, amount_cents, currency, stripe_product_id, stripe_price_id, active')
      .eq('id', package_id)
      .eq('active', true)
      .single();

    if (packageError || !creditPackage) {
      return json({ error: 'Credit package not found' }, 404);
    }

    let productId = creditPackage.stripe_product_id as string | null;
    let priceId = creditPackage.stripe_price_id as string | null;

    if (!productId || !productId.startsWith('prod_')) {
      const product = await stripe.products.create({
        name: `Nexora AI — ${creditPackage.name}`,
        description: `${creditPackage.credits} crédits IA à utiliser dans Nexora AI`,
        metadata: {
          billing_type: 'credit_topup',
          package_id: creditPackage.id,
          credits: String(creditPackage.credits),
        },
      });
      productId = product.id;
      priceId = null;
    }

    if (!priceId || !priceId.startsWith('price_')) {
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: creditPackage.amount_cents,
        currency: creditPackage.currency || 'eur',
        metadata: {
          billing_type: 'credit_topup',
          package_id: creditPackage.id,
          credits: String(creditPackage.credits),
        },
      });
      priceId = price.id;
    }

    if (
      productId !== creditPackage.stripe_product_id ||
      priceId !== creditPackage.stripe_price_id
    ) {
      const { error: syncError } = await supabase
        .from('credit_packages')
        .update({
          stripe_product_id: productId,
          stripe_price_id: priceId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creditPackage.id);
      if (syncError) throw syncError;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id as string | null;
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      const existing = user.email
        ? await stripe.customers.list({ email: user.email, limit: 1 })
        : null;
      customerId = existing?.data?.[0]?.id || null;
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name || user.user_metadata?.full_name || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    const origin = req.headers.get('origin') || Deno.env.get('PUBLIC_APP_URL') || 'http://localhost:8080';
    const metadata = {
      type: 'credit_topup',
      user_id: user.id,
      package_id: creditPackage.id,
      credits: String(creditPackage.credits),
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      success_url: `${origin}/dashboard?credit_payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?credit_payment=cancelled`,
      metadata,
      payment_intent_data: { metadata },
    });

    return json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('create-credit-checkout failed', error);
    return json({ error: error instanceof Error ? error.message : 'Checkout failed' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
