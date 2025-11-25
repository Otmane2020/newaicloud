import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductOptimizationTabs } from '@/components/seo/ProductOptimizationTabs';
import { TagOptimization } from '@/components/seo/TagOptimization';
import { SeoAltImage } from '@/components/seo/SeoAltImage';
import { SmartTitle } from '@/components/seo/SmartTitle';
import { SeoAutomation } from '@/components/seo/SeoAutomation';
import { PageOptimization } from '@/components/seo/PageOptimization';
import { HomePageSeo } from '@/components/seo/HomePageSeo';
import { HomePageSeoAudit } from '@/components/seo/HomePageSeoAudit';
import { SeoAuditReports } from '@/components/seo/SeoAuditReports';
import { CollectionOptimization } from '@/components/seo/CollectionOptimization';
import ArticleManagement, { ArticleManagementRef } from '@/pages/ArticleManagement';
import { AdsCampaign } from '@/components/seo/AdsCampaign';
import { SeoAuditDashboard } from '@/components/seo/SeoAuditDashboard';
import { GoogleSearchConsole } from '@/components/seo/GoogleSearchConsole';
import { Sparkles, Tags, Image, Settings, FileText, PenSquare, TrendingUp, Package, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { calculateArticleSeoScore, calculateDetailedSeoScore } from '@/lib/seoQuality';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';
import { useStore } from '@/contexts/StoreContext';
import { ProgressBanner } from '@/components/seo/ProgressBanner';
import { useOptimization } from '@/contexts/OptimizationContext';
import { OptimizationCompletedDialog } from '@/components/OptimizationCompletedDialog';

export default function SEO() {
  const { t } = useTranslation();
  const { selectedStore } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'products');
  const [articlesSeoScore, setArticlesSeoScore] = useState<number>(0);
  const [pagesSeoScore, setPagesSeoScore] = useState<number>(0);
  const [loadingScores, setLoadingScores] = useState(false);
  const articleManagementRef = useRef<ArticleManagementRef>(null);
  const { state: optimizationState, setShowCompletedDialog, cancelOptimization } = useOptimization();

  const handleSyncShopify = async () => {
    try {
      toast.loading('Synchronisation en cours...', { id: 'sync' });
      
      // Reload articles and recalculate score
      if (activeTab === 'articles') {
        await calculateArticlesSeoScore();
      } else if (activeTab === 'pages') {
        await calculatePagesSeoScore();
      }
      
      toast.success('✅ Synchronisé avec succès', { id: 'sync' });
      
      // Reload page to see changes
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast.error('❌ Erreur de synchronisation', { id: 'sync' });
    }
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    const validTabs = ['products', 'optimization', 'tags', 'pages', 'articles', 'collections', 'homepage', 'audit', 'audit-dashboard', 'alt', 'smart-title', 'automation', 'ads-campaign', 'google-console'];
    
    if (tab && validTabs.includes(tab)) {
      if (tab === 'optimization') {
        setActiveTab('products');
      } else {
        setActiveTab(tab);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedStore) {
      if (activeTab === 'articles') {
        calculateArticlesSeoScore();
      } else if (activeTab === 'pages') {
        calculatePagesSeoScore();
      }
    }
  }, [activeTab, selectedStore]);


  const calculateArticlesSeoScore = async () => {
    if (!selectedStore) {
      setArticlesSeoScore(0);
      return;
    }

    try {
      setLoadingScores(true);
      const { data, error } = await supabase
        .from('blog_articles')
        .select('title, seo_title, meta_description, keywords, featured_image, status, optimization_count')
        .eq('store_id', selectedStore.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const scores = data.map((article: any) => {
          const score = calculateArticleSeoScore(
            article.title,
            article.seo_title || article.title,
            article.meta_description || '',
            article.keywords ? (typeof article.keywords === 'string' ? [] : article.keywords) : [],
            !!article.featured_image,
            article.status === 'published',
            article.optimization_count || 0
          );
          
          return score.score;
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
    if (!selectedStore) {
      setPagesSeoScore(0);
      return;
    }

    try {
      setLoadingScores(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('shopify_pages')
        .select('*')
        .eq('user_id', user.id)
        .eq('store_id', selectedStore.id);

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
    
    toast.success(t.seo.cacheCleared);
    window.location.reload();
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 break-words">
            {t.seo.title}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base break-words">
            {t.seo.description}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearCache}
          className="gap-2 flex-shrink-0 w-full sm:w-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="truncate">{t.seo.clearCache}</span>
        </Button>
      </div>

      {/* Tab Content - Navigation via sidebar uniquement */}
      <div className="mt-6">
        {(activeTab === 'products' || activeTab === 'optimization') && <ProductOptimizationTabs />}
        {activeTab === 'tags' && <TagOptimization />}
        {activeTab === 'pages' && (
          <>
            {/* Banner for Pages */}
            <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950 dark:via-pink-950 dark:to-rose-950 border-2 border-purple-200 p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6">
                <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent break-words">
                      {t.seo.banners.pages.title}
                    </h2>
                  </div>
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg break-words">
                    {t.seo.banners.pages.description}
                  </p>
                  <div className="flex flex-wrap gap-2 sm:gap-3 pt-1 sm:pt-2">
                    <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />
                      <span className="font-medium break-words">{t.seo.banners.pages.seoOptimized}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                      <span className="font-medium break-words">{t.seo.banners.pages.betterRankings}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-pink-600 flex-shrink-0" />
                      <span className="font-medium break-words">{t.seo.banners.pages.aiEnhanced}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:gap-3 items-center w-full lg:w-auto flex-shrink-0">
                  {optimizationState.isRunning && optimizationState.type === 'pages' ? (
                    <ProgressBanner
                      current={optimizationState.current}
                      total={optimizationState.total}
                      label="Optimisation des pages"
                      onCancel={cancelOptimization}
                    />
                  ) : (
                    <>
                      <div className="text-center">
                        <div className={`text-3xl sm:text-4xl font-bold ${
                          loadingScores ? 'text-muted-foreground' :
                          pagesSeoScore >= 80 ? 'text-green-600' : 
                          pagesSeoScore >= 60 ? 'text-purple-600' : 
                          pagesSeoScore >= 40 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {loadingScores ? '...' : `${pagesSeoScore}/100`}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">{t.seo.banners.pages.seoScore}</div>
                      </div>
                      <Button
                        size="lg"
                        onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2 shadow-lg w-full lg:w-auto"
                      >
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span className="truncate">{t.seo.banners.pages.optimizeBtn}</span>
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
            <PageOptimization />
          </>
        )}
        {activeTab === 'articles' && (
          <>
            {/* Banner for Articles */}
            <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 border-2 border-blue-200 p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6">
                <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                  <div className="flex items-center gap-2">
                    <PenSquare className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent break-words">
                      {t.seo.banners.articles.title}
                    </h2>
                  </div>
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg break-words">
                    {t.seo.banners.articles.description}
                  </p>
                  <div className="flex flex-wrap gap-2 sm:gap-3 pt-1 sm:pt-2">
                    <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                      <span className="font-medium break-words">{t.seo.banners.articles.seoOptimized}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                      <span className="font-medium break-words">{t.seo.banners.articles.trafficBoost}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />
                      <span className="font-medium break-words">{t.seo.banners.articles.aiEnhanced}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:gap-3 items-center w-full lg:w-auto flex-shrink-0">
                  {optimizationState.isRunning && optimizationState.type === 'articles' ? (
                    <ProgressBanner
                      current={optimizationState.current}
                      total={optimizationState.total}
                      label="Optimisation des articles"
                      onCancel={cancelOptimization}
                    />
                  ) : (
                    <>
                      <div className="text-center">
                        <div className={`text-3xl sm:text-4xl font-bold ${
                          loadingScores ? 'text-muted-foreground' :
                          articlesSeoScore >= 80 ? 'text-green-600' : 
                          articlesSeoScore >= 60 ? 'text-blue-600' : 
                          articlesSeoScore >= 40 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {loadingScores ? '...' : `${articlesSeoScore}/100`}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">{t.seo.banners.articles.seoScore}</div>
                      </div>
                      <Button
                        size="lg"
                        onClick={() => articleManagementRef.current?.optimizeAllArticles()}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 gap-2 shadow-lg w-full lg:w-auto"
                      >
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span className="truncate">{t.seo.banners.articles.optimizeBtn}</span>
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
            <ArticleManagement 
              ref={articleManagementRef} 
              onOptimizationComplete={calculateArticlesSeoScore}
            />
          </>
        )}
        {activeTab === 'collections' && <CollectionOptimization />}
        {activeTab === 'homepage' && <HomePageSeoAudit />}
        {activeTab === 'audit' && <SeoAuditReports />}
        {activeTab === 'audit-dashboard' && <SeoAuditDashboard />}
        {activeTab === 'alt' && <SeoAltImage />}
        {activeTab === 'smart-title' && <SmartTitle />}
        {activeTab === 'automation' && <SeoAutomation />}
        {activeTab === 'ads-campaign' && <AdsCampaign />}
        {activeTab === 'google-console' && (
          <GoogleSearchConsole />
        )}
      </div>

      <OptimizationCompletedDialog
        open={optimizationState.showCompletedDialog}
        onOpenChange={setShowCompletedDialog}
        onSyncShopify={handleSyncShopify}
        type={optimizationState.type || ''}
        totalOptimized={optimizationState.current}
      />
    </div>
  );
}
