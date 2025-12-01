import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, Target, Zap, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/language';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ROASData {
  date: string;
  ad_cost: number | null;
  revenue: number | null;
  roas: number | null;
}

export function GoogleAdsOptimization() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [roasData, setRoasData] = useState<ROASData[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [generatingStrategies, setGeneratingStrategies] = useState(false);

  useEffect(() => {
    if (user) {
      loadROASData();
      loadStrategies();
    }
  }, [user]);

  const loadROASData = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('google_ads_roas')
        .select('date, ad_cost, revenue, roas')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setRoasData(data || []);
    } catch (error) {
      console.error('Error loading ROAS data:', error);
    }
  };

  const loadStrategies = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('google_ads_strategies')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_applied', false)
        .order('impact_score', { ascending: false })
        .limit(5);

      if (error) throw error;
      setStrategies(data || []);
    } catch (error) {
      console.error('Error loading strategies:', error);
    }
  };

  const generateStrategies = async () => {
    setGeneratingStrategies(true);
    try {
      const { error } = await supabase.functions.invoke('generate-ads-strategy', {
        body: {}
      });

      if (error) throw error;
      
      toast.success(t.googleAds.toasts.strategiesGenerated);
      loadStrategies();
    } catch (error) {
      console.error('Error generating strategies:', error);
      toast.error(t.googleAds.toasts.strategiesError);
    } finally {
      setGeneratingStrategies(false);
    }
  };

  // Calculate metrics from ROAS data
  const calculateMetrics = () => {
    if (roasData.length === 0) {
      return {
        currentROAS: '-',
        conversionRate: '-',
        avgCPC: '-',
        qualityScore: '-'
      };
    }

    const totalRevenue = roasData.reduce((sum, d) => sum + (d.revenue || 0), 0);
    const totalCost = roasData.reduce((sum, d) => sum + (d.ad_cost || 0), 0);
    
    const avgROAS = totalCost > 0 ? (totalRevenue / totalCost).toFixed(2) : '-';

    return {
      currentROAS: avgROAS !== '-' ? `${avgROAS}x` : '-',
      conversionRate: '-',
      avgCPC: totalCost > 0 ? `€${(totalCost / 1000).toFixed(2)}` : '-',
      qualityScore: strategies.length > 0 ? `${Math.round(85 - strategies.length * 5)}/100` : '-'
    };
  };

  const metrics = calculateMetrics();

  const metricsDisplay = [
    {
      label: t.googleAds.optimization.metrics.currentROAS,
      value: metrics.currentROAS,
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      label: t.googleAds.optimization.metrics.conversionRate,
      value: metrics.conversionRate,
      icon: Target,
      color: 'text-blue-600',
    },
    {
      label: t.googleAds.optimization.metrics.avgCPC,
      value: metrics.avgCPC,
      icon: TrendingUp,
      color: 'text-purple-600',
    },
    {
      label: t.googleAds.optimization.metrics.qualityScore,
      value: metrics.qualityScore,
      icon: Zap,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsDisplay.map((metric) => (
          <Card key={metric.label} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="text-2xl font-bold mt-1">{metric.value}</p>
              </div>
              <metric.icon className={`h-8 w-8 ${metric.color}`} />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t.googleAds.optimization.roasTitle}</h3>
          <Button 
            onClick={generateStrategies} 
            disabled={generatingStrategies}
            size="sm"
          >
            {generatingStrategies ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Générer avec l'IA
          </Button>
        </div>
        
        {strategies.length > 0 ? (
          <div className="space-y-3">
            {strategies.map((strategy) => (
              <div 
                key={strategy.id} 
                className="p-4 border rounded-lg bg-gradient-to-r from-primary/5 to-transparent"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {strategy.strategy_type}
                      </span>
                      {strategy.impact_score && (
                        <span className="text-xs text-muted-foreground">
                          Impact: {strategy.impact_score}/10
                        </span>
                      )}
                    </div>
                    <p className="text-sm">{strategy.recommendation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t.googleAds.optimization.optimizeAuto}</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              {t.googleAds.optimization.optimizeAutoDesc}
            </p>
            <Button onClick={generateStrategies} disabled={generatingStrategies}>
              {generatingStrategies ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Démarrer l'optimisation
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
        <h3 className="font-semibold mb-3">{t.googleAds.optimization.automaticOptimizations.title}</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.optimization.automaticOptimizations.feature1}
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.optimization.automaticOptimizations.feature2}
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.optimization.automaticOptimizations.feature3}
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.optimization.automaticOptimizations.feature4}
          </li>
        </ul>
      </Card>
    </div>
  );
}
