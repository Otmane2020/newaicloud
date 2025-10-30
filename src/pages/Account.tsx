import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AccountSettings } from '@/components/dashboard/AccountSettings';
import { CurrentPlanCard } from '@/components/dashboard/CurrentPlanCard';
import { BillingPortal } from '@/components/dashboard/BillingPortal';
import { ShopifyIntegrationTabs } from '@/components/integration/ShopifyIntegrationTabs';
import { UsageLimits } from '@/components/dashboard/UsageLimits';
import { SubscriptionPlans } from '@/components/dashboard/SubscriptionPlans';

import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
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

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'integrations', 'subscription', 'billing'].includes(tab)) {
      // Valid tab from URL
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Account Settings</h1>
        {planName && (
          <Badge variant="secondary" className="mt-2">
            <Sparkles className="w-3 h-3 mr-1" />
            {planName}{isTrialing && ' (Trial)'}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg border p-4 md:p-6">
            <AccountSettings />
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="bg-white rounded-lg border p-4 md:p-6">
            <ShopifyIntegrationTabs />
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="space-y-4 md:space-y-6">
            <div className="bg-white rounded-lg border p-4 md:p-6">
              <CurrentPlanCard />
            </div>
            <div className="bg-white rounded-lg border p-4 md:p-6">
              <SubscriptionPlans />
            </div>
            <div className="bg-white rounded-lg border p-4 md:p-6">
              <UsageLimits />
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="bg-white rounded-lg border p-4 md:p-6">
            <BillingPortal />
          </div>
        )}
      </div>
    </div>
  );
}