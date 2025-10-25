import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENCRYPTION_KEY = Deno.env.get('SHOPIFY_TOKEN_ENCRYPTION_KEY');

// Simple AES-256-GCM encryption using Web Crypto API
async function encryptToken(token: string): Promise<{ encrypted: string; iv: string }> {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not configured');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  // Derive key from the encryption key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('shopify-token-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Convert to base64 for storage
  const encryptedArray = new Uint8Array(encrypted);
  const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));
  const ivBase64 = btoa(String.fromCharCode(...iv));

  return {
    encrypted: encryptedBase64,
    iv: ivBase64,
  };
}

async function decryptToken(encrypted: string, iv: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not configured');
  }

  const encoder = new TextEncoder();
  
  // Derive key from the encryption key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('shopify-token-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Decode from base64
  const encryptedArray = new Uint8Array(
    atob(encrypted).split('').map(c => c.charCodeAt(0))
  );
  const ivArray = new Uint8Array(
    atob(iv).split('').map(c => c.charCodeAt(0))
  );

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivArray },
    key,
    encryptedArray
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { action, token, encrypted, iv } = await req.json();

    if (action === 'encrypt') {
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Token required for encryption' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const result = await encryptToken(token);
      console.log('Token encrypted successfully');
      
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } else if (action === 'decrypt') {
      if (!encrypted || !iv) {
        return new Response(
          JSON.stringify({ error: 'Encrypted token and IV required for decryption' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const decrypted = await decryptToken(encrypted, iv);
      console.log('Token decrypted successfully');
      
      return new Response(
        JSON.stringify({ token: decrypted }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "encrypt" or "decrypt"' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  } catch (error: any) {
    console.error('Encryption operation failed');
    return new Response(
      JSON.stringify({ error: 'Encryption operation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
