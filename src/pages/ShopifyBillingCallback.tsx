import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";

const ShopifyBillingCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  
  const plan = searchParams.get("plan");
  const subscription = searchParams.get("subscription");
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) {
      setStatus("error");
      return;
    }

    if (subscription === "active") {
      setStatus("success");
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 3000);
    } else {
      // If we get here without success, it's an error
      setStatus("error");
    }
  }, [error, subscription, navigate]);

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
                    Processing payment...
                  </>
                )}
                {status === "success" && (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    Payment successful!
                  </>
                )}
                {status === "error" && (
                  <>
                    <XCircle className="w-6 h-6 text-red-500" />
                    Payment failed
                  </>
                )}
              </CardTitle>
              <CardDescription className="text-center">
                {status === "loading" && "Please wait while we confirm your subscription..."}
                {status === "success" && "Redirecting you to your dashboard..."}
                {status === "error" && "Something went wrong. Please try again."}
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
                      Your plan has been activated
                    </p>
                    {plan && (
                      <p className="font-semibold text-primary">{plan}</p>
                    )}
                  </div>
                )}
                {status === "error" && (
                  <div className="space-y-4 w-full">
                    <p className="text-sm text-muted-foreground text-center">
                      {error || "An unknown error occurred"}
                    </p>
                    <Button 
                      onClick={() => navigate("/onboarding")} 
                      className="w-full"
                    >
                      Back to plans
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
