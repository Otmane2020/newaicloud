import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export const AI_CREDIT_COSTS = {
  text: 1,
  seo: 1,
  content: 2,
  smart_analysis: 3,
  image: 4,
  video: 8,
} as const;

export type CreditAction = keyof typeof AI_CREDIT_COSTS;

export class CreditBillingError extends Error {
  status: number;
  code: string;
  required?: number;
  balance?: number;

  constructor(message: string, options: { status: number; code: string; required?: number; balance?: number }) {
    super(message);
    this.name = "CreditBillingError";
    this.status = options.status;
    this.code = options.code;
    this.required = options.required;
    this.balance = options.balance;
  }
}

export type CreditReservation = {
  userId: string | null;
  cost: number;
  balanceAfter: number | null;
  referenceId: string | null;
  internal: boolean;
};

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Reserve credits before calling a paid AI provider.
 * - End users are charged atomically through apply_credit_transaction().
 * - Service-role internal jobs are not charged to a user wallet.
 * - An idempotency key can be sent as x-idempotency-key; otherwise one is generated.
 */
export async function reserveCredits(
  req: Request,
  action: CreditAction,
  metadata: Record<string, unknown> = {},
): Promise<CreditReservation> {
  const cost = AI_CREDIT_COSTS[action];
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!authHeader) {
    throw new CreditBillingError("Authentication required", { status: 401, code: "AUTH_REQUIRED" });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (serviceRoleKey && token === serviceRoleKey) {
    return { userId: null, cost: 0, balanceAfter: null, referenceId: null, internal: true };
  }

  const supabase = adminClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    throw new CreditBillingError("Invalid session", { status: 401, code: "INVALID_SESSION" });
  }

  const idempotencyKey = (req.headers.get("x-idempotency-key") || crypto.randomUUID()).slice(0, 180);
  const referenceId = `ai:${action}:${user.id}:${idempotencyKey}`;

  const { data: balanceAfter, error } = await supabase.rpc("apply_credit_transaction", {
    p_user_id: user.id,
    p_amount: -cost,
    p_type: `ai_${action}`,
    p_reference_id: referenceId,
    p_metadata: {
      action,
      cost,
      ...metadata,
    },
  });

  if (error) {
    if (String(error.message || "").includes("INSUFFICIENT_CREDITS")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .maybeSingle();
      const balance = Number(profile?.credits ?? 0);
      throw new CreditBillingError(
        `Insufficient credits: ${cost} required, ${balance} available`,
        { status: 402, code: "INSUFFICIENT_CREDITS", required: cost, balance },
      );
    }
    throw error;
  }

  return {
    userId: user.id,
    cost,
    balanceAfter: typeof balanceAfter === "number" ? balanceAfter : Number(balanceAfter),
    referenceId,
    internal: false,
  };
}

/** Refund a reservation when the AI operation itself fails. */
export async function refundCredits(
  reservation: CreditReservation | null,
  reason: string,
): Promise<void> {
  if (!reservation || reservation.internal || !reservation.userId || !reservation.referenceId || reservation.cost <= 0) return;

  const supabase = adminClient();
  const { error } = await supabase.rpc("apply_credit_transaction", {
    p_user_id: reservation.userId,
    p_amount: reservation.cost,
    p_type: "ai_refund",
    p_reference_id: `refund:${reservation.referenceId}`,
    p_metadata: {
      reason,
      original_reference_id: reservation.referenceId,
    },
  });

  if (error) console.error("Credit refund failed", error);
}

export function creditErrorResponse(error: unknown, corsHeaders: Record<string, string>): Response | null {
  if (!(error instanceof CreditBillingError)) return null;

  return new Response(JSON.stringify({
    success: false,
    error: error.message,
    code: error.code,
    required_credits: error.required,
    credit_balance: error.balance,
    recharge_required: error.status === 402,
  }), {
    status: error.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
