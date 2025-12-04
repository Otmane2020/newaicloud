import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/language";
import { FileCode, Tag, Barcode, CheckCircle2, ShoppingCart, Globe } from "lucide-react";

// Google Shopping Bag Logo
const GoogleShoppingLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8">
    {/* Shopping bag body */}
    <path fill="#4285F4" d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
    {/* Handle */}
    <path d="M9 6V4.5C9 3.12 10.12 2 11.5 2h1C13.88 2 15 3.12 15 4.5V6" stroke="#FBBC05" strokeWidth="1.5" fill="none"/>
    {/* Center circle */}
    <circle cx="12" cy="13" r="3" fill="#EA4335"/>
    {/* G letter */}
    <path fill="white" d="M13 13h-1.5v1h2c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5c.41 0 .78.17 1.05.44l.7-.7C13.36 11.86 12.71 11.5 12 11.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5v-1h-1.5z"/>
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
