import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CatalogActionCard } from '@/components/CatalogActionCard';
import {
  Sparkles,
  CheckCircle,
  Upload,
  Loader2,
  LucideIcon,
} from 'lucide-react';

interface SeoHeroBannerProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  globalScore: number;
  optimizing: boolean;
  onOptimizeAll: () => void;
  canOptimize: boolean;
  features?: Array<{ label: string; icon: LucideIcon }>;
  badge?: { text: string; variant?: 'default' | 'secondary' | 'outline' };
}

export function SeoHeroBanner({
  icon: Icon,
  title,
  subtitle,
  description,
  globalScore,
  optimizing,
  onOptimizeAll,
  canOptimize,
  features = [
    { label: 'SEO Automatisé', icon: Sparkles },
    { label: 'Contenu Complet', icon: CheckCircle },
    { label: 'Sync Shopify', icon: Upload },
  ],
  badge,
}: SeoHeroBannerProps) {
  return (
    <CatalogActionCard
      icon={Icon}
      title={title}
      description={
        <>
          <p className="font-medium text-slate-600">{subtitle}</p>
          <p className="mt-1">{description}</p>
        </>
      }
      meta={
        <div className="flex w-full max-w-xl flex-col items-center gap-4">
          {badge && (
            <Badge variant="secondary" className="border-violet-100 bg-violet-50 text-violet-700">
              <Sparkles className="mr-1 h-3 w-3" />
              {badge.text}
            </Badge>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            {features.map((feature, index) => (
              <span key={index} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                <feature.icon className="h-3.5 w-3.5 text-violet-600" />
                {feature.label}
              </span>
            ))}
          </div>

          <div className="w-full max-w-xs">
            <div className="mb-2 flex items-end justify-center gap-2">
              <span className="text-3xl font-bold text-slate-900">{globalScore}</span>
              <span className="pb-1 text-xs font-medium text-slate-500">Score SEO Global</span>
            </div>
            <Progress value={globalScore} className="h-2 [&>div]:bg-violet-600" />
          </div>
        </div>
      }
      action={
        <Button
          size="lg"
          onClick={onOptimizeAll}
          disabled={optimizing || !canOptimize}
          className="rounded-lg bg-violet-600 px-6 font-semibold text-white shadow-none hover:bg-violet-700"
        >
          {optimizing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Optimisation...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Optimiser Tout
            </>
          )}
        </Button>
      }
    />
  );
}
