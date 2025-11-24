import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  Trash2, 
  ExternalLink,
  Eye,
  Sparkles,
  Plus,
  Search,
  Check,
  X,
  ImageIcon,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BlogWizard } from '@/components/blog/BlogWizard';
import { ResultsDialog, ProgressDialog, SyncConfirmationDialog } from '@/components/seo/SeoWorkflowDialogs';
import { useAuth } from '@/contexts/AuthContext';
import { calculateArticleSeoScore, getSeoScoreBadge, passesQualityFilter } from '@/lib/seoQuality';
import { ArticleFeaturedImageDialog } from '@/components/blog/ArticleFeaturedImageDialog';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { useStore } from '@/contexts/StoreContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { GoogleSearchPreview } from '@/components/seo/GoogleSearchPreview';
import { buildPublicUrl } from '@/lib/shopifyDomainUtils';
import { useStoreDomain } from '@/hooks/useStoreDomain';
import { useOptimization } from '@/contexts/OptimizationContext';
import { ProgressBanner } from '@/components/seo/ProgressBanner';

interface Article {
  id: string;
  title: string;
  content: string;
  meta_description: string | null;
  keywords: string[] | null;
  status: string;
  published_at: string | null;
  shopify_blog_id: string | null;
  shopify_article_id: number | null;
  created_at: string;
  updated_at: string;
  source: string | null;
  featured_image: string | null;
  optimization_count: number;
  seo_title?: string | null;
  handle?: string | null;
}

export interface ArticleManagementRef {
  optimizeAllArticles: () => Promise<void>;
}

interface ArticleManagementProps {
  onOptimizationComplete?: () => void;
}

