import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ShopifyApp() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const processShopifyOAuth = async () => {
      const shop = params.get("shop");
      const code = params.get("code");
      const hmac = params.get("hmac");
      const timestamp = params.get("timestamp");

      if (!shop || !code || !hmac || !timestamp) {
        toast.error("Invalid installation", {
          description: "Missing Shopify OAuth parameters.",
        });
        return;
      }

      // Appelle l’edge function pour échanger le code contre access_token Shopify
      const { data, error } = await supabase.functions.invoke("shopify-auth-callback", {
        body: { shop, code, hmac, timestamp },
      });

      if (error) {
        toast.error("Authentication failed", { description: error.message });
        return;
      }

      // le backend doit renvoyer un JWT interne basé sur le shop
      if (!data?.jwt) {
        toast.error("Invalid session", { description: "Missing JWT." });
        return;
      }

      // Connecte l'app via SUPABASE, mais SANS créer un user classique
      await supabase.auth.setSession({
        access_token: data.jwt,
        refresh_token: data.jwt,
      });

      toast.success("Welcome back!");

      navigate("/dashboard", { replace: true });
    };

    processShopifyOAuth();
  }, [params]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto" />
        <h1 className="text-xl font-bold">Finalizing your installation…</h1>
        <p>This will only take a moment.</p>
      </div>
    </div>
  );
}
