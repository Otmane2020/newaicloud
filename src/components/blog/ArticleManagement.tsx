import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { calculateArticleSeoScore } from '@/lib/seoQuality';
import { Checkbox } from '@/components/ui/checkbox';
import { usePaginatedSeo } from '@/hooks/usePaginatedSeo';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  RefreshCw,
  Sparkles,
  Upload,
  Loader2,
  FileText,
  Eye,
  ExternalLink,
  Filter,
  Grid3x3,
  List,
  CheckCircle,
  Clock,
  AlertCircle,
  ImageIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Share2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { VisionAIBanner } from '../seo/VisionAIBanner';
import { GoogleSearchPreview } from '../seo/GoogleSearchPreview';
import { buildPublicUrl } from '@/lib/shopifyDomainUtils';
import { useTranslation } from '@/lib/language';
import { ArticleFeaturedImageDialog } from './ArticleFeaturedImageDialog';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { useStore } from '@/contexts/StoreContext';
import { 
  ProgressDialog, 
  ResultsDialog, 
  SyncConfirmationDialog 
} from '../seo/SeoWorkflowDialogs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface Article {
  id: string;
  title: string;
  content: string;
  meta_description: string;
  keywords: string[];
  status: string;
  published_at: string | null;
  shopify_blog_id: string;
  source: string;
  created_at: string;
  updated_at: string;
  optimization_count?: number;
  last_optimization_at?: string | null;
  featured_image?: string | null;
  last_synced_at?: string | null;
  seo_title?: string | null;
  handle?: string | null;
}

type QuickFilterTab = 'all' | 'draft' | 'published' | 'shopify-synced' | 'ai-generated' | 'shopify-import';
type SeoScoreSort = 'none' | 'asc' | 'desc';
type StatusFilter = 'all' | 'optimized' | 'not-optimized';
type SyncFilter = 'all' | 'synced' | 'not-synced';
type QualityFilter = 'all' | 'excellent' | 'good' | 'medium' | 'poor';

