import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const PricingComparison = () => {
  const { t } = useTranslation();
  
  const features = [
    {
      category: t('pricingComparison.products'),
      items: [
        { name: t('pricingComparison.products_count'), starter: "1 000", pro: t('pricingComparison.unlimited'), enterprise: t('pricingComparison.unlimited') },
        { name: t('pricingComparison.optimizations'), starter: "1 000", pro: "2 000", enterprise: "10 000" },
        { name: t('pricingComparison.articles'), starter: "5", pro: "10", enterprise: "100" },
        { name: t('pricingComparison.campaigns'), starter: "0", pro: "5", enterprise: "20" },
      ]
    },
    {
      category: t('pricingComparison.ai'),
      items: [
        { name: t('pricingComparison.shopify_searches'), starter: "100", pro: "500", enterprise: "5 000" },
        { name: t('pricingComparison.chat_responses'), starter: "200", pro: "1 000", enterprise: "10 000" },
        { name: t('pricingComparison.deepseek'), starter: true, pro: true, enterprise: true },
      ]
    },
    {
      category: t('pricingComparison.integrations'),
      items: [
        { name: t('pricingComparison.shopify_stores'), starter: "1", pro: "3", enterprise: "10" },
        { name: t('pricingComparison.google_merchant'), starter: false, pro: true, enterprise: true },
        { name: t('pricingComparison.custom_api'), starter: false, pro: false, enterprise: true },
        { name: t('pricingComparison.multi_stores'), starter: false, pro: false, enterprise: true },
      ]
    },
    {
      category: t('pricingComparison.automation'),
      items: [
        { name: t('pricingComparison.full_automation'), starter: true, pro: true, enterprise: true },
        { name: t('pricingComparison.support'), starter: t('pricingComparison.support_email'), pro: t('pricingComparison.support_247'), enterprise: t('pricingComparison.support_manager') },
        { name: t('pricingComparison.custom_training'), starter: false, pro: false, enterprise: true },
        { name: t('pricingComparison.sla'), starter: false, pro: false, enterprise: true },
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
              <th className="p-4 text-left font-semibold min-w-[250px]">{t('pricingComparison.features')}</th>
              <th className="p-4 text-center font-semibold min-w-[150px]">
                <Badge variant="outline" className="text-base">{t('pricingComparison.starter')}</Badge>
              </th>
              <th className="p-4 text-center font-semibold min-w-[150px]">
                <Badge className="bg-primary text-base">{t('pricingComparison.pro')} 🔥</Badge>
              </th>
              <th className="p-4 text-center font-semibold min-w-[150px]">
                <Badge variant="outline" className="text-base">{t('pricingComparison.enterprise')}</Badge>
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
