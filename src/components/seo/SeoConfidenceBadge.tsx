import { Badge } from '@/components/ui/badge';
import { Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { calculateSeoConfidence, getConfidenceBadgeColor, getConfidenceLabel } from '@/lib/seoQuality';

interface SeoConfidenceBadgeProps {
  seoTitle: string | null | undefined;
  seoDescription: string | null | undefined;
  showLabel?: boolean;
  className?: string;
}

export function SeoConfidenceBadge({ 
  seoTitle, 
  seoDescription, 
  showLabel = true,
  className = '' 
}: SeoConfidenceBadgeProps) {
  const confidence = calculateSeoConfidence(seoTitle, seoDescription);
  const badgeColor = getConfidenceBadgeColor(confidence);
  const label = getConfidenceLabel(confidence);

  const getIcon = () => {
    if (confidence >= 70) return <Shield className="h-3 w-3" />;
    if (confidence >= 50) return <TrendingUp className="h-3 w-3" />;
    return <AlertTriangle className="h-3 w-3" />;
  };

  return (
    <Badge 
      variant="outline" 
      className={`${badgeColor} border ${className} flex items-center gap-1.5`}
    >
      {getIcon()}
      <span className="font-semibold">{confidence}%</span>
      {showLabel && <span className="text-xs">- {label}</span>}
    </Badge>
  );
}
