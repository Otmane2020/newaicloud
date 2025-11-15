import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { TrialLimitBanner } from '@/components/TrialLimitBanner';
import { OptimizationConfirmDialog } from './OptimizationConfirmDialog';
import { usePaginatedSeo } from '@/hooks/usePaginatedSeo';
import { 
  ProgressDialog, 
  ResultsDialog, 
  SyncConfirmationDialog 
} from './SeoWorkflowDialogs';
import {
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  Sparkles,
  Upload,
  Loader2,
  Package,
  Eye,
  Target,
  TrendingUp,
  Zap,
  ArrowRight,
  Filter,
  Grid3x3,
  List,
  Image as ImageIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { SeoConfidenceBadge } from './SeoConfidenceBadge';
import { GoogleSearchPreview } from './GoogleSearchPreview';
import { calculateDetailedSeoScore, getSeoScoreBadge, passesQualityFilter } from '@/lib/seoQuality';
import { Progress } from '@/components/ui/progress';
import { VisionAIBanner } from './VisionAIBanner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/contexts/StoreContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface ShopifyPage {
  id: string;
  title: string;
  handle: string;
  body_html: string;
  seo_title: string | null;
  seo_description: string | null;
  optimized: boolean;
  last_synced_at?: string | null;
  optimization_count?: number;
}

type StatusFilter = 'all' | 'optimized' | 'not-optimized';
type SyncFilter = 'all' | 'synced' | 'not-synced';
type QualityFilter = 'all' | 'excellent' | 'good' | 'medium' | 'poor';

