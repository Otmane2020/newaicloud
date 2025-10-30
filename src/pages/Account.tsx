import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AccountSettings } from '@/components/dashboard/AccountSettings';
import { CurrentPlanCard } from '@/components/dashboard/CurrentPlanCard';
import { BillingPortal } from '@/components/dashboard/BillingPortal';
import { ShopifyIntegrationTabs } from '@/components/integration/ShopifyIntegrationTabs';
import { UsageLimits } from '@/components/dashboard/UsageLimits';
import { SubscriptionPlans } from '@/components/dashboard/SubscriptionPlans';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { User, Package, CreditCard, Receipt, Sparkles, Menu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';

export default function Account() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  const { user } = useAuth();
  const { t } = useTranslation();
  const [planName, setPlanName] = useState<string | null>(null);
  const [isTrialing, setIsTrialing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        {/* Mobile Header */}
        <div className="md:hidden mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{t('account.title')}</h1>
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-lg bg-white border"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          {planName && (
            <Badge variant="secondary" className="mt-2">
              <Sparkles className="w-3 h-3 mr-1" />
              {planName}{isTrialing && ' (Trial)'}
            </Badge>
          )}
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block mb-8">
          <h1 className="text-4xl font-bold mb-2">{t('account.title')}</h1>
          {planName && (
            <Badge variant="secondary" className="mt-2">
              <Sparkles className="w-3 h-3 mr-1" />
              {planName}{isTrialing && ' (Trial)'}
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {/* Mobile Tabs */}
          {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 bg-white z-50 p-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Navigation</h2>
                <button
                  onClick={toggleMobileMenu}
                  className="p-2 rounded-lg bg-gray-100"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
              <TabsList className="grid grid-cols-1 gap-2 w-full">
                <TabsTrigger value="profile" className="flex items-center gap-2 justify-start p-4">
                  <User className="w-4 h-4" />
                  {t('account.profile_tab')}
                </TabsTrigger>
                <TabsTrigger value="integrations" className="flex items-center gap-2 justify-start p-4">
                  <Package className="w-4 h-4" />
                  {t('account.integrations_tab')}
                </TabsTrigger>
                <TabsTrigger value="subscription" className="flex items-center gap-2 justify-start p-4">
                  <CreditCard className="w-4 h-4" />
                  {t('account.subscription_tab')}
                </TabsTrigger>
                <TabsTrigger value="billing" className="flex items-center gap-2 justify-start p-4">
                  <Receipt className="w-4 h-4" />
                  {t('account.billing_tab')}
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          {/* Desktop Tabs */}
          <TabsList className="hidden md:grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('account.profile_tab')}
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              {t('account.integrations_tab')}
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              {t('account.subscription_tab')}
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              {t('account.billing_tab')}
            </TabsTrigger>
          </TabsList>

          {/* Mobile Compact Tabs (when menu is closed) */}
          <TabsList className="md:hidden grid grid-cols-2 gap-2 mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-1 text-xs p-2">
              <User className="w-3 h-3" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-1 text-xs p-2">
              <Package className="w-3 h-3" />
              Apps
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-1 text-xs p-2">
              <CreditCard className="w-3 h-3" />
              Plan
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-1 text-xs p-2">
              <Receipt className="w-3 h-3" />
              Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="bg-white rounded-lg border p-4 md:p-6">
              <AccountSettings />
            </div>
          </TabsContent>

          <TabsContent value="integrations">
            <div className="bg-white rounded-lg border p-4 md:p-6">
              <ShopifyIntegrationTabs />
            </div>
          </TabsContent>

          <TabsContent value="subscription">
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
          </TabsContent>

          <TabsContent value="billing">
            <div className="bg-white rounded-lg border p-4 md:p-6">
              <BillingPortal />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}