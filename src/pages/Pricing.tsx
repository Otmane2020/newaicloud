import { SubscriptionPlans } from "@/components/dashboard/SubscriptionPlans";
import PricingComparison from "@/components/PricingComparison";

export default function Pricing() {
  return (
    <div className="container mx-auto py-6 space-y-12">
      <SubscriptionPlans />
      
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-center">Comparaison détaillée</h2>
        <PricingComparison />
      </div>
    </div>
  );
}
