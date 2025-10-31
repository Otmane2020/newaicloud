import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Home, 
  ShoppingBag, 
  Folder, 
  FileText, 
  Globe,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
  Clock,
  Sparkles,
  BarChart3,
  Image as ImageIcon,
  Link as LinkIcon,
  Search,
  Zap
} from 'lucide-react';

interface ScoreItem {
  label: string;
  score: number;
  maxScore: number;
  status: 'success' | 'warning' | 'error';
}

interface AuditSection {
  title: string;
  items: {
    label: string;
    value: string;
    status: 'success' | 'warning' | 'error';
    icon: React.ReactNode;
  }[];
}

export function SeoAuditReports() {
  const [activeReport, setActiveReport] = useState('homepage');

  const getStatusIcon = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'bg-green-100 dark:bg-green-950';
    if (percentage >= 60) return 'bg-yellow-100 dark:bg-yellow-950';
    return 'bg-red-100 dark:bg-red-950';
  };

  // Données de démonstration - À remplacer par des données réelles depuis Supabase
  const homepageData = {
    globalScore: 82,
    scores: [
      { label: 'Technique', score: 90, maxScore: 100, status: 'success' as const },
      { label: 'Contenu', score: 75, maxScore: 100, status: 'warning' as const },
      { label: 'Sémantique', score: 80, maxScore: 100, status: 'success' as const },
    ],
    technical: [
      { label: 'Balise Title', value: '✅ "Boutique de meubles design – Decora Home"', status: 'success' as const, icon: <Search className="w-4 h-4" /> },
      { label: 'Meta Description', value: '⚠️ Trop courte (98 caractères)', status: 'warning' as const, icon: <FileText className="w-4 h-4" /> },
      { label: 'Balises H1-H6', value: '❌ Plusieurs H1 détectés', status: 'error' as const, icon: <FileText className="w-4 h-4" /> },
      { label: 'Favicon & OG tags', value: '✅ Présents', status: 'success' as const, icon: <ImageIcon className="w-4 h-4" /> },
      { label: 'Canonical URL', value: '⚠️ Canonical manquant', status: 'warning' as const, icon: <LinkIcon className="w-4 h-4" /> },
      { label: 'Temps de chargement', value: '1,9s (Excellent)', status: 'success' as const, icon: <Zap className="w-4 h-4" /> },
    ],
    content: [
      { label: 'Densité mots-clés', value: 'Optimale (2,3%)', status: 'success' as const, icon: <Sparkles className="w-4 h-4" /> },
      { label: 'Cohérence Title/H1', value: 'Bonne', status: 'success' as const, icon: <CheckCircle2 className="w-4 h-4" /> },
      { label: 'CTA clair', value: 'Présent', status: 'success' as const, icon: <CheckCircle2 className="w-4 h-4" /> },
      { label: 'Liens internes', value: '38 liens', status: 'success' as const, icon: <LinkIcon className="w-4 h-4" /> },
    ],
    recommendations: [
      'Améliorer la meta description (viser 150-160 caractères)',
      'Corriger la structure H1 (un seul H1 par page)',
      'Ajouter une balise canonical',
      'Enrichir avec des mots-clés secondaires',
    ],
  };

  const productData = {
    globalScore: 88,
    scores: [
      { label: 'Structure', score: 95, maxScore: 100, status: 'success' as const },
      { label: 'Contenu IA', score: 92, maxScore: 100, status: 'success' as const },
      { label: 'Images', score: 78, maxScore: 100, status: 'warning' as const },
    ],
    elements: [
      { label: 'SEO Title', value: '"Table basse en bois massif – Meublei"', status: 'success' as const, icon: <Search className="w-4 h-4" /> },
      { label: 'Meta Description', value: '✅ Optimisée (152 caractères)', status: 'success' as const, icon: <FileText className="w-4 h-4" /> },
      { label: 'H1', value: 'Identique au nom produit', status: 'success' as const, icon: <FileText className="w-4 h-4" /> },
      { label: 'Alt Images', value: '5/6 générés par Vision AI', status: 'warning' as const, icon: <ImageIcon className="w-4 h-4" /> },
      { label: 'Slug', value: 'table-basse-bois-massif', status: 'success' as const, icon: <LinkIcon className="w-4 h-4" /> },
      { label: 'Description', value: '420 mots, unique', status: 'success' as const, icon: <FileText className="w-4 h-4" /> },
      { label: 'Schema.org', value: 'Product, Offer, AggregateRating', status: 'success' as const, icon: <CheckCircle2 className="w-4 h-4" /> },
    ],
    aiQuality: {
      score: 92,
      humanEdit: 8,
    },
  };

  const collectionData = {
    globalScore: 75,
    scores: [
      { label: 'Structure', score: 80, maxScore: 100, status: 'success' as const },
      { label: 'Contenu', score: 65, maxScore: 100, status: 'warning' as const },
      { label: 'Liens internes', score: 82, maxScore: 100, status: 'success' as const },
    ],
    elements: [
      { label: 'Title & Meta', value: 'Mots-clés présents', status: 'success' as const, icon: <Search className="w-4 h-4" /> },
      { label: 'Texte descriptif', value: '⚠️ Trop court (80 mots)', status: 'warning' as const, icon: <FileText className="w-4 h-4" /> },
      { label: 'Produits visibles', value: '24 produits cohérents', status: 'success' as const, icon: <ShoppingBag className="w-4 h-4" /> },
      { label: 'Filtres', value: 'Indexabilité OK', status: 'success' as const, icon: <CheckCircle2 className="w-4 h-4" /> },
      { label: 'Liens internes', value: 'Vers produits similaires', status: 'success' as const, icon: <LinkIcon className="w-4 h-4" /> },
      { label: 'H1', value: '"Canapés modernes et design"', status: 'success' as const, icon: <FileText className="w-4 h-4" /> },
    ],
  };

  const blogData = {
    globalScore: 85,
    scores: [
      { label: 'Structure', score: 90, maxScore: 100, status: 'success' as const },
      { label: 'Contenu', score: 88, maxScore: 100, status: 'success' as const },
      { label: 'Optimisation', score: 78, maxScore: 100, status: 'warning' as const },
    ],
    elements: [
      { label: 'Structure Hn', value: 'H1/H2/H3 cohérents', status: 'success' as const, icon: <FileText className="w-4 h-4" /> },
      { label: 'Densité mots-clés', value: 'Optimale', status: 'success' as const, icon: <Sparkles className="w-4 h-4" /> },
      { label: 'Meta & OpenGraph', value: 'Présents', status: 'success' as const, icon: <ImageIcon className="w-4 h-4" /> },
      { label: 'Longueur', value: '1.250 mots', status: 'success' as const, icon: <FileText className="w-4 h-4" /> },
      { label: 'Images', value: '⚠️ 2/5 avec alt', status: 'warning' as const, icon: <ImageIcon className="w-4 h-4" /> },
      { label: 'Interlinking', value: '3 liens produits', status: 'success' as const, icon: <LinkIcon className="w-4 h-4" /> },
    ],
  };

  const globalData = {
    stats: {
      pagesAnalyzed: 156,
      averageScore: 82,
      titleOptimized: 89,
      metaMissing: 12,
      altGenerated: 78,
      h1Coherent: 94,
      scoreAbove80: 67,
    },
    evolution: [
      { month: 'Janvier', score: 72 },
      { month: 'Février', score: 76 },
      { month: 'Mars', score: 82 },
    ],
  };

  const renderScoreCard = (data: { globalScore: number; scores: ScoreItem[] }) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Score SEO Global
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className={`flex-shrink-0 w-32 h-32 rounded-full ${getScoreBgColor(data.globalScore, 100)} flex flex-col items-center justify-center`}>
            <div className={`text-5xl font-bold ${getScoreColor(data.globalScore, 100)}`}>
              {data.globalScore}
            </div>
            <div className="text-sm text-muted-foreground">/100</div>
          </div>
          <div className="flex-1 space-y-4 w-full">
            {data.scores.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.score}/{item.maxScore}</span>
                </div>
                <Progress value={(item.score / item.maxScore) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderAuditSection = (title: string, items: any[]) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="mt-0.5">{getStatusIcon(item.status)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {item.icon}
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
                <p className="text-sm text-muted-foreground">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 border-2 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Rapports SEO Automatiques
          </CardTitle>
          <CardDescription className="text-base">
            Analyse complète de votre site Shopify : pages d'accueil, produits, collections et articles
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeReport} onValueChange={setActiveReport} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2 h-auto p-2">
          <TabsTrigger value="homepage" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Page d'accueil</span>
            <span className="sm:hidden">Home</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Produits</span>
            <span className="sm:hidden">Produits</span>
          </TabsTrigger>
          <TabsTrigger value="collections" className="flex items-center gap-2">
            <Folder className="w-4 h-4" />
            <span className="hidden sm:inline">Collections</span>
            <span className="sm:hidden">Collections</span>
          </TabsTrigger>
          <TabsTrigger value="blog" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Blog</span>
            <span className="sm:hidden">Blog</span>
          </TabsTrigger>
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Vue globale</span>
            <span className="sm:hidden">Global</span>
          </TabsTrigger>
        </TabsList>

        {/* Homepage Report */}
        <TabsContent value="homepage" className="space-y-6">
          {renderScoreCard(homepageData)}
          {renderAuditSection('🔍 Analyse Technique', homepageData.technical)}
          {renderAuditSection('💡 Contenu & Sémantique', homepageData.content)}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Recommandations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {homepageData.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Report */}
        <TabsContent value="products" className="space-y-6">
          {renderScoreCard(productData)}
          {renderAuditSection('🛍️ Éléments SEO Produit', productData.elements)}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Score IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Qualité IA</span>
                  <Badge className="bg-green-100 dark:bg-green-950 text-green-700">{productData.aiQuality.score}%</Badge>
                </div>
                <Progress value={productData.aiQuality.score} className="h-2" />
                <div className="text-sm text-muted-foreground">
                  AI Quality {productData.aiQuality.score}% | Human Edit {productData.aiQuality.humanEdit}%
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Collections Report */}
        <TabsContent value="collections" className="space-y-6">
          {renderScoreCard(collectionData)}
          {renderAuditSection('🧩 Analyse Collection', collectionData.elements)}
        </TabsContent>

        {/* Blog Report */}
        <TabsContent value="blog" className="space-y-6">
          {renderScoreCard(blogData)}
          {renderAuditSection('📝 Analyse Article', blogData.elements)}
        </TabsContent>

        {/* Global Report */}
        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>📈 Vue d'ensemble du site</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{globalData.stats.pagesAnalyzed}</div>
                  <div className="text-sm text-muted-foreground">Pages analysées</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{globalData.stats.averageScore}</div>
                  <div className="text-sm text-muted-foreground">Score moyen</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-green-600">{globalData.stats.titleOptimized}%</div>
                  <div className="text-sm text-muted-foreground">Titles optimisés</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-red-600">{globalData.stats.metaMissing}%</div>
                  <div className="text-sm text-muted-foreground">Meta manquantes</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-blue-600">{globalData.stats.altGenerated}%</div>
                  <div className="text-sm text-muted-foreground">Alt générés IA</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-purple-600">{globalData.stats.scoreAbove80}%</div>
                  <div className="text-sm text-muted-foreground">Score &gt; 80</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Évolution mensuelle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {globalData.evolution.map((month, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{month.month}</span>
                    <div className="flex items-center gap-3 flex-1 ml-4">
                      <Progress value={month.score} className="h-2 flex-1" />
                      <span className="text-sm font-medium w-12">{month.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
