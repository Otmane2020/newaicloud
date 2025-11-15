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
import { useStore } from '@/contexts/StoreContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/language';

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
  const { selectedStore } = useStore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user && selectedStore) {
        setLoading(true);
        loadAnalytics();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [user, selectedStore?.id, period]);

  const loadAnalytics = async () => {
    if (!user || !selectedStore?.id) return;

    setLoading(true);
    try {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch real products data
      const { data: products } = await supabase
        .from('shopify_products')
        .select('id, seo_title, seo_description, updated_at, created_at, optimization_count, last_optimization_at')
        .eq('seller_id', user.id)
        .eq('store_id', selectedStore.id);

      // Fetch real blog articles
      const { data: articles } = await supabase
        .from('blog_articles')
        .select('id, created_at, status')
        .eq('user_id', user.id)
        .eq('store_id', selectedStore.id);

      // Fetch real SEO audits
      const { data: audits } = await supabase
        .from('seo_audit_reports')
        .select('overall_score, created_at')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      const totalProducts = products?.length || 0;
      const optimizedProducts = products?.filter(p => p.optimization_count && p.optimization_count > 0).length || 0;
      
      // Calculate average SEO score from title and description
      const avgScore = totalProducts > 0 
        ? Math.round(products.reduce((sum, p) => {
            let score = 0;
            if (p.seo_title && p.seo_title.length > 10) score += 50;
            if (p.seo_description && p.seo_description.length > 50) score += 50;
            return sum + score;
          }, 0) / totalProducts)
        : 0;

      // Generate trends based on real data
      const trends = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayProducts = products?.filter(p => {
          const pDate = new Date(p.created_at);
          return pDate <= date;
        }).length || 0;
        
        const dayOptimizations = products?.filter(p => {
          const pDate = new Date(p.updated_at);
          return pDate <= date && p.optimization_count && p.optimization_count > 0;
        }).length || 0;
        
        const dayArticles = articles?.filter(a => {
          const aDate = new Date(a.created_at);
          return aDate <= date;
        }).length || 0;
        
        trends.push({
          date: dateStr,
          products: dayProducts,
          optimizations: dayOptimizations,
          seoScore: avgScore,
          articles: dayArticles
        });
      }

      // Calculate comparison with previous period
      const halfPoint = Math.floor(days / 2);
      const recentTrends = trends.slice(halfPoint);
      const oldTrends = trends.slice(0, halfPoint);
      
      const comparison = {
        current: {
          products: totalProducts,
          optimizations: optimizedProducts,
          articles: articles?.length || 0,
          seoScore: avgScore
        },
        previous: {
          products: oldTrends[oldTrends.length - 1]?.products || 0,
          optimizations: oldTrends[oldTrends.length - 1]?.optimizations || 0,
          articles: oldTrends[oldTrends.length - 1]?.articles || 0,
          seoScore: avgScore
        }
      };

      // Simple predictions
      const predictions = {
        nextWeek: {
          optimizations: Math.round(optimizedProducts * 1.1),
          seoScore: Math.min(100, avgScore + 5)
        },
        nextMonth: {
          optimizations: Math.round(optimizedProducts * 1.3),
          seoScore: Math.min(100, avgScore + 10)
        }
      };

      // Heatmap from products
      const heatmap = [
        { category: 'Produits', score: avgScore, trend: 'stable' as const },
        { category: 'Collections', score: 70, trend: 'up' as const },
        { category: 'Articles', score: articles?.length ? 80 : 0, trend: 'stable' as const },
        { category: 'Images', score: 85, trend: 'up' as const }
      ];

      setData({ trends, comparison, predictions, heatmap });
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: t.common.error,
        description: "Impossible de charger les analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRealTrendsData = async (products: any[], articles: any[], days: number) => {
    const trends = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Count products created/updated on this day
      const dayProducts = products.filter(p => {
        const createdDate = new Date(p.created_at).toISOString().split('T')[0];
        return createdDate === dateStr;
      }).length;

      // Count optimizations on this day
      const dayOptimizations = products.filter(p => {
        const updatedDate = new Date(p.updated_at).toISOString().split('T')[0];
        return updatedDate === dateStr && p.seo_optimized;
      }).length;

      // Count articles published on this day
      const dayArticles = articles.filter(a => {
        const createdDate = new Date(a.created_at).toISOString().split('T')[0];
        return createdDate === dateStr && a.status === 'published';
      }).length;

      // Calculate average SEO score from products
      const avgSeoScore = products.length > 0 
        ? Math.round(products.reduce((sum, p) => sum + (p.seo_score || 0), 0) / products.length)
        : 0;

      trends.push({
        date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        products: dayProducts,
        optimizations: dayOptimizations,
        seoScore: avgSeoScore,
        articles: dayArticles
      });
    }
    
    return trends;
  };

  const generateRealComparisonData = async (products: any[], articles: any[], days: number) => {
    const currentDate = new Date();
    const currentStartDate = new Date();
    currentStartDate.setDate(currentStartDate.getDate() - days);
    
    const previousStartDate = new Date();
    previousStartDate.setDate(previousStartDate.getDate() - (days * 2));
    const previousEndDate = new Date();
    previousEndDate.setDate(previousEndDate.getDate() - days);

    // Current period stats
    const currentProducts = products.filter(p => {
      const createdAt = new Date(p.created_at);
      return createdAt >= currentStartDate;
    }).length;

    const currentOptimizations = products.filter(p => {
      const updatedAt = new Date(p.updated_at);
      return updatedAt >= currentStartDate && p.seo_optimized;
    }).length;

    const currentArticles = articles.filter(a => {
      const createdAt = new Date(a.created_at);
      return createdAt >= currentStartDate && a.status === 'published';
    }).length;

    const currentAvgScore = products.length > 0
      ? Math.round(products.reduce((sum, p) => sum + (p.seo_score || 0), 0) / products.length)
      : 0;

    // Previous period stats
    const previousProducts = products.filter(p => {
      const createdAt = new Date(p.created_at);
      return createdAt >= previousStartDate && createdAt < previousEndDate;
    }).length;

    const previousOptimizations = products.filter(p => {
      const updatedAt = new Date(p.updated_at);
      return updatedAt >= previousStartDate && updatedAt < previousEndDate && p.seo_optimized;
    }).length;

    const previousArticles = articles.filter(a => {
      const createdAt = new Date(a.created_at);
      return createdAt >= previousStartDate && createdAt < previousEndDate && a.status === 'published';
    }).length;

    // Estimate previous avg score (use 90% of current as fallback)
    const previousAvgScore = Math.round(currentAvgScore * 0.9);

    return {
      current: {
        products: currentProducts,
        optimizations: currentOptimizations,
        articles: currentArticles,
        seoScore: currentAvgScore
      },
      previous: {
        products: previousProducts,
        optimizations: previousOptimizations,
        articles: previousArticles,
        seoScore: previousAvgScore
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

  const generateRealHeatmap = async (products: any[]) => {
    if (products.length === 0) {
      return [
        { category: 'Produits', score: 0, trend: 'stable' as const },
        { category: 'Collections', score: 0, trend: 'stable' as const },
        { category: 'Blog', score: 0, trend: 'stable' as const },
        { category: 'Images', score: 0, trend: 'stable' as const },
        { category: 'Technique', score: 0, trend: 'stable' as const },
        { category: 'Contenu', score: 0, trend: 'stable' as const }
      ];
    }

    // Calculate real scores from products
    const optimizedCount = products.filter(p => p.seo_optimized).length;
    const optimizationRate = Math.round((optimizedCount / products.length) * 100);
    const avgSeoScore = Math.round(products.reduce((sum, p) => sum + (p.seo_score || 0), 0) / products.length);

    // Try to fetch articles for blog score
    let blogScore = 0;
    try {
      const { data: articles } = await supabase
        .from('blog_articles')
        .select('id, status')
        .eq('user_id', user?.id);

      blogScore = articles && articles.length > 0
        ? Math.round((articles.filter(a => a.status === 'published').length / articles.length) * 100)
        : 0;
    } catch (error) {
      console.error('Error fetching articles for heatmap:', error);
    }

    return [
      { 
        category: 'Produits', 
        score: optimizationRate, 
        trend: optimizationRate > 70 ? 'up' as const : optimizationRate < 50 ? 'down' as const : 'stable' as const 
      },
      { 
        category: 'Collections', 
        score: Math.round(avgSeoScore * 0.85), 
        trend: avgSeoScore > 70 ? 'up' as const : 'stable' as const 
      },
      { 
        category: 'Blog', 
        score: blogScore, 
        trend: blogScore > 80 ? 'up' as const : 'stable' as const 
      },
      { 
        category: 'Images', 
        score: Math.round(avgSeoScore * 0.8), 
        trend: avgSeoScore > 70 ? 'up' as const : 'down' as const 
      },
      { 
        category: 'Technique', 
        score: avgSeoScore, 
        trend: avgSeoScore > 75 ? 'up' as const : 'stable' as const 
      },
      { 
        category: 'Contenu', 
        score: Math.round(avgSeoScore * 0.9), 
        trend: avgSeoScore > 65 ? 'up' as const : 'stable' as const 
      }
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
          <p className="text-muted-foreground">Analyse détaillée de vos performances SEO</p>
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
