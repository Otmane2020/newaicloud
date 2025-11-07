import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  Users,
  MousePointer,
  BarChart3,
  RefreshCw,
  Calendar,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';

interface SearchConsoleData {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

const MetricCard = ({ title, value, change, icon, trend = 'neutral' }: MetricCardProps) => {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-muted-foreground';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">{icon}</div>
        <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
          {getTrendIcon()}
          <span>{change > 0 ? '+' : ''}{change}%</span>
        </div>
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </Card>
  );
};

interface GoogleSearchConsoleInsightsProps {
  selectedDomain: string;
}

export function GoogleSearchConsoleInsights({ selectedDomain }: GoogleSearchConsoleInsightsProps) {
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');
  const [data, setData] = useState<SearchConsoleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [syncConfig, setSyncConfig] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [analyzingAnomalies, setAnalyzingAnomalies] = useState(false);

  useEffect(() => {
    if (selectedDomain) {
      loadCachedData();
    }
  }, [selectedDomain, dateRange]);

  const loadCachedData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const daysBack = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Try to load cached data first
      const { data: cachedData, error } = await supabase
        .from('google_search_console_data')
        .select('*')
        .eq('user_id', user.id)
        .eq('domain', selectedDomain)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (cachedData && cachedData.length > 0) {
        const formattedData = cachedData.map(item => ({
          date: new Date(item.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
          clicks: item.clicks,
          impressions: item.impressions,
          ctr: parseFloat(item.ctr.toString()),
          position: parseFloat(item.position.toString())
        }));
        setData(formattedData);
      } else {
        // If no cached data, fetch from API
        loadSearchConsoleData();
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
      loadSearchConsoleData();
    }
  };

  useEffect(() => {
    if (selectedDomain) {
      loadAlerts();
    }
  }, [selectedDomain]);

  useEffect(() => {
    loadSyncConfig();
  }, []);

  const loadSearchConsoleData = async () => {
    if (!selectedDomain) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('get-search-console-data', {
        body: {
          domain: selectedDomain,
          days: parseInt(dateRange),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.data) throw new Error('Aucune donnée reçue');

      const formattedData = data.data.map((item: SearchConsoleData) => ({
        date: new Date(item.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
        clicks: item.clicks,
        impressions: item.impressions,
        ctr: parseFloat(item.ctr.toString()),
        position: parseFloat(item.position.toString())
      }));

      setData(formattedData);
      toast.success('Données chargées avec succès');
    } catch (error: any) {
      console.error('Error loading Search Console data:', error);
      toast.error(error?.message || 'Erreur lors du chargement des données');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('gsc_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('domain', selectedDomain)
        .eq('is_resolved', false)
        .order('detection_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const loadSyncConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('gsc_sync_config')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSyncConfig(data);
    } catch (error) {
      console.error('Error loading sync config:', error);
    }
  };

  const analyzeAnomalies = async () => {
    if (!selectedDomain) return;
    
    try {
      setAnalyzingAnomalies(true);
      const { data, error } = await supabase.functions.invoke('analyze-gsc-anomalies', {
        body: { domain: selectedDomain, days: parseInt(dateRange) },
      });

      if (error) throw error;

      if (data?.summary?.total_alerts > 0) {
        toast.success(`${data.summary.total_alerts} alerte(s) détectée(s)`);
        await loadAlerts();
      } else {
        toast.success('Aucune anomalie détectée');
      }
    } catch (error: any) {
      console.error('Error analyzing anomalies:', error);
      toast.error('Erreur lors de l\'analyse des anomalies');
    } finally {
      setAnalyzingAnomalies(false);
    }
  };

  const updateSyncConfig = async (field: string, value: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('gsc_sync_config')
        .upsert({
          user_id: user.id,
          [field]: value,
        });

      if (error) throw error;

      setSyncConfig((prev: any) => ({ ...prev, [field]: value }));
      toast.success('Configuration mise à jour');
    } catch (error) {
      console.error('Error updating sync config:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const markAlertAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('gsc_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;
      await loadAlerts();
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('gsc_alerts')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;
      toast.success('Alerte résolue');
      await loadAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Erreur lors de la résolution');
    }
  };

  const calculateMetrics = () => {
    if (data.length === 0) return null;

    const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0);
    const totalImpressions = data.reduce((sum, d) => sum + d.impressions, 0);
    const avgCTR = data.reduce((sum, d) => sum + d.ctr, 0) / data.length;
    const avgPosition = data.reduce((sum, d) => sum + d.position, 0) / data.length;

    const halfLength = Math.floor(data.length / 2);
    const recentData = data.slice(halfLength);
    const oldData = data.slice(0, halfLength);

    const recentClicks = recentData.reduce((sum, d) => sum + d.clicks, 0);
    const oldClicks = oldData.reduce((sum, d) => sum + d.clicks, 0);
    const clicksChange = oldClicks > 0 ? ((recentClicks - oldClicks) / oldClicks) * 100 : 0;

    const recentImpressions = recentData.reduce((sum, d) => sum + d.impressions, 0);
    const oldImpressions = oldData.reduce((sum, d) => sum + d.impressions, 0);
    const impressionsChange = oldImpressions > 0 ? ((recentImpressions - oldImpressions) / oldImpressions) * 100 : 0;

    const recentCTR = recentData.reduce((sum, d) => sum + d.ctr, 0) / recentData.length;
    const oldCTR = oldData.reduce((sum, d) => sum + d.ctr, 0) / oldData.length;
    const ctrChange = oldCTR > 0 ? ((recentCTR - oldCTR) / oldCTR) * 100 : 0;

    const recentPosition = recentData.reduce((sum, d) => sum + d.position, 0) / recentData.length;
    const oldPosition = oldData.reduce((sum, d) => sum + d.position, 0) / oldData.length;
    const positionChange = oldPosition > 0 ? ((oldPosition - recentPosition) / oldPosition) * 100 : 0;

    return {
      totalClicks,
      totalImpressions,
      avgCTR: avgCTR.toFixed(2),
      avgPosition: avgPosition.toFixed(1),
      clicksChange: Math.round(clicksChange),
      impressionsChange: Math.round(impressionsChange),
      ctrChange: Math.round(ctrChange),
      positionChange: Math.round(positionChange),
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="space-y-6">
      {/* Alerts panel */}
      {alerts.length > 0 && (
        <Card className="p-6 border-orange-200 bg-orange-50/50">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2 text-orange-900">
                Alertes détectées ({alerts.length})
              </h3>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start justify-between gap-4 p-3 bg-white rounded-lg border border-orange-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={
                          alert.severity === 'critical' ? 'destructive' :
                          alert.severity === 'high' ? 'default' :
                          'secondary'
                        }>
                          {alert.severity === 'critical' ? 'Critique' :
                           alert.severity === 'high' ? 'Important' :
                           alert.severity === 'medium' ? 'Moyen' : 'Faible'}
                        </Badge>
                        <span className="font-medium text-sm">{alert.metric_name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Baisse de {Math.abs(alert.change_percentage).toFixed(1)}% 
                        ({alert.previous_value.toLocaleString()} → {alert.current_value.toLocaleString()})
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!alert.is_read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAlertAsRead(alert.id)}
                        >
                          Marquer lu
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        Résoudre
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Date range selector with settings */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-primary" />
            <Label>Période d'analyse</Label>
            <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 derniers jours</SelectItem>
                <SelectItem value="30">30 derniers jours</SelectItem>
                <SelectItem value="90">90 derniers jours</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={analyzeAnomalies}
              disabled={analyzingAnomalies}
              className="gap-2"
            >
              {analyzingAnomalies ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              Analyser les anomalies
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Paramètres
          </Button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="mt-6 pt-6 border-t space-y-4">
            <h4 className="font-semibold mb-4">Paramètres de synchronisation automatique</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Synchronisation automatique</Label>
                <p className="text-sm text-muted-foreground">
                  Synchroniser automatiquement les données quotidiennement
                </p>
              </div>
              <Switch
                checked={syncConfig?.auto_sync_enabled ?? true}
                onCheckedChange={(checked) => updateSyncConfig('auto_sync_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir des notifications pour les alertes et synchronisations
                </p>
              </div>
              <Switch
                checked={syncConfig?.notification_enabled ?? true}
                onCheckedChange={(checked) => updateSyncConfig('notification_enabled', checked)}
              />
            </div>

            {syncConfig?.last_sync_at && (
              <div className="text-sm text-muted-foreground">
                Dernière synchronisation : {new Date(syncConfig.last_sync_at).toLocaleString('fr-FR')}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Metrics cards */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Clics totaux"
            value={metrics.totalClicks.toLocaleString()}
            change={metrics.clicksChange}
            trend={metrics.clicksChange > 0 ? 'up' : metrics.clicksChange < 0 ? 'down' : 'neutral'}
            icon={<MousePointer className="h-5 w-5 text-primary" />}
          />
          <MetricCard
            title="Impressions"
            value={metrics.totalImpressions.toLocaleString()}
            change={metrics.impressionsChange}
            trend={metrics.impressionsChange > 0 ? 'up' : metrics.impressionsChange < 0 ? 'down' : 'neutral'}
            icon={<Users className="h-5 w-5 text-primary" />}
          />
          <MetricCard
            title="CTR moyen"
            value={`${metrics.avgCTR}%`}
            change={metrics.ctrChange}
            trend={metrics.ctrChange > 0 ? 'up' : metrics.ctrChange < 0 ? 'down' : 'neutral'}
            icon={<BarChart3 className="h-5 w-5 text-primary" />}
          />
          <MetricCard
            title="Position moyenne"
            value={metrics.avgPosition}
            change={metrics.positionChange}
            trend={metrics.positionChange > 0 ? 'up' : metrics.positionChange < 0 ? 'down' : 'neutral'}
            icon={<TrendingUp className="h-5 w-5 text-primary" />}
          />
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Chargement des données de Google Search Console...</p>
          </div>
        </Card>
      )}

      {/* Charts */}
      {!loading && data.length > 0 && (
        <>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Évolution des clics et impressions</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                <Area type="monotone" dataKey="impressions" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Position moyenne et CTR</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="position" stroke="hsl(var(--chart-3))" />
                <Line yAxisId="right" type="monotone" dataKey="ctr" stroke="hsl(var(--chart-4))" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {/* No data state */}
      {!loading && data.length === 0 && (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Aucune donnée Search Console</h3>
              <p className="text-muted-foreground">
                Les données Google Search Console n'ont pas encore été synchronisées pour ce domaine.
              </p>
            </div>
            <Button onClick={loadSearchConsoleData} className="gap-2">
              <RefreshCw className="h-5 w-5" />
              Charger les données depuis Google Search Console
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
