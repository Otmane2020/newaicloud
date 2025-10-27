import { useSearchParams } from 'react-router-dom';
import { AccountSettings } from '@/components/dashboard/AccountSettings';
import { CurrentPlanCard } from '@/components/dashboard/CurrentPlanCard';
import { BillingPortal } from '@/components/dashboard/BillingPortal';
import { ShopifyConnectionsList } from '@/components/dashboard/ShopifyConnectionsList';
import { UsageLimits } from '@/components/dashboard/UsageLimits';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Package, CreditCard, Receipt } from 'lucide-react';

export default function Account() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold mb-8">Mon Compte</h1>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Intégrations
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Abonnement
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Facturation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <AccountSettings />
          </TabsContent>

          <TabsContent value="integrations">
            <ShopifyConnectionsList />
          </TabsContent>

          <TabsContent value="subscription">
            <div className="space-y-6">
              <CurrentPlanCard />
              <UsageLimits />
            </div>
          </TabsContent>

          <TabsContent value="billing">
            <BillingPortal />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}