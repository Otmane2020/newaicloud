import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

interface TrialLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: string;
  currentUsage: number;
  maxUsage: number;
  trialMaxUsage?: number;
}

export function TrialLimitDialog({
  open,
  onOpenChange,
  limitType,
  currentUsage,
  maxUsage,
  trialMaxUsage,
}: TrialLimitDialogProps) {
  const [loading, setLoading] = useState(false);
  const { t, tf } = useTranslation();

  const handlePayNow = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("force-payment", {
        body: {
          success_url: `${window.location.origin}/dashboard?payment=success`,
          cancel_url: `${window.location.origin}/dashboard?payment=cancelled`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Error creating immediate payment:", error);
      toast.error(t.toasts.error.payment);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md mx-2 sm:mx-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <DialogTitle className="text-lg sm:text-xl leading-tight">{t.dialogs.trialLimit.title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm sm:text-base pt-2">
            {t.dialogs.trialLimit.description}
            {limitType && (
              <div className="mt-2 font-semibold text-foreground">
                {tf('dialogs.trialLimit.usageFormat', { 
                  limitType, 
                  currentUsage, 
                  maxUsage: trialMaxUsage || maxUsage 
                })}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 sm:py-4">
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-sm font-semibold">{t.dialogs.upgrade.starter.title}</div>
              <div className="text-xl sm:text-2xl font-bold">
                {t.dialogs.upgrade.starter.price}<span className="text-xs sm:text-sm font-normal text-muted-foreground">{t.dialogs.upgrade.starter.perMonth}</span>
              </div>
            </div>
            <ul className="text-xs sm:text-sm space-y-1.5 sm:space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">✅</span>
                <span className="flex-1">{t.dialogs.upgrade.starter.features.products}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">✅</span>
                <span className="flex-1">{t.dialogs.upgrade.starter.features.optimizations}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">✅</span>
                <span className="flex-1">{t.dialogs.upgrade.starter.features.articles}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">✅</span>
                <span className="flex-1">{t.dialogs.upgrade.starter.features.searches}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">✅</span>
                <span className="flex-1">{t.dialogs.upgrade.starter.features.chatResponses}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">✅</span>
                <span className="flex-1">{t.dialogs.upgrade.starter.features.stores}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">✅</span>
                <span className="flex-1">{t.dialogs.upgrade.starter.features.automation}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">✅</span>
                <span className="flex-1">{t.dialogs.upgrade.starter.features.support}</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 sm:gap-3">
            <Button
              size="lg"
              onClick={handlePayNow}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm sm:text-base h-11 sm:h-12"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2" />
              ) : (
                <>
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  {t.dialogs.upgrade.activateMyPlan}
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full text-sm sm:text-base h-11 sm:h-12"
            >
              {t.dialogs.upgrade.later}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground px-2">
            {t.dialogs.upgrade.unlockFeatures}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
