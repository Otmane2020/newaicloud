import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AccountSettings } from '@/components/dashboard/AccountSettings';
import { CurrentPlanCard } from '@/components/dashboard/CurrentPlanCard';
import { BillingPortal } from '@/components/dashboard/BillingPortal';
import { ShopifyIntegrationTabs } from '@/components/integration/ShopifyIntegrationTabs';
import { UsageLimits } from '@/components/dashboard/UsageLimits';
import { SubscriptionPlans } from '@/components/dashboard/SubscriptionPlans';
import { UsageWidget } from '@/components/dashboard/UsageWidget';
import { ReferralSystem } from '@/components/dashboard/ReferralSystem';

import { Badge } from '@/components/ui/badge';
import { WorkspacePageHeader } from '@/components/layout/WorkspacePageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, CreditCard, ReceiptText, Settings, Sparkles, Store, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/language';

// Full access email - same as AppSidebar
const FULL_ACCESS_EMAIL = 'oben.rockman@gmail.com';

export default function Account() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  const { user } = useAuth();
  const { t } = useTranslation();
  const [planName, setPlanName] = useState<string | null>(null);
  const [isTrialing, setIsTrialing] = useState(false);

  // Check if user has full access
  const hasFullAccess = user?.email === FULL_ACCESS_EMAIL;

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

  const accountTabs = [
    { value: 'profile', label: t.account.tabs.profile, icon: User },
    { value: 'integrations', label: t.account.tabs.integrations, icon: Store },
    { value: 'subscription', label: t.account.tabs.subscription, icon: CreditCard },
    { value: 'billing', label: t.account.tabs.billing, icon: ReceiptText },
    { value: 'usage', label: t.dashboard?.usage?.title || 'Usage', icon: Activity },
  ];

  return (
    <div className="space-y-6 pb-10">
      <WorkspacePageHeader
        section="Settings"
        page={accountTabs.find((tab) => tab.value === activeTab)?.label || t.account.title}
        title={t.account.title}
        description="Manage your profile, connected stores, subscription and workspace usage."
        actions={planName ? (
          <Badge variant="secondary" className="px-3 py-2 text-violet-700">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {isTrialing ? t.trial.title : planName}
          </Badge>
        ) : undefined}
      />

      <Tabs value={activeTab} onValueChange={(value) => setSearchParams({ tab: value })}>
        {hasFullAccess && (
          <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5">
            {accountTabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-2">
                <Icon className="h-4 w-4" /><span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        )}

        <TabsContent value="profile" className="mt-6"><AccountSettings /></TabsContent>
        <TabsContent value="integrations" className="mt-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><ShopifyIntegrationTabs /></section>
        </TabsContent>
        <TabsContent value="subscription" className="mt-6">
          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><CurrentPlanCard /></section>
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><SubscriptionPlans /></section>
            {hasFullAccess && <><section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><UsageLimits /></section><ReferralSystem /></>}
          </div>
        </TabsContent>
        <TabsContent value="billing" className="mt-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><BillingPortal /></section>
        </TabsContent>
        <TabsContent value="usage" className="mt-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><UsageWidget /></section>
        </TabsContent>
      </Tabs>
    </div>
  );
}