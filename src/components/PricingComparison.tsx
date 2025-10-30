import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X } from "lucide-react";
import { useTranslation } from '@/hooks/useTranslation';

const PricingComparison = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const features = [
    {
      category: "Produits",
      items: [
        { name: "Produits maximum", starter: "1 000", pro: "5 000 - 320 000", enterprise: "100 000 - 12 800 000" },
        { name: "Import Shopify", starter: true, pro: true, enterprise: true },
        { name: "Gestion multi-boutiques", starter: "1", pro: "2 - 128", enterprise: "10 - 1 280" },
      ]
    },
    {
      category: "Optimisations SEO",
      items: [
        { name: "Optimisations mensuelles", starter: "250", pro: "500 - 32 000", enterprise: "5 000 - 640 000" },
        { name: "Optimisation automatique", starter: true, pro: true, enterprise: true },
        { name: "Sync vers Shopify", starter: true, pro: true, enterprise: true },
        { name: "Analyse de qualité SEO", starter: true, pro: true, enterprise: true },
      ]
    },
    {
      category: "IA",
      items: [
        { name: "Articles IA par mois", starter: "5", pro: "10 - 640", enterprise: "100 - 12 800" },
        { name: "Chat IA par mois", starter: "500", pro: "1 000 - 64 000", enterprise: "10 000 - 1 280 000" },
        { name: "Campagnes éditoriales", starter: "2", pro: "5 - 320", enterprise: "50 - 6 400" },
        { name: "Vision IA (images)", starter: true, pro: true, enterprise: true },
      ]
    },
    {
      category: "Netlinking & Blog",
      items: [
        { name: "Opportunités SEO", starter: true, pro: true, enterprise: true },
        { name: "Sync blog vers Shopify", starter: true, pro: true, enterprise: true },
        { name: "Analyse de netlinking", starter: true, pro: true, enterprise: true },
      ]
    },
    {
      category: "Support & Performance",
      items: [
        { name: "Support par email", starter: true, pro: true, enterprise: true },
        { name: "Support prioritaire", starter: false, pro: true, enterprise: true },
        { name: "Account manager dédié", starter: false, pro: false, enterprise: true },
        { name: "API Access", starter: false, pro: false, enterprise: true },
      ]
    }
  ];

  const renderValue = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? (
        <CheckCircle2 className="w-5 h-5 text-success mx-auto" />
      ) : (
        <X className="w-5 h-5 text-muted-foreground mx-auto" />
      );
    }
    return <span className="text-sm font-medium">{value}</span>;
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-4 text-left font-semibold">Fonctionnalités</th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Badge variant="outline">Starter</Badge>
                  <span className="text-2xl font-bold">$9.99</span>
                  <span className="text-xs text-muted-foreground">/mois</span>
                </div>
              </th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Badge className="bg-primary">Pro</Badge>
                  <span className="text-2xl font-bold">$98 - $4,900</span>
                  <span className="text-xs text-muted-foreground">/mois</span>
                </div>
              </th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Badge className="bg-success">Enterprise</Badge>
                  <span className="text-2xl font-bold">$199 - $19,900</span>
                  <span className="text-xs text-muted-foreground">/mois</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((category, categoryIndex) => (
              <>
                <tr key={`cat-${categoryIndex}`} className="bg-muted/30">
                  <td colSpan={4} className="p-3 font-semibold text-sm">
                    {category.category}
                  </td>
                </tr>
                {category.items.map((item, itemIndex) => (
                  <tr key={`item-${categoryIndex}-${itemIndex}`} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-4 text-sm">{item.name}</td>
                    <td className="p-4 text-center">{renderValue(item.starter)}</td>
                    <td className="p-4 text-center">{renderValue(item.pro)}</td>
                    <td className="p-4 text-center">{renderValue(item.enterprise)}</td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default PricingComparison;