import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/language";
import { FileCode, Tag, Barcode, CheckCircle2, ShoppingCart, Globe } from "lucide-react";

// Google Shopping Bag Logo - Style like official Google Shopping bags
const GoogleShoppingLogo = () => (
  <svg viewBox="0 0 48 48" className="w-10 h-10">
    {/* Shopping bag body - light lavender/white color */}
    <path 
      d="M8 16L12 44h24l4-28H8z" 
      fill="#E8EAED" 
      stroke="#DADCE0" 
      strokeWidth="0.5"
    />
    {/* Bag shadow/depth */}
    <path 
      d="M12 44l-4-28h8l3 28H12z" 
      fill="#D2D5DB" 
      opacity="0.5"
    />
    {/* Handle */}
    <path 
      d="M16 16V12c0-4.42 3.58-8 8-8s8 3.58 8 8v4" 
      stroke="#DADCE0" 
      strokeWidth="2" 
      fill="none"
      strokeLinecap="round"
    />
    {/* Google G logo - multicolor */}
    <g transform="translate(16, 24)">
      {/* Blue arc */}
      <path d="M16 8A8 8 0 0 1 8.7 15.3L4.2 11.8A12 12 0 0 0 8 -0.2V4A8 8 0 0 1 16 8z" fill="#4285F4"/>
      {/* Green arc */}
      <path d="M8.7 15.3A8 8 0 0 1 0 8H4A4 4 0 0 0 4.7 11.8z" fill="#34A853"/>
      {/* Yellow arc */}
      <path d="M0 8A8 8 0 0 1 2.3 2.3L5.8 5.8A4 4 0 0 0 4 8z" fill="#FBBC05"/>
      {/* Red arc */}
      <path d="M2.3 2.3A8 8 0 0 1 8 0V4A4 4 0 0 0 5.8 5.8z" fill="#EA4335"/>
      {/* G horizontal bar */}
      <rect x="8" y="6" width="6" height="4" fill="#4285F4"/>
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
