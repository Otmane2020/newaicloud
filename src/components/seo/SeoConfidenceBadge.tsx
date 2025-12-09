import { Badge } from '@/components/ui/badge';
import { Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { calculateDetailedSeoScore, getConfidenceBadgeColor, getConfidenceLabel } from '@/lib/seoQuality';

interface SeoConfidenceBadgeProps {
  seoTitle: string | null | undefined;
  seoDescription: string | null | undefined;
  showLabel?: boolean;
  className?: string;
  hasImage?: boolean;
  tags?: string | null;
  optimizationCount?: number;
  itemId?: string;
}

export function SeoConfidenceBadge({ 
  seoTitle, 
  seoDescription, 
  showLabel = true,
  className = '',
  hasImage = true,
  tags,
  optimizationCount = 0,
  itemId
}: SeoConfidenceBadgeProps) {
  // Use the complete SEO score calculation
  const scoreDetails = calculateDetailedSeoScore(
    seoTitle, 
    seoDescription, 
    hasImage, 
    true, // hasUrl
    tags,
    optimizationCount,
    itemId
  );
  const confidence = scoreDetails.score;
  const badgeColor = getConfidenceBadgeColor(confidence);
  const label = getConfidenceLabel(confidence);

  const getIcon = () => {
    if (confidence >= 80) return <Shield className="h-3 w-3" />;
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
