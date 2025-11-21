import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles, ShoppingBag, Zap, FileText, MessageSquare, BarChart3, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/language";

interface PlanLimits {
  name: string;
  max_products: number;
  max_optimizations_monthly: number;
  max_articles_monthly: number;
  max_chat_responses_monthly: number;
  max_campaigns: number;
  max_shopify_stores: number;
}

export default function UpgradeSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlanDetails = async () => {
      if (!user?.id) {
        setError("Utilisateur non connecté");
        setLoading(false);
        return;
      }

      try {
        // Get user's current plan
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('current_plan_id')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        if (!profile?.current_plan_id) {
          setError("Aucun plan actif trouvé");
          setLoading(false);
          return;
        }

        // Get plan details
        const { data: plan, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', profile.current_plan_id)
          .single();

        if (planError) throw planError;

        setPlanLimits(plan);
      } catch (err: any) {
        console.error('Error loading plan details:', err);
        setError(err.message || "Erreur lors du chargement des détails du plan");
      } finally {
        setLoading(false);
      }
    };

    loadPlanDetails();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-12 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Chargement des détails de votre plan...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Erreur</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/account?tab=subscription')}>
              Retour à la page d'abonnement
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl border-2 border-success shadow-lg">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex justify-center">
            <div className="rounded-full bg-success/10 p-6">
              <CheckCircle2 className="w-16 h-16 text-success" />
            </div>
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold">
              🎉 Paiement réussi !
            </CardTitle>
            <CardDescription className="text-lg">
              Votre plan a été mis à niveau avec succès
            </CardDescription>
          </div>

          {planLimits && (
            <Badge className="text-lg px-6 py-2 bg-primary">
              <Sparkles className="w-5 h-5 mr-2" />
              Plan {planLimits.name}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Nouvelles limites */}
          {planLimits && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Vos nouvelles limites
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <ShoppingBag className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Produits</p>
                      <p className="text-2xl font-bold">
                        {planLimits.max_products === -1 ? '∞' : planLimits.max_products.toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Optimisations / mois</p>
                      <p className="text-2xl font-bold">
                        {planLimits.max_optimizations_monthly === -1 ? '∞' : planLimits.max_optimizations_monthly.toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Articles / mois</p>
                      <p className="text-2xl font-bold">
                        {planLimits.max_articles_monthly === -1 ? '∞' : planLimits.max_articles_monthly}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Réponses chat / mois</p>
                      <p className="text-2xl font-bold">
                        {planLimits.max_chat_responses_monthly === -1 ? '∞' : planLimits.max_chat_responses_monthly}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Campagnes</p>
                      <p className="text-2xl font-bold">
                        {planLimits.max_campaigns === -1 ? '∞' : planLimits.max_campaigns}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <ShoppingBag className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Boutiques Shopify</p>
                      <p className="text-2xl font-bold">
                        {planLimits.max_shopify_stores === -1 ? '∞' : planLimits.max_shopify_stores}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button 
              className="flex-1 gap-2" 
              size="lg"
              onClick={() => navigate('/dashboard')}
            >
              Retour au tableau de bord
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              size="lg"
              onClick={() => navigate('/account?tab=subscription')}
            >
              Voir mon abonnement
            </Button>
          </div>

          {/* Info supplémentaire */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              💡 Vos nouvelles limites sont actives immédiatement. Un email de confirmation vous a été envoyé.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
