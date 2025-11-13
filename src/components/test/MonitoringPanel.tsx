import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useUsageLimits } from '@/hooks/useUsageLimits';

interface LogEntry {
  timestamp: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export function MonitoringPanel() {
  const { limits } = useUsageLimits();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [apiCalls, setApiCalls] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState(0);

  useEffect(() => {
    // Intercept console logs for real-time monitoring
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        type: 'info' as const,
        message: args.join(' ')
      }].slice(-50)); // Keep only last 50 logs
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        type: 'error' as const,
        message: args.join(' ')
      }].slice(-50));
      originalError.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Activity className="w-3 h-3 text-blue-500" />;
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">📊 Monitoring en temps réel</h2>
      
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Appels API</span>
          </div>
          <p className="text-2xl font-bold">{apiCalls}</p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">Temps moyen</span>
          </div>
          <p className="text-2xl font-bold">{avgResponseTime}ms</p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Optimisations</span>
          </div>
          <p className="text-2xl font-bold">
            {limits?.usage.optimizations_count || 0}
            <span className="text-sm text-muted-foreground">
              /{limits?.limits.max_optimizations || 0}
            </span>
          </p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-muted-foreground">Articles</span>
          </div>
          <p className="text-2xl font-bold">
            {limits?.usage.articles_count || 0}
            <span className="text-sm text-muted-foreground">
              /{limits?.limits.max_articles || 0}
            </span>
          </p>
        </Card>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Console Logs</h3>
        <ScrollArea className="h-64 rounded border">
          <div className="p-4 space-y-2">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun log pour le moment
              </p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 text-xs">
                  {getTypeIcon(log.type)}
                  <Badge variant="outline" className="shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </Badge>
                  <p className="text-muted-foreground break-all">{log.message}</p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}
