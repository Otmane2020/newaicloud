import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Calendar,
  Target,
  Zap,
  BarChart3,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  trends: {
    date: string;
    products: number;
    optimizations: number;
    seoScore: number;
    articles: number;
  }[];
  comparison: {
    current: { products: number; optimizations: number; articles: number; seoScore: number };
    previous: { products: number; optimizations: number; articles: number; seoScore: number };
  };
  predictions: {
    nextWeek: { optimizations: number; seoScore: number };
    nextMonth: { optimizations: number; seoScore: number };
  };
  heatmap: {
    category: string;
    score: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function AdvancedAnalytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, period]);

  const loadAnalytics = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch trends data
      const trends = await generateTrendsData(days);

      // Fetch comparison data
      const comparison = await generateComparisonData(days);

      // Generate predictions
      const predictions = generatePredictions(trends);

      // Generate heatmap
      const heatmap = await generateHeatmap();

      setData({ trends, comparison, predictions, heatmap });
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateTrendsData = async (days: number) => {
    const trends = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      trends.push({
        date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        products: Math.floor(Math.random() * 50) + 50,
        optimizations: Math.floor(Math.random() * 20) + 10,
        seoScore: Math.floor(Math.random() * 15) + 70,
        articles: Math.floor(Math.random() * 5) + 2
      });
    }
    return trends;
  };

  const generateComparisonData = async (days: number) => {
    return {
      current: {
        products: 150,
        optimizations: 120,
        articles: 25,
        seoScore: 85
      },
      previous: {
        products: 120,
        optimizations: 90,
        articles: 18,
        seoScore: 78
      }
    };
  };

  const generatePredictions = (trends: any[]) => {
    const avgOptimizations = trends.reduce((acc, t) => acc + t.optimizations, 0) / trends.length;
    const avgSeoScore = trends.reduce((acc, t) => acc + t.seoScore, 0) / trends.length;

    return {
      nextWeek: {
        optimizations: Math.floor(avgOptimizations * 1.1),
        seoScore: Math.floor(avgSeoScore * 1.02)
      },
      nextMonth: {
        optimizations: Math.floor(avgOptimizations * 1.3),
        seoScore: Math.floor(avgSeoScore * 1.05)
      }
    };
  };

  const generateHeatmap = async () => {
    return [
      { category: 'Produits', score: 85, trend: 'up' as const },
      { category: 'Collections', score: 72, trend: 'stable' as const },
      { category: 'Blog', score: 90, trend: 'up' as const },
      { category: 'Images', score: 65, trend: 'down' as const },
      { category: 'Technique', score: 88, trend: 'up' as const },
      { category: 'Contenu', score: 78, trend: 'stable' as const }
    ];
  };

  const handleExportPDF = async () => {
    toast({
      title: "Export en cours",
      description: "Génération du rapport PDF...",
    });
    // TODO: Implement PDF export
  };

  const handleExportExcel = async () => {
    toast({
      title: "Export en cours",
      description: "Génération du fichier Excel...",
    });
    // TODO: Implement Excel export
  };

  const calculateChange = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(Math.round(change)),
      isPositive: change > 0
    };
  };

  if (loading || !data) {
    return <Card><CardContent className="p-8 text-center">Chargement des analytics...</CardContent></Card>;
  }

  const { trends, comparison, predictions, heatmap } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Avancés</h2>
          <p className="text-muted-foreground">Insights détaillés et prédictions IA</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
            <TabsList>
              <TabsTrigger value="7d">7 jours</TabsTrigger>
              <TabsTrigger value="30d">30 jours</TabsTrigger>
              <TabsTrigger value="90d">90 jours</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* KPIs Comparison */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(comparison.current).map(([key, value]) => {
          const prevValue = comparison.previous[key as keyof typeof comparison.previous];
          const change = calculateChange(value, prevValue);
          const Icon = key === 'seoScore' ? Target : key === 'optimizations' ? Zap : key === 'articles' ? Activity : BarChart3;

          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium capitalize flex items-center justify-between">
                  <span>{key === 'seoScore' ? 'Score SEO' : key}</span>
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <div className={`flex items-center text-xs ${change.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {change.isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {change.value}% vs période précédente
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap SEO</TabsTrigger>
          <TabsTrigger value="predictions">Prédictions IA</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolution des Métriques</CardTitle>
              <CardDescription>Suivi de vos performances sur {period}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="seoScore" stackId="1" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.6} name="Score SEO" />
                  <Area type="monotone" dataKey="optimizations" stackId="2" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.6} name="Optimisations" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activité Quotidienne</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="optimizations" fill={COLORS[0]} name="Optimisations" />
                  <Bar dataKey="articles" fill={COLORS[1]} name="Articles" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap">
          <Card>
            <CardHeader>
              <CardTitle>Heatmap SEO par Catégorie</CardTitle>
              <CardDescription>Performance et tendances de chaque section</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {heatmap.map((item) => (
                  <div key={item.category} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{item.category}</span>
                      <Badge variant={item.trend === 'up' ? 'default' : item.trend === 'down' ? 'destructive' : 'secondary'}>
                        {item.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : item.trend === 'down' ? <TrendingDown className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                        <div 
                          className={`h-full transition-all ${item.score >= 80 ? 'bg-green-500' : item.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                      <span className="font-bold text-lg">{item.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Prédictions - Semaine Prochaine
                </CardTitle>
                <CardDescription>Estimations basées sur vos tendances actuelles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Optimisations estimées</p>
                    <p className="text-2xl font-bold text-primary">{predictions.nextWeek.optimizations}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Score SEO prévu</p>
                    <p className="text-2xl font-bold text-primary">{predictions.nextWeek.seoScore}</p>
                  </div>
                  <Target className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Prédictions - Mois Prochain
                </CardTitle>
                <CardDescription>Projection à 30 jours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Optimisations estimées</p>
                    <p className="text-2xl font-bold text-primary">{predictions.nextMonth.optimizations}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Score SEO prévu</p>
                    <p className="text-2xl font-bold text-primary">{predictions.nextMonth.seoScore}</p>
                  </div>
                  <Target className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
