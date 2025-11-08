import { SubscriptionPlans } from "@/components/dashboard/SubscriptionPlans";
import PricingComparison from "@/components/PricingComparison";
import { useTranslation } from "@/lib/language";

export default function Pricing() {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto py-6 space-y-12">
      <SubscriptionPlans />
      
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-center">{t.pricing.detailedComparison}</h2>
        <PricingComparison />
      </div>
    </div>
  );
}
