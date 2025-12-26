import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/language";
import {
  Check,
  Sparkles,
  Zap,
  Loader2,
  FileText,
  Search,
  Target,
  Globe,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

const PRICE_MONTHLY = 99;
const PRICE_YEARLY = 75; // per month
const YEARLY_SAVINGS = 288;
const TRIAL_DAYS = 3;

const FEATURES = [
  { text: { fr: "30 articles SEO/LLM de marque", en: "30 SEO/LLM branded articles" }, icon: FileText },
  { text: { fr: "Infographies et vidéos YouTube", en: "Infographics and YouTube videos" }, icon: BarChart3 },
  { text: { fr: "800€+ de backlinks de qualité/mois", en: "$800+ worth of quality backlinks per month" }, icon: Globe },
  { text: { fr: "Détection des problèmes techniques bloquant Google & ChatGPT", en: "We find technical issues that block Google & ChatGPT from ranking your site" }, icon: Search },
  { text: { fr: "Articles basés sur recherche temps réel et expertise", en: "Articles backed by real-time research and expert insights" }, icon: Sparkles },
  { text: { fr: "Recherche de mots-clés automatisée", en: "Automated keyword research" }, icon: Target },
  { text: { fr: "Agent Reddit pour visibilité et autorité de marque", en: "Reddit agent that builds your brand visibility and authority" }, icon: MessageSquare },
  { text: { fr: "Publication d'articles en 1 clic", en: "Publish articles with 1 click" }, icon: Check },
  { text: { fr: "Schema JSON-LD inclus", en: "JSON-LD schema markup included" }, icon: Check },
];

export default function AeoPricingPage() {
  const { user } = useAuth();
  const { language } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isYearly, setIsYearly] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth?mode=signup&redirect=/aeo-pricing");
    }
  }, [user, navigate]);

  const handleStartTrial = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error(language === "fr" ? "Session expirée" : "Session expired");
        navigate("/auth");
        return;
      }

      // Create Stripe checkout with trial
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          plan_id: "aeo-all-in-one",
          billing_period: isYearly ? "yearly" : "monthly",
          success_url: `${window.location.origin}/dashboard?checkout=success`,
          cancel_url: `${window.location.origin}/aeo-pricing`,
          trial_days: TRIAL_DAYS,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast.error(error.message || (language === "fr" ? "Erreur lors du paiement" : "Payment error"));
    } finally {
      setLoading(false);
    }
  };

  const price = isYearly ? PRICE_YEARLY : PRICE_MONTHLY;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">AEOReply</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-lg">
        {/* Badge */}
        <div className="flex justify-center mb-4">
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <Sparkles className="w-3 h-3 mr-1" />
            {language === "fr" ? "Tout est prêt pour vous" : "Everything is ready for you"}
          </Badge>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {language === "fr" ? "Commencez à développer votre trafic organique " : "Start Growing Your Organic Traffic "}
            <span className="text-primary">{language === "fr" ? "Aujourd'hui" : "Today"}</span>
          </h1>
          <p className="text-muted-foreground">
            {language === "fr" 
              ? "Rejoignez plus de 1 000 entreprises qui obtiennent des leads organiques de Google et ChatGPT chaque mois."
              : "Join 1,000+ businesses getting organic leads from Google and ChatGPT every month."}
          </p>
        </div>

        {/* Pricing Card */}
        <div className="rounded-3xl border-2 border-primary/20 bg-white p-6 shadow-lg">
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground uppercase tracking-wider">
              {language === "fr" ? "RAPPORT QUALITÉ-PRIX" : "VALUE FOR MONEY"}
            </p>
            <h2 className="text-2xl font-bold text-primary mt-1">
              {language === "fr" ? "Plan All-in-One" : "All-in-One Plan"}
            </h2>
          </div>

          {/* Price */}
          <div className="text-center mb-4">
            <div className="flex items-baseline justify-center gap-2">
              {isYearly && (
                <span className="text-2xl text-muted-foreground line-through">${PRICE_MONTHLY}</span>
              )}
              <span className="text-5xl font-bold">${price}</span>
              <span className="text-muted-foreground">/{language === "fr" ? "mois" : "month"}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {language === "fr" ? "Annulez à tout moment. Sans engagement." : "Cancel anytime. No questions asked."}
            </p>
          </div>

          {/* Yearly Toggle */}
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 mb-6 transition-all ${
              isYearly ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                isYearly ? "border-primary bg-primary" : "border-slate-300"
              }`}>
                {isYearly && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm">
                {language === "fr" ? "Facturation annuelle" : "with annual billing"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                {language === "fr" ? `Économisez $${YEARLY_SAVINGS}` : `Save $${YEARLY_SAVINGS}`}
              </Badge>
              <span className="text-sm font-medium">${PRICE_YEARLY}/{language === "fr" ? "mois" : "month"}</span>
            </div>
          </button>

          {/* Divider */}
          <div className="border-t my-6" />

          {/* Features Title */}
          <h3 className="font-semibold mb-4">
            {language === "fr" ? "Tout ce dont vous avez besoin pour réussir :" : "Everything You Need to Succeed:"}
          </h3>

          {/* Features List */}
          <ul className="space-y-3">
            {FEATURES.map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm">
                  {language === "fr" ? feature.text.fr : feature.text.en}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Footer CTA */}
      <footer className="sticky bottom-0 bg-white border-t p-4">
        <div className="container mx-auto max-w-lg">
          <Button
            className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-white text-lg font-medium"
            onClick={handleStartTrial}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {language === "fr" 
                  ? `Commencer votre essai gratuit de ${TRIAL_DAYS} jours`
                  : `Start Your ${TRIAL_DAYS}-Day Free Trial`}
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
