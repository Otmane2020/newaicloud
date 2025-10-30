import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

interface TrialUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: 'limit_reached' | 'trial_expired';
  limitType?: string;
}

export function TrialUpgradeDialog({ open, onOpenChange, reason, limitType }: TrialUpgradeDialogProps) {
  const [loading, setLoading] = useState(false);

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
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error('Error creating payment');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    "100 analyzed products",
    "100 AI SEO optimizations / month",
    "1 AI article / month",
    "20 Shopify AI searches / month",
    "50 AI Chat responses / month",
    "1 Shopify store connected",
    "Basic automation",
    "Email support"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {reason === 'limit_reached' 
              ? `🎯 Limit Reached` 
              : `⏰ Trial Expired`}
          </DialogTitle>
          <DialogDescription className="text-base">
            {reason === 'limit_reached' 
              ? `You've reached the ${limitType} limit of the free plan. Upgrade to the Starter plan now to continue (immediate payment).`
              : `Your free trial period has ended. Activate the Starter plan to continue (immediate payment).`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm font-semibold mb-2">Starter Plan</div>
            <div className="text-2xl font-bold">$9.99 <span className="text-sm font-normal text-muted-foreground">/ month</span></div>
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

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Later
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="bg-primary"
          >
            {loading ? 'Loading...' : 'Activate Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}