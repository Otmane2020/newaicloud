import { SubscriptionManagement } from '@/components/dashboard/SubscriptionManagement';
import { UsageLimits } from '@/components/dashboard/UsageLimits';
import { BillingPortal } from '@/components/dashboard/BillingPortal';

export default function Subscription() {
  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Mon Abonnement
          </h1>
          <p className="text-muted-foreground text-lg">
            Gérez votre abonnement et facturation
          </p>
        </div>

        <div className="space-y-6">
          <SubscriptionManagement />
          
          <div className="grid md:grid-cols-2 gap-6">
            <UsageLimits />
            <BillingPortal />
          </div>
        </div>
      </div>
    </div>
  );
}