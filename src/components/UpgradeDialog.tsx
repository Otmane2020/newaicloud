import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: 'optimizations' | 'articles' | 'chat' | 'shopifySearch';
  usage?: number;
  limit?: number;
}

export function UpgradeDialog({ open, onOpenChange, limitType, usage, limit }: UpgradeDialogProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const limitData = t(`upgradeDialog.limit_types.${limitType}`, { returnObjects: true }) as {
    title: string;
    message: string;
    trial: string;
    paid: string;
  };

  const features = t('upgradeDialog.features', { returnObjects: true }) as string[];

  const handleActivate = () => {
    onOpenChange(false);
    navigate('/subscription');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">🚀 {t('upgradeDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            {t('upgradeDialog.reached_limit')}
          </p>
          <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
            <p className="font-medium text-orange-900 dark:text-orange-100">
              {limitData.title}: {limitData.message.replace('{usage}', String(usage)).replace('{limit}', String(limit))}
            </p>
          </div>
          
          <Separator />
          
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold mb-3 text-lg">{t('upgradeDialog.starter_plan_title')}</h3>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                <span className="text-sm">{t('upgradeDialog.all_features')}</span>
              </li>
            </ul>
          </div>
          
          <Button 
            onClick={handleActivate} 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            size="lg"
          >
            💳 {t('upgradeDialog.activate_button')}
          </Button>
          
          <Button 
            onClick={() => onOpenChange(false)} 
            variant="ghost" 
            className="w-full"
          >
            {t('upgradeDialog.later')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}