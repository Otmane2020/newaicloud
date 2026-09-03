import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_SCOPE = "https://www.googleapis.com/auth/business.manage";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GOOGLE_ACCOUNTS_URL = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
const GOOGLE_LOCATIONS_URL = "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const googleClientId = Deno.env.get("GOOGLE_BUSINESS_CLIENT_ID") ?? "";
const googleClientSecret = Deno.env.get("GOOGLE_BUSINESS_CLIENT_SECRET") ?? "";
const appUrl = (Deno.env.get("APP_URL") || "https://newaicloud.vercel.app").replace(/\/$/, "");
const redirectUri = Deno.env.get("GOOGLE_BUSINESS_REDIRECT_URI") ||
  `${supabaseUrl}/functions/v1/google-business-oauth?action=callback`;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function appRedirect(params: Record<string, string>) {
  const url = new URL(`${appUrl}/account`);
  url.searchParams.set("tab", "integrations");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return Response.redirect(url.toString(), 302);
}

function assertConfiguration() {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase server configuration is missing");
  if (!googleClientId || !googleClientSecret) throw new Error("Google Business OAuth credentials are missing");
}

async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Not authenticated");

  const token = authHeader.slice("Bearer ".length);
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) throw new Error("Not authenticated");
  return user;
}

function makeState() {
  return `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
}

function expiresAtFromSeconds(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds)) return null;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function safeGoogleError(payload: any, fallback: string) {
  const message = payload?.error?.message || payload?.error_description || payload?.error || fallback;
  return typeof message === "string" ? message.slice(0, 500) : fallback;
}

async function fetchGoogleJson(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

async function handleStart(req: Request) {
  const user = await requireUser(req);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  const state = makeState();

  await admin.from("google_business_oauth_states").delete().eq("user_id", user.id).lt("expires_at", now.toISOString());

  const { error } = await admin.from("google_business_oauth_states").insert({
    state,
    user_id: user.id,
    expires_at: expiresAt,
  });
  if (error) throw new Error(`Unable to create OAuth state: ${error.message}`);

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", googleClientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("state", state);

  return json({ authUrl: authUrl.toString() });
}

async function handleCallback(url: URL) {
  const oauthError = url.searchParams.get("error");
  if (oauthError) return appRedirect({ google_error: "oauth_denied" });

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return appRedirect({ google_error: "missing_callback_params" });

  const nowIso = new Date().toISOString();
  const { data: stateRow, error: stateError } = await admin
    .from("google_business_oauth_states")
    .update({ used_at: nowIso })
    .eq("state", state)
    .is("used_at", null)
    .gt("expires_at", nowIso)
    .select("user_id")
    .maybeSingle();

  if (stateError || !stateRow?.user_id) return appRedirect({ google_error: "invalid_state" });

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error("Google token exchange failed", tokenResponse.status, safeGoogleError(tokenData, "token_exchange_failed"));
    return appRedirect({ google_error: "token_exchange_failed" });
  }

  const expiresAt = expiresAtFromSeconds(tokenData.expires_in);
  const scopes = typeof tokenData.scope === "string" ? tokenData.scope.split(" ").filter(Boolean) : [GOOGLE_SCOPE];

  const { data: existingCredential } = await admin
    .from("google_business_credentials")
    .select("refresh_token")
    .eq("user_id", stateRow.user_id)
    .maybeSingle();

  const refreshToken = tokenData.refresh_token || existingCredential?.refresh_token || null;

  const { error: credentialError } = await admin.from("google_business_credentials").upsert({
    user_id: stateRow.user_id,
    access_token: tokenData.access_token,
    refresh_token: refreshToken,
    token_type: tokenData.token_type || "Bearer",
    scopes,
    expires_at: expiresAt,
    updated_at: nowIso,
  }, { onConflict: "user_id" });
  if (credentialError) throw new Error(`Unable to store Google credential: ${credentialError.message}`);

  const accountsResult = await fetchGoogleJson(GOOGLE_ACCOUNTS_URL, tokenData.access_token);
  const locationsUrl = new URL(GOOGLE_LOCATIONS_URL);
  locationsUrl.searchParams.set("readMask", "name,title,storeCode,websiteUri");
  locationsUrl.searchParams.set("pageSize", "100");
  const locationsResult = accountsResult.ok
    ? await fetchGoogleJson(locationsUrl.toString(), tokenData.access_token)
    : { ok: false, status: accountsResult.status, payload: {} };

  const accounts = accountsResult.ok && Array.isArray(accountsResult.payload?.accounts)
    ? accountsResult.payload.accounts
    : [];
  const locations = locationsResult.ok && Array.isArray(locationsResult.payload?.locations)
    ? locationsResult.payload.locations
    : [];

  const apiAccessRequired = accountsResult.status === 403 || locationsResult.status === 403;
  const apiFailure = !accountsResult.ok || !locationsResult.ok;
  const connectionStatus = apiAccessRequired ? "api_access_required" : apiFailure ? "error" : "connected";
  const apiError = !accountsResult.ok
    ? safeGoogleError(accountsResult.payload, `accounts_http_${accountsResult.status}`)
    : !locationsResult.ok
      ? safeGoogleError(locationsResult.payload, `locations_http_${locationsResult.status}`)
      : null;

  const firstAccount = accounts[0] || null;
  const { error: connectionError } = await admin.from("google_business_connections").upsert({
    user_id: stateRow.user_id,
    status: connectionStatus,
    google_account_name: firstAccount?.name || null,
    account_display_name: firstAccount?.accountName || null,
    accounts,
    locations,
    scopes,
    token_expires_at: expiresAt,
    api_error: apiError,
    connected_at: nowIso,
    updated_at: nowIso,
  }, { onConflict: "user_id" });
  if (connectionError) throw new Error(`Unable to store Google Business connection: ${connectionError.message}`);

  return appRedirect({ google: connectionStatus });
}

async function handleStatus(req: Request) {
  const user = await requireUser(req);
  const { data, error } = await admin
    .from("google_business_connections")
    .select("status, google_account_name, account_display_name, accounts, locations, scopes, token_expires_at, api_error, connected_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(`Unable to load Google Business status: ${error.message}`);
  if (!data) return json({ connected: false, connection: null });

  const accountsCount = Array.isArray(data.accounts) ? data.accounts.length : 0;
  const locationsCount = Array.isArray(data.locations) ? data.locations.length : 0;
  const locationTitles = Array.isArray(data.locations)
    ? data.locations.map((location: any) => location?.title).filter(Boolean).slice(0, 5)
    : [];

  return json({
    connected: data.status === "connected" || data.status === "api_access_required",
    connection: {
      status: data.status,
      googleAccountName: data.google_account_name,
      accountDisplayName: data.account_display_name,
      accountsCount,
      locationsCount,
      locationTitles,
      tokenExpiresAt: data.token_expires_at,
      apiError: data.api_error,
      connectedAt: data.connected_at,
      updatedAt: data.updated_at,
    },
  });
}

async function handleDisconnect(req: Request) {
  const user = await requireUser(req);
  const { data: credential } = await admin
    .from("google_business_credentials")
    .select("access_token, refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  const tokenToRevoke = credential?.refresh_token || credential?.access_token;
  if (tokenToRevoke) {
    await fetch(GOOGLE_REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: tokenToRevoke }),
    }).catch(() => undefined);
  }

  const { error: credentialsDeleteError } = await admin
    .from("google_business_credentials")
    .delete()
    .eq("user_id", user.id);
  if (credentialsDeleteError) throw new Error(`Unable to remove Google credential: ${credentialsDeleteError.message}`);

  const { error: connectionDeleteError } = await admin
    .from("google_business_connections")
    .delete()
    .eq("user_id", user.id);
  if (connectionDeleteError) throw new Error(`Unable to remove Google Business connection: ${connectionDeleteError.message}`);

  return json({ success: true });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    assertConfiguration();
    const url = new URL(req.url);
    const queryAction = url.searchParams.get("action");

    if (req.method === "GET" && queryAction === "callback") return await handleCallback(url);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = queryAction || body?.action;

    switch (action) {
      case "start":
        return await handleStart(req);
      case "status":
        return await handleStatus(req);
      case "disconnect":
        return await handleDisconnect(req);
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("google-business-oauth error", message);
    const status = message === "Not authenticated" ? 401 : 500;
    return json({ error: message }, status);
  }
});
