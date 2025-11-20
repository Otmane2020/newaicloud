import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

interface PricingCardProps {
  // Bloc 1: Icon
  icon: string;
  
  // Bloc 2: Name
  name: string;
  isCurrentPlan?: boolean;
  isRecommended?: boolean;
  isBestValue?: boolean;
  
  // Bloc 3: Price
  price: number;
  currency: string;
  period: string;
  originalPrice?: number;
  
  // Bloc 4: Description
  description: string;
  
  // Bloc 4bis: Button
  buttonText: string;
  onButtonClick: () => void;
  buttonDisabled?: boolean;
  buttonLoading?: boolean;
  buttonVariant?: "default" | "secondary";
  
  // Bloc 5: Features
  features: Array<{
    label: string;
    value: string | number;
  }>;
  
  className?: string;
}

export function PricingCard({
  icon,
  name,
  isCurrentPlan,
  isRecommended,
  isBestValue,
  price,
  currency,
  period,
  originalPrice,
  description,
  buttonText,
  onButtonClick,
  buttonDisabled,
  buttonLoading,
  buttonVariant = "default",
  features,
  className = "",
}: PricingCardProps) {
  return (
    <Card 
      className={`
        relative flex flex-col hover:shadow-lg transition-shadow
        ${isCurrentPlan ? 'border-2 border-primary shadow-lg' : 'border border-border'}
        ${className}
      `}
    >
      {/* Badges en haut */}
      {isCurrentPlan && (
        <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 transform -translate-x-1/2 bg-primary text-xs sm:text-sm">
          Votre Plan
        </Badge>
      )}
      {!isCurrentPlan && isRecommended && (
        <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 transform -translate-x-1/2 bg-accent text-xs sm:text-sm">
          Recommandé
        </Badge>
      )}
      {!isCurrentPlan && isBestValue && (
        <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 transform -translate-x-1/2 bg-success text-success-foreground text-xs sm:text-sm">
          Meilleur Rapport
        </Badge>
      )}

      <div className="p-6 lg:p-8 space-y-6 flex-1 flex flex-col">
        {/* Bloc 1: Icon aligné au centre */}
        <div className="flex justify-center">
          <div className="text-4xl sm:text-5xl">{icon}</div>
        </div>

        {/* Bloc 2: Name */}
        <div className="text-center">
          <h3 className="text-2xl sm:text-3xl font-bold">{name}</h3>
        </div>

        {/* Bloc 3: Price avec prix barré si applicable */}
        <div className="text-center space-y-1">
          {originalPrice && originalPrice > price && (
            <div className="text-lg text-muted-foreground line-through">
              {originalPrice}{currency}
            </div>
          )}
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl sm:text-5xl font-bold">
              {price}{currency}
            </span>
            <span className="text-muted-foreground text-base">
              {period}
            </span>
          </div>
        </div>

        {/* Bloc 4: Description */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {/* Bloc 4bis: Bouton */}
        <div className="pt-2">
          <Button 
            className="w-full text-sm sm:text-base" 
            size="lg"
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

        {/* Bloc 5: Trait de séparation et détails */}
        <div className="pt-4 mt-auto border-t space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
              <span>
                <span className="font-semibold">{feature.value}</span> {feature.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
