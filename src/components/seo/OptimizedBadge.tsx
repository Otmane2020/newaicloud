import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface OptimizedBadgeProps {
  optimizationCount: number;
  className?: string;
}

export function OptimizedBadge({ optimizationCount, className = '' }: OptimizedBadgeProps) {
  const { t } = useTranslation();
  if (optimizationCount === 0) return null;
  
  return (
    <Badge 
      variant="secondary" 
      className={`gap-1 bg-primary/10 text-primary hover:bg-primary/20 ${className}`}
    >
      <Sparkles className="h-3 w-3" />
      {t.badges.optimizedByAI}
    </Badge>
  );
}
