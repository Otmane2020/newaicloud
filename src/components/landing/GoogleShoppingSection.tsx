import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/language";
import { FileCode, Tag, Barcode, CheckCircle2, ShoppingCart, Globe } from "lucide-react";

// Google Shopping Bag Logo - Official style with multicolor G
const GoogleShoppingLogo = () => (
  <svg viewBox="0 0 64 64" className="w-14 h-14 lg:w-16 lg:h-16">
    {/* Shopping bag body */}
    <path 
      d="M12 20L16 56h32l4-36H12z" 
      fill="#4285F4"
    />
    {/* Bag highlight */}
    <path 
      d="M12 20L16 56h6l-4-36H12z" 
      fill="#3367D6"
    />
    {/* Handle */}
    <path 
      d="M20 20V14c0-6.63 5.37-12 12-12s12 5.37 12 12v6" 
      stroke="#4285F4" 
      strokeWidth="4" 
      fill="none"
      strokeLinecap="round"
    />
    {/* Google G logo - multicolor on bag */}
    <g transform="translate(22, 28)">
      {/* White circle background */}
      <circle cx="10" cy="10" r="11" fill="white"/>
      {/* Red - top left quadrant */}
      <path d="M10 0 A10 10 0 0 0 0 10 L4 10 A6 6 0 0 1 10 4 Z" fill="#EA4335"/>
      {/* Yellow - bottom left quadrant */}
      <path d="M0 10 A10 10 0 0 0 10 20 L10 16 A6 6 0 0 1 4 10 Z" fill="#FBBC05"/>
      {/* Green - bottom right quadrant */}
      <path d="M10 20 A10 10 0 0 0 20 10 L16 10 A6 6 0 0 1 10 16 Z" fill="#34A853"/>
      {/* Blue - top right quadrant + bar */}
      <path d="M20 10 A10 10 0 0 0 10 0 L10 4 A6 6 0 0 1 16 10 Z" fill="#4285F4"/>
      {/* G horizontal bar */}
      <rect x="10" y="8" width="10" height="4" fill="#4285F4"/>
    </g>
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
