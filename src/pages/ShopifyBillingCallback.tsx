import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { supabase } from "@/integrations/supabase/client";

const ShopifyBillingCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const shop = searchParams.get("shop");
  const plan = searchParams.get("plan");
  const cycle = searchParams.get("cycle");
  const chargeId = searchParams.get("charge_id");
  const error = searchParams.get("error");

  useEffect(() => {
    const verifySubscription = async () => {
      // If there's an explicit error param, show error
      if (error) {
        setStatus("error");
        setErrorMessage(error);
        return;
      }

      // Need shop to verify
      if (!shop) {
        setStatus("error");
        setErrorMessage("Missing shop parameter");
        return;
      }

      try {
        console.log("[BillingCallback] Verifying subscription with Shopify...", { shop, plan, cycle, chargeId });

        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log("[BillingCallback] No session, redirecting to auth");
          setStatus("error");
          setErrorMessage("Please log in to continue");
          return;
        }

        // Call edge function to verify subscription with Shopify
        const { data, error: fnError } = await supabase.functions.invoke("shopify-billing-callback", {
          body: {
            shopDomain: shop,
            planId: plan,
            billingCycle: cycle,
            chargeId,
          },
        });

        console.log("[BillingCallback] Edge function response:", { data, fnError });

        if (fnError) {
          throw fnError;
        }

        if (data?.success) {
          setStatus("success");
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 2000);
        } else {
          setStatus("error");
          setErrorMessage(data?.error || "Subscription verification failed");
        }
      } catch (err) {
        console.error("[BillingCallback] Error:", err);
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "An error occurred");
      }
    };

    verifySubscription();
  }, [shop, plan, cycle, chargeId, error, navigate]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <PublicHeader />
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                {status === "loading" && (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Vérification du paiement...
                  </>
                )}
                {status === "success" && (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    Paiement réussi !
                  </>
                )}
                {status === "error" && (
                  <>
                    <XCircle className="w-6 h-6 text-red-500" />
                    Échec du paiement
                  </>
                )}
              </CardTitle>
              <CardDescription className="text-center">
                {status === "loading" && "Veuillez patienter pendant que nous confirmons votre abonnement..."}
                {status === "success" && "Redirection vers votre tableau de bord..."}
                {status === "error" && "Une erreur s'est produite. Veuillez réessayer."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-4 space-y-4">
                {status === "loading" && (
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                )}
                {status === "success" && (
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Votre plan a été activé
                    </p>
                    {plan && (
                      <p className="font-semibold text-primary capitalize">{plan}</p>
                    )}
                  </div>
                )}
                {status === "error" && (
                  <div className="space-y-4 w-full">
                    <p className="text-sm text-muted-foreground text-center">
                      {errorMessage || "Une erreur inconnue s'est produite"}
                    </p>
                    <Button 
                      onClick={() => {
                        // Go back to SetupWizard for Shopify users
                        if (shop) {
                          navigate(`/app/setup-wizard?shop=${encodeURIComponent(shop)}&embedded=1`);
                        } else {
                          navigate("/dashboard");
                        }
                      }} 
                      className="w-full"
                    >
                      Retour aux plans
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShopifyBillingCallback;

