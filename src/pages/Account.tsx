import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AccountSettings } from '@/components/dashboard/AccountSettings';
import { CurrentPlanCard } from '@/components/dashboard/CurrentPlanCard';
import { BillingPortal } from '@/components/dashboard/BillingPortal';
import { ShopifyIntegrationTabs } from '@/components/integration/ShopifyIntegrationTabs';
import { UsageLimits } from '@/components/dashboard/UsageLimits';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { User, Package, CreditCard, Receipt, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Account() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  const { user } = useAuth();
  const [planName, setPlanName] = useState<string | null>(null);
  const [isTrialing, setIsTrialing] = useState(false);

  useEffect(() => {
    const loadPlan = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_plan_id, trial_ends_at')
        .eq('id', user.id)
        .single();

      if (profile?.current_plan_id) {
        const { data: plan } = await supabase
          .from('subscription_plans')
          .select('name')
          .eq('id', profile.current_plan_id)
          .single();

        if (plan) {
          setPlanName(plan.name);
          setIsTrialing(profile.trial_ends_at ? new Date(profile.trial_ends_at) > new Date() : false);
        }
      }
    };

    loadPlan();
  }, [user]);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Mon Compte</h1>
          {planName && (
            <Badge variant="secondary" className="mt-2">
              <Sparkles className="w-3 h-3 mr-1" />
              {planName}{isTrialing && ' (Trial)'}
            </Badge>
          )}
        </div>

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
            <ShopifyIntegrationTabs />
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