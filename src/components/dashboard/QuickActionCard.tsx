import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/language';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  borderColor: string;
  hoverBg: string;
  onClick: () => void;
  counter?: string | number;
  badge?: {
    text: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
  };
}

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  iconColor,
  iconBg,
  borderColor,
  hoverBg,
  onClick,
  counter,
  badge
}: QuickActionCardProps) {
  const { t } = useTranslation();
  
  return (
    <button
      onClick={onClick}
      className={`group relative p-5 border-2 ${borderColor} rounded-xl ${hoverBg} transition-all duration-300 text-left hover:scale-[1.02] hover:shadow-lg`}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-transparent" />
      
      <div className="relative space-y-3">
        <div className="flex items-start justify-between">
          <div className={`p-2.5 rounded-lg ${iconBg} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          {badge && (
            <Badge variant={badge.variant} className="text-xs animate-fade-in">
              {badge.text}
            </Badge>
          )}
        </div>
        
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        </div>

        {counter !== undefined && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground">
              <span className="text-lg font-bold text-foreground">{counter}</span>
              {typeof counter === 'number' && counter > 0 && (
                <span className="ml-1">{t.dashboard.items}</span>
              )}
            </p>
          </div>
        )}
      </div>
    </button>
  );
}
