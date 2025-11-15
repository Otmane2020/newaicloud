import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ReactNode } from 'react';

interface GSCMetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
  loading?: boolean;
}

export function GSCMetricCard({ title, value, change, icon, loading }: GSCMetricCardProps) {
  const getTrend = () => {
    if (!change || change === 0) return 'neutral';
    return change > 0 ? 'up' : 'down';
  };

  const trend = getTrend();

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-card to-card/50 border-border/50">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      
      <div className="relative p-6">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-10 w-10 bg-muted/50 rounded-lg" />
            <div className="h-4 w-20 bg-muted/50 rounded" />
            <div className="h-8 w-24 bg-muted/50 rounded" />
          </div>
        ) : (
          <>
            {/* Icon and trend */}
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                {icon}
              </div>
              
              {change !== undefined && (
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
                  trend === 'down' ? 'text-rose-600 dark:text-rose-400' :
                  'text-muted-foreground'
                }`}>
                  {trend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
                  {trend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
                  {trend === 'neutral' && <Minus className="h-3.5 w-3.5" />}
                  <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
                </div>
              )}
            </div>

            {/* Value */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium">{title}</p>
              <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
