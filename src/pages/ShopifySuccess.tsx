import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutoImportDialog } from "@/components/integration/AutoImportDialog";
import { createClient } from "@supabase/supabase-js";

const ShopifySuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const shop = searchParams.get("shop");
  const status = searchParams.get("status");
  const reason = searchParams.get("reason");
  const [showAutoImport, setShowAutoImport] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    // Si succès, démarrer l'auto-import
    if (status === "success" && shop) {
      const initAutoImport = async () => {
        try {
          const supabase = createClient(
            import.meta.env.VITE_SUPABASE_URL!,
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!
          );
          
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Trouver le store_id correspondant à cette boutique
          const { data: stores } = await supabase
            .from('shopify_connections')
            .select('id')
            .eq('user_id', user.id)
            .eq('shop_domain', shop)
            .order('created_at', { ascending: false })
            .limit(1);

          if (stores && stores.length > 0) {
            setStoreId(stores[0].id);
            setShowAutoImport(true);
          }
        } catch (err) {
          console.error('Error initializing auto-import:', err);
        }
      };

      initAutoImport();
    }
  }, [status, shop]);

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
    <>
      <AutoImportDialog
        open={showAutoImport}
        storeId={storeId}
        onComplete={() => {
          setShowAutoImport(false);
          navigate("/products");
        }}
      />
      
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
              Import automatique en cours...
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShopifySuccess;
