import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Loader2, CheckCircle2 } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface PricingCardProps {
  icon: LucideIcon;
  name: string;
  isCurrentPlan?: boolean;
  isRecommended?: boolean;
  isBestValue?: boolean;
  price: number;
  currency: string;
  period: string;
  priceSuffix?: string;
  originalPrice?: number;
  description: string;
  secondaryDescription?: string;
  buttonText: string;
  onButtonClick: () => void;
  buttonDisabled?: boolean;
  buttonLoading?: boolean;
  buttonVariant?: "default" | "secondary";
  features: string[];
  className?: string;
  language?: 'fr' | 'en';
}

export function PricingCard({
  icon: Icon,
  name,
  isCurrentPlan,
  isRecommended,
  isBestValue,
  price,
  currency,
  period,
  priceSuffix,
  originalPrice,
  description,
  secondaryDescription,
  buttonText,
  onButtonClick,
  buttonDisabled,
  buttonLoading,
  buttonVariant = "default",
  features,
  className = "",
  language = 'fr',
}: PricingCardProps) {
  return (
    <Card 
      className={`
        relative flex flex-col justify-between
        p-6 shadow-sm border rounded-2xl bg-card
        hover:shadow-lg transition-all duration-300 hover:-translate-y-1
        ${isCurrentPlan ? 'border-2 border-primary' : ''}
        ${className}
      `}
    >
      {/* Badges premium */}
      {isCurrentPlan && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-1 rounded-full shadow-lg text-xs sm:text-sm">
          ✓ Votre Plan
        </Badge>
      )}
      {!isCurrentPlan && isRecommended && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full shadow-lg text-xs sm:text-sm">
          ⭐ Recommandé
        </Badge>
      )}
      {!isCurrentPlan && isBestValue && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full shadow-lg text-xs sm:text-sm">
          💎 Meilleur Rapport
        </Badge>
      )}

      <div className="flex flex-col h-full">
        {/* Icône premium centrée */}
        <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shadow-md mb-4">
          <Icon className="w-8 h-8 text-white" />
        </div>

        {/* Titre */}
        <h3 className="text-center text-2xl font-semibold mb-2">
          {name}
        </h3>

        {/* Description */}
        <div className="text-center mb-4 min-h-[60px]">
          <p className="text-sm text-muted-foreground">{description}</p>
          {secondaryDescription && (
            <p className="text-xs text-muted-foreground mt-2">{secondaryDescription}</p>
          )}
        </div>

        {/* Prix style Stripe */}
        <div className="text-center mb-6">
          {originalPrice && originalPrice > price && (
            <div className="text-2xl text-muted-foreground line-through mb-1">
              {language === 'fr' ? `${originalPrice} ${currency}` : `${currency}${originalPrice}`}
            </div>
          )}
          <div className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {language === 'fr' ? `${price} ${currency}` : `${currency}${price}`}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {priceSuffix || period}
          </p>
        </div>

        {/* Features list */}
        <div className="space-y-3 mb-6 flex-grow">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2">
              <Check className="w-5 h-5 text-success flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>

        {/* Bouton aligné en bas */}
        <div className="mt-auto">
          <Button 
            className="w-full h-12 text-base font-semibold" 
            variant={buttonVariant}
            disabled={buttonDisabled}
            onClick={onButtonClick}
          >
            {buttonLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : buttonDisabled && isCurrentPlan ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {buttonText}
              </>
            ) : (
              buttonText
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
