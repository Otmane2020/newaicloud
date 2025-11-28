import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  TrendingUp,
  Calendar,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from '@/lib/language';

interface CronJob {
  name: string;
  displayName: string;
  frequency: string;
  lastRun: string | null;
  nextRun: string | null;
  status: 'running' | 'success' | 'failed' | 'never_run' | 'overdue';
  description: string;
  functionName: string;
}

export default function CronMonitoring() {
  const { t, language } = useTranslation();
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);

  const loadCronStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get Shopify sync settings
      const { data: shopifySettings } = await supabase
        .from('shopify_sync_settings')
        .select('import_frequency, last_import_at, next_import_at')
        .eq('user_id', user.id)
        .maybeSingle();

      // Get Google Merchant sync settings
      const { data: merchantSettings } = await supabase
        .from('google_merchant_sync_settings')
        .select('sync_frequency, last_sync_at, next_sync_at, auto_sync_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      // Get Blog campaigns
      const { data: campaigns } = await supabase
        .from('blog_campaigns')
        .select('frequency, last_generation_date, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const now = new Date();
      
      const jobs: CronJob[] = [
        {
          name: 'shopify-auto-sync',
          displayName: t.cronMonitoring.jobs.shopifySync,
          frequency: shopifySettings?.import_frequency || 'manual',
          lastRun: shopifySettings?.last_import_at || null,
          nextRun: shopifySettings?.next_import_at || null,
          status: getJobStatus(
            shopifySettings?.last_import_at,
            shopifySettings?.next_import_at,
            shopifySettings?.import_frequency !== 'manual'
          ),
          description: t.cronMonitoring.jobs.shopifySyncDesc,
          functionName: 'scheduled-sync',
        },
        {
          name: 'google-merchant-sync',
          displayName: t.cronMonitoring.jobs.googleMerchant,
          frequency: merchantSettings?.sync_frequency || 'manual',
          lastRun: merchantSettings?.last_sync_at || null,
          nextRun: merchantSettings?.next_sync_at || null,
          status: getJobStatus(
            merchantSettings?.last_sync_at,
            merchantSettings?.next_sync_at,
            merchantSettings?.auto_sync_enabled
          ),
          description: t.cronMonitoring.jobs.googleMerchantDesc,
          functionName: 'scheduled-merchant-sync',
        },
        {
          name: 'blog-generation',
          displayName: t.cronMonitoring.jobs.blogGeneration,
          frequency: campaigns?.[0]?.frequency || 'none',
          lastRun: campaigns?.[0]?.last_generation_date || null,
          nextRun: null,
          status: getJobStatus(
            campaigns?.[0]?.last_generation_date,
            null,
            (campaigns?.length || 0) > 0
          ),
          description: t.cronMonitoring.jobs.blogGenerationDesc,
          functionName: 'generate-blog-article',
        },
      ];

      setCronJobs(jobs);
    } catch (error) {
      console.error('Error loading cron status:', error);
      toast.error(t.cronMonitoring.toasts.loadError);
    } finally {
      setLoading(false);
    }
  };

  const getJobStatus = (
    lastRun: string | null,
    nextRun: string | null,
    isEnabled: boolean
  ): 'running' | 'success' | 'failed' | 'never_run' | 'overdue' => {
    if (!isEnabled) return 'never_run';
    if (!lastRun) return 'never_run';
    
    const now = new Date();
    if (nextRun && new Date(nextRun) < now) {
      return 'overdue';
    }
    
    return 'success';
  };

  const triggerManualSync = async (functionName: string, jobName: string) => {
    setTriggering(jobName);
    try {
      const { error } = await supabase.functions.invoke(functionName, {
        body: {},
      });

      if (error) throw error;

      toast.success(t.cronMonitoring.toasts.syncTriggered);
      setTimeout(loadCronStatus, 2000);
    } catch (error: any) {
      console.error('Error triggering sync:', error);
      toast.error(error.message || t.cronMonitoring.toasts.syncError);
    } finally {
      setTriggering(null);
    }
  };

  useEffect(() => {
    loadCronStatus();
    const interval = setInterval(loadCronStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':
      case 'overdue':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'never_run':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default">{t.cronMonitoring.status.active}</Badge>;
      case 'overdue':
        return <Badge variant="destructive">{t.cronMonitoring.status.overdue}</Badge>;
      case 'never_run':
        return <Badge variant="outline">{t.cronMonitoring.status.neverRun}</Badge>;
      default:
        return <Badge variant="secondary">{t.cronMonitoring.status.inactive}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>{t.cronMonitoring.loading}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Monitoring des Synchronisations</h1>
          <p className="text-muted-foreground">
            Suivez l'état des synchronisations automatiques en temps réel
          </p>
        </div>
        <Button onClick={loadCronStatus} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tâches actives</p>
                <p className="text-2xl font-bold">
                  {cronJobs.filter((j) => j.status === 'success').length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En retard</p>
                <p className="text-2xl font-bold">
                  {cronJobs.filter((j) => j.status === 'overdue').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jamais exécuté</p>
                <p className="text-2xl font-bold">
                  {cronJobs.filter((j) => j.status === 'never_run').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cron Jobs List */}
      <div className="space-y-4">
        {cronJobs.map((job) => (
          <Card key={job.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <CardTitle className="text-lg">{job.displayName}</CardTitle>
                    <CardDescription>{job.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(job.status)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerManualSync(job.functionName, job.name)}
                    disabled={triggering === job.name}
                  >
                    {triggering === job.name ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Exécuter maintenant
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Fréquence</p>
                    <p className="font-medium capitalize">{job.frequency}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Dernière exécution</p>
                    <p className="font-medium">
                      {job.lastRun ? format(new Date(job.lastRun), 'Pp', { locale: fr }) : 'Jamais'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Prochaine exécution</p>
                    <p className="font-medium">
                      {job.nextRun ? format(new Date(job.nextRun), 'Pp', { locale: fr }) : 'Non planifiée'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