export function PageOptimization() {
  const [searchParams] = useSearchParams();
  const { selectedStore } = useStore();
  const [pages, setPages] = useState<ShopifyPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importingPages, setImportingPages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [syncFilter, setSyncFilter] = useState<SyncFilter>('all');
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>(
    (searchParams.get("filter") as QualityFilter) || "all"
  );
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showOptimizeAllConfirmDialog, setShowOptimizeAllConfirmDialog] = useState(false);
  const [previewPageId, setPreviewPageId] = useState<string | null>(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [optimizedPages, setOptimizedPages] = useState<ShopifyPage[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  const { limits, loading: limitsLoading, canDoAction, refresh: refreshLimits } = useUsageLimits();

  // Get store domain with automatic fetching and caching
  const storeDomain = selectedStore?.public_domain && !selectedStore.public_domain.includes('.myshopify.com')
    ? selectedStore.public_domain
    : selectedStore?.store_url?.replace(/^https?:\/\//, '').replace(/\/$/, '').includes('.myshopify.com')
    ? 'example.com'
    : selectedStore?.store_url?.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'example.com';

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedStore?.id) {
        fetchPages();
        setSelectedPages(new Set()); // Clear selections on store change
      } else {
        setPages([]);
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [selectedStore?.id]);

  // Auto-refresh toutes les 30 secondes pour détecter les suppressions Shopify
  useEffect(() => {
    if (!selectedStore?.id) return;
    
    const interval = setInterval(() => {
      fetchPages();
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

  const fetchPages = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not connected');
        setLoading(false);
        return;
      }

      if (!selectedStore) {
        setLoading(false);
        return;
      }

      // ✅ PAGINATION CÔTÉ SERVEUR pour récupérer TOUTES les pages
      let allPages: any[] = [];
      let hasMore = true;
      let page = 0;
      const PAGE_SIZE = 1000;

      console.log('🔄 [PAGES] Starting paginated fetch...');

      while (hasMore) {
        const start = page * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;
        
        console.log(`📄 [PAGES] Fetching page ${page + 1} (${start}-${end})...`);
        
        const { data: pageData, error: pageError } = await supabase
          .from('shopify_pages')
          .select('*')
          .eq('user_id', user.id)
          .eq('store_id', selectedStore.id)
          .range(start, end)
          .order('published_at', { ascending: false });
        
        if (pageError) throw pageError;
        
        if (pageData && pageData.length > 0) {
          console.log(`✅ [PAGES] Page ${page + 1} loaded: ${pageData.length} pages`);
          allPages = [...allPages, ...pageData];
          
          if (pageData.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      console.log('✅ [PAGES] Total pages fetched:', allPages.length);
      const data = allPages;
      
      // Map Shopify pages to our interface
      const mappedPages: ShopifyPage[] = (data || []).map((page: any) => ({
        id: page.id,
        title: page.title,
        handle: page.handle,
        body_html: page.body_html || '',
        seo_title: page.seo_title,
        seo_description: page.seo_description,
        optimized: (page.optimization_count || 0) > 0, // Based on AI optimization, not just data presence
        last_synced_at: page.last_synced_at,
        optimization_count: page.optimization_count || 0
      }));
      
      setPages(mappedPages);
    } catch (error) {
      console.error('Error fetching pages:', error);
      toast.error('Error loading pages');
    } finally {
      setLoading(false);
    }
  };

  const filteredPages = pages.filter((page) => {
    // Status filter
    if (statusFilter === 'optimized' && !page.optimized) return false;
    if (statusFilter === 'not-optimized' && page.optimized) return false;

    // Sync filter
    if (syncFilter === 'synced' && !page.last_synced_at) return false;
    if (syncFilter === 'not-synced' && page.last_synced_at) return false;

    // Quality filter
    if (qualityFilter !== 'all') {
      const score = calculateDetailedSeoScore(
        page.seo_title || page.title,
        page.seo_description || page.body_html?.substring(0, 160),
        false,
        !!page.handle,
        undefined,
        page.optimization_count || 0
      ).score;

      if (!passesQualityFilter(score, qualityFilter)) return false;
    }

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return page.title.toLowerCase().includes(term);
  });

  // Batch pagination
  const {
    paginatedItems: paginatedPages,
    currentPage,
    totalPages,
    goToPage,
    nextPage: goToNextPage,
    previousPage: goToPreviousPage,
    hasNextPage,
    hasPreviousPage
  } = usePaginatedSeo({
    items: filteredPages,
    itemsPerPage: 50,
    cacheKey: 'pages-pagination'
  });

  const handleSelectAll = () => {
    if (selectedPages.size === filteredPages.length) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(filteredPages.map((p) => p.id)));
    }
  };

  const handleSelectPage = (pageId: string) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageId)) {
      newSelected.delete(pageId);
    } else {
      newSelected.add(pageId);
    }
    setSelectedPages(newSelected);
  };

  const handleImportPages = async () => {
    try {
      setImportingPages(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not connected');
        return;
      }
      
      // Get user's Shopify connections
      const { data: connections, error: connError } = await supabase
        .from('shopify_connections')
        .select('id, store_name')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (connError) throw connError;
      
      if (!connections || connections.length === 0) {
        toast.error('No Shopify store connected');
        setImportingPages(false);
        return;
      }
      
      // Import pages for all connected stores
      let totalImported = 0;
      for (const store of connections) {
        toast.loading(`Importing pages from ${store.store_name || 'your store'}...`, { id: store.id });
        
        const { data, error } = await supabase.functions.invoke('import-shopify-pages', {
          body: { storeId: store.id }
        });
        
        if (error) {
          toast.error(`Error: ${error.message}`, { id: store.id });
        } else if (data.permissionError) {
          toast.warning(data.message, { id: store.id });
        } else {
          toast.success(`✅ ${data.count} pages imported`, { id: store.id });
          totalImported += data.count;
        }
      }
      
      // Refresh pages list
      await fetchPages();
      
      if (totalImported > 0) {
        toast.success(`🎉 ${totalImported} pages imported in total!`);
      }
    } catch (error) {
      console.error('Error importing pages:', error);
      toast.error('Error importing pages');
    } finally {
      setImportingPages(false);
    }
  };

  const handleOptimizeSelected = async (pageIds?: string[]) => {
    // Check limits BEFORE optimizing
    if (!limits?.canUseOptimizations || limits?.limitReached.optimizations) {
      if (limits?.isTrialing) {
        toast.error('Limite du plan actuel atteinte. Passez à un plan payant pour continuer.');
      } else if (limits?.isPaid) {
        toast.error('Limite mensuelle d\'optimisations atteinte. Passez à un plan supérieur.');
      }
      setShowUpgradeDialog(true);
      return;
    }
    
    // Use provided pageIds or fall back to selectedPages
    const idsToUse = pageIds || Array.from(selectedPages);
    
    if (idsToUse.length === 0) return;
    
    setOptimizing(true);
    let successCount = 0;
    
    for (let i = 0; i < idsToUse.length; i++) {
      try {
        const { error } = await supabase.functions.invoke('generate-page-seo', {
          body: { pageId: idsToUse[i], force: true }
        });
        
        if (error) throw error;
        
        successCount++;
        toast.success(`Page ${i + 1}/${idsToUse.length} optimized`);
      } catch (error) {
        console.error('Error optimizing page:', error);
        toast.error(`Error for page ${i + 1}`);
      }
    }
    
    setOptimizing(false);
    setSelectedPages(new Set());
    await fetchPages();
    await refreshLimits();
    
    if (successCount === idsToUse.length) {
      toast.success('🎉 All pages optimized!');
    } else {
      toast.warning(`${successCount}/${idsToUse.length} pages optimized`);
    }
  };

  const handleOptimizeAll = async () => {
    // Check limits BEFORE showing confirmation dialog
    if (!limits?.canUseOptimizations || limits?.limitReached.optimizations) {
      if (limits?.isTrialing) {
        toast.error('Limite du plan actuel atteinte. Passez à un plan payant pour continuer.');
      } else if (limits?.isPaid) {
        toast.error('Limite mensuelle d\'optimisations atteinte. Passez à un plan supérieur.');
      }
      setShowUpgradeDialog(true);
      return;
    }
    
    const pagesToOptimize = pages.filter(p => !p.optimized);
    if (pagesToOptimize.length === 0) {
      toast.info('All pages are already optimized');
      return;
    }
    
    // Show confirmation dialog
    setShowOptimizeAllConfirmDialog(true);
  };

  const handleConfirmOptimizeAll = async () => {
    const pagesToOptimize = pages.filter(p => !p.optimized);
    
    setOptimizing(true);
    let successCount = 0;
    
    for (let i = 0; i < pagesToOptimize.length; i++) {
      try {
        const { error } = await supabase.functions.invoke('generate-page-seo', {
          body: { pageId: pagesToOptimize[i].id, force: true }
        });
        
        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error('Error:', error);
      }
    }
    
    setOptimizing(false);
    toast.success(`${successCount}/${pagesToOptimize.length} pages optimized!`);
    await fetchPages();
    await refreshLimits();
  };

  const handleSyncAll = async () => {
    const pagesToSync = pages.filter(p => p.optimized && (p.optimization_count || 0) > 0);
    if (pagesToSync.length === 0) {
      toast.info('No AI-optimized pages to sync');
      return;
    }
    
    setSyncing(true);
    let successCount = 0;
    
    for (const page of pagesToSync) {
      try {
        const { error } = await supabase.functions.invoke('sync-page-to-shopify', {
          body: { pageId: page.id }
        });
        
        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error('Error:', error);
      }
    }
    
    setSyncing(false);
    toast.success(`${successCount}/${pagesToSync.length} pages synchronized!`);
    fetchPages();
  };

  const handleSyncSelected = async () => {
    if (selectedPages.size === 0) return;
    
    const pagesToSync = Array.from(selectedPages).filter(pageId => {
      const page = pages.find(p => p.id === pageId);
      return page && page.optimized && (page.optimization_count || 0) > 0;
    });
    
    if (pagesToSync.length === 0) {
      toast.info('Aucune page AI-optimisée à synchroniser');
      return;
    }
    
    setSyncing(true);
    let successCount = 0;
    
    for (const pageId of pagesToSync) {
      try {
        const { error } = await supabase.functions.invoke('sync-page-to-shopify', {
          body: { pageId }
        });
        
        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error('Error:', error);
      }
    }
    
    setSyncing(false);
    setSelectedPages(new Set());
    toast.success(`${successCount}/${pagesToSync.length} pages synchronized!`);
    fetchPages();
  };

  const handleOptimizePage = async (pageId: string, forceReoptimize = false) => {
    if (!limits?.canUseOptimizations || limits?.limitReached.optimizations) {
      setShowUpgradeDialog(true);
      return;
    }
    
    try {
      setOptimizing(true);
      setShowProgressDialog(true);
      setProgress({ current: 0, total: 1 });

      const { data, error } = await supabase.functions.invoke('generate-page-seo', {
        body: { pageId, force: forceReoptimize }
      });
      
      if (error) throw error;

      setProgress({ current: 1, total: 1 });
      await fetchPages();
      await refreshLimits();

      const page = pages.find(p => p.id === pageId);
      setOptimizedPages(page ? [page] : []);
      
      setShowProgressDialog(false);
      setShowResultsDialog(true);
    } catch (error: any) {
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
    if (optimizedPages.length === 0) return;
    
    try {
      setSyncing(true);
      setShowSyncDialog(false);
      
      for (const page of optimizedPages) {
        const { error } = await supabase.functions.invoke('sync-page-to-shopify', {
          body: { pageId: page.id }
        });
        
        if (error) throw error;
      }
      
      toast.success(`${optimizedPages.length} page(s) synchronisée(s)`);
      await fetchPages();
      setOptimizedPages([]);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncPage = async (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page || !page.optimized || (page.optimization_count || 0) === 0) {
      toast.error('Seules les pages AI-optimisées peuvent être synchronisées');
      return;
    }
    
    try {
      setSyncing(true);
      const { error } = await supabase.functions.invoke('sync-page-to-shopify', {
        body: { pageId }
      });
      
      if (error) throw error;
      toast.success('Page synchronized!');
      fetchPages();
    } catch (error: any) {
      toast.error(error.message || 'Error');
    } finally {
      setSyncing(false);
    }
  };

  if (!selectedStore) {
    return (
      <Alert className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Aucune boutique sélectionnée</AlertTitle>
        <AlertDescription>
          Veuillez sélectionner une boutique dans le menu en haut pour afficher les pages.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading || limitsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate global SEO score with 30/70 weighting
  const pagesNotOptimized = pages.filter(p => !p.optimized || (p.optimization_count || 0) === 0);
  const pagesOptimized = pages.filter(p => p.optimized && (p.optimization_count || 0) > 0);

  // Score for non-optimized pages (Shopify data)
  const scoreWithoutAI = pagesNotOptimized.length > 0
    ? Math.round(
        pagesNotOptimized.reduce((sum, p) => {
          const score = calculateDetailedSeoScore(
            p.title, // Shopify title
            p.body_html?.substring(0, 160) || '',
            false,
            !!p.handle,
            undefined, // No tags for pages
            0 // Non-optimized = 0
          );
          return sum + score.score;
        }, 0) / pagesNotOptimized.length
      )
    : 0;

  // Score for AI-optimized pages
  const scoreWithAI = pagesOptimized.length > 0
    ? Math.round(
        pagesOptimized.reduce((sum, p) => {
          const score = calculateDetailedSeoScore(
            p.seo_title || p.title,
            p.seo_description || p.body_html?.substring(0, 160) || '',
            false,
            !!p.handle,
            undefined,
            p.optimization_count || 0
          );
          return sum + score.score;
        }, 0) / pagesOptimized.length
      )
    : 0;

  // Calculate global score as the average of ALL pages (not weighted 30/70)
  const globalPageSeoScore = pages.length > 0
    ? Math.round(
        pages.reduce((sum, p) => {
          const score = calculateDetailedSeoScore(
            p.seo_title || p.title,
            p.seo_description || p.body_html?.substring(0, 160) || '',
            false,
            !!p.handle,
            undefined,
            p.optimization_count || 0
          );
          return sum + score.score;
        }, 0) / pages.length
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Vision AI Banner */}
      <VisionAIBanner />

      {/* Stats Cards - 4 cartes cliquables */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={() => {
            setStatusFilter('not-optimized');
            toast.info(`${pages.filter(p => !p.optimized).length} pages à optimiser`);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-300">To Optimize</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-100">{pages.filter(p => !p.optimized).length}</p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Empty or Shopify
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-xs text-orange-600 dark:text-orange-300 mt-2">Click to view</p>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={() => {
            setStatusFilter('optimized');
            toast.info(`${pages.filter(p => p.optimized).length} pages AI-optimisées`);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">AI-Optimized</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{pages.filter(p => p.optimized).length}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                AI-generated
              </p>
            </div>
            <Sparkles className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 mt-2">Click to view</p>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={() => {
            setSyncFilter('not-synced');
            toast.info(`${pages.filter(p => p.optimized && !p.last_synced_at).length} pages à synchroniser`);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">To Synchronize</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{pages.filter(p => p.optimized && !p.last_synced_at).length}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                AI-optimized only
              </p>
            </div>
            <Clock className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">Click to view</p>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={() => {
            setSyncFilter('synced');
            toast.info(`${pages.filter(p => p.last_synced_at).length} pages synchronisées`);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Synchronized</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{pages.filter(p => p.last_synced_at).length}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Synced to Shopify
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">Click to view</p>
        </Card>
      </div>

      {/* Stats Cards - Enhanced Design */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 hidden">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-2 border-blue-200 hover:shadow-xl transition-all hover:scale-105 transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{pages.length}</p>
              <p className="text-sm text-muted-foreground font-medium mt-1">Pages Totales</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-2 border-orange-200 hover:shadow-xl transition-all hover:scale-105 transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{pages.filter(p => !p.optimized).length}</p>
              <p className="text-sm text-muted-foreground font-medium mt-1">À Optimiser</p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Vides ou Shopify
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-xl">
              <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-2 border-green-200 hover:shadow-xl transition-all hover:scale-105 transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{pages.filter(p => p.optimized).length}</p>
              <p className="text-sm text-muted-foreground font-medium mt-1">Pages SEO</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Titres & descriptions
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-2 border-purple-200 hover:shadow-xl transition-all hover:scale-105 transform duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{pages.filter(p => p.last_synced_at).length}</p>
              <p className="text-sm text-muted-foreground font-medium mt-1">Synchronisées</p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                Sur Shopify
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
              <Upload className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Pages Table */}
      {pages.length === 0 ? (
        <Card className="p-12 text-center bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900 dark:to-slate-900">
          <div className="max-w-md mx-auto">
            <div className="p-6 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center">
              <FileText className="w-16 h-16 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Aucune page trouvée</h3>
            <p className="text-muted-foreground mb-8 text-lg">
              Importez vos pages Shopify pour commencer l'optimisation SEO et booster votre visibilité
            </p>
            <Button 
              onClick={handleImportPages}
              disabled={importingPages}
              size="lg"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xl px-8 py-6 text-lg"
            >
              {importingPages ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Importation en cours...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-5 w-5" />
                  Importer les Pages Shopify
                </>
              )}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="border-2">
          <div className="p-6">
            {/* Sticky Action Bar */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border -m-6 mb-6 p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    checked={selectedPages.size === filteredPages.length && filteredPages.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedPages.size > 0 ? (
                      <span className="text-primary">{selectedPages.size} page(s) sélectionnée(s)</span>
                    ) : (
                      <span className="text-muted-foreground">Sélectionner tout</span>
                    )}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() => handleOptimizeSelected()}
                    disabled={selectedPages.size === 0 || optimizing}
                    size="sm"
                    className="gap-2"
                  >
                    {optimizing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>Optimiser sélectionnés</span>
                  </Button>
                  <Button
                    onClick={handleOptimizeAll}
                    disabled={optimizing || pages.filter(p => !p.optimized).length === 0}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    {optimizing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>Optimiser tout</span>
                  </Button>
                  <Button
                    onClick={handleSyncSelected}
                    disabled={selectedPages.size === 0 || syncing}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    {syncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span>Synchroniser</span>
                  </Button>
                  <Button
                    onClick={handleSyncAll}
                    disabled={syncing || pages.filter(p => p.optimized).length === 0}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    {syncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span>Synchroniser tout</span>
                  </Button>
                  <Button
                    onClick={fetchPages}
                    disabled={loading}
                    variant="ghost"
                    size="sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-bold mb-1">Pages Shopify</h3>
                <p className="text-muted-foreground">Gérez et optimisez toutes vos pages</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleImportPages}
                  disabled={importingPages}
                  variant="outline"
                  size="sm"
                  className="border-2"
                >
                  {importingPages ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Import...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Importer
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleOptimizeSelected()}
                  disabled={optimizing || selectedPages.size === 0}
                  size="sm"
                  className="bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary shadow-lg hover:shadow-primary/50 border-0 text-primary-foreground font-semibold transition-all duration-300"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Optimiser ({selectedPages.size})
                </Button>
                <Button
                  onClick={handleSyncSelected}
                  disabled={syncing || selectedPages.size === 0}
                  variant="outline"
                  size="sm"
                  className="border-2 border-green-200 text-green-700 hover:bg-green-50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Synchroniser
                </Button>
              </div>
            </div>

            <div className="relative flex-1 mb-4 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for a page..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                <SelectTrigger className="min-w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="optimized">Optimized</SelectItem>
                  <SelectItem value="not-optimized">Not Optimized</SelectItem>
                </SelectContent>
              </Select>

              <Select value={syncFilter} onValueChange={(value: SyncFilter) => setSyncFilter(value)}>
                <SelectTrigger className="min-w-[150px]">
                  <SelectValue placeholder="Sync" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sync</SelectItem>
                  <SelectItem value="synced">Synced</SelectItem>
                  <SelectItem value="not-synced">Not Synced</SelectItem>
                </SelectContent>
              </Select>

              <Select value={qualityFilter} onValueChange={(value: any) => setQualityFilter(value as QualityFilter)}>
                <SelectTrigger className="min-w-[150px]">
                  <SelectValue placeholder="SEO Quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Qualities</SelectItem>
                  <SelectItem value="excellent">Excellent (≥80)</SelectItem>
                  <SelectItem value="good">Good (60-79)</SelectItem>
                  <SelectItem value="medium">Medium (40-59)</SelectItem>
                  <SelectItem value="poor">Poor (&lt;40)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedPages.size === filteredPages.length && filteredPages.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="min-w-[400px]">Aperçu Google</TableHead>
                <TableHead className="w-32">SEO Score</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-40">Sync Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
              <TableBody>
                {paginatedPages.map((page) => {
                  const seoScore = calculateDetailedSeoScore(
                    page.seo_title,
                    page.seo_description,
                    false,
                    true,
                    undefined, // No tags for pages
                    page.optimization_count || 0 // Pass optimization count
                  );
                  const scoreBadge = getSeoScoreBadge(seoScore.score);
                  
                  return (
                    <TableRow key={page.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedPages.has(page.id)}
                          onCheckedChange={() => handleSelectPage(page.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium line-clamp-2">{page.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{page.handle}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {page.seo_title && page.seo_description ? (
                          <div 
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setPreviewPageId(page.id)}
                          >
                            <GoogleSearchPreview
                              title={page.seo_title}
                              description={page.seo_description}
                              url={`https://${storeDomain}/pages/${page.handle}`}
                              compact
                            />
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Not optimized
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <Badge variant={page.optimized ? 'default' : 'secondary'}>
                          {page.optimized ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Optimized
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {page.last_synced_at ? (
                          <Badge variant="default" className="bg-green-600 text-white">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Synced
                          </Badge>
                        ) : page.optimized ? (
                          <Badge variant="secondary" className="bg-yellow-600 text-white">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            Not synced
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              if (!canDoAction('optimizations')) {
                                toast.error("Limite atteinte", {
                                  description: `Vous avez atteint votre limite mensuelle de ${limits.limits.max_optimizations} optimisations.`,
                                });
                                setShowUpgradeDialog(true);
                                return;
                              }
                              // Optimiser directement cette page
                              handleOptimizeSelected([page.id]);
                            }}
                            disabled={optimizing}
                            title={page.optimized ? "Re-optimize" : "Optimize"}
                            className="bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary shadow-lg hover:shadow-primary/50 text-primary-foreground font-semibold transition-all duration-300"
                          >
                            <Zap className="w-4 h-4" />
                          </Button>
                          {page.optimized && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSyncPage(page.id)}
                              disabled={syncing}
                              title="Sync to Shopify"
                              className="hover:bg-green-50"
                            >
                              <Upload className="w-5 h-5 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center py-4 border-t">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={goToPreviousPage}
                      className={!hasPreviousPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => goToPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={goToNextPage}
                      className={!hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </Card>
      )}
      
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
        items={optimizedPages.map(p => ({
          id: p.id,
          title: p.title,
          handle: p.handle,
          seo_title: p.seo_title || undefined,
          seo_description: p.seo_description || undefined,
          body_html: p.body_html
        }))}
        onSyncClick={handleOpenSyncDialog}
        onClose={() => setShowResultsDialog(false)}
      />

      <SyncConfirmationDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        onConfirm={handleConfirmSync}
        itemCount={optimizedPages.length}
        type="seo"
        loading={syncing}
      />
      
      <OptimizationConfirmDialog
        open={showOptimizeAllConfirmDialog}
        onOpenChange={setShowOptimizeAllConfirmDialog}
        onConfirm={handleConfirmOptimizeAll}
        selectedCount={pages.filter(p => !p.optimized).length}
        currentUsage={limits?.usage.optimizations_count || 0}
        maxOptimizations={limits?.limits.max_optimizations || 0}
        isTrialing={limits?.isTrialing || false}
      />

      {/* Upgrade Dialog */}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType="optimizations"
      />
    </div>
  );
}