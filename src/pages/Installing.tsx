import { useEffect, useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";

export default function Installing() {
  const [searchParams] = useSearchParams();
  const shop = searchParams.get("shop");
  const [steps, setSteps] = useState({
    connection: false,
    authorization: false,
    finalizing: true,
  });

  useEffect(() => {
    if (!shop) return;

    let attempts = 0;
    const maxAttempts = 20;

    // Simulate progressive steps
    const timer1 = setTimeout(() => setSteps(s => ({ ...s, connection: true })), 500);
    const timer2 = setTimeout(() => setSteps(s => ({ ...s, authorization: true })), 1200);

    const interval = setInterval(async () => {
      attempts++;

      try {
        const { data, error } = await supabase.functions.invoke("installation-status", {
          body: { shopDomain: shop },
        });

        if (!error && data?.ready) {
          clearInterval(interval);
          setSteps(s => ({ ...s, finalizing: false }));
          
          // Small delay before redirect for smooth UX
          setTimeout(() => {
            window.location.href = `/app/setup-wizard?shop=${encodeURIComponent(shop)}`;
          }, 300);
        }
      } catch (_) {
        // Silently continue polling
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        // After max attempts, redirect anyway - OAuth should have completed
        window.location.href = `/app/setup-wizard?shop=${encodeURIComponent(shop)}`;
      }
    }, 500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [shop]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <img src="/shopify-logo.svg" alt="Shopify" className="h-12" />

      <Loader2 className="h-10 w-10 animate-spin text-foreground" />

      <h1 className="text-xl font-semibold text-foreground">
        Installation de NewAI en cours…
      </h1>

      <div className="space-y-2 text-sm text-muted-foreground text-center">
        <p className="flex items-center justify-center gap-2">
          {steps.connection ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Connexion à Shopify
        </p>
        <p className="flex items-center justify-center gap-2">
          {steps.authorization ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Autorisations validées
        </p>
        <p className="flex items-center justify-center gap-2">
          {!steps.finalizing ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Finalisation de l'installation…
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Cela prend généralement moins de 5 secondes
      </p>
    </div>
  );
}
