import { useState, useEffect } from 'react';
import { AccountSettings } from '@/components/dashboard/AccountSettings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, ExternalLink, CreditCard, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/lib/language';
import { toast } from 'sonner';

export default function AeoAccount() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { language } = useTranslation();
  const [planName, setPlanName] = useState<string | null>(null);
  const [isTrialing, setIsTrialing] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

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

  const handleOpenBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast.error(language === 'fr' ? 'Erreur lors de l\'ouverture du portail' : 'Error opening portal');
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {language === 'fr' ? 'Mon compte' : 'My Account'}
        </h1>
        {planName && (
          <Badge variant="secondary" className="mt-2 bg-violet-100 text-violet-700">
            <Sparkles className="w-3 h-3 mr-1" />
            {isTrialing ? (language === 'fr' ? 'Essai gratuit' : 'Free trial') : planName}
          </Badge>
        )}
      </div>

      {/* Profile Settings - Only visible section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          {language === 'fr' ? 'Paramètres du profil' : 'Profile Settings'}
        </h2>
        <AccountSettings />
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Subscription Card */}
        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/subscription')}>
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-violet-100">
              <CreditCard className="h-5 w-5 text-violet-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">
                {language === 'fr' ? 'Gérer mon abonnement' : 'Manage subscription'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'fr' ? 'Voir les plans et upgrader' : 'View plans and upgrade'}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        {/* Billing Portal Card */}
        <Card 
          className="p-6 hover:shadow-md transition-shadow cursor-pointer" 
          onClick={handleOpenBillingPortal}
        >
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-slate-100">
              <ExternalLink className="h-5 w-5 text-slate-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">
                {language === 'fr' ? 'Portail de facturation' : 'Billing portal'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'fr' ? 'Factures et méthode de paiement' : 'Invoices and payment method'}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Link to Aeoreply.com */}
      <div className="text-center pt-4">
        <a 
          href="https://aeoreply.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
        >
          <ExternalLink className="h-4 w-4" />
          aeoreply.com
        </a>
      </div>
    </div>
  );
}
