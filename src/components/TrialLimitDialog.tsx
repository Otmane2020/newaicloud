import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";
import { useShopifyBilling } from "@/hooks/useShopifyBilling";
import { useNavigate } from "react-router-dom";

interface TrialLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: string;
  currentUsage: number;
  maxUsage: number;
  trialMaxUsage?: number;
  isTrialing?: boolean;
}

export function TrialLimitDialog({
  open,
  onOpenChange,
  limitType,
  currentUsage,
  maxUsage,
  trialMaxUsage,
  isTrialing = true,
}: TrialLimitDialogProps) {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { isShopifyUser, billingProvider } = useShopifyBilling();
  const navigate = useNavigate();

  const isShopifyBilling = isShopifyUser || billingProvider === "shopify";
  const dialogTexts = isTrialing
    ? t.dialogs.trialLimit
    : (t.dialogs as any).planLimit || t.dialogs.trialLimit;

  const formatUsage = () => {
    const template = dialogTexts.usageFormat || "{{limitType}}: {{currentUsage}}/{{maxUsage}} used";
    return template
      .replace('{{limitType}}', limitType)
      .replace('{{currentUsage}}', String(currentUsage))
      .replace('{{maxUsage}}', String(trialMaxUsage ?? maxUsage));
  };

  const handlePayNow = async () => {
    if (loading) return;
    setLoading(true);

    if (isShopifyBilling) {
      onOpenChange(false);
      navigate("/subscription");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("force-payment", {
        body: {
          success_url: `${window.location.origin}/dashboard?payment=success`,
          cancel_url: `${window.location.origin}/dashboard?payment=cancelled`,
        },
      });

      if (error) throw error;
      if (!data?.url || typeof data.url !== 'string') {
        throw new Error("No checkout URL returned");
      }

      let checkoutUrl: URL;
      try {
        checkoutUrl = new URL(data.url);
      } catch {
        throw new Error("Invalid checkout URL returned");
      }

      if (checkoutUrl.protocol !== 'https:') {
        throw new Error("Unsafe checkout URL returned");
      }

      // Async window.open calls are frequently blocked by browsers. A same-tab
      // redirect is reliable and Stripe returns the user to success_url/cancel_url.
      onOpenChange(false);
      window.location.assign(checkoutUrl.toString());
    } catch (error) {
      console.error("Error creating immediate payment:", error);
      toast.error(t.toasts.error.payment);
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
    t.dialogs.upgrade.starter.features.support,
  ];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !loading && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle>{dialogTexts.title}</DialogTitle>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {isTrialing ? 'Usage limit' : 'Plan limit'}
              </p>
            </div>
          </div>
          <DialogDescription>
            {dialogTexts.description}
            {limitType && (
              <span className="mt-2 block font-semibold text-foreground">{formatUsage()}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Starter</p>
                <p className="mt-1 text-lg font-semibold">{t.dialogs.upgrade.starter.title}</p>
              </div>
              <div className="text-right text-2xl font-bold tracking-tight">
                {isShopifyBilling ? '$9.99' : t.dialogs.upgrade.starter.price}
                <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                  {isShopifyBilling ? '/month' : t.dialogs.upgrade.starter.perMonth}
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Button onClick={handlePayNow} disabled={loading} className="h-11 w-full rounded-xl">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              {loading ? t.dialogs.upgrade.loading : dialogTexts.activateMyPlan}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-11 w-full rounded-xl"
            >
              {dialogTexts.later}
            </Button>
          </div>

          <p className="px-2 text-center text-xs leading-relaxed text-muted-foreground">
            {dialogTexts.unlockFeatures}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
