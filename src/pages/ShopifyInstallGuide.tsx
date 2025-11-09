import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicHeader } from "@/components/PublicHeader";
import { ShoppingBag, ArrowRight, CheckCircle2 } from "lucide-react";

const ShopifyInstallGuide = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const shop = searchParams.get("shop");

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <PublicHeader />
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <ShoppingBag className="h-12 w-12 text-primary" />
                </div>
              </div>
              <CardTitle className="text-3xl">Bienvenue sur NewAI</CardTitle>
              <CardDescription className="text-base">
                Pour connecter votre boutique Shopify, suivez ces étapes simples
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {shop && (
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Boutique à connecter</p>
                  <p className="font-semibold text-lg">{shop}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Créez un compte NewAI</h3>
                    <p className="text-sm text-muted-foreground">
                      Ou connectez-vous si vous avez déjà un compte
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Accédez à la page Intégration</h3>
                    <p className="text-sm text-muted-foreground">
                      Vous serez automatiquement redirigé après connexion
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Connectez votre boutique</h3>
                    <p className="text-sm text-muted-foreground">
                      Le nom de votre boutique sera pré-rempli automatiquement
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <Button
                  onClick={() => navigate(`/auth?redirect=/integration${shop ? `?shop=${encodeURIComponent(shop)}` : ''}`)}
                  className="w-full"
                  size="lg"
                >
                  Se connecter
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                <Button
                  onClick={() => navigate(`/auth?signup=true&redirect=/integration${shop ? `?shop=${encodeURIComponent(shop)}` : ''}`)}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Créer un compte
                </Button>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Cette étape est nécessaire pour garantir la sécurité de votre connexion et associer votre boutique à votre compte.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShopifyInstallGuide;
