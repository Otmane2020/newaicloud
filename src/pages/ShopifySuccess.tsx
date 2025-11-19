import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShopifyRetryClaimButton } from "@/components/integration/ShopifyRetryClaimButton";

export default function ShopifySuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);
  
  const shop = searchParams.get('shop');
  const status = searchParams.get('status');
  const reason = searchParams.get('reason');
  const shopifyPending = searchParams.get('shopify_pending');

  // Store pending token in localStorage for retry functionality
  useEffect(() => {
    if (shopifyPending) {
      localStorage.setItem('shopify_pending_token', shopifyPending);
    }
  }, [shopifyPending]);

  useEffect(() => {
    if (status === 'success') {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            if (shopifyPending) {
              const shopParam = shop ? `&shop=${encodeURIComponent(shop)}` : '';
              navigate(`/auth?shopify_pending=${shopifyPending}${shopParam}`);
            } else {
              localStorage.setItem('shopify_trigger_import', 'true');
              navigate('/integration');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [navigate, status, shopifyPending, shop]);

  if (status === 'error' && reason === 'invalid_flow') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-16 w-16 text-destructive" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Installation incorrecte</h1>
              <p className="text-muted-foreground">
                Vous devez installer l'application directement depuis votre tableau de bord Shopify Partner, puis suivre le flux d'installation OAuth standard.
              </p>
            </div>

            {shop && (
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Boutique</p>
                <p className="font-semibold">{shop}</p>
              </div>
            )}

            <div className="space-y-3 text-left bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-semibold">Pour connecter votre boutique:</p>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Connectez-vous à votre compte</li>
                <li>Allez dans la page "Intégration"</li>
                <li>Cliquez sur "Ajouter une boutique"</li>
                <li>Suivez le processus d'installation</li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate('/auth')}>
                Aller à la page de connexion
              </Button>
              {shopifyPending && (
                <ShopifyRetryClaimButton 
                  pendingToken={shopifyPending}
                  onSuccess={() => navigate('/dashboard?show_shopify_prompt=true')}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-affirmative-primary/10 p-4">
              <CheckCircle2 className="h-16 w-16 text-affirmative-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Connexion réussie !</h1>
            <p className="text-muted-foreground">
              Votre boutique Shopify a été connectée avec succès
            </p>
          </div>

          {shop && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Boutique</p>
              <p className="font-semibold">{shop}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm">Redirection dans {countdown} secondes...</p>
          </div>

          <Button 
            onClick={() => {
              if (shopifyPending) {
                const shopParam = shop ? `&shop=${encodeURIComponent(shop)}` : '';
                navigate(`/auth?shopify_pending=${shopifyPending}${shopParam}`);
              } else {
                localStorage.setItem('shopify_trigger_import', 'true');
                navigate('/integration');
              }
            }}
            variant="outline"
          >
            Continuer maintenant
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
