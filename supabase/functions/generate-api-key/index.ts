import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

async function hashSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Vérifier que l'utilisateur a un plan Enterprise
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_plan_id, subscription_status')
      .eq('id', user.id)
      .single();

    if (!profile?.current_plan_id?.includes('enterprise') || profile.subscription_status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'API access requires an active Enterprise subscription' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { keyName, environment = 'production' } = await req.json();

    if (!keyName) {
      throw new Error('keyName is required');
    }

    // Générer la clé publique et le secret
    const prefix = environment === 'production' ? 'newai_live' : 'newai_test';
    const apiKey = `${prefix}_ak_${generateRandomString(32)}`;
    const apiSecret = `${prefix}_sk_${generateRandomString(64)}`;

    // Hasher le secret
    const secretHash = await hashSecret(apiSecret);

    // Créer la clé dans la base de données avec service role
    const supabaseService = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: newKey, error: insertError } = await supabaseService
      .from('user_api_keys')
      .insert({
        user_id: user.id,
        key_name: keyName,
        api_key: apiKey,
        api_secret_hash: secretHash,
        environment,
        rate_limit_per_minute: 100,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        apiKey: newKey,
        // IMPORTANT: Le secret n'est montré qu'une seule fois
        apiSecret,
        warning: 'Save this secret securely. It will not be shown again.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
