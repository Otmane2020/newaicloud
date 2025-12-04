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
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <GoogleShoppingLogo />
            <h2 className="text-xl sm:text-2xl font-bold">
              Google <span className="text-primary">Shopping</span> Ready
            </h2>
          </div>

          {/* Main Card */}
          <div className="bg-card rounded-3xl p-6 shadow-lg border border-border mb-6">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Merchant Center
              </span>
              <Badge className="bg-success/10 text-success border-success/20 text-xs">
                {language === 'fr' ? "Approuvé" : "Approved"}
              </Badge>
            </div>

            {/* XML Feed Preview */}
            <div className="bg-muted/50 rounded-xl p-4 mb-6 font-mono text-[10px] text-muted-foreground overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <FileCode className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">product_feed.xml</span>
              </div>
              <div className="space-y-1 opacity-80">
                <p>&lt;product&gt;</p>
                <p className="pl-4">&lt;title&gt;<span className="text-success">Optimized Title</span>&lt;/title&gt;</p>
                <p className="pl-4">&lt;google_category&gt;<span className="text-primary">5678</span>&lt;/google_category&gt;</p>
                <p className="pl-4">&lt;gtin&gt;<span className="text-warning">3760123456789</span>&lt;/gtin&gt;</p>
                <p className="pl-4">&lt;brand&gt;<span className="text-accent-foreground">AI Generated</span>&lt;/brand&gt;</p>
                <p>&lt;/product&gt;</p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-card rounded-xl p-4 text-center border border-border hover:border-primary/30 transition-colors">
                <div className={`w-10 h-10 mx-auto mb-2 rounded-full ${feature.bgColor} flex items-center justify-center`}>
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <p className="text-xs font-medium mb-1">{feature.title}</p>
                <p className="text-[10px] text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Bottom Badges */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs gap-1">
              <CheckCircle2 className="w-3 h-3 text-success" />
              {language === 'fr' ? "MPN inclus" : "MPN included"}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              <ShoppingCart className="w-3 h-3 text-primary" />
              {language === 'fr' ? "Prix & Stock" : "Price & Stock"}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              <Globe className="w-3 h-3 text-warning" />
              {language === 'fr' ? "Multi-langue" : "Multi-language"}
            </Badge>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GoogleShoppingSection;
