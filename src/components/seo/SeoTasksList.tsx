import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Target, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';

interface SeoTask {
  id: string;
  task_type: string;
  priority: number;
  status: string;
  title: string;
  description: string | null;
  action_url: string | null;
  estimated_impact: number;
  created_at: string;
}

export function SeoTasksList() {
  const { t, tf } = useTranslation();
  const [tasks, setTasks] = useState<SeoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingTask, setCompletingTask] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('seo_tasks')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: true })
        .order('estimated_impact', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeTask = async (taskId: string, impact: number) => {
    try {
      setCompletingTask(taskId);
      const { error } = await supabase
        .from('seo_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      toast.success(tf('seo.seoTasks.toasts.taskCompleted', { impact }), {
        description: t.seo.seoTasks.toasts.reanalyzeForNewScore
      });

      await fetchTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error(t.seo.seoTasks.toasts.updateError);
    } finally {
      setCompletingTask(null);
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200';
    if (priority === 2) return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority === 1) return t.seo.seoTasks.priority.critical;
    if (priority === 2) return t.seo.seoTasks.priority.important;
    return t.seo.seoTasks.priority.optional;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return null;
  }

  const totalImpact = tasks.reduce((sum, task) => sum + task.estimated_impact, 0);

  return (
    <Card className="border-yellow-200 dark:border-yellow-800">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-yellow-600" />
              🎯 {t.seo.seoTasks.title}
            </CardTitle>
            <CardDescription>
              {tf('seo.seoTasks.description', { points: totalImpact })}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-lg font-bold">
            +{totalImpact} pts
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={false}
                disabled={completingTask === task.id}
                onCheckedChange={() => completeTask(task.id, task.estimated_impact)}
                className="mt-1"
              />
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {task.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      +{task.estimated_impact}
                    </Badge>
                    <Badge className={getPriorityColor(task.priority)}>
                      {getPriorityLabel(task.priority)}
                    </Badge>
                  </div>
                </div>
                {task.action_url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-2 h-8 px-2"
                    onClick={() => {
                      if (task.action_url?.startsWith('http')) {
                        window.open(task.action_url, '_blank');
                      } else {
                        window.location.href = task.action_url || '#';
                      }
                    }}
                  >
                    {t.seo.seoTasks.fixNow}
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
