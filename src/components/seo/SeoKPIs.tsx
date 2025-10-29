import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { calculateSeoConfidence } from '@/lib/seoQuality';
import { 
  Target,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Home,
  FileCode,
  Settings,
  XCircle
} from 'lucide-react';

// Types pour l'analyse de qualité
interface QualityAnalysis {
  score: number;
  issues: string[];
  optimal: boolean;
}

// Analyse qualité SEO Title
const analyzeTitleQuality = (title: string | null, productTitle: string): QualityAnalysis => {
  if (!title) return { score: 0, issues: ['Titre SEO manquant'], optimal: false };
  
  const length = title.length;
  const issues: string[] = [];
  let score = 100;
  
  if (length < 30) { score -= 30; issues.push('Trop court (< 30 caractères)'); }
  if (length > 70) { score -= 20; issues.push('Trop long (> 70 caractères)'); }
  if (length < 50 || length > 60) score -= 10;
  
  // Vérifier si contient le mot-clé (nom du produit)
  const containsKeyword = productTitle && title.toLowerCase().includes(productTitle.toLowerCase().substring(0, 20));
  if (!containsKeyword) { score -= 15; issues.push('Ne contient pas le mot-clé principal'); }
  
  return { 
    score: Math.max(0, score), 
    issues, 
    optimal: length >= 50 && length <= 60 && containsKeyword 
  };
};

// Analyse qualité Meta Description
const analyzeDescriptionQuality = (desc: string | null): QualityAnalysis => {
  if (!desc) return { score: 0, issues: ['Description manquante'], optimal: false };
  
  const length = desc.length;
  const issues: string[] = [];
  let score = 100;
  
  if (length < 70) { score -= 40; issues.push('Trop courte (< 70 caractères)'); }
  if (length > 200) { score -= 30; issues.push('Trop longue (> 200 caractères)'); }
  if (length < 120 || length > 160) score -= 15;
  
  // Vérifier appel à l'action
  const hasCallToAction = /découvrez|achetez|commandez|profitez|obtenez|explorez|trouvez/i.test(desc);
  if (!hasCallToAction) { score -= 10; issues.push('Manque d\'appel à l\'action'); }
  
  return { 
    score: Math.max(0, score), 
    issues, 
    optimal: length >= 120 && length <= 160 && hasCallToAction 
  };
};

// Analyse qualité ALT Text
const analyzeAltTextQuality = (alt: string | null): QualityAnalysis => {
  if (!alt) return { score: 0, issues: ['ALT text manquant'], optimal: false };
  
  const length = alt.length;
  const issues: string[] = [];
  let score = 100;
  
  if (length < 10) { score -= 50; issues.push('Trop court (< 10 caractères)'); }
  if (length > 125) { score -= 20; issues.push('Trop long (> 125 caractères)'); }
  
  // Vérifier si c'est juste un nom de fichier
  if (/\.(jpg|png|jpeg|webp|gif)$/i.test(alt)) {
    score -= 40;
    issues.push('Ressemble à un nom de fichier');
  }
  
  // Vérifier si trop générique
  const isGeneric = /^(image|photo|picture|img)$/i.test(alt.trim());
  if (isGeneric) {
    score -= 30;
    issues.push('Trop générique');
  }
  
  return { 
    score: Math.max(0, score), 
    issues, 
    optimal: length >= 50 && length <= 125 && !isGeneric 
  };
};

// Badge de statut selon le score
const getScoreBadge = (score: number) => {
  if (score >= 90) return { label: 'Excellent', variant: 'default' as const, color: 'text-green-600' };
  if (score >= 70) return { label: 'Bon', variant: 'secondary' as const, color: 'text-blue-600' };
  if (score >= 40) return { label: 'À améliorer', variant: 'outline' as const, color: 'text-orange-600' };
  return { label: 'Critique', variant: 'destructive' as const, color: 'text-red-600' };
};

