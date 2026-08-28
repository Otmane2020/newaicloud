import { Button } from "@/components/ui/button";
import { CatalogActionCard } from "@/components/CatalogActionCard";
import { useTranslation } from "@/lib/language";
import { Sparkles, ArrowRight, Lock } from "lucide-react";

interface SoftPaywallBannerProps {
  answersCount: number;
  onUpgrade: () => void;
}

export function SoftPaywallBanner({ answersCount, onUpgrade }: SoftPaywallBannerProps) {
  const { language } = useTranslation();
  const fr = language === "fr";

  return (
    <CatalogActionCard
      icon={Sparkles}
      title={fr ? `${answersCount} réponses AEO générées` : `${answersCount} AEO answers generated`}
      description={
        fr
          ? "Passez à un plan payant pour les publier et les rendre visibles aux assistants IA."
          : "Upgrade to publish them and make them visible to AI assistants."
      }
      meta={
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-violet-600" />
          {fr
            ? "Vos réponses sont prêtes à être publiées."
            : "Your answers are ready to publish."}
        </span>
      }
      action={
        <Button
          onClick={onUpgrade}
          size="sm"
          className="rounded-lg bg-violet-600 px-5 font-semibold text-white shadow-none hover:bg-violet-700"
        >
          {fr ? "Voir les plans" : "View plans"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      }
    />
  );
}
