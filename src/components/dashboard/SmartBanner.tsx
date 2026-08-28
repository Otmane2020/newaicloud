import { Button } from '@/components/ui/button';
import { CatalogActionCard } from '@/components/CatalogActionCard';
import { Sparkles, AlertTriangle, Lightbulb } from 'lucide-react';

interface SmartBannerProps {
  type: 'optimization' | 'low-score' | 'success';
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  count?: number;
}

export function SmartBanner({
  type,
  title,
  description,
  actionLabel,
  onAction,
  count,
}: SmartBannerProps) {
  const icons = {
    optimization: Sparkles,
    'low-score': AlertTriangle,
    success: Lightbulb,
  };

  const Icon = icons[type];

  return (
    <CatalogActionCard
      icon={Icon}
      title={title}
      description={description}
      meta={count !== undefined && count > 0 ? `${count} items need attention` : undefined}
      action={
        <Button
          onClick={onAction}
          size="sm"
          className="rounded-lg bg-violet-600 px-5 font-semibold text-white shadow-none hover:bg-violet-700"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      }
    />
  );
}
