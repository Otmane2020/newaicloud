import { Button } from '@/components/ui/button';
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
  count 
}: SmartBannerProps) {
  const configs = {
    optimization: {
      gradient: 'from-warning/20 via-warning/10 to-transparent',
      border: 'border-warning/30',
      icon: Sparkles,
      iconColor: 'text-warning',
      iconBg: 'bg-warning/10',
      buttonVariant: 'default' as const,
      buttonClass: 'bg-warning hover:bg-warning/90 text-white'
    },
    'low-score': {
      gradient: 'from-destructive/20 via-destructive/10 to-transparent',
      border: 'border-destructive/30',
      icon: AlertTriangle,
      iconColor: 'text-destructive',
      iconBg: 'bg-destructive/10',
      buttonVariant: 'destructive' as const,
      buttonClass: ''
    },
    success: {
      gradient: 'from-success/20 via-success/10 to-transparent',
      border: 'border-success/30',
      icon: Lightbulb,
      iconColor: 'text-success',
      iconBg: 'bg-success/10',
      buttonVariant: 'default' as const,
      buttonClass: 'bg-success hover:bg-success/90 text-white'
    }
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className={`relative overflow-hidden rounded-xl border-2 ${config.border} bg-gradient-to-r ${config.gradient} backdrop-blur-sm p-6 animate-fade-in`}>
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
      
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className={`p-3 rounded-xl ${config.iconBg} animate-pulse`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          
          <div className="flex-1">
            <h3 className="text-base font-bold text-foreground mb-1">
              {count !== undefined && count > 0 && (
                <span className={`${config.iconColor} mr-2`}>🎯 {count}</span>
              )}
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <Button 
          onClick={onAction}
          className={`${config.buttonClass} font-semibold shadow-lg hover:scale-105 transition-transform`}
          size="lg"
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
