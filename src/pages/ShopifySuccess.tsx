import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ShopifySuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const shop = searchParams.get("shop");
  const status = searchParams.get("status");

  useEffect(() => {
    // Rediriger vers l'intégration après 3 secondes
    const timer = setTimeout(() => {
      navigate("/integration");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-xl p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-affirmative-primary/10 p-4">
            <CheckCircle className="h-16 w-16 text-affirmative-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Connexion réussie !
          </h1>
          <p className="text-muted-foreground">
            Votre boutique Shopify a été connectée avec succès
          </p>
        </div>

        {shop && (
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Boutique connectée</p>
            <p className="font-semibold text-foreground">{shop}</p>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Redirection automatique dans 3 secondes...
          </p>
          <Button
            onClick={() => navigate("/integration")}
            className="w-full"
            size="lg"
          >
            Aller à l'intégration
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShopifySuccess;
