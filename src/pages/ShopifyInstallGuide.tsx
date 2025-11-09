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
              <CardTitle className="text-3xl">Connectez votre boutique Shopify</CardTitle>
              <CardDescription className="text-base">
                Une dernière étape avant de profiter de NewAI pour optimiser votre SEO
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {shop && (
                <div className="bg-primary/10 rounded-lg p-4 text-center border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Boutique détectée</p>
                  <p className="font-semibold text-lg text-primary">{shop}</p>
                  <p className="text-xs text-muted-foreground mt-1">Vos informations seront automatiquement pré-remplies</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Authentifiez-vous</h3>
                    <p className="text-sm text-muted-foreground">
                      Créez un compte ou connectez-vous en 30 secondes
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Redirection automatique</h3>
                    <p className="text-sm text-muted-foreground">
                      Vous serez redirigé vers la connexion de votre boutique
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Connexion en un clic</h3>
                    <p className="text-sm text-muted-foreground">
                      Validez simplement les informations pré-remplies
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <Button
                  onClick={() => navigate(`/auth?signup=true&redirect=/integration${shop ? `?shop=${encodeURIComponent(shop)}` : ''}`)}
                  className="w-full"
                  size="lg"
                >
                  Créer un compte gratuitement
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                <Button
                  onClick={() => navigate(`/auth?redirect=/integration${shop ? `?shop=${encodeURIComponent(shop)}` : ''}`)}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  J'ai déjà un compte
                </Button>
              </div>

              <div className="bg-gradient-subtle rounded-lg p-4 text-center border">
                <p className="text-xs text-muted-foreground">
                  🔒 Connexion sécurisée • ⚡ Configuration en 2 minutes • 🎯 Boutique automatiquement détectée
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