const ArticleManagement = forwardRef<ArticleManagementRef, ArticleManagementProps>(({ onOptimizationComplete }, ref) => {
  const { user } = useAuth();
  const { selectedStore } = useStore();
  const { domain } = useStoreDomain();
  const [searchParams] = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [showOptimizationResults, setShowOptimizationResults] = useState(false);
  const [optimizedArticles, setOptimizedArticles] = useState<any[]>([]);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedArticleForImage, setSelectedArticleForImage] = useState<Article | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [optimizing, setOptimizing] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [syncFilter, setSyncFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [qualityFilter, setQualityFilter] = useState<'all' | 'excellent' | 'good' | 'medium' | 'poor'>(
    (searchParams.get("filter") as 'all' | 'excellent' | 'good' | 'medium' | 'poor') || 'all'
  );
  
  const { limits, loading: limitsLoading, refresh: refreshLimits } = useUsageLimits();
  const { startOptimization, updateProgress, completeOptimization } = useOptimization();

  const loadCategories = async () => {
    try {
      const { data } = await supabase
        .from('shopify_products')
        .select('category')
        .not('category', 'is', null);
      
      const uniqueCategories = [...new Set(data?.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories as string[]);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadArticles = async () => {
    try {
      setLoading(true);
      
      if (!selectedStore) {
        setLoading(false);
        return;
      }

      // ✅ PAGINATION POUR DÉPASSER LA LIMITE DE 1000 ARTICLES
      let allArticles: any[] = [];
      let hasMore = true;
      let page = 0;
      const PAGE_SIZE = 1000;
      
      console.log('🔄 [ARTICLES] Starting paginated fetch for store:', selectedStore.id);
      
      while (hasMore) {
        const start = page * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;
        
        console.log(`📄 [ARTICLES] Fetching page ${page + 1} (${start}-${end})...`);
        
        const { data: pageData, error: pageError } = await supabase
          .from('blog_articles')
          .select('*')
          .eq('store_id', selectedStore.id)
          .range(start, end)
          .order('created_at', { ascending: false });
        
        if (pageError) throw pageError;
        
        if (!pageData || pageData.length === 0) {
          hasMore = false;
        } else {
          allArticles = [...allArticles, ...pageData];
          page++;
          
          // Si on a reçu moins que PAGE_SIZE, c'est la dernière page
          if (pageData.length < PAGE_SIZE) {
            hasMore = false;
          }
        }
      }
      
      console.log(`✅ [ARTICLES] Loaded ${allArticles.length} articles total for store ${selectedStore.store_name}`);
      setArticles(allArticles);
    } catch (error) {
      console.error('Error loading articles:', error);
      toast.error('Error loading articles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
    loadCategories();
  }, []);

  // Détecter les articles orphelins (sans store_id)
  useEffect(() => {
    if (!user?.id) return;
    
    const checkOrphanArticles = async () => {
      const { data: orphans } = await supabase
        .from('blog_articles')
        .select('id, title')
        .eq('user_id', user.id)
        .is('store_id', null);
      
      if (orphans && orphans.length > 0) {
        toast.warning(`${orphans.length} article(s) sans boutique détecté(s)`, {
          description: "Ces articles ne seront pas visibles",
          action: {
            label: "Réparer",
            onClick: () => repairOrphanArticles(orphans)
          }
        });
      }
    };
    
    checkOrphanArticles();
  }, [user?.id]);

  const repairOrphanArticles = async (orphans: any[]) => {
    if (!selectedStore?.id || !user?.id) {
      toast.error("Sélectionnez une boutique pour réparer les articles");
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('repair_orphan_articles', {
        p_user_id: user.id,
        p_store_id: selectedStore.id
      });
      
      if (error) throw error;
      
      toast.success(`${data?.[0]?.repaired_count || 0} article(s) réparé(s)`);
      loadArticles();
    } catch (error) {
      console.error('Error repairing orphan articles:', error);
      toast.error("Erreur lors de la réparation des articles");
    }
  };

  if (!selectedStore) {
    return (
      <Alert className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Aucune boutique sélectionnée</AlertTitle>
        <AlertDescription>
          Veuillez sélectionner une boutique dans le menu en haut pour afficher les articles.
        </AlertDescription>
      </Alert>
    );
  }

  const filteredArticles = articles.filter(article => {
    const matchesSearch = !searchQuery || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.meta_description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
    
    const matchesSource = sourceFilter === 'all' || 
      (sourceFilter === 'ai' && article.source === 'ai_generated') ||
      (sourceFilter === 'shopify' && article.source === 'shopify_import');
    
    const matchesSync = syncFilter === 'all' || 
      (syncFilter === 'synced' && article.shopify_blog_id) ||
      (syncFilter === 'not_synced' && !article.shopify_blog_id);
    
    // Collection filter (placeholder for future implementation)
    const matchesCollection = collectionFilter === 'all';
    
    // Quality filter
    const matchesQuality = qualityFilter === 'all' || (() => {
      const seoScore = calculateArticleSeoScore(
        article.title,
        article.seo_title || article.title,
        article.meta_description || '',
        article.keywords ? (typeof article.keywords === 'string' ? [] : article.keywords) : [],
        !!article.featured_image,
        article.status === 'published',
        article.optimization_count || 0
      );
      return passesQualityFilter(seoScore.score, qualityFilter);
    })();
    
    return matchesSearch && matchesStatus && matchesSource && matchesSync && matchesQuality && matchesCollection;
  });

  const stats = {
    total: articles.length,
    ai: articles.filter(a => a.source === 'ai_generated').length,
    shopify: articles.filter(a => a.source === 'shopify_import').length,
    published: articles.filter(a => a.status === 'published').length,
    synced: articles.filter(a => a.shopify_blog_id).length,
    seoOptimized: articles.filter(a => a.meta_description).length,
  };

  const deleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      const { error } = await supabase
        .from('blog_articles')
        .delete()
        .eq('id', articleId);

      if (error) throw error;
      
      toast.success('Article deleted');
      loadArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('Error deleting article');
    }
  };

  const optimizeAllArticles = async () => {
    if (!limits?.canUseOptimizations || limits?.limitReached.optimizations) {
      if (limits?.isTrialing) {
        toast.error('Limite du plan actuel atteinte. Passez à un plan payant pour continuer.');
      } else if (limits?.isPaid) {
        toast.error('Limite mensuelle d\'optimisations atteinte. Passez à un plan supérieur.');
      }
      setShowUpgradeDialog(true);
      return;
    }

    try {
      const allArticleIds = articles.map(a => a.id);
      
      // Start optimization with context
      startOptimization('articles', allArticleIds.length, 'optimizing');
      
      let successCount = 0;
      let errorCount = 0;
      
      // Process articles one by one to update progress
      for (let i = 0; i < allArticleIds.length; i++) {
        const articleId = allArticleIds[i];
        
        try {
          const { data, error } = await supabase.functions.invoke('generate-article-seo', {
            body: { article_ids: [articleId] }
          });

          if (error) {
            console.error(`Error optimizing article ${articleId}:`, error);
            errorCount++;
            updateProgress(i + 1, articleId, 'error');
          } else {
            successCount++;
            updateProgress(i + 1, articleId, 'success');
          }
        } catch (err) {
          console.error(`Error processing article ${articleId}:`, err);
          errorCount++;
          updateProgress(i + 1, articleId, 'error');
        }
      }
      
      // Complete and show success dialog
      completeOptimization();
      
      // Show summary toast
      if (successCount > 0) {
        toast.success(`✅ ${successCount} article(s) optimisé(s)`, {
          description: errorCount > 0 ? `${errorCount} erreur(s)` : undefined
        });
      } else {
        toast.error('Aucun article optimisé');
      }
      
      // Reload articles to reflect changes
      await loadArticles();
      await refreshLimits();
      
      // Notify parent to recalculate score
      onOptimizationComplete?.();
      
    } catch (error) {
      console.error('Error optimizing:', error);
      toast.error('❌ Erreur lors de l\'optimisation', {
        description: 'Veuillez réessayer'
      });
      completeOptimization();
    }
  };
  
  // Expose optimizeAllArticles via ref
  useImperativeHandle(ref, () => ({
    optimizeAllArticles
  }));

  const optimizeArticles = async (articleIds: string[]) => {
    if (!limits?.canUseOptimizations || limits?.limitReached.optimizations) {
      if (limits?.isTrialing) {
        toast.error('Limite du plan actuel atteinte. Passez à un plan payant pour continuer.');
      } else if (limits?.isPaid) {
        toast.error('Limite mensuelle d\'optimisations atteinte. Passez à un plan supérieur.');
      }
      setShowUpgradeDialog(true);
      return;
    }
    
    try {
      const loadingToast = toast.loading('🤖 Optimisation SEO en cours...', {
        description: `Analyse de ${articleIds.length} article(s) par l'IA`
      });
      
      const { data, error } = await supabase.functions.invoke('generate-article-seo', {
        body: { article_ids: articleIds }
      });

      if (error) throw error;
      
      const { data: articles, error: articlesError } = await supabase
        .from('blog_articles')
        .select('id, title, meta_description, keywords, featured_image, shopify_article_id, optimization_count')
        .in('id', articleIds);

      if (articlesError) throw articlesError;

      toast.dismiss(loadingToast);
      
      setOptimizedArticles(articles || []);
      setShowOptimizationResults(true);
      
      await loadArticles();
      await refreshLimits();
    } catch (error) {
      console.error('Error optimizing:', error);
      toast.error('❌ Erreur lors de l\'optimisation', {
        description: 'Veuillez réessayer'
      });
    }
  };

  useImperativeHandle(ref, () => ({
    optimizeAllArticles
  }));

  const syncToShopify = async (articleIds: string[]) => {
    // Filter only AI-optimized articles
    const articlesToSync = articles.filter(a => 
      articleIds.includes(a.id) && (a.optimization_count || 0) > 0
    );
    
    if (articlesToSync.length === 0) {
      toast.error('❌ Aucun article AI-optimisé sélectionné', {
        description: 'Les articles doivent être optimisés par l\'IA avant synchronisation'
      });
      return;
    }
    
    const loadingToast = toast.loading('📤 Synchronisation Shopify', {
      description: `Publication de ${articlesToSync.length} article(s) AI-optimisé(s)...`
    });
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    for (const article of articlesToSync) {
      try {
        const { error } = await supabase.functions.invoke('sync-blog-to-shopify', {
          body: { articleId: article.id }
        });

        if (error) {
          errorCount++;
          errors.push(`${article.title}: ${error.message}`);
        } else {
          successCount++;
        }
      } catch (error) {
        console.error('Error syncing:', error);
        errorCount++;
        errors.push(`${article.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    toast.dismiss(loadingToast);
    
    if (successCount > 0) {
      toast.success(`✅ ${successCount} article(s) publié(s)`, {
        description: errorCount > 0 ? `${errorCount} erreur(s)` : 'Synchronisation réussie'
      });
    }
    
    if (errorCount > 0 && errors.length > 0) {
      console.error('Sync errors:', errors);
      toast.error(`❌ ${errorCount} erreur(s) de synchronisation`, {
        description: errors[0] // Show first error
      });
    }
    
    if (errorCount > 0 && successCount === 0) {
      toast.error('❌ Échec de la synchronisation', {
        description: 'Vérifiez votre connexion Shopify'
      });
    }
    
    loadArticles();
    setSelectedArticles([]);
  };

  const bulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedArticles.length} articles?`)) return;

    try {
      const { error } = await supabase
        .from('blog_articles')
        .delete()
        .in('id', selectedArticles);

      if (error) throw error;
      
      toast.success(`${selectedArticles.length} articles deleted`);
      setSelectedArticles([]);
      loadArticles();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('Error during deletion');
    }
  };

  const toggleSelectAll = () => {
    if (selectedArticles.length === filteredArticles.length) {
      setSelectedArticles([]);
    } else {
      setSelectedArticles(filteredArticles.map(a => a.id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Articles SEO Management</h1>
            <p className="text-muted-foreground mt-1">Optimize SEO title and meta description for your articles</p>
          </div>
          <Button onClick={() => setShowWizard(true)} size="lg" className="w-full sm:w-auto">
            <Plus className="w-5 h-5 mr-2" />
            Create Article
          </Button>
        </div>
      </div>

      {/* Interactive Dashboard Cards - 4 filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card 
          className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={() => {
            setQualityFilter('all');
            setStatusFilter('all');
            setSyncFilter('all');
            setSearchQuery('');
            toast.info(`${stats.total - stats.seoOptimized} articles à optimiser`);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-300">To Optimize</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-100">{stats.total - stats.seoOptimized}</p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Not AI-optimized yet
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-xs text-orange-600 dark:text-orange-300 mt-2">Click to filter</p>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={() => {
            setQualityFilter('all');
            setStatusFilter('all');
            setSyncFilter('all');
            setSearchQuery('');
            toast.info(`${stats.seoOptimized} articles AI-optimisés`);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">AI-Optimized</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.seoOptimized}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                AI-enhanced SEO
              </p>
            </div>
            <Sparkles className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 mt-2">Click to filter</p>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={() => {
            setSyncFilter('not-synced');
            setQualityFilter('all');
            setStatusFilter('all');
            toast.info(`${articles.filter(a => (a.optimization_count || 0) > 0 && !a.shopify_article_id).length} articles à synchroniser`);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">To Synchronize</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {articles.filter(a => (a.optimization_count || 0) > 0 && !a.shopify_article_id).length}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                AI-optimized only
              </p>
            </div>
            <Clock className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">Click to filter</p>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={() => {
            setSyncFilter('synced');
            setQualityFilter('all');
            setStatusFilter('all');
            toast.info(`${stats.synced} articles synchronisés`);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Synchronized</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.synced}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Synced to Shopify
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">Click to filter</p>
        </Card>
      </div>

      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Selection Counter */}
          <div className="flex items-center gap-3">
            <Checkbox 
              checked={selectedArticles.length === filteredArticles.length && filteredArticles.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm font-medium">
              {selectedArticles.length > 0 ? (
                <span className="text-primary">{selectedArticles.length} article(s) sélectionné(s)</span>
              ) : (
                <span className="text-muted-foreground">Sélectionner tout</span>
              )}
            </span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => optimizeArticles(selectedArticles)}
              disabled={selectedArticles.length === 0}
              size="sm"
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg gap-2 flex-1 sm:flex-none"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Optimiser sélectionnés</span>
            </Button>
            <Button
              onClick={optimizeAllArticles}
              disabled={loading || optimizing || articles.filter(a => (a.optimization_count || 0) === 0).length === 0}
              size="sm"
              variant="outline"
              className="border-2 border-primary text-primary hover:bg-primary/10 gap-2 flex-1 sm:flex-none"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Optimiser tout</span>
            </Button>
            <Button
              onClick={() => syncToShopify(selectedArticles)}
              disabled={selectedArticles.length === 0}
              variant="outline"
              size="sm"
              className="gap-2 flex-1 sm:flex-none"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Synchroniser sélectionnés</span>
            </Button>
            <Button
              onClick={async () => {
                const articlesToSync = articles.filter(a => (a.optimization_count || 0) > 0 && !a.shopify_article_id);
                if (articlesToSync.length === 0) {
                  toast.error('Aucun article AI-optimisé à synchroniser');
                  return;
                }
                await syncToShopify(articlesToSync.map(a => a.id));
              }}
              disabled={loading || articles.filter(a => (a.optimization_count || 0) > 0 && !a.shopify_article_id).length === 0}
              variant="outline"
              size="sm"
              className="gap-2 flex-1 sm:flex-none"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Synchroniser tout</span>
            </Button>
            <Button
              onClick={bulkDelete}
              disabled={selectedArticles.length === 0}
              variant="destructive"
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <Trash2 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Supprimer</span>
            </Button>
            <Button
              onClick={loadArticles}
              disabled={loading}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {showProgressDialog && (
            <div className="w-full sm:w-auto mt-2 sm:mt-0">
              <ProgressBanner
                current={progress.current}
                total={progress.total}
                label="Optimisation des articles"
              />
            </div>
          )}
        </div>
      </div>

      {/* Filters & Actions */}
      <Card className="mb-6 bg-background/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                placeholder="Search by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base relative z-20"
              />
            </div>

            {/* Filters Row 1 */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-10 flex-1 sm:min-w-[150px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  <SelectItem value="all">Toutes sources</SelectItem>
                  <SelectItem value="ai">IA Généré</SelectItem>
                  <SelectItem value="shopify">Shopify</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 flex-1 sm:min-w-[150px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
                </SelectContent>
              </Select>

              <Select value={syncFilter} onValueChange={setSyncFilter}>
                <SelectTrigger className="h-10 flex-1 sm:min-w-[150px]">
                  <SelectValue placeholder="Synchronisation" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="synced">Synchronisé</SelectItem>
                  <SelectItem value="not_synced">Non synchronisé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filters Row 2 */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={collectionFilter} onValueChange={setCollectionFilter}>
                <SelectTrigger className="h-10 flex-1 sm:min-w-[150px]">
                  <SelectValue placeholder="Collection" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  <SelectItem value="all">Toutes collections</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={qualityFilter} 
                onValueChange={(value) => setQualityFilter(value as 'all' | 'excellent' | 'good' | 'medium' | 'poor')}
              >
                <SelectTrigger className="h-10 flex-1 sm:min-w-[150px]">
                  <SelectValue placeholder="Score SEO" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  <SelectItem value="all">Tous scores</SelectItem>
                  <SelectItem value="excellent">Excellent (≥80%)</SelectItem>
                  <SelectItem value="good">Bon (55-79%)</SelectItem>
                  <SelectItem value="medium">Moyen (40-54%)</SelectItem>
                  <SelectItem value="poor">Faible (&lt;40%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedArticles.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground mb-2 sm:mb-0">
                {selectedArticles.length} selected
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => optimizeArticles(selectedArticles)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Optimize SEO
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => syncToShopify(selectedArticles)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Sync
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={bulkDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Articles Table */}
      {filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No articles found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-3 text-left">
                      <Checkbox
                        checked={selectedArticles.length === filteredArticles.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-3 text-left hidden sm:table-cell">Image</th>
                    <th className="p-3 text-left">Article Title</th>
                    <th className="p-3 text-left hidden lg:table-cell">SEO Title</th>
                    <th className="p-3 text-left hidden md:table-cell">SEO Meta Description</th>
                    <th className="p-3 text-left hidden xl:table-cell">SEO Score</th>
                    <th className="p-3 text-left hidden sm:table-cell">Source</th>
                    <th className="p-3 text-left hidden md:table-cell">Published on Shopify</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArticles.map((article) => (
                    <tr key={article.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <Checkbox
                          checked={selectedArticles.includes(article.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedArticles([...selectedArticles, article.id]);
                            } else {
                              setSelectedArticles(selectedArticles.filter(id => id !== article.id));
                            }
                          }}
                        />
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        {article.featured_image ? (
                          <img
                            src={article.featured_image}
                            alt={article.title}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover cursor-pointer hover:scale-110 transition-transform"
                            onClick={() => {
                              setSelectedArticleForImage(article);
                              setShowImageDialog(true);
                            }}
                          />
                        ) : (
                          <div 
                            className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform border-2 border-dashed border-indigo-300"
                            onClick={() => {
                              setSelectedArticleForImage(article);
                              setShowImageDialog(true);
                            }}
                            title="Cliquer pour ajouter une image de couverture"
                          >
                            <ImageIcon className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="max-w-[150px] sm:max-w-xs">
                          <p 
                            className="font-medium line-clamp-2 cursor-pointer hover:text-primary transition-colors text-sm sm:text-base"
                            onClick={() => window.open(`/article-landing/${article.id}`, '_blank')}
                          >
                            {article.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(article.created_at), 'PP', { locale: fr })}
                          </p>
                        </div>
                      </td>
                      <td className="p-3" colSpan={2}>
                        <GoogleSearchPreview
                          title={article.seo_title || article.title}
                          description={article.meta_description || "En attente d'optimisation SEO"}
                          url={buildPublicUrl(`/blogs/news/${article.handle || article.title.toLowerCase().replace(/\s+/g, '-')}`, domain)}
                          compact={true}
                        />
                      </td>
                      <td className="p-3 hidden xl:table-cell">
                        {(() => {
                          const seoScore = calculateArticleSeoScore(
                            article.title,
                            article.seo_title || article.title,
                            article.meta_description,
                            article.keywords,
                            !!article.featured_image,
                            article.status === 'published',
                            article.optimization_count || 0
                          );
                          const scoreBadge = getSeoScoreBadge(seoScore.score);
                          
                          return (
                            <div className="flex flex-col items-start gap-1">
                              {(() => {
                                const scoreBadge = getSeoScoreBadge(seoScore.score);
                                return (
                                  <span className={`text-2xl font-bold ${scoreBadge.color}`}>
                                    {Math.round(seoScore.score)}%
                                  </span>
                                );
                              })()}
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                                <span className="text-xs text-muted-foreground">{scoreBadge.label}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        <Badge 
                          variant={article.source === 'ai_generated' ? 'default' : 'secondary'}
                          className={article.source === 'ai_generated' ? 'bg-blue-600' : 'bg-green-600'}
                        >
                          {article.source === 'ai_generated' ? 'AI NewAI' : 'Shopify'}
                        </Badge>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        {article.shopify_blog_id ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Check className="w-3 h-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            <X className="w-3 h-3 mr-1" />
                            No
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`/article-landing/${article.id}`, '_blank')}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          {!article.meta_description ? (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => optimizeArticles([article.id])}
                              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg gap-1 h-8 px-2"
                            >
                              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline text-xs">Optimiser</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => optimizeArticles([article.id])}
                              className="h-8 w-8 p-0"
                              title="Re-optimiser"
                            >
                              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                            </Button>
                          )}
                          {(article.optimization_count || 0) > 0 && !article.shopify_blog_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => syncToShopify([article.id])}
                              className="h-8 gap-1 px-2"
                            >
                              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline text-xs">Sync</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteArticle(article.id)}
                            className="h-8 w-8 p-0 text-destructive"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blog Wizard */}
      {showWizard && (
        <BlogWizard
          onClose={() => {
            setShowWizard(false);
            loadArticles();
          }}
          categories={categories}
        />
      )}

      {/* Optimization Results Dialog */}
      <ResultsDialog
        open={showOptimizationResults}
        onOpenChange={setShowOptimizationResults}
        type="seo"
        items={optimizedArticles.map(article => ({
          id: article.id,
          title: article.title,
          seo_title: article.title,
          seo_description: article.meta_description
        }))}
        onSyncClick={() => {
          const articleIds = optimizedArticles.map(a => a.id);
          setShowOptimizationResults(false);
          syncToShopify(articleIds);
        }}
        onClose={() => {
          setShowOptimizationResults(false);
          setSelectedArticles([]);
        }}
      />

      {/* Featured Image Dialog */}
      {selectedArticleForImage && (
        <ArticleFeaturedImageDialog
          open={showImageDialog}
          onOpenChange={setShowImageDialog}
          article={selectedArticleForImage}
          onImageUpdated={loadArticles}
        />
      )}
      
      {/* Upgrade Dialog */}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType="optimizations"
      />

      {/* Progress Dialog */}
      <ProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        type="seo"
        operation="optimizing"
        current={progress.current}
        total={progress.total}
      />

      {/* Sync Confirmation Dialog */}
      <SyncConfirmationDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        onConfirm={async () => {
          await syncToShopify(optimizedArticles.map(a => a.id));
          setShowSyncDialog(false);
        }}
        itemCount={optimizedArticles.length}
        type="seo"
        loading={false}
      />
    </div>
  );
});

export default ArticleManagement;