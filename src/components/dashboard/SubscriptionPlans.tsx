import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Sparkles, Zap, Crown, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  icon: any;
  badge?: string;
  badgeColor?: string;
  features: string[];
  benefits: string[];
  cta: string;
  featured?: boolean;
}

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Pour les petites boutiques qui découvrent l'IA",
    price_monthly: 9.99,
    price_yearly: 95.88,
    icon: Sparkles,
    badge: "14 jours gratuits",
    badgeColor: "bg-green-500",
    features: [
      "1 000 optimisations SEO / mois",
      "5 articles IA / mois",
      "100 recherches IA / mois",
      "200 réponses Chat IA / mois",
      "1 boutique Shopify",
      "Support prioritaire email"
    ],
    benefits: [
      "Automatisation SEO complète",
      "Génération de contenu IA",
      "Intégration Shopify rapide",
      "Support réactif"
    ],
    cta: "Démarrer l'essai gratuit",
    featured: false
  },
  {
    id: "pro",
    name: "Pro",
    description: "Pour les boutiques en croissance",
    price_monthly: 49,
    price_yearly: 468,
    icon: Zap,
    badge: "Plus Populaire 🔥",
    badgeColor: "bg-primary",
    features: [
      "Produits illimités",
      "2 000 optimisations SEO / mois",
      "10 articles IA / mois",
      "5 campagnes automatiques / mois",
      "500 recherches IA / mois",
      "1 000 réponses Chat IA / mois",
      "3 boutiques Shopify",
      "Google Merchant intégré",
      "Support prioritaire 24/7"
    ],
    benefits: [
      "Croissance accélérée garantie",
      "Multi-boutiques",
      "Campagnes automatisées",
      "Support dédié 24/7"
    ],
    cta: "Passer à Pro",
    featured: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Pour les grandes boutiques et agences",
    price_monthly: 199,
    price_yearly: 1908,
    icon: Crown,
    features: [
      "Tout illimité",
      "10 000 optimisations SEO / mois",
      "100 articles IA / mois",
      "20 campagnes / mois",
      "5 000 recherches IA / mois",
      "10 000 réponses Chat IA / mois",
      "10 boutiques Shopify",
      "API personnalisée",
      "Manager dédié",
      "SLA garanti"
    ],
    benefits: [
      "Solution sur-mesure",
      "Performance maximale",
      "API personnalisée",
      "Account manager dédié"
    ],
    cta: "Nous contacter",
    featured: false
  }
];

export function SubscriptionPlans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const loadCurrentPlan = async () => {
      if (!user?.id) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_plan_id')
        .eq('id', user.id)
        .single();
      
      setCurrentPlanId(profile?.current_plan_id || null);
      setLoading(false);
    };

    loadCurrentPlan();
  }, [user?.id]);

  const handleSelectPlan = async (planId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan_id: planId,
          billing_period: billingPeriod,
          success_url: `${window.location.origin}/dashboard?checkout=success`,
          cancel_url: `${window.location.origin}/account?tab=subscription&checkout=cancelled`
        }
      });

      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la session de paiement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isCurrentPlan = (planId: string) => currentPlanId === planId;

  const getPrice = (plan: Plan) => {
    return billingPeriod === 'yearly' ? plan.price_yearly : plan.price_monthly;
  };

  const getSavings = (plan: Plan) => {
    const monthlyCost = plan.price_monthly * 12;
    const yearlyCost = plan.price_yearly;
    const savings = ((monthlyCost - yearlyCost) / monthlyCost * 100).toFixed(0);
    return savings;
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Choisissez votre plan</h2>
        <p className="text-muted-foreground">
          Sélectionnez le plan qui correspond le mieux à vos besoins
        </p>
        
        {/* Toggle Mensuel / Annuel */}
        <div className="flex justify-center">
          <Tabs value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as 'monthly' | 'yearly')}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="monthly">Mensuel</TabsTrigger>
              <TabsTrigger value="yearly">
                Annuel
                <Badge variant="secondary" className="ml-2 bg-success/20 text-success">
                  -20%
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = isCurrentPlan(plan.id);
          
          return (
            <Card 
              key={plan.id}
              className={`relative ${plan.featured ? 'border-2 border-primary shadow-primary' : ''} ${isCurrent ? 'border-2 border-success' : ''}`}
            >
              {plan.badge && (
                <Badge className={`absolute -top-3 left-1/2 transform -translate-x-1/2 ${plan.badgeColor || 'bg-primary'}`}>
                  {plan.badge}
                </Badge>
              )}
              {isCurrent && (
                <Badge className="absolute -top-3 right-4 bg-success">
                  ✓ Plan actuel
                </Badge>
              )}
              
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-6 h-6 text-primary" />
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{getPrice(plan)}€</span>
                  <span className="text-muted-foreground">
                    /{billingPeriod === 'monthly' ? 'mois' : 'an'}
                  </span>
                  {billingPeriod === 'yearly' && (
                    <Badge variant="secondary" className="bg-success/20 text-success text-xs">
                      Économisez {getSavings(plan)}%
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Benefits - Points "Pour" */}
                <div className="space-y-2">
                  <p className="font-semibold text-sm text-primary">✨ Pourquoi choisir ce plan :</p>
                  {plan.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm font-medium text-primary">{benefit}</span>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <div className="space-y-2 pt-4 border-t">
                  <p className="font-semibold text-sm">Inclus :</p>
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full"
                  variant={plan.featured ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrent || loading}
                >
                  {isCurrent ? "Plan actuel" : plan.cta}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pay As You Go Section */}
      <Card className="border-2 border-dashed border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            <CardTitle className="text-2xl">Pay as you go</CardTitle>
          </div>
          <CardDescription className="text-base">
            Dépassez vos limites mensuelles sans changer de plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="font-semibold">💰 Tarifs à la demande :</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Optimisation SEO : <span className="font-medium text-foreground">$0.01 / optimisation</span></li>
                <li>• Article IA : <span className="font-medium text-foreground">$2.00 / article</span></li>
                <li>• Recherche IA : <span className="font-medium text-foreground">$0.05 / recherche</span></li>
                <li>• Réponse Chat : <span className="font-medium text-foreground">$0.02 / réponse</span></li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <p className="font-semibold">✨ Avantages :</p>
              <ul className="space-y-1">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm"><strong>Pas de limite</strong> - continuez sans interruption</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm"><strong>Facturation automatique</strong> en fin de mois</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm"><strong>Tarifs dégressifs</strong> à partir de 10 000 crédits</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mt-4">
            <p className="text-sm text-muted-foreground text-center">
              💡 <strong>Astuce :</strong> Le pay-as-you-go est automatiquement activé sur tous les plans. 
              Vous ne payez que ce que vous consommez au-delà de vos limites mensuelles.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
