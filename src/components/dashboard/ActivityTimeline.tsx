import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, FileText, Store, Zap, Clock } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface Activity {
  id: string;
  type: 'optimization' | 'article' | 'connection' | 'sync';
  title: string;
  timestamp: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const { t } = useTranslation();
  
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'optimization':
        return { icon: Zap, color: 'text-warning', bg: 'bg-warning/10' };
      case 'article':
        return { icon: FileText, color: 'text-primary', bg: 'bg-primary/10' };
      case 'connection':
        return { icon: Store, color: 'text-success', bg: 'bg-success/10' };
      case 'sync':
        return { icon: CheckCircle2, color: 'text-accent', bg: 'bg-accent/10' };
    }
  };

  if (activities.length === 0) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            {t.dashboard.activity.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t.dashboard.activity.empty}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          {t.dashboard.activity.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const config = getActivityIcon(activity.type);
            const Icon = config.icon;
            
            return (
              <div 
                key={activity.id} 
                className="flex gap-4 group hover:bg-muted/30 p-2 rounded-lg transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Timeline line */}
                <div className="relative flex flex-col items-center">
                  <div className={`p-2 rounded-full ${config.bg} group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  {index < activities.length - 1 && (
                    <div className="flex-1 w-px bg-border mt-2" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium text-foreground mb-1">
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.timestamp}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
