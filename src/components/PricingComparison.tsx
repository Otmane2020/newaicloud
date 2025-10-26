import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X } from "lucide-react";

const PricingComparison = () => {
  const features = [
    {
      category: "Produits & Optimisations",
      items: [
        { name: "Produits", starter: "1 000", pro: "Illimité", enterprise: "Illimité" },
        { name: "Optimisations SEO avancées / mois", starter: "1 000", pro: "2 000", enterprise: "10 000" },
        { name: "Articles IA / mois", starter: "5", pro: "10", enterprise: "100" },
        { name: "Campagnes automatiques / mois", starter: "0", pro: "5", enterprise: "20" },
      ]
    },
    {
      category: "Intelligence Artificielle",
      items: [
        { name: "Recherches IA Shopify / mois", starter: "100", pro: "500", enterprise: "5 000" },
        { name: "Réponses Chat IA / mois", starter: "200", pro: "1 000", enterprise: "10 000" },
        { name: "Optimisation IA avec DeepSeek", starter: true, pro: true, enterprise: true },
      ]
    },
    {
      category: "Intégrations",
      items: [
        { name: "Boutiques Shopify connectables", starter: "1", pro: "3", enterprise: "10" },
        { name: "Google Merchant Center", starter: false, pro: true, enterprise: true },
        { name: "API personnalisée", starter: false, pro: false, enterprise: true },
        { name: "Multi-boutiques", starter: false, pro: false, enterprise: true },
      ]
    },
    {
      category: "Automatisation & Support",
      items: [
        { name: "Automatisation complète", starter: true, pro: true, enterprise: true },
        { name: "Support", starter: "E-mail prioritaire", pro: "24/7 prioritaire", enterprise: "Account manager dédié" },
        { name: "Formation personnalisée", starter: false, pro: false, enterprise: true },
        { name: "SLA garanti", starter: false, pro: false, enterprise: true },
      ]
    }
  ];

  const renderValue = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? (
        <CheckCircle2 className="w-5 h-5 text-success mx-auto" />
      ) : (
        <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
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
              <th className="p-4 text-left font-semibold min-w-[250px]">Fonctionnalités</th>
              <th className="p-4 text-center font-semibold min-w-[150px]">
                <Badge variant="outline" className="text-base">Starter</Badge>
              </th>
              <th className="p-4 text-center font-semibold min-w-[150px]">
                <Badge className="bg-primary text-base">Pro 🔥</Badge>
              </th>
              <th className="p-4 text-center font-semibold min-w-[150px]">
                <Badge variant="outline" className="text-base">Enterprise</Badge>
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((section, sectionIdx) => (
              <>
                <tr key={`section-${sectionIdx}`} className="bg-muted/30">
                  <td colSpan={4} className="p-3 font-semibold text-sm uppercase tracking-wide">
                    {section.category}
                  </td>
                </tr>
                {section.items.map((item, itemIdx) => (
                  <tr key={`item-${sectionIdx}-${itemIdx}`} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-4 text-sm">{item.name}</td>
                    <td className="p-4 text-center">{renderValue(item.starter)}</td>
                    <td className="p-4 text-center bg-primary/5">{renderValue(item.pro)}</td>
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
