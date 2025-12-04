import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/language";
import { FileCode, Tag, Barcode, CheckCircle2, ShoppingCart, Globe } from "lucide-react";

// Google Shopping Logo
const GoogleShoppingLogo = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7">
    <path fill="#4285F4" d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path fill="#34A853" d="M2 17l10 5 10-5v-5L12 17 2 12v5z"/>
    <path fill="#FBBC05" d="M12 12L2 7v5l10 5 10-5V7l-10 5z"/>
    <path fill="#EA4335" d="M12 22l10-5v-5l-10 5-10-5v5l10 5z" opacity="0.5"/>
  </svg>
);

export const GoogleShoppingSection = () => {
  const { language } = useTranslation();

  const features = [
    {
      icon: FileCode,
      title: "XML Feed",
      description: language === 'fr' ? "Généré automatiquement" : "Auto-generated",
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      icon: Tag,
      title: language === 'fr' ? "Catégories Google" : "Google Categories",
      description: language === 'fr' ? "Mapping intelligent" : "Smart mapping",
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      icon: Barcode,
      title: "GTIN / EAN",
      description: language === 'fr' ? "Validation auto" : "Auto validation",
      color: "text-warning",
      bgColor: "bg-warning/10"
    }
  ];

  const stats = [
    { value: "100%", label: language === 'fr' ? "Compatible GMC" : "GMC Compatible" },
    { value: "0", label: language === 'fr' ? "Erreurs Feed" : "Feed Errors" },
    { value: "24h", label: language === 'fr' ? "Sync auto" : "Auto sync" }
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        <div className="max-w-lg lg:max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <GoogleShoppingLogo />
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">
              Google <span className="text-primary">Shopping</span> Ready
            </h2>
          </div>

          {/* Features and Badges */}
          <div className="space-y-6">
            {/* Feature Cards */}
            <div className="grid grid-cols-3 gap-3 lg:gap-4">
              {features.map((feature, index) => (
                <div key={index} className="bg-card rounded-xl p-4 lg:p-6 text-center border border-border hover:border-primary/30 transition-colors">
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 mx-auto mb-2 rounded-full ${feature.bgColor} flex items-center justify-center`}>
                    <feature.icon className={`w-5 h-5 lg:w-6 lg:h-6 ${feature.color}`} />
                  </div>
                  <p className="text-xs lg:text-sm font-medium mb-1">{feature.title}</p>
                  <p className="text-[10px] lg:text-xs text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Bottom Badges */}
            <div className="flex items-center justify-center gap-2 lg:gap-3 flex-wrap">
              <Badge variant="outline" className="text-xs lg:text-sm gap-1 lg:gap-2 px-3 lg:px-4 py-1.5 lg:py-2">
                <CheckCircle2 className="w-3 h-3 lg:w-4 lg:h-4 text-success" />
                {language === 'fr' ? "MPN inclus" : "MPN included"}
              </Badge>
              <Badge variant="outline" className="text-xs lg:text-sm gap-1 lg:gap-2 px-3 lg:px-4 py-1.5 lg:py-2">
                <ShoppingCart className="w-3 h-3 lg:w-4 lg:h-4 text-primary" />
                {language === 'fr' ? "Prix & Stock" : "Price & Stock"}
              </Badge>
              <Badge variant="outline" className="text-xs lg:text-sm gap-1 lg:gap-2 px-3 lg:px-4 py-1.5 lg:py-2">
                <Globe className="w-3 h-3 lg:w-4 lg:h-4 text-warning" />
                {language === 'fr' ? "Multi-langue" : "Multi-language"}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GoogleShoppingSection;