// Barre de progression colorée selon le score
const ScoreProgress = ({ score }: { score: number }) => {
  const getColor = (score: number) => {
    if (score >= 90) return 'bg-green-600';
    if (score >= 70) return 'bg-blue-600';
    if (score >= 40) return 'bg-orange-600';
    return 'bg-red-600';
  };
  
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
      <div 
        className={`h-full transition-all ${getColor(score)}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
};

export function SeoKPIs() {
  const { user } = useAuth();

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['seo-audit', user?.id],
    queryFn: async () => {
      // Récupérer les produits avec détails complets
      const { data: products, error: productsError } = await supabase
        .from('shopify_products')
        .select('id, title, seo_title, seo_description, description, tags, seo_synced_to_shopify')
        .eq('seller_id', user?.id);

      if (productsError) throw productsError;

      const productIds = products?.map(p => p.id) || [];

      // Récupérer images avec ALT
      const { data: images, error: imagesError } = await supabase
        .from('product_images')
        .select('id, alt_text, src')
        .in('product_id', productIds);

      if (imagesError) throw imagesError;

      // Récupérer homepage (pages avec handle = 'index' ou 'home')
      const { data: homepage } = await supabase
        .from('shopify_pages')
        .select('*')
        .eq('user_id', user?.id)
        .or('handle.eq.index,handle.eq.home,handle.eq.homepage')
        .maybeSingle();

      // Analyse SEO Title Quality + Confidence Index
      const titleAnalyses = products?.map(p => analyzeTitleQuality(p.seo_title, p.title)) || [];
      const confidenceScores = products?.map(p => calculateSeoConfidence(p.seo_title, p.seo_description)) || [];
      
      // Weighted average: 60% quality analysis + 40% confidence index
      const avgTitleScore = titleAnalyses.length > 0
        ? Math.round(
            (titleAnalyses.reduce((sum, a) => sum + a.score, 0) * 0.6 / titleAnalyses.length) +
            (confidenceScores.reduce((sum, c) => sum + c, 0) * 0.4 / confidenceScores.length)
          )
        : 0;
      const titleIssuesCount = titleAnalyses.filter(a => a.issues.length > 0).length;

      // Analyse Meta Description Quality + Confidence Index
      const descAnalyses = products?.map(p => analyzeDescriptionQuality(p.seo_description)) || [];
      
      // Weighted average: 60% quality analysis + 40% confidence index (already calculated above)
      const avgDescScore = descAnalyses.length > 0
        ? Math.round(
            (descAnalyses.reduce((sum, a) => sum + a.score, 0) * 0.6 / descAnalyses.length) +
            (confidenceScores.reduce((sum, c) => sum + c, 0) * 0.4 / confidenceScores.length)
          )
        : 0;
      const descIssuesCount = descAnalyses.filter(a => a.issues.length > 0).length;

      // Analyse Image ALT Quality
      const altAnalyses = images?.map(img => analyzeAltTextQuality(img.alt_text)) || [];
      const avgAltScore = altAnalyses.length > 0
        ? Math.round(altAnalyses.reduce((sum, a) => sum + a.score, 0) / altAnalyses.length)
        : 0;
      const altIssuesCount = altAnalyses.filter(a => a.issues.length > 0).length;

      // Score Homepage SEO
      const homepageScore = homepage
        ? (homepage.seo_title ? 33 : 0) + 
          (homepage.seo_description ? 33 : 0) + 
          (homepage.optimized ? 34 : 0)
        : 0;

      // Score Content Quality
      const productsWithDesc = products?.filter(p => p.description && p.description.length >= 100).length || 0;
      const productsWithTags = products?.filter(p => p.tags && p.tags.length > 0).length || 0;
      const contentScore = products && products.length > 0
        ? Math.round(((productsWithDesc / products.length) * 60) + ((productsWithTags / products.length) * 40))
        : 0;

      // Score Technical SEO
      const syncedProducts = products?.filter(p => p.seo_synced_to_shopify).length || 0;
      const imagesWithAlt = images?.filter(img => img.alt_text).length || 0;
      const technicalScore = products && products.length > 0 && images && images.length > 0
        ? Math.round(((syncedProducts / products.length) * 50) + ((imagesWithAlt / images.length) * 50))
        : 0;

      // Score Global (avec indice de confiance intégré)
      // Moyenne pondérée de toutes les catégories incluant l'indice de confiance
      const avgConfidenceScore = confidenceScores.length > 0
        ? Math.round(confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length)
        : 0;
      
      const globalScore = Math.round(
        (avgTitleScore * 0.2 + avgDescScore * 0.2 + avgAltScore * 0.15 + 
         homepageScore * 0.15 + contentScore * 0.15 + technicalScore * 0.15)
      );

      return {
        globalScore,
        categories: {
          titleQuality: { score: avgTitleScore, issuesCount: titleIssuesCount, total: products?.length || 0 },
          descQuality: { score: avgDescScore, issuesCount: descIssuesCount, total: products?.length || 0 },
          altQuality: { score: avgAltScore, issuesCount: altIssuesCount, total: images?.length || 0 },
          homepageSeo: { score: homepageScore, hasHomepage: !!homepage },
          contentQuality: { score: contentScore, withDesc: productsWithDesc, withTags: productsWithTags, total: products?.length || 0 },
          technicalSeo: { score: technicalScore, synced: syncedProducts, imagesWithAlt, totalImages: images?.length || 0 }
        },
        details: {
          titleAnalyses,
          descAnalyses,
          altAnalyses,
          products: products || [],
          images: images || [],
          homepage
        }
      };
    },
    enabled: !!user?.id
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const categories = auditData?.categories;
  const globalScore = auditData?.globalScore || 0;
  const scoreBadge = getScoreBadge(globalScore);

  // Recommandations prioritaires
  const urgentIssues: string[] = [];
  const importantIssues: string[] = [];
  const improvementIssues: string[] = [];

  if (categories?.homepageSeo.score === 0) {
    urgentIssues.push('Page d\'accueil SEO manquante ou non optimisée (impact élevé)');
  }
  if (categories?.altQuality.score < 40) {
    urgentIssues.push(`${categories.altQuality.issuesCount} images avec ALT text critique`);
  }
  if (categories?.titleQuality.score < 40) {
    importantIssues.push(`${categories.titleQuality.issuesCount} produits avec titres SEO problématiques`);
  }
  if (categories?.descQuality.score < 40) {
    importantIssues.push(`${categories.descQuality.issuesCount} produits avec descriptions SEO problématiques`);
  }
  if (categories?.contentQuality.score < 70) {
    importantIssues.push(`Qualité du contenu à améliorer (descriptions, tags)`);
  }
  if (categories?.titleQuality.score >= 40 && categories?.titleQuality.score < 90) {
    improvementIssues.push(`Optimiser ${categories.titleQuality.issuesCount} titres SEO`);
  }
  if (categories?.descQuality.score >= 40 && categories?.descQuality.score < 90) {
    improvementIssues.push(`Améliorer ${categories.descQuality.issuesCount} descriptions SEO`);
  }
  if (categories?.altQuality.score >= 40 && categories?.altQuality.score < 90) {
    improvementIssues.push(`Enrichir ${categories.altQuality.issuesCount} ALT texts`);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Audit SEO Professionnel</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Analyse détaillée de votre optimisation SEO selon les standards Yoast
        </p>
      </div>

      {/* Score SEO Global */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Score SEO Global
          </CardTitle>
          <CardDescription>
            Évaluation globale basée sur 6 catégories d'audit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="flex-1 w-full">
              <div className="flex items-baseline gap-2 mb-3 justify-center sm:justify-start">
                <span className="text-4xl sm:text-6xl font-bold text-primary">{globalScore}</span>
                <span className="text-2xl sm:text-3xl text-muted-foreground">/100</span>
              </div>
              <ScoreProgress score={globalScore} />
            </div>
            <div className="text-center sm:text-right">
              <Badge variant={scoreBadge.variant} className="text-base sm:text-lg px-3 sm:px-4 py-1.5 sm:py-2">
                {scoreBadge.label}
              </Badge>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                {globalScore >= 90 ? 'Excellent travail !' :
                 globalScore >= 70 ? 'Bon niveau SEO' :
                 globalScore >= 40 ? 'Améliorations nécessaires' :
                 'Optimisation urgente requise'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit détaillé - 6 catégories */}
      <Card>
        <CardHeader>
          <CardTitle>Audit détaillé par catégorie</CardTitle>
          <CardDescription>
            Analyse approfondie de chaque aspect SEO
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3">
          {/* SEO Title Quality */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 w-full">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-semibold">Qualité des titres SEO</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {categories?.titleQuality.issuesCount} problèmes / {categories?.titleQuality.total}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="w-20 sm:w-32">
                <ScoreProgress score={categories?.titleQuality.score || 0} />
              </div>
              <div className="text-right min-w-[60px] sm:min-w-[80px]">
                <span className={`text-xl sm:text-2xl font-bold ${getScoreBadge(categories?.titleQuality.score || 0).color}`}>
                  {categories?.titleQuality.score}
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground">/100</span>
              </div>
              <Badge variant={getScoreBadge(categories?.titleQuality.score || 0).variant} className="text-xs sm:text-sm">
                {getScoreBadge(categories?.titleQuality.score || 0).label}
              </Badge>
            </div>
          </div>

          {/* Meta Description Quality */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3 flex-1">
              <FileCode className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Qualité des meta descriptions</p>
                <p className="text-sm text-muted-foreground">
                  {categories?.descQuality.issuesCount} descriptions problématiques sur {categories?.descQuality.total}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-32">
                <ScoreProgress score={categories?.descQuality.score || 0} />
              </div>
              <div className="text-right min-w-[80px]">
                <span className={`text-2xl font-bold ${getScoreBadge(categories?.descQuality.score || 0).color}`}>
                  {categories?.descQuality.score}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <Badge variant={getScoreBadge(categories?.descQuality.score || 0).variant}>
                {getScoreBadge(categories?.descQuality.score || 0).label}
              </Badge>
            </div>
          </div>

          {/* Image ALT Quality */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3 flex-1">
              <ImageIcon className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Qualité des ALT texts images</p>
                <p className="text-sm text-muted-foreground">
                  {categories?.altQuality.issuesCount} images avec problèmes sur {categories?.altQuality.total}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-32">
                <ScoreProgress score={categories?.altQuality.score || 0} />
              </div>
              <div className="text-right min-w-[80px]">
                <span className={`text-2xl font-bold ${getScoreBadge(categories?.altQuality.score || 0).color}`}>
                  {categories?.altQuality.score}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <Badge variant={getScoreBadge(categories?.altQuality.score || 0).variant}>
                {getScoreBadge(categories?.altQuality.score || 0).label}
              </Badge>
            </div>
          </div>

          {/* Homepage SEO */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3 flex-1">
              <Home className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">SEO de la page d'accueil</p>
                <p className="text-sm text-muted-foreground">
                  {categories?.homepageSeo.hasHomepage ? 'Page importée' : 'Page non importée'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-32">
                <ScoreProgress score={categories?.homepageSeo.score || 0} />
              </div>
              <div className="text-right min-w-[80px]">
                <span className={`text-2xl font-bold ${getScoreBadge(categories?.homepageSeo.score || 0).color}`}>
                  {categories?.homepageSeo.score}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <Badge variant={getScoreBadge(categories?.homepageSeo.score || 0).variant}>
                {getScoreBadge(categories?.homepageSeo.score || 0).label}
              </Badge>
            </div>
          </div>

          {/* Content Quality */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3 flex-1">
              <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Qualité du contenu</p>
                <p className="text-sm text-muted-foreground">
                  Descriptions: {categories?.contentQuality.withDesc}/{categories?.contentQuality.total} • 
                  Tags: {categories?.contentQuality.withTags}/{categories?.contentQuality.total}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-32">
                <ScoreProgress score={categories?.contentQuality.score || 0} />
              </div>
              <div className="text-right min-w-[80px]">
                <span className={`text-2xl font-bold ${getScoreBadge(categories?.contentQuality.score || 0).color}`}>
                  {categories?.contentQuality.score}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <Badge variant={getScoreBadge(categories?.contentQuality.score || 0).variant}>
                {getScoreBadge(categories?.contentQuality.score || 0).label}
              </Badge>
            </div>
          </div>

          {/* Technical SEO */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3 flex-1">
              <Settings className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">SEO technique</p>
                <p className="text-sm text-muted-foreground">
                  Synchronisation Shopify et optimisations techniques
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-32">
                <ScoreProgress score={categories?.technicalSeo.score || 0} />
              </div>
              <div className="text-right min-w-[80px]">
                <span className={`text-2xl font-bold ${getScoreBadge(categories?.technicalSeo.score || 0).color}`}>
                  {categories?.technicalSeo.score}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <Badge variant={getScoreBadge(categories?.technicalSeo.score || 0).variant}>
                {getScoreBadge(categories?.technicalSeo.score || 0).label}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommandations prioritaires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Recommandations prioritaires
          </CardTitle>
          <CardDescription>
            Actions à prendre pour améliorer votre SEO
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Urgent */}
          {urgentIssues.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-600">URGENT</h3>
              </div>
              {urgentIssues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-900 dark:text-red-100">{issue}</p>
                </div>
              ))}
            </div>
          )}

          {/* Important */}
          {importantIssues.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-orange-600">IMPORTANT</h3>
              </div>
              {importantIssues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                  <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-orange-900 dark:text-orange-100">{issue}</p>
                </div>
              ))}
            </div>
          )}

          {/* Amélioration */}
          {improvementIssues.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-600">AMÉLIORATION</h3>
              </div>
              {improvementIssues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900 dark:text-blue-100">{issue}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tout est excellent */}
          {urgentIssues.length === 0 && importantIssues.length === 0 && improvementIssues.length === 0 && (
            <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">
                  Excellent travail ! 🎉
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Votre optimisation SEO est au top. Continuez à maintenir ce niveau d'excellence.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Détails expandables */}
      <Card>
        <CardHeader>
          <CardTitle>Détails des problèmes détectés</CardTitle>
          <CardDescription>
            Cliquez pour voir les problèmes spécifiques par catégorie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {/* Titres SEO */}
            <AccordionItem value="titles">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Problèmes de titres SEO ({categories?.titleQuality.issuesCount})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {auditData?.details.titleAnalyses
                    .map((analysis, idx) => ({ analysis, product: auditData.details.products[idx] }))
                    .filter(({ analysis }) => analysis.issues.length > 0)
                    .slice(0, 10)
                    .map(({ analysis, product }, idx) => (
                      <div key={idx} className="p-3 bg-muted rounded-lg">
                        <p className="font-medium text-sm">{product.title}</p>
                        <div className="mt-1 space-y-1">
                          {analysis.issues.map((issue, i) => (
                            <p key={i} className="text-xs text-red-600 dark:text-red-400">• {issue}</p>
                          ))}
                        </div>
                        {product.seo_title && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Titre actuel: "{product.seo_title}" ({product.seo_title.length} car.)
                          </p>
                        )}
                      </div>
                    ))}
                  {(categories?.titleQuality.issuesCount || 0) > 10 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      ... et {(categories?.titleQuality.issuesCount || 0) - 10} autres problèmes
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Descriptions SEO */}
            <AccordionItem value="descriptions">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  <span>Problèmes de meta descriptions ({categories?.descQuality.issuesCount})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {auditData?.details.descAnalyses
                    .map((analysis, idx) => ({ analysis, product: auditData.details.products[idx] }))
                    .filter(({ analysis }) => analysis.issues.length > 0)
                    .slice(0, 10)
                    .map(({ analysis, product }, idx) => (
                      <div key={idx} className="p-3 bg-muted rounded-lg">
                        <p className="font-medium text-sm">{product.title}</p>
                        <div className="mt-1 space-y-1">
                          {analysis.issues.map((issue, i) => (
                            <p key={i} className="text-xs text-red-600 dark:text-red-400">• {issue}</p>
                          ))}
                        </div>
                        {product.seo_description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Description actuelle: "{product.seo_description.substring(0, 100)}..." ({product.seo_description.length} car.)
                          </p>
                        )}
                      </div>
                    ))}
                  {(categories?.descQuality.issuesCount || 0) > 10 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      ... et {(categories?.descQuality.issuesCount || 0) - 10} autres problèmes
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ALT texts */}
            <AccordionItem value="alt">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  <span>Problèmes d'ALT texts ({categories?.altQuality.issuesCount})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {auditData?.details.altAnalyses
                    .map((analysis, idx) => ({ analysis, image: auditData.details.images[idx] }))
                    .filter(({ analysis }) => analysis.issues.length > 0)
                    .slice(0, 10)
                    .map(({ analysis, image }, idx) => (
                      <div key={idx} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-start gap-3">
                          <img src={image.src} alt="" className="w-16 h-16 object-cover rounded" />
                          <div className="flex-1">
                            <div className="space-y-1">
                              {analysis.issues.map((issue, i) => (
                                <p key={i} className="text-xs text-red-600 dark:text-red-400">• {issue}</p>
                              ))}
                            </div>
                            {image.alt_text && (
                              <p className="text-xs text-muted-foreground mt-1">
                                ALT actuel: "{image.alt_text}"
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  {(categories?.altQuality.issuesCount || 0) > 10 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      ... et {(categories?.altQuality.issuesCount || 0) - 10} autres problèmes
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
