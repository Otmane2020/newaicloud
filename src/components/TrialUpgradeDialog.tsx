import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

interface TrialUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: 'limit_reached' | 'trial_expired';
  limitType?: string;
}

export function TrialUpgradeDialog({ open, onOpenChange, reason, limitType }: TrialUpgradeDialogProps) {
  const [loading, setLoading] = useState(false);
  const { t, tf } = useTranslation();

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      console.log('💳 Creating immediate payment checkout...');
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan_id: 'starter',
          billing_period: 'monthly',
          force_immediate_payment: true
        }
      });

      if (error) {
        console.error('Checkout error:', error);
        throw error;
      }

      if (data?.url) {
        console.log('✅ Redirecting to payment:', data.url);
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error(t.toasts.error.payment);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      console.log('🔧 Opening customer portal...');
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) {
        console.error('Portal error:', error);
        throw error;
      }

      if (data?.url) {
        console.log('✅ Redirecting to portal:', data.url);
        window.open(data.url, '_blank');
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error(t.toasts.error.portal);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    t.dialogs.upgrade.starter.features.products,
    t.dialogs.upgrade.starter.features.optimizations,
    t.dialogs.upgrade.starter.features.articles,
    t.dialogs.upgrade.starter.features.searches,
    t.dialogs.upgrade.starter.features.chatResponses,
    t.dialogs.upgrade.starter.features.stores,
    t.dialogs.upgrade.starter.features.automation,
    t.dialogs.upgrade.starter.features.support
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {reason === 'limit_reached' 
              ? t.dialogs.upgrade.limitReached.title
              : t.dialogs.upgrade.trialExpired.title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {reason === 'limit_reached' 
              ? tf('dialogs.upgrade.limitReached.description', { limitType })
              : t.dialogs.upgrade.trialExpired.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm font-semibold mb-2">{t.dialogs.upgrade.starter.title}</div>
            <div className="text-2xl font-bold">{t.dialogs.upgrade.starter.price} <span className="text-sm font-normal text-muted-foreground">{t.dialogs.upgrade.starter.perMonth}</span></div>
          </div>

          <div className="space-y-2">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {t.dialogs.upgrade.later}
          </Button>
          <Button
            onClick={handleManageSubscription}
            disabled={loading}
            variant="secondary"
            className="w-full sm:w-auto"
          >
            {loading ? t.dialogs.upgrade.loading : t.dialogs.upgrade.manageSub}
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="bg-primary w-full sm:w-auto"
          >
            {loading ? t.dialogs.upgrade.loading : t.dialogs.upgrade.activateNow}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}