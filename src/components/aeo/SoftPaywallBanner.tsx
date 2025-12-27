import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/language";
import { Sparkles, ArrowRight, Lock } from "lucide-react";

interface SoftPaywallBannerProps {
  answersCount: number;
  onUpgrade: () => void;
}

export function SoftPaywallBanner({ answersCount, onUpgrade }: SoftPaywallBannerProps) {
  const { language } = useTranslation();

  return (
    <Card className="bg-gradient-to-r from-violet-500/20 via-blue-500/20 to-cyan-500/20 border-violet-500/30 p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/20 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-2xl" />
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              {language === 'fr' 
                ? `${answersCount} réponses AEO générées !`
                : `${answersCount} AEO answers generated!`}
            </h3>
            <p className="text-white/70 mt-1">
              {language === 'fr' 
                ? "Passez à un plan payant pour les publier et les rendre visibles aux IA (ChatGPT, Gemini, Perplexity...)"
                : "Upgrade to publish them and make them visible to AI assistants (ChatGPT, Gemini, Perplexity...)"}
            </p>
            <div className="flex items-center gap-2 mt-2 text-white/50 text-sm">
              <Lock className="w-4 h-4" />
              <span>
                {language === 'fr' 
                  ? "Vos réponses sont prêtes, il ne reste plus qu'à les publier"
                  : "Your answers are ready, just need to publish them"}
              </span>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={onUpgrade}
          className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white shadow-lg shadow-violet-500/25 shrink-0"
        >
          {language === 'fr' ? "Voir les plans" : "View plans"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Card>
  );
}
