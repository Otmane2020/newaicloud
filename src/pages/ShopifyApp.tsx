import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ShopifyApp() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const processPendingToken = async () => {
      const shop = params.get("shop");
      const pendingToken = params.get("pending_token");

      if (!shop || !pendingToken) {
        setStatus("error");
        toast.error("Installation error", {
          description: "Missing Shopify connection parameters.",
        });
        return;
      }

      try {
        // Call the edge function to claim the pending token
        const { data, error } = await supabase.functions.invoke("shopify-auto-auth", {
          body: { shop, pending_token: pendingToken },
        });

        if (error) {
          setStatus("error");
          toast.error("Authentication failed", { description: error.message });
          return;
        }

        // Auto-login using session tokens returned
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (sessionError) {
          setStatus("error");
          toast.error("Login failed", { description: sessionError.message });
          return;
        }

        toast.success("Welcome!", {
          description: "Your 14-day trial is now active.",
        });

        // Store pending sync to trigger auto-import dialog on dashboard
        sessionStorage.setItem('pending_sync', shop);

        navigate("/dashboard", { replace: true });
      } catch (err) {
        setStatus("error");
        toast.error("Unexpected error");
      }
    };

    processPendingToken();
  }, [params, navigate]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Installation failed</h1>
          <p className="text-muted-foreground mt-2">Something went wrong during installation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto" />
        <h1 className="text-xl font-bold mt-4">Setting up your app...</h1>
        <p className="text-muted-foreground mt-2">Your free trial is being activated.</p>
      </div>
    </div>
  );
}
