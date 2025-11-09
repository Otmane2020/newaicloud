import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicHeader } from "@/components/PublicHeader";

const ShopifyInstall = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const shop = searchParams.get("shop");
    
    // Rediriger immédiatement vers la page de guide avec le nom de la boutique
    if (shop) {
      navigate(`/shopify/guide?shop=${encodeURIComponent(shop)}`, { replace: true });
    } else {
      navigate("/shopify/guide", { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <PublicHeader />
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Installation Shopify</CardTitle>
              <CardDescription className="text-center">
                Redirection vers les instructions...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground text-center">Redirection en cours...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShopifyInstall;
