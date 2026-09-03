import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function base64urlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function verifyState(state: string, secret: string) {
  const [encodedPayload, encodedSignature] = state.split(".");
  if (!encodedPayload || !encodedSignature) return null;

  const payloadBytes = base64urlDecode(encodedPayload);
  const payload = new TextDecoder().decode(payloadBytes);
  const signature = base64urlDecode(encodedSignature);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(payload));
  if (!valid) return null;

  const parsed = JSON.parse(payload) as { uid?: string; ts?: number };
  if (!parsed.uid || !parsed.ts || Date.now() - parsed.ts > 10 * 60 * 1000) return null;
  return parsed;
}

Deno.serve(async (req) => {
  const appUrl = Deno.env.get("APP_URL") || "https://newaicloud.vercel.app";
  const redirect = (params: Record<string, string>) => {
    const url = new URL("/account", appUrl);
    url.searchParams.set("tab", "integrations");
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return Response.redirect(url.toString(), 302);
  };

  try {
    const requestUrl = new URL(req.url);
    const code = requestUrl.searchParams.get("code");
    const state = requestUrl.searchParams.get("state");
    const oauthError = requestUrl.searchParams.get("error");

    if (oauthError) return redirect({ google_business: "error", reason: oauthError });
    if (!code || !state) return redirect({ google_business: "error", reason: "missing_code_or_state" });

    const clientId = Deno.env.get("GOOGLE_BUSINESS_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_BUSINESS_CLIENT_SECRET")!;
    const redirectUri = Deno.env.get("GOOGLE_BUSINESS_REDIRECT_URI")!;
    const stateSecret = Deno.env.get("GOOGLE_OAUTH_STATE_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!clientId || !clientSecret || !redirectUri || !stateSecret) {
      return redirect({ google_business: "error", reason: "oauth_not_configured" });
    }

    const verified = await verifyState(state, stateSecret);
    if (!verified?.uid) return redirect({ google_business: "error", reason: "invalid_state" });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Google token exchange failed", await tokenResponse.text());
      return redirect({ google_business: "error", reason: "token_exchange_failed" });
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    const accountsResponse = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    let googleAccountId: string | null = null;
    let accountName: string | null = null;
    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json() as { accounts?: Array<{ name?: string; accountName?: string }> };
      const account = accountsData.accounts?.[0];
      googleAccountId = account?.name || null;
      accountName = account?.accountName || null;
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: existing } = await admin
      .from("google_business_connections")
      .select("refresh_token")
      .eq("user_id", verified.uid)
      .maybeSingle();

    const { error: saveError } = await admin
      .from("google_business_connections")
      .upsert({
        user_id: verified.uid,
        google_account_id: googleAccountId,
        account_name: accountName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || existing?.refresh_token || null,
        token_expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
        scope: tokens.scope || "https://www.googleapis.com/auth/business.manage",
        status: "connected",
      }, { onConflict: "user_id" });

    if (saveError) {
      console.error("Google Business connection save failed", saveError);
      return redirect({ google_business: "error", reason: "save_failed" });
    }

    return redirect({ google_business: "connected" });
  } catch (error) {
    console.error("Google Business OAuth callback failed", error);
    return redirect({ google_business: "error", reason: "callback_failed" });
  }
});
