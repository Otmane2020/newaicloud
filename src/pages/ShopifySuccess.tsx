import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ShopifySuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const shop = searchParams.get("shop");
  const status = searchParams.get("status");
  const reason = searchParams.get("reason");
  const shopifyPending = searchParams.get("shopify_pending");

  useEffect(() => {
    // Rediriger seulement en cas de succès
    if (status === "success") {
      const timer = setTimeout(() => {
        // Si shopify_pending existe, c'est un nouveau compte depuis l'app dev
        // Rediriger vers auth pour création compte/login
        // Auth se chargera ensuite de rediriger vers onboarding
        if (shopifyPending) {
          // Transmettre le nom de la boutique
          const shopParam = shop ? `&shop=${encodeURIComponent(shop)}` : '';
          navigate(`/auth?shopify_pending=${shopifyPending}${shopParam}`);
        } else {
          // Sinon, flux normal vers integration (utilisateur déjà connecté)
          localStorage.setItem("shopify_trigger_import", "true");
          navigate("/integration");
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [navigate, status, shopifyPending, shop]);

  // Gérer les erreurs de flux OAuth
  if (status === "error" && reason === "invalid_flow") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-md w-full bg-card rounded-lg shadow-xl p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <CheckCircle className="h-16 w-16 text-destructive" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Installation incorrecte
            </h1>
            <p className="text-muted-foreground">
              Vous devez installer l'application depuis votre compte
            </p>
          </div>

          {shop && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Boutique</p>
              <p className="font-semibold text-foreground">{shop}</p>
            </div>
          )}

          <div className="space-y-3 text-left bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-semibold">Pour connecter votre boutique:</p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Connectez-vous à votre compte NewAI</li>
              <li>Allez dans la page "Intégration"</li>
              <li>Cliquez sur "Ajouter une boutique"</li>
              <li>Suivez le processus d'installation</li>
            </ol>
          </div>

          <Button
            onClick={() => navigate("/auth")}
            className="w-full"
            size="lg"
          >
            Se connecter maintenant
          </Button>
        </div>
      </div>
    );
  }

  // Affichage succès
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