export function ArticleManagement() {
  const { t } = useTranslation();
  const { selectedStore } = useStore();
  const [searchParams] = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { limits, canDoAction, refresh: refreshLimits } = useUsageLimits();
  const [activeTab, setActiveTab] = useState<QuickFilterTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [seoScoreSort, setSeoScoreSort] = useState<SeoScoreSort>('none');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [syncFilter, setSyncFilter] = useState<SyncFilter>('all');
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all');
  const [syncing, setSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [optimizing, setOptimizing] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedArticleForImage, setSelectedArticleForImage] = useState<Article | null>(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [optimizedArticle, setOptimizedArticle] = useState<Article | null>(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [optimizedArticles, setOptimizedArticles] = useState<Article[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [indexingArticle, setIndexingArticle] = useState<string | null>(null);

  // Get store domain with automatic fetching and caching
  const storeDomain = selectedStore?.public_domain && !selectedStore.public_domain.includes('.myshopify.com')
    ? selectedStore.public_domain
    : selectedStore?.store_url?.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'example.com';

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedStore?.id) {
        fetchArticles();
        setSelectedArticles(new Set()); // Clear selections on store change
      } else {
        setArticles([]);
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [selectedStore?.id]);

  // Auto-refresh toutes les 30 secondes UNIQUEMENT si store sélectionné
  useEffect(() => {
    if (!selectedStore?.id) return;
    
    const interval = setInterval(() => {
      fetchArticles();
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedStore?.id]);

  // Réagir aux changements de filtre dans l'URL
  useEffect(() => {
    const filterParam = searchParams.get("filter") as QualityFilter;
    if (filterParam && ['all', 'excellent', 'good', 'medium', 'poor'].includes(filterParam)) {
      setQualityFilter(filterParam);
    }
  }, [searchParams]);

  const fetchArticles = async () => {
    if (!selectedStore?.id) {
      setArticles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user');
        setLoading(false);
        return;
      }

      // ✅ PAGINATION CÔTÉ SERVEUR pour récupérer TOUS les articles
      let allArticles: any[] = [];
      let hasMore = true;
      let page = 0;
      const PAGE_SIZE = 1000;

      console.log('🔄 [ARTICLES] Starting paginated fetch...');

      while (hasMore) {
        const start = page * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;
        
        console.log(`📄 [ARTICLES] Fetching page ${page + 1} (${start}-${end})...`);
        
        const { data: pageData, error: pageError } = await supabase
          .from('blog_articles')
          .select('*')
          .eq('user_id', user.id)
          .or(`store_id.eq.${selectedStore.id},store_id.is.null`)
          .range(start, end)
          .order('updated_at', { ascending: false });
        
        if (pageError) throw pageError;
        
        if (pageData && pageData.length > 0) {
          console.log(`✅ [ARTICLES] Page ${page + 1} loaded: ${pageData.length} articles`);
          allArticles = [...allArticles, ...pageData];
          
          if (pageData.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      console.log('✅ [ARTICLES] Total articles fetched:', allArticles.length);
      const data = allArticles;
      
      // Debug logs for article import
      console.log('📊 Articles loaded:', data?.length, 'articles');
      console.log('📊 By source:', {
        shopify: data?.filter(a => a.source === 'shopify_import').length,
        ai: data?.filter(a => a.source === 'ai_generated').length,
        other: data?.filter(a => !a.source || (a.source !== 'shopify_import' && a.source !== 'ai_generated')).length
      });
      
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast.error(t.blog.management.messages.loadError);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get numeric SEO score from article
  const getArticleSeoScore = (article: Article): number => {
    return calculateArticleSeoScore(
      article.title,
      article.seo_title,
      article.meta_description,
      article.keywords,
      !!article.featured_image,
      article.status === 'published',
      article.optimization_count || 0
    ).score;
  };

  const getSeoScoreBadge = (score: number) => {
    if (score >= 80) return { variant: 'default' as const, label: t.blog.management.score.excellent, color: 'text-green-600' };
    if (score >= 60) return { variant: 'secondary' as const, label: t.blog.management.score.good, color: 'text-orange-600' };
    if (score >= 40) return { variant: 'outline' as const, label: t.blog.management.score.medium, color: 'text-orange-500' };
    return { variant: 'outline' as const, label: t.blog.management.score.poor, color: 'text-red-600' };
  };

const handleOptimizeArticle = async (articleId: string) => {
    if (!canDoAction('optimizations')) {
      toast.error('Limite d\'optimisations atteinte', {
        description: limits?.isTrialing 
          ? 'Passez à un plan payant pour continuer.'
          : 'Limite mensuelle atteinte. Passez à un plan supérieur.'
      });
      setShowUpgradeDialog(true);
      return;
    }

    try {
      setOptimizing(true);
      setShowProgressDialog(true);
      setProgress({ current: 0, total: 1 });

      const { data, error } = await supabase.functions.invoke('generate-article-seo', {
        body: { article_ids: [articleId] }
      });

      if (error) {
        if (error.message?.includes('limite_optimisations_atteinte') || error.message?.includes('403')) {
          toast.error('Limite d\'optimisations atteinte');
          setShowUpgradeDialog(true);
          setShowProgressDialog(false);
          return;
        }
        throw error;
      }

      if (data?.success_count > 0) {
        const article = articles.find(a => a.id === articleId);
        setOptimizedArticles(article ? [article] : []);
        setProgress({ current: 1, total: 1 });
        await fetchArticles();
        await refreshLimits();
        
        setShowProgressDialog(false);
        setShowResultsDialog(true);
      } else {
        throw new Error(data?.results?.[0]?.error || 'Erreur d\'optimisation');
      }
    } catch (error: any) {
      console.error('Error optimizing article:', error);
      toast.error(error.message || 'Erreur lors de l\'optimisation');
      setShowProgressDialog(false);
    } finally {
      setOptimizing(false);
    }
  };

  const handleOpenSyncDialog = () => {
    setShowResultsDialog(false);
    setShowSyncDialog(true);
  };

  const handleConfirmSync = async () => {
    if (optimizedArticles.length === 0) return;
    
    try {
      setSyncing(true);
      setShowSyncDialog(false);
      
      for (const article of optimizedArticles) {
        const { data, error } = await supabase.functions.invoke('sync-blog-to-shopify', {
          body: { articleId: article.id }
        });
        
        if (error) throw error;
      }
      
      toast.success(`${optimizedArticles.length} article(s) synchronisé(s)`);
      await fetchArticles();
      setOptimizedArticles([]);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncOptimizedArticle = async () => {
    if (!optimizedArticle) return;
    
    try {
      setSyncing(true);
      setShowResultsDialog(false);
      
      const { data, error } = await supabase.functions.invoke('sync-blog-to-shopify', {
        body: { articleId: optimizedArticle.id }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(t.blog.management.messages.syncSuccess, {
          description: optimizedArticle.title
        });
        await fetchArticles();
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || t.blog.management.messages.syncError);
    } finally {
      setSyncing(false);
      setOptimizedArticle(null);
    }
  };

  const handleSyncArticle = async (articleId: string) => {
    try {
      setSyncing(true);
      toast.info(t.blog.management.messages.importing);

      const { data, error } = await supabase.functions.invoke('sync-blog-to-shopify', {
        body: { articleId }
      });

      if (error) throw error;

      if (data?.success) {
        const article = articles.find(a => a.id === articleId);
        if (article) {
          toast.success(t.blog.management.messages.syncSuccess, {
            description: (
              <>
                <span className="font-medium">{article.title}</span>
                <br />
                <span className="text-xs text-muted-foreground">
                  View in your Shopify admin
                </span>
              </>
            ),
          });
        }
        await fetchArticles();
      } else {
        throw new Error(data?.error || t.blog.management.messages.syncError);
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || t.blog.management.messages.syncError);
    } finally {
      setSyncing(false);
    }
  };

  const handleRequestIndexing = async (articleId: string, articleTitle: string) => {
    setIndexingArticle(articleId);
    try {
      const article = articles.find(a => a.id === articleId);
      if (!article) {
        toast.error('Article introuvable');
        return;
      }

      if (!selectedStore) {
        toast.error('Boutique introuvable');
        return;
      }

      const domain = selectedStore.public_domain && !selectedStore.public_domain.includes('.myshopify.com')
        ? selectedStore.public_domain
        : selectedStore.store_url?.replace(/^https?:\/\//, '').replace(/\/$/, '');

      if (!domain) {
        toast.error('Domaine de boutique introuvable');
        return;
      }

      const articleUrl = `https://${domain}/blogs/news/${article.handle || articleTitle.toLowerCase().replace(/\s+/g, '-')}`;

      const { data, error } = await supabase.functions.invoke('request-gsc-indexing', {
        body: { articleId, url: articleUrl }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Demande d\'indexation envoyée avec succès');
      } else if (data?.error === 'NO_GOOGLE_AUTH') {
        toast.error('Veuillez connecter Google Search Console d\'abord');
      } else if (data?.error === 'quota_exceeded') {
        toast.warning('Quota d\'indexation dépassé, réessayez demain');
      } else {
        toast.error('Erreur lors de la demande d\'indexation');
      }
    } catch (error) {
      console.error('Error requesting indexing:', error);
      toast.error('Erreur lors de la demande d\'indexation');
    } finally {
      setIndexingArticle(null);
    }
  };

  const handleImportArticles = async () => {
    // Vérifier les limites avant d'importer
    if (!canDoAction('articles')) {
      toast.error('Limite d\'articles atteinte', {
        description: limits?.isTrialing 
          ? 'Passez à un plan payant pour importer plus d\'articles.'
          : 'Limite mensuelle atteinte. Contactez le support ou attendez le mois prochain.'
      });
      setShowUpgradeDialog(true);
      return;
    }

    try {
      setSyncing(true);
      const toastId = toast.loading(t.blog.management.messages.importing);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: storeData } = await supabase
        .from('shopify_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!storeData) {
        toast.error("Aucune connexion Shopify active", { id: toastId });
        return;
      }

      console.log('📰 Starting article import for store:', storeData.store_url);

      const { data, error } = await supabase.functions.invoke('import-shopify-articles', {
        body: { 
          shopName: storeData.store_url.replace('.myshopify.com', ''),
          authToken: storeData.access_token,
          storeId: storeData.id
        }
      });

      if (error) throw error;

      const totalArticles = data?.count || 0;
      const totalImages = data?.images || 0;
      
      console.log('✅ Import complete:', { totalArticles, totalImages });
      
      // Reset filters to show all imported articles
      setActiveTab('all');
      setQualityFilter('all');
      setStatusFilter('all');
      setSyncFilter('all');
      setSearchTerm('');
      
      toast.success(t.blog.management.messages.importSuccess
        .replace('{{totalArticles}}', String(totalArticles))
        .replace('{{totalImages}}', String(totalImages)), { 
          id: toastId,
          description: totalArticles > 0 ? 'Les filtres ont été réinitialisés pour afficher tous les articles.' : undefined
        });
      await fetchArticles();
      // Force complete refresh
      setSelectedArticles(new Set());
    } catch (error: any) {
      console.error('❌ Error importing articles:', error);
      toast.error(error.message || t.blog.management.messages.importError);
    } finally {
      setSyncing(false);
    }
  };

  const handleOptimizeArticles = async () => {
    if (selectedArticles.size === 0) {
      toast.error(t.blog.management.messages.noneSelected);
      return;
    }

    try {
      setOptimizing(true);
      const toastId = toast.loading(t.blog.management.messages.optimizing.replace('{{count}}', String(selectedArticles.size)));

      const { data, error } = await supabase.functions.invoke('generate-article-seo', {
        body: { article_ids: Array.from(selectedArticles) }
      });

      if (error) throw error;

      const successCount = data?.success_count || 0;
      const errorCount = data?.error_count || 0;

      if (successCount > 0) {
        toast.success(t.blog.management.messages.optimizationSuccess.replace('{{count}}', String(successCount)), { id: toastId });
        await fetchArticles();
        setSelectedArticles(new Set());
      } else {
        toast.error(t.blog.management.messages.optimizationError, { id: toastId });
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || t.blog.management.messages.importError);
    } finally {
      setOptimizing(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedArticles.size === sortedArticles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(sortedArticles.map(a => a.id)));
    }
  };

  const handleSelectArticle = (articleId: string) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(articleId)) {
      newSelected.delete(articleId);
    } else {
      newSelected.add(articleId);
    }
    setSelectedArticles(newSelected);
  };

  const handleSeoScoreSortToggle = () => {
    if (seoScoreSort === 'none') {
      setSeoScoreSort('desc'); // First click: highest to lowest
    } else if (seoScoreSort === 'desc') {
      setSeoScoreSort('asc'); // Second click: lowest to highest
    } else {
      setSeoScoreSort('none'); // Third click: reset
    }
  };

  const getFilteredArticles = () => {
    let filtered = [...articles];

    // Apply quick filter
    switch (activeTab) {
      case 'draft':
        filtered = filtered.filter(a => a.status === 'draft');
        break;
      case 'published':
        filtered = filtered.filter(a => a.status === 'published');
        break;
      case 'shopify-synced':
        filtered = filtered.filter(a => a.shopify_blog_id);
        break;
      case 'ai-generated':
        filtered = filtered.filter(a => a.source === 'ai_generated');
        break;
      case 'shopify-import':
        filtered = filtered.filter(a => a.source === 'shopify_import' || a.source === 'shopify');
        break;
    }

    // Status filter
    if (statusFilter === 'optimized') {
      filtered = filtered.filter(a => a.optimization_count && a.optimization_count > 0);
    } else if (statusFilter === 'not-optimized') {
      filtered = filtered.filter(a => !a.optimization_count || a.optimization_count === 0);
    }

    // Sync filter
    if (syncFilter === 'synced') {
      filtered = filtered.filter(a => a.last_synced_at);
    } else if (syncFilter === 'not-synced') {
      filtered = filtered.filter(a => !a.last_synced_at);
    }

    // Quality filter
    if (qualityFilter !== 'all') {
      filtered = filtered.filter(a => {
        const score = getArticleSeoScore(a);

        if (qualityFilter === 'excellent' && score < 80) return false;
        if (qualityFilter === 'good' && (score < 60 || score >= 80)) return false;
        if (qualityFilter === 'medium' && (score < 40 || score >= 60)) return false;
        if (qualityFilter === 'poor' && score >= 40) return false;
        return true;
      });
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.title?.toLowerCase().includes(term) ||
        a.content?.toLowerCase().includes(term) ||
        a.meta_description?.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const filteredArticles = getFilteredArticles();

  // Apply SEO score sorting
  const sortedArticles = [...filteredArticles];
  if (seoScoreSort !== 'none') {
    sortedArticles.sort((a, b) => {
      const scoreA = getArticleSeoScore(a);
      const scoreB = getArticleSeoScore(b);
      
      return seoScoreSort === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    });
  }

  // Batch pagination
  const {
    paginatedItems: paginatedArticles,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage,
    hasPreviousPage
  } = usePaginatedSeo({
    items: sortedArticles,
    itemsPerPage: 50,
    cacheKey: 'articles-pagination'
  });
  
  // Calculate global SEO score
  const globalSeoScore = articles.length > 0
    ? Math.round(articles.reduce((sum, article) => sum + getArticleSeoScore(article), 0) / articles.length)
    : 0;
  
  const stats = {
    total: articles.length,
    draft: articles.filter(a => a.status === 'draft').length,
    published: articles.filter(a => a.status === 'published').length,
    synced: articles.filter(a => a.shopify_blog_id).length,
    aiGenerated: articles.filter(a => a.source === 'ai_generated').length,
    shopifyImport: articles.filter(a => a.source === 'shopify_import' || a.source === 'shopify').length,
    // AI optimization stats
    totalEmpty: articles.filter(a => !a.meta_description || a.meta_description.trim().length === 0).length,
    existingData: articles.filter(a => a.meta_description && a.meta_description.trim().length > 0 && (!a.optimization_count || a.optimization_count === 0)).length,
    aiOptimized: articles.filter(a => a.optimization_count && a.optimization_count > 0).length,
    pendingSync: articles.filter(a => a.optimization_count && a.optimization_count > 0 && !a.last_synced_at).length,
    synchronized: articles.filter(a => a.last_synced_at).length,
  };

  const notOptimizedCount = stats.totalEmpty + stats.existingData;
  const optimizedCount = stats.aiOptimized;

  const quickFilters = [
    { id: 'all' as QuickFilterTab, label: t.blog.management.tabs.all, count: stats.total, icon: FileText },
    { id: 'ai-generated' as QuickFilterTab, label: 'Articles IA', count: stats.aiGenerated, icon: Sparkles },
    { id: 'shopify-import' as QuickFilterTab, label: 'Shopify', count: stats.shopifyImport, icon: Upload },
    { id: 'draft' as QuickFilterTab, label: t.blog.management.tabs.draft, count: stats.draft, icon: Clock },
    { id: 'published' as QuickFilterTab, label: t.blog.management.tabs.published, count: stats.published, icon: CheckCircle },
    { id: 'shopify-synced' as QuickFilterTab, label: t.blog.management.tabs.shopifySynced, count: stats.synced, icon: Upload },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vision AI Banner */}
      <VisionAIBanner />
      
      {/* Global SEO Score Card */}
      <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 border-2 border-blue-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">{t.blog.management.globalScore.title}</h3>
            <p className="text-sm text-muted-foreground">
              {t.blog.management.globalScore.subtitle}
            </p>
          </div>
          <div className="text-center">
            <div className={`text-4xl font-bold ${
              globalSeoScore >= 80 ? 'text-green-600' : 
              globalSeoScore >= 60 ? 'text-orange-600' : 
              'text-red-600'
            }`}>
              {globalSeoScore}/100
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {articles.length} {articles.length > 1 ? t.blog.management.globalScore.articles : t.blog.management.globalScore.article}
            </div>
          </div>
        </div>
      </Card>
      
      {/* Quick Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickFilters.map((filter) => {
          const Icon = filter.icon;
          return (
            <Card
              key={filter.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                activeTab === filter.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setActiveTab(filter.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${activeTab === filter.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <Badge variant={activeTab === filter.id ? 'default' : 'secondary'}>
                  {filter.count}
                </Badge>
              </div>
              <div className="text-sm font-medium">{filter.label}</div>
            </Card>
          );
        })}
      </div>

      {/* AI Optimization Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => setStatusFilter('not-optimized')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">To Optimize</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{notOptimizedCount}</p>
              <div className="flex gap-2 mt-1 text-xs text-orange-600 dark:text-orange-400">
                <span>Empty: {stats.totalEmpty}</span>
                <span>•</span>
                <span>Existing: {stats.existingData}</span>
              </div>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => setStatusFilter('optimized')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">AI-Optimized</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{optimizedCount}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                AI-generated
              </p>
            </div>
            <Sparkles className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => setSyncFilter('not-synced')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">To Synchronize</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.pendingSync}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                AI-optimized only
              </p>
            </div>
            <Clock className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => setSyncFilter('synced')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Synchronized</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.synchronized}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Synced to Shopify
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full md:w-auto flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t.blog.management.filters.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
              <SelectTrigger className="min-w-[150px]">
                <SelectValue placeholder={t.blog.management.filters.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.blog.management.status.all}</SelectItem>
                <SelectItem value="optimized">{t.blog.management.status.optimized}</SelectItem>
                <SelectItem value="not-optimized">{t.blog.management.status.notOptimized}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={syncFilter} onValueChange={(value: SyncFilter) => setSyncFilter(value)}>
              <SelectTrigger className="min-w-[150px]">
                <SelectValue placeholder={t.blog.management.filters.sync} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.blog.management.sync.all}</SelectItem>
                <SelectItem value="synced">{t.blog.management.sync.synced}</SelectItem>
                <SelectItem value="not-synced">{t.blog.management.sync.notSynced}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={qualityFilter} onValueChange={(value: any) => setQualityFilter(value as QualityFilter)}>
              <SelectTrigger className="min-w-[150px]">
                <SelectValue placeholder={t.blog.management.filters.quality} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.blog.management.quality.all}</SelectItem>
                <SelectItem value="excellent">{t.blog.management.quality.excellent} (≥80)</SelectItem>
                <SelectItem value="good">{t.blog.management.quality.good} (60-79)</SelectItem>
                <SelectItem value="medium">{t.blog.management.quality.medium} (40-59)</SelectItem>
                <SelectItem value="poor">{t.blog.management.quality.poor} (&lt;40)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 items-center w-full md:w-auto">
            {selectedArticles.size > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleOptimizeArticles}
                disabled={optimizing || syncing}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t.blog.management.actions.optimizeSelected} ({selectedArticles.size})
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportArticles}
              disabled={syncing || optimizing}
            >
              <Upload className="w-4 h-4 mr-2" />
              {t.blog.management.actions.importArticles}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            >
              {viewMode === 'list' ? <Grid3x3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={fetchArticles}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Articles Table/Grid */}
      {sortedArticles.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No articles found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'Try adjusting your search' : 'Create your first article with AI'}
          </p>
        </Card>
      ) : viewMode === 'list' ? (
        <Card className="overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
          <Table>
            {/* Article Table Headers - Updated structure */}
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedArticles.size === sortedArticles.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Article</TableHead>
                <TableHead className="text-right w-32">
                  <button
                    onClick={handleSeoScoreSortToggle}
                    className="flex items-center gap-1 hover:text-primary transition-colors ml-auto"
                  >
                    {t.blog.management.table.seoScore}
                    {seoScoreSort === 'none' && <ArrowUpDown className="w-4 h-4" />}
                    {seoScoreSort === 'asc' && <ArrowUp className="w-4 h-4" />}
                    {seoScoreSort === 'desc' && <ArrowDown className="w-4 h-4" />}
                  </button>
                </TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedArticles.map((article) => {
                const seoScore = getArticleSeoScore(article);
                const scoreBadge = getSeoScoreBadge(seoScore);
                const truncatedTitle = article.title.length > 50 
                  ? article.title.substring(0, 50) + '...' 
                  : article.title;
                
                return (
                  <TableRow key={article.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedArticles.has(article.id)}
                        onCheckedChange={() => handleSelectArticle(article.id)}
                      />
                    </TableCell>
                    <TableCell className="w-full">
                      <div className="flex items-start gap-4">
                        {/* Left: Image + Title + Brand */}
                        <div className="flex items-start gap-3 min-w-[200px]">
                          <div 
                            className="relative w-12 h-12 bg-background rounded overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 border"
                            onClick={() => {
                              setSelectedArticleForImage(article);
                              setShowImageDialog(true);
                            }}
                          >
                            {article.featured_image ? (
                              <img 
                                src={article.featured_image} 
                                alt={article.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <p className="font-medium text-sm line-clamp-2 break-words">{article.title}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">
                              {article.source === 'ai' ? 'AI' : article.source === 'shopify' ? 'SHOPIFY' : 'MANUAL'}
                            </p>
                          </div>
                        </div>

                        {/* Right: Google Preview + SEO Score */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className="flex-1 min-w-0">
                            {article.seo_title && article.meta_description ? (
                              <GoogleSearchPreview
                                title={article.seo_title || article.title}
                                description={article.meta_description}
                                url={buildPublicUrl(`/blogs/news/${article.handle || article.title.toLowerCase().replace(/\s+/g, '-')}`, storeDomain)}
                                compact
                              />
                            ) : (
                              <div className="text-sm text-muted-foreground py-2">
                                Not optimized
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-3xl font-bold ${scoreBadge.color}`}>
                            {Math.round(seoScore)}%
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (!canDoAction('articles')) {
                                toast.error("Limite d'articles atteinte");
                                setShowUpgradeDialog(true);
                                return;
                              }
                              handleOptimizeArticle(article.id);
                            }}
                            disabled={optimizing}
                            className="h-7 w-7 p-0 hover:bg-primary/10"
                            title="Re-optimize with AI"
                          >
                            <Sparkles className="w-4 h-4 text-primary" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className={`w-3 h-3 ${scoreBadge.color.replace('text-', '')}`} />
                          <span className={`text-xs font-medium ${scoreBadge.color}`}>{scoreBadge.label}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`/article-landing/${article.id}`, '_blank')}
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {article.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSyncArticle(article.id)}
                            disabled={syncing}
                            title="Sync to Shopify"
                          >
                            <Upload className="w-4 h-4 text-green-600" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRequestIndexing(article.id, article.title)}
                          disabled={indexingArticle === article.id}
                          title="Submit to Google Search Console"
                        >
                          {indexingArticle === article.id ? (
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                          ) : (
                            <Share2 className="w-4 h-4 text-blue-600" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedArticles.map((article) => (
            <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-all">
              <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <FileText className="w-16 h-16 text-primary" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                    {article.status}
                  </Badge>
                  {article.shopify_blog_id && (
                    <Badge variant="outline" className="text-xs">
                      <Upload className="w-3 h-3 mr-1" />
                      Synced
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{article.title}</h3>
                {article.meta_description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {article.meta_description}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(`/article-landing/${article.id}`, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  {article.status === 'draft' && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleSyncArticle(article.id)}
                      disabled={syncing}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Publish
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center py-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={previousPage}
                  className={!hasPreviousPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => goToPage(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={nextPage}
                  className={!hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
      
      {/* Featured Image Dialog */}
      {selectedArticleForImage && (
        <ArticleFeaturedImageDialog
          open={showImageDialog}
          onOpenChange={setShowImageDialog}
          article={selectedArticleForImage}
          onImageUpdated={fetchArticles}
        />
      )}
      
      {/* Workflow Dialogs */}
      <ProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        type="seo"
        operation={optimizing ? 'optimizing' : 'syncing'}
        current={progress.current}
        total={progress.total}
      />

      <ResultsDialog
        open={showResultsDialog}
        onOpenChange={setShowResultsDialog}
        type="seo"
        items={optimizedArticles.map(a => ({
          id: a.id,
          title: a.title,
          handle: a.handle || undefined,
          seo_title: a.seo_title || undefined,
          seo_description: a.meta_description,
          content: a.content,
          featured_image: a.featured_image || undefined
        }))}
        onSyncClick={handleOpenSyncDialog}
        onClose={() => setShowResultsDialog(false)}
      />

      <SyncConfirmationDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        onConfirm={handleConfirmSync}
        itemCount={optimizedArticles.length}
        type="seo"
        loading={syncing}
      />

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType="articles"
        usage={limits?.usage.articles_count}
        limit={limits?.limits.max_articles}
      />
    </div>
  );
}