import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      cart_abandoned: { processed: 0, sent: 0, errors: 0 },
      onboarding_abandoned: { processed: 0, sent: 0, errors: 0 },
      reminder_24h: { processed: 0, sent: 0, errors: 0 },
    };

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // 1. Process cart_abandoned (1 hour delay)
    console.log('Processing cart_abandoned automation...');
    const { data: abandonedCarts, error: cartsError } = await supabase
      .from('abandoned_carts')
      .select('*')
      .eq('recovery_email_sent', false)
      .eq('converted', false)
      .not('email', 'is', null)
      .lt('created_at', oneHourAgo.toISOString());

    if (cartsError) {
      console.error('Error fetching abandoned carts:', cartsError);
    } else if (abandonedCarts && abandonedCarts.length > 0) {
      console.log(`Found ${abandonedCarts.length} abandoned carts to process`);
      
      for (const cart of abandonedCarts) {
        results.cart_abandoned.processed++;
        try {
          // Send recovery email
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-recovery-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              email: cart.email,
              template: 'cart_abandoned',
              variables: {
                full_name: cart.full_name || 'there',
                plan_name: cart.plan_name || 'your selected plan',
              }
            }),
          });

          if (emailResponse.ok) {
            // Mark as sent
            await supabase
              .from('abandoned_carts')
              .update({ 
                recovery_email_sent: true, 
                recovery_email_sent_at: new Date().toISOString() 
              })
              .eq('id', cart.id);
            
            results.cart_abandoned.sent++;
            console.log(`Sent cart_abandoned email to ${cart.email}`);
          } else {
            results.cart_abandoned.errors++;
            console.error(`Failed to send email to ${cart.email}:`, await emailResponse.text());
          }
        } catch (err) {
          results.cart_abandoned.errors++;
          console.error(`Error processing cart ${cart.id}:`, err);
        }
      }
    }

    // 2. Process onboarding_abandoned (24 hour delay)
    console.log('Processing onboarding_abandoned automation...');
    const { data: abandonedOnboarding, error: onboardingError } = await supabase
      .from('potential_customers')
      .select('*')
      .eq('source', 'onboarding_view')
      .eq('status', 'lead')
      .is('first_email_sent_at', null)
      .lt('created_at', twentyFourHoursAgo.toISOString());

    if (onboardingError) {
      console.error('Error fetching abandoned onboarding:', onboardingError);
    } else if (abandonedOnboarding && abandonedOnboarding.length > 0) {
      console.log(`Found ${abandonedOnboarding.length} abandoned onboarding to process`);
      
      for (const lead of abandonedOnboarding) {
        results.onboarding_abandoned.processed++;
        try {
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-recovery-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              email: lead.email,
              template: 'onboarding_abandoned',
              variables: {
                full_name: lead.full_name || 'there',
              }
            }),
          });

          if (emailResponse.ok) {
            await supabase
              .from('potential_customers')
              .update({ first_email_sent_at: new Date().toISOString() })
              .eq('id', lead.id);
            
            results.onboarding_abandoned.sent++;
            console.log(`Sent onboarding_abandoned email to ${lead.email}`);
          } else {
            results.onboarding_abandoned.errors++;
            console.error(`Failed to send email to ${lead.email}:`, await emailResponse.text());
          }
        } catch (err) {
          results.onboarding_abandoned.errors++;
          console.error(`Error processing lead ${lead.id}:`, err);
        }
      }
    }

    // 3. Process reminder_24h (48 hour delay, after first email)
    console.log('Processing reminder_24h automation...');
    const { data: reminderLeads, error: reminderError } = await supabase
      .from('potential_customers')
      .select('*')
      .eq('status', 'lead')
      .not('first_email_sent_at', 'is', null)
      .is('second_email_sent_at', null)
      .lt('first_email_sent_at', twentyFourHoursAgo.toISOString());

    if (reminderError) {
      console.error('Error fetching reminder leads:', reminderError);
    } else if (reminderLeads && reminderLeads.length > 0) {
      console.log(`Found ${reminderLeads.length} leads for reminder`);
      
      for (const lead of reminderLeads) {
        results.reminder_24h.processed++;
        try {
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-recovery-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              email: lead.email,
              template: 'reminder_24h',
              variables: {
                full_name: lead.full_name || 'there',
              }
            }),
          });

          if (emailResponse.ok) {
            await supabase
              .from('potential_customers')
              .update({ second_email_sent_at: new Date().toISOString() })
              .eq('id', lead.id);
            
            results.reminder_24h.sent++;
            console.log(`Sent reminder_24h email to ${lead.email}`);
          } else {
            results.reminder_24h.errors++;
            console.error(`Failed to send email to ${lead.email}:`, await emailResponse.text());
          }
        } catch (err) {
          results.reminder_24h.errors++;
          console.error(`Error processing lead ${lead.id}:`, err);
        }
      }
    }

    console.log('Automation processing complete:', results);

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in process-recovery-automations:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
