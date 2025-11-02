import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: 'optimizations' | 'articles' | 'chat' | 'shopifySearch';
  usage?: number;
  limit?: number;
}

export function UpgradeDialog({ open, onOpenChange, limitType, usage, limit }: UpgradeDialogProps) {
  const [loading, setLoading] = useState(false);
  const { t, tf } = useTranslation();

  const limitTitle = t.dialogs.limit.limitTypes[limitType];
  const limitMessage = tf('dialogs.limit.usageMessage', { 
    usage: usage || 0, 
    limit: limit || 0, 
    type: limitTitle 
  });

  const handleActivate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('force-payment', {
        body: {
          success_url: `${window.location.origin}/dashboard?payment=success`,
          cancel_url: `${window.location.origin}/dashboard?payment=cancelled`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        onOpenChange(false);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error(t.toasts.error.payment);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{t.dialogs.limit.upgradeRequired}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            {t.dialogs.limit.reachedLimit}
          </p>
          <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
            <p className="font-medium text-orange-900 dark:text-orange-100">
              {limitTitle}: {limitMessage}
            </p>
          </div>
          
          <Separator />
          
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold mb-3 text-lg">{t.dialogs.upgrade.starter.title} - {t.dialogs.upgrade.starter.price}{t.dialogs.upgrade.starter.perMonth}</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                <span className="text-sm">{t.dialogs.upgrade.starter.features.products}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                <span className="text-sm">{t.dialogs.upgrade.starter.features.optimizations}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                <span className="text-sm">{t.dialogs.upgrade.starter.features.articles}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                <span className="text-sm">{t.dialogs.upgrade.starter.features.searches}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                <span className="text-sm">{t.dialogs.upgrade.starter.features.chatResponses}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                <span className="text-sm">{t.dialogs.upgrade.starter.features.stores}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                <span className="text-sm">{t.dialogs.upgrade.starter.features.automation}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                <span className="text-sm">{t.dialogs.upgrade.starter.features.support}</span>
              </li>
            </ul>
          </div>
          
          <Button 
            onClick={handleActivate} 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
            ) : (
              <CreditCard className="w-5 h-5 mr-2" />
            )}
            {loading ? t.dialogs.upgrade.loading : t.dialogs.limit.activatePlan}
          </Button>
          
          <Button 
            onClick={() => onOpenChange(false)} 
            variant="ghost" 
            className="w-full"
          >
            {t.dialogs.limit.maybeLater}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}