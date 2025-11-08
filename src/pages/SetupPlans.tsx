import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SetupPlans() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleSetup = async () => {
    setLoading(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("setup-subscription-plans");

      if (error) throw error;

      setResults(data);
      toast.success("Plans configurés avec succès!");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Erreur lors de la configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Configuration des Plans d'Abonnement</h1>
        <p className="text-muted-foreground">
          Créez tous les produits et prix Stripe pour les plans d'abonnement (72 price IDs au total).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Créer les Plans et Prix</CardTitle>
          <CardDescription>
            Cette opération va créer dans Stripe:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>1 plan Trial (gratuit)</li>
              <li>1 plan Starter (9.99/mois)</li>
              <li>8 plans Pro (de 49 à 4900/mois)</li>
              <li>8 plans Enterprise (de 199 à 19900/mois)</li>
              <li>Pour chaque plan: 2 périodes (mensuel/annuel) × 2 devises (USD/EUR) = 4 price IDs</li>
              <li>Total: 18 plans × 4 = 72 price IDs</li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleSetup} 
            disabled={loading}
            size="lg"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Création en cours..." : "Créer tous les plans"}
          </Button>

          {results && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">{results.message}</p>
                  {results.results && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium">Plans créés:</p>
                      <div className="grid gap-2">
                        {results.results.slice(0, 5).map((result: any) => (
                          <div key={result.plan_id} className="text-xs bg-muted/50 p-2 rounded">
                            <span className="font-mono">{result.plan_id}</span>
                            {result.price_ids.stripe_price_id_monthly && (
                              <div className="text-muted-foreground mt-1">
                                ✓ 4 price IDs créés
                              </div>
                            )}
                          </div>
                        ))}
                        {results.results.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            ... et {results.results.length - 5} autres plans
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Prochaines étapes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
              <div>
                <p className="font-medium">1. Vérifier dans Stripe</p>
                <p className="text-sm text-muted-foreground">
                  Connectez-vous à votre dashboard Stripe pour vérifier les produits et prix créés
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
              <div>
                <p className="font-medium">2. Tester le checkout</p>
                <p className="text-sm text-muted-foreground">
                  Les plans sont maintenant disponibles sur la page d'abonnement
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
              <div>
                <p className="font-medium">3. Logique upgrade/downgrade</p>
                <p className="text-sm text-muted-foreground">
                  La table subscription_plans contient maintenant display_order pour gérer les upgrades/downgrades
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
