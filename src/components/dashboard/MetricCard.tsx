import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient: string;
  iconBg: string;
  subtitle?: string;
  badge?: string;
  trend?: string;
}

export function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  gradient, 
  iconBg,
  subtitle, 
  badge,
  trend 
}: MetricCardProps) {
  return (
    <Card className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
      {/* Border gradient effect on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      
      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl ${iconBg} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-5 h-5 text-current" />
          </div>
          {badge && (
            <Badge variant="secondary" className="text-xs font-semibold">
              {badge}
            </Badge>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-black text-foreground tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p className="text-xs font-medium text-success">{trend}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
