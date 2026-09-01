import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Bootstraps billing for an authenticated session:
 * - recovers any paid credit checkout that was not credited after redirect
 * - creates missing Stripe subscription Products/Prices from DB plans
 * Both server operations are idempotent.
 */
export function StripePlanBootstrap({ userId }: { userId: string }) {
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const planStorageKey = `stripe-plans-synced:${userId}`;
    const topupStorageKey = `stripe-credit-topups-recovered:${userId}`;

    const recoverTopups = async () => {
      if (sessionStorage.getItem(topupStorageKey) === "true") return;

      try {
        const { data, error } = await supabase.functions.invoke("sync-credit-topups", {
          body: { source: "app_bootstrap" },
        });
        if (cancelled) return;
        if (error) {
          console.warn("Stripe credit recovery skipped:", error.message);
          return;
        }
        if (data?.ok === true) {
          sessionStorage.setItem(topupStorageKey, "true");
        }
      } catch (error) {
        console.warn("Stripe credit recovery failed:", error);
      }
    };

    const syncPlans = async () => {
      if (sessionStorage.getItem(planStorageKey) === "true") return;

      try {
        const { data, error } = await supabase.functions.invoke("ensure-stripe-plans", {
          body: { source: "app_bootstrap" },
        });

        if (cancelled) return;
        if (error) {
          console.warn("Stripe plan bootstrap skipped:", error.message);
          return;
        }

        const successful = data?.ok === true ||
          (typeof data?.failed === "number" && data.failed === 0) ||
          (typeof data?.synced === "number" && data.synced > 0);

        if (successful) {
          sessionStorage.setItem(planStorageKey, "true");

          // Subscription.tsx historically hides DB plans that do not yet have
          // Stripe IDs. If this sync just created them while that page was
          // mounting, reload it once so the freshly persisted IDs are read.
          if (window.location.pathname === "/subscription") {
            window.location.reload();
          }
        }
      } catch (error) {
        console.warn("Stripe plan bootstrap failed:", error);
      }
    };

    const bootstrap = async () => {
      // Recover money already paid before doing anything that might reload the
      // subscription page.
      await recoverTopups();
      if (!cancelled) await syncPlans();
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
}
