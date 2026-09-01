import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { validateCreateCheckout } from '../_shared/validation.ts';

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

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return json({ ok: true, stripe_configured: Boolean(stripeSecret) });
  }

  try {
    if (!stripeSecret) {
      return json({ error: 'Stripe is not configured. Missing STRIPE_SECRET_KEY.' }, 500);
    }

    const validation = validateCreateCheckout(body);
    if (!validation.success || !validation.data) {
      return json({ error: 'Validation failed', details: validation.errors }, 400);
    }

    const {
      plan_id,
      billing_period = 'monthly',
      success_url,
      cancel_url,
      use_manual_promo,
    } = validation.data;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Authentication required' }, 401);

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Invalid session' }, 401);

    const { data: usage } = await (supabase as any)
      .from('usage_tracking')
      .select('products_count')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const productCount = Number(usage?.products_count || 0);

    const { data: plan, error: planError } = await (supabase as any)
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) return json({ error: 'Plan not found' }, 404);

    const maxProducts = Number(plan.max_products ?? -1);
    if (maxProducts !== -1 && productCount > maxProducts) {
      const { data: alternatives } = await (supabase as any)
        .from('subscription_plans')
        .select('id, max_products')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      const suggestedPlan = alternatives?.find(
        (candidate: any) => Number(candidate.max_products) === -1 || Number(candidate.max_products) >= productCount,
      );

      return json({
        error: `Votre boutique contient ${productCount} produits, au-dessus de la limite de ${maxProducts} du plan ${plan.name}.`,
        suggested_plan_id: suggestedPlan?.id || null,
      }, 400);
    }

    const isYearly = billing_period === 'yearly';
    const priceColumn = isYearly ? 'stripe_price_id_yearly' : 'stripe_price_id_monthly';
    let priceId = plan[priceColumn] as string | null;
    let productId = plan.stripe_product_id as string | null;

    // Create the Stripe Product/Price server-side when the DB plan exists but
    // Stripe IDs have not been synchronized yet. This makes checkout self-healing.
    if (!productId || !productId.startsWith('prod_')) {
      const product = await stripe.products.create({
        name: `Nexora AI — ${plan.name}`,
        description: plan.description || `Nexora AI ${plan.name} subscription`,
        metadata: {
          billing_type: 'subscription',
          plan_id: plan.id,
          plan_name: plan.name,
        },
      });
      productId = product.id;
    }

    if (!priceId || !priceId.startsWith('price_')) {
      const rawAmount = isYearly
        ? (plan.price_yearly_eur ?? plan.price_yearly)
        : (plan.price_monthly_eur ?? plan.price_monthly);
      const amount = Number(rawAmount);

      if (!Number.isFinite(amount) || amount <= 0) {
        return json({
          error: `Le prix ${isYearly ? 'annuel' : 'mensuel'} du plan ${plan.name} n'est pas configuré.`,
        }, 400);
      }

      const price = await stripe.prices.create({
        product: productId,
        unit_amount: Math.round(amount * 100),
        currency: 'eur',
        recurring: { interval: isYearly ? 'year' : 'month' },
        metadata: {
          billing_type: 'subscription',
          plan_id: plan.id,
          billing_period,
        },
      });
      priceId = price.id;

      const { error: priceSyncError } = await (supabase as any)
        .from('subscription_plans')
        .update({
          stripe_product_id: productId,
          [priceColumn]: priceId,
        })
        .eq('id', plan.id);
      if (priceSyncError) throw priceSyncError;
    } else if (productId !== plan.stripe_product_id) {
      await (supabase as any)
        .from('subscription_plans')
        .update({ stripe_product_id: productId })
        .eq('id', plan.id);
    }

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id as string | null;
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if ((customer as Stripe.DeletedCustomer).deleted) customerId = null;
      } catch {
        customerId = null;
      }
    }

    if (!customerId && user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      customerId = customers.data[0]?.id || null;
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name || user.user_metadata?.full_name || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    await (supabase as any)
      .from('profiles')
      .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });
    const activeStatuses = new Set(['active', 'trialing', 'past_due', 'unpaid']);
    const activeSubscription = existingSubscriptions.data.find((sub) => activeStatuses.has(sub.status));

    if (activeSubscription) {
      return json({
        error: 'Vous avez déjà un abonnement Stripe actif. Utilisez « Changer de plan » pour le modifier.',
        redirect_to_upgrade: true,
        stripe_subscription_id: activeSubscription.id,
      }, 400);
    }

    const origin = req.headers.get('origin') || Deno.env.get('PUBLIC_APP_URL') || 'http://localhost:8080';
    const metadata = {
      user_id: user.id,
      plan_id: plan.id,
      billing_period,
      plan_name: plan.name,
      billing_type: 'subscription',
    };

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      payment_method_collection: 'always',
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata,
      subscription_data: { metadata },
      success_url: success_url || `${origin}/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${origin}/subscription?checkout=cancelled&plan_id=${encodeURIComponent(plan.id)}`,
      billing_address_collection: 'required',
    };

    if (use_manual_promo === true) {
      sessionConfig.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    if (!session.url) throw new Error('Stripe did not return a checkout URL');

    console.log('Stripe checkout created', {
      session_id: session.id,
      user_id: user.id,
      plan_id: plan.id,
      billing_period,
    });

    return json({ url: session.url, session_id: session.id, free: false });
  } catch (error) {
    console.error('create-checkout failed', error);
    return json({ error: error instanceof Error ? error.message : 'Checkout failed' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
