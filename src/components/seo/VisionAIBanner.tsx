import { CatalogActionCard } from '@/components/CatalogActionCard';
import { Sparkles, Eye } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface VisionAIBannerProps {
  className?: string;
}

export function VisionAIBanner({ className = '' }: VisionAIBannerProps) {
  const { t } = useTranslation();

  return (
    <CatalogActionCard
      icon={Eye}
      className={className}
      compact
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600" />
          {t.seo.optimization.visionAI.badge}
        </span>
      }
      description={
        <>
          <span className="font-semibold text-slate-600">{t.seo.optimization.visionAI.description}</span>{' '}
          {t.seo.optimization.visionAI.fullDescription}
        </>
      }
    />
  );
}
