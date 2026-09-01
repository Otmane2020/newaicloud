import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Keeps subscription_plans usable even when Stripe Product/Price IDs have not
 * been provisioned yet. The server function is idempotent and only creates
 * missing Stripe objects. We cache a successful run for the browser session.
 */
export function StripePlanBootstrap({ userId }: { userId: string }) {
  useEffect(() => {
    if (!userId) return;

    const storageKey = `stripe-plans-synced:${userId}`;
    if (sessionStorage.getItem(storageKey) === "true") return;

    let cancelled = false;

    const sync = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("ensure-stripe-plans", {
          body: { source: "app_bootstrap" },
        });

        if (cancelled) return;
        if (error) {
          console.warn("Stripe plan bootstrap skipped:", error.message);
          return;
        }

        if (data?.ok === true || (typeof data?.failed === "number" && data.failed === 0)) {
          sessionStorage.setItem(storageKey, "true");
        }
      } catch (error) {
        console.warn("Stripe plan bootstrap failed:", error);
      }
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
}
