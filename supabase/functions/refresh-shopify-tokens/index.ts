import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENCRYPTION_KEY = Deno.env.get("SHOPIFY_TOKEN_ENCRYPTION_KEY") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function deriveKey(usage: "encrypt" | "decrypt"): Promise<CryptoKey> {
  if (!ENCRYPTION_KEY) throw new Error("Encryption key not configured");
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(ENCRYPTION_KEY.padEnd(32, "0").substring(0, 32)),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("shopify-token-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

async function decryptSecret(encrypted: string, iv: string): Promise<string> {
  const key = await deriveKey("decrypt");
  const bytes = new Uint8Array(atob(encrypted).split("").map((c) => c.charCodeAt(0)));
  const ivBytes = new Uint8Array(atob(iv).split("").map((c) => c.charCodeAt(0)));
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, key, bytes);
  return new TextDecoder().decode(decrypted);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    let payload: Record<string, unknown> = {};
    if (req.method === "POST") {
      payload = await req.json().catch(() => ({}));
    }
    const connectionId = typeof payload.connectionId === "string" ? payload.connectionId : null;
    const force = payload.force === true;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let query = supabase
      .from("shopify_connections")
      .select("id, store_url, api_key, encrypted_token, token_iv, available_scopes, connection_type")
      .eq("connection_type", "client_credentials")
      .eq("is_active", true);

    if (connectionId) query = query.eq("id", connectionId);

    const { data: connections, error } = await query;
    if (error) return json({ success: false, error: error.message }, 500);

    const results: Array<Record<string, unknown>> = [];

    for (const connection of connections || []) {
      const scopes = (connection.available_scopes || {}) as Record<string, unknown>;
      const expiresAtRaw = typeof scopes.token_expires_at === "string" ? scopes.token_expires_at : null;
      const expiresAt = expiresAtRaw ? new Date(expiresAtRaw).getTime() : 0;
      const needsRefresh = force || !expiresAt || expiresAt - Date.now() < 6 * 60 * 60 * 1000;

      if (!needsRefresh) {
        results.push({ id: connection.id, skipped: "still_valid", expiresAt: expiresAtRaw });
        continue;
      }

      if (!connection.api_key || !connection.encrypted_token || !connection.token_iv) {
        results.push({ id: connection.id, error: "missing_stored_credentials" });
        continue;
      }

      try {
        const clientSecret = await decryptSecret(connection.encrypted_token, connection.token_iv);
        const tokenResponse = await fetch(`https://${connection.store_url}/admin/oauth/access_token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: connection.api_key,
            client_secret: clientSecret,
          }),
        });

        if (!tokenResponse.ok) {
          const details = (await tokenResponse.text()).slice(0, 300);
          results.push({ id: connection.id, error: `token_exchange_failed_${tokenResponse.status}`, details });
          continue;
        }

        const tokenData = await tokenResponse.json();
        const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 86399) * 1000).toISOString();

        const { error: updateError } = await supabase
          .from("shopify_connections")
          .update({
            access_token: tokenData.access_token,
            available_scopes: { ...scopes, token_expires_at: newExpiresAt },
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);

        if (updateError) {
          results.push({ id: connection.id, error: updateError.message });
          continue;
        }

        results.push({ id: connection.id, refreshed: true, expiresAt: newExpiresAt });
      } catch (err) {
        results.push({ id: connection.id, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return json({
      success: true,
      total: connections?.length || 0,
      refreshed: results.filter((r) => r.refreshed).length,
      results,
    });
  } catch (err) {
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
