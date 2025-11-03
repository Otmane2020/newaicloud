import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SeoOptimization } from '@/components/seo/SeoOptimization';
import { TagOptimization } from '@/components/seo/TagOptimization';
import { SeoAltImage } from '@/components/seo/SeoAltImage';
import { SeoAutomation } from '@/components/seo/SeoAutomation';
import { PageOptimization } from '@/components/seo/PageOptimization';
import { HomePageSeo } from '@/components/seo/HomePageSeo';
import { HomePageSeoAudit } from '@/components/seo/HomePageSeoAudit';
import { SeoAuditReports } from '@/components/seo/SeoAuditReports';
import { CollectionOptimization } from '@/components/seo/CollectionOptimization';
import ArticleManagement from '@/pages/ArticleManagement';
import { AdsCampaign } from '@/components/seo/AdsCampaign';
import { SeoAuditDashboard } from '@/components/seo/SeoAuditDashboard';
import { Sparkles, Tags, Image, Settings, FileText, PenSquare, TrendingUp, Package, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { calculateDescriptionScore, calculateDetailedSeoScore } from '@/lib/seoQuality';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';

export default function SEO() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'products');
  const [articlesSeoScore, setArticlesSeoScore] = useState<number>(0);
  const [pagesSeoScore, setPagesSeoScore] = useState<number>(0);
  const [loadingScores, setLoadingScores] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['products', 'optimization', 'tags', 'pages', 'articles', 'collections', 'homepage', 'audit', 'audit-dashboard', 'alt', 'automation', 'ads-campaign'].includes(tab)) {
      // Redirect old 'optimization' tab to 'products'
      if (tab === 'optimization') {
        setActiveTab('products');
      } else {
        setActiveTab(tab);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'articles') {
      calculateArticlesSeoScore();
    } else if (activeTab === 'pages') {
      calculatePagesSeoScore();
    }
  }, [activeTab]);

  const calculateArticlesSeoScore = async () => {
    try {
      setLoadingScores(true);
      const { data, error } = await supabase
        .from('blog_articles')
        .select('*');

      if (error) throw error;

      if (data && data.length > 0) {
        const scores = data.map((article: any) => {
          const detailedScore = calculateDescriptionScore(
            article.meta_description,
            undefined,
            undefined,
            article.title
          );
          
          let score = detailedScore.score;
          
          // Penalty if no featured image (15%)
          if (!article.featured_image) {
            score = Math.round(score * 0.85);
          }
          
          // Bonus for optimization
          if (article.optimization_count && article.optimization_count > 0) {
            score = Math.min(100, score + 10);
          }
          
          return score;
        });

        const avgScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
        setArticlesSeoScore(avgScore);
      }
    } catch (error) {
      console.error('Error calculating articles SEO score:', error);
    } finally {
      setLoadingScores(false);
    }
  };

  const calculatePagesSeoScore = async () => {
    try {
      setLoadingScores(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('shopify_pages')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const scores = data.map((page: any) => {
          const detailedScore = calculateDetailedSeoScore(
            page.seo_title || page.title,
            page.seo_description,
            false,
            true,
            null,
            page.optimization_count
          );
          return detailedScore.score;
        });

        const avgScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
        setPagesSeoScore(avgScore);
      }
    } catch (error) {
      console.error('Error calculating pages SEO score:', error);
    } finally {
      setLoadingScores(false);
    }
  };

  const handleClearCache = () => {
    // Clear browser cache and reload
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }
    
    // Clear localStorage (preserving auth)
    const authData = localStorage.getItem('supabase.auth.token');
    localStorage.clear();
    if (authData) {
      localStorage.setItem('supabase.auth.token', authData);
    }
    
    toast.success('Cache cleared successfully');
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {t.seo.title}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            {t.seo.description}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearCache}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {t.seo.clearCache}
        </Button>
      </div>

      {/* Tab Content - Navigation via sidebar uniquement */}
      <div className="mt-6">
        {(activeTab === 'products' || activeTab === 'optimization') && <SeoOptimization />}
        {activeTab === 'tags' && <TagOptimization />}
        {activeTab === 'pages' && (
          <>
            {/* Banner for Pages */}
            <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950 dark:via-pink-950 dark:to-rose-950 border-2 border-purple-200 p-8 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-6 h-6 text-purple-600" />
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {t.seo.banners.pages.title}
                    </h2>
                  </div>
                  <p className="text-muted-foreground text-lg max-w-2xl">
                    {t.seo.banners.pages.description}
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">{t.seo.banners.pages.seoOptimized}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="font-medium">{t.seo.banners.pages.betterRankings}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-pink-600" />
                      <span className="font-medium">{t.seo.banners.pages.aiEnhanced}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 items-center">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${
                      loadingScores ? 'text-muted-foreground' :
                      pagesSeoScore >= 80 ? 'text-green-600' : 
                      pagesSeoScore >= 60 ? 'text-purple-600' : 
                      pagesSeoScore >= 40 ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {loadingScores ? '...' : `${pagesSeoScore}/100`}
                    </div>
                    <div className="text-sm text-muted-foreground">{t.seo.banners.pages.seoScore}</div>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2 shadow-lg"
                  >
                    <Sparkles className="w-5 h-5" />
                    {t.seo.banners.pages.optimizeBtn}
                    <FileText className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </Card>
            <PageOptimization />
          </>
        )}
        {activeTab === 'articles' && (
          <>
            {/* Banner for Articles */}
            <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 border-2 border-blue-200 p-8 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <PenSquare className="w-6 h-6 text-blue-600" />
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {t.seo.banners.articles.title}
                    </h2>
                  </div>
                  <p className="text-muted-foreground text-lg max-w-2xl">
                    {t.seo.banners.articles.description}
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{t.seo.banners.articles.seoOptimized}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="font-medium">{t.seo.banners.articles.trafficBoost}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">{t.seo.banners.articles.aiEnhanced}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 items-center">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${
                      loadingScores ? 'text-muted-foreground' :
                      articlesSeoScore >= 80 ? 'text-green-600' : 
                      articlesSeoScore >= 60 ? 'text-blue-600' : 
                      articlesSeoScore >= 40 ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {loadingScores ? '...' : `${articlesSeoScore}/100`}
                    </div>
                    <div className="text-sm text-muted-foreground">{t.seo.banners.articles.seoScore}</div>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 gap-2 shadow-lg"
                  >
                    <Sparkles className="w-5 h-5" />
                    {t.seo.banners.articles.optimizeBtn}
                    <FileText className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </Card>
            <ArticleManagement />
          </>
        )}
        {activeTab === 'collections' && <CollectionOptimization />}
        {activeTab === 'homepage' && <HomePageSeoAudit />}
        {activeTab === 'audit' && <SeoAuditReports />}
        {activeTab === 'audit-dashboard' && <SeoAuditDashboard />}
        {activeTab === 'alt' && <SeoAltImage />}
        {activeTab === 'automation' && <SeoAutomation />}
        {activeTab === 'ads-campaign' && <AdsCampaign />}
      </div>
    </div>
  );
}
