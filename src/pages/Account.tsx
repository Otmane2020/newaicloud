import { AccountSettings } from '@/components/dashboard/AccountSettings';
import { CurrentPlanCard } from '@/components/dashboard/CurrentPlanCard';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useTranslation } from '@/hooks/useTranslation';

export default function Account() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              {t('account.title')}
            </h1>
            <p className="text-muted-foreground text-lg">
              {t('account.subtitle')}
            </p>
          </div>
          <LanguageSelector />
        </div>

        <div className="space-y-6">
          <CurrentPlanCard />
          <AccountSettings />
        </div>
      </div>
    </div>
  );
}