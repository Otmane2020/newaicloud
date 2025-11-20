import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

interface ValidateResult {
  valid: boolean;
  error?: string;
  userId?: string;
  apiKeyId?: string;
  allowedEndpoints?: string[] | null;
  environment?: string;
}

export async function validateApiKey(apiKey: string): Promise<ValidateResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Format attendu: "newai_live_xxxxx" ou "newai_test_xxxxx"
  if (!apiKey.startsWith('newai_')) {
    return { valid: false, error: 'Invalid API key format' };
  }

  const environment = apiKey.startsWith('newai_live_') ? 'production' : 'test';

  // Récupérer la clé et vérifier
  const { data: keyData, error } = await supabase
    .from('user_api_keys')
    .select(`
      *,
      profiles!inner(current_plan_id, subscription_status)
    `)
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .eq('environment', environment)
    .single();

  if (error || !keyData) {
    console.error('API key validation error:', error);
    return { valid: false, error: 'API key not found or inactive' };
  }

  // Vérifier expiration
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return { valid: false, error: 'API key expired' };
  }

  // Vérifier que l'utilisateur a un plan Enterprise actif
  const profile = keyData.profiles as any;
  if (!profile || 
      !profile.current_plan_id?.includes('enterprise') || 
      profile.subscription_status !== 'active') {
    return { 
      valid: false, 
      error: 'API access requires an active Enterprise subscription' 
    };
  }

  // Rate limiting simple (vérifier nb d'appels dans la dernière minute)
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  const { count } = await supabase
    .from('api_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', keyData.id)
    .gte('created_at', oneMinuteAgo);

  if (count && count >= keyData.rate_limit_per_minute) {
    return { 
      valid: false, 
      error: `Rate limit exceeded. Max ${keyData.rate_limit_per_minute} requests per minute` 
    };
  }

  // Mettre à jour last_used_at
  await supabase
    .from('user_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyData.id);

  return { 
    valid: true, 
    userId: keyData.user_id,
    apiKeyId: keyData.id,
    allowedEndpoints: keyData.allowed_endpoints,
    environment: keyData.environment
  };
}

export async function logApiCall(data: {
  apiKeyId: string;
  userId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  await supabase.from('api_usage_logs').insert({
    api_key_id: data.apiKeyId,
    user_id: data.userId,
    endpoint: data.endpoint,
    method: data.method,
    status_code: data.statusCode,
    response_time_ms: data.responseTimeMs,
    error_message: data.errorMessage,
    ip_address: data.ipAddress,
    user_agent: data.userAgent,
  });
}
