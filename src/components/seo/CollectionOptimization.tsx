import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePaginatedSeo } from '@/hooks/usePaginatedSeo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { calculateDetailedSeoScore, getSeoScoreBadge, passesQualityFilter } from '@/lib/seoQuality';
import { 
  ProgressDialog, 
  ResultsDialog, 
  SyncConfirmationDialog 
} from './SeoWorkflowDialogs';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { TrialLimitBanner } from '@/components/TrialLimitBanner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CollectionImageDialog } from './CollectionImageDialog';
import { ReoptimizeConfirmDialog } from './ReoptimizeConfirmDialog';
import { VisionAIBanner } from './VisionAIBanner';
import { useTranslation } from '@/lib/language';
import { useStore } from '@/contexts/StoreContext';
import { GoogleSearchPreview } from './GoogleSearchPreview';
import { buildPublicUrl } from '@/lib/shopifyDomainUtils';
import { GenerateDescriptionDialog } from './GenerateDescriptionDialog';
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
  AlertCircle,
  Pencil
} from 'lucide-react';
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
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface Collection {
  id: string;
  title: string;
  handle: string;
  body_html: string | null;
  image_url: string | null;
  image_alt: string | null;
  shopify_collection_id: number;
  seo_title?: string | null;
  seo_description?: string | null;
  optimization_count?: number;
  last_optimization_at?: string | null;
  last_synced_at?: string | null;
  products_count?: number;
  created_at: string;
  updated_at: string;
}

type QuickFilterTab = 'all' | 'not-optimized' | 'optimized' | 'pending-sync' | 'synced';
type SeoScoreSort = 'none' | 'asc' | 'desc';
type StatusFilter = 'all' | 'optimized' | 'not-optimized';
type SyncFilter = 'all' | 'synced' | 'not-synced';
type QualityFilter = 'all' | 'excellent' | 'good' | 'medium' | 'poor';

export function CollectionOptimization() {
  const { t, tf } = useTranslation();
  const { selectedStore } = useStore();
  const { limits, canDoAction, refresh: refreshLimits } = useUsageLimits();
  const [searchParams] = useSearchParams();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<QuickFilterTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [collectionStatusFilter, setCollectionStatusFilter] = useState('all');
  const [seoScoreSort, setSeoScoreSort] = useState<SeoScoreSort>('none');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [syncFilter, setSyncFilter] = useState<SyncFilter>('all');
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>(
    (searchParams.get("filter") as QualityFilter) || "all"
  );
  const [syncing, setSyncing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [isOptimizationComplete, setIsOptimizationComplete] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [optimizedCollections, setOptimizedCollections] = useState<Collection[]>([]);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [collectionsToSync, setCollectionsToSync] = useState<Collection[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedCollectionForImage, setSelectedCollectionForImage] = useState<Collection | null>(null);
  const [showReoptimizeDialog, setShowReoptimizeDialog] = useState(false);
  const [pendingOptimizationCollections, setPendingOptimizationCollections] = useState<Collection[]>([]);
  const [previewCollectionId, setPreviewCollectionId] = useState<string | null>(null);
  const [showGenerateDescriptionDialog, setShowGenerateDescriptionDialog] = useState(false);
  const [selectedCollectionForDescription, setSelectedCollectionForDescription] = useState<Collection | null>(null);

  // Get store domain with automatic fetching and caching
  const storeDomain = selectedStore?.public_domain && !selectedStore.public_domain.includes('.myshopify.com')
    ? selectedStore.public_domain
    : selectedStore?.store_url?.replace(/^https?:\/\//, '').replace(/\/$/, '').includes('.myshopify.com')
    ? 'example.com'
    : selectedStore?.store_url?.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'example.com';

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedStore?.id) {
        fetchCollections();
        setSelectedCollections(new Set()); // Clear selections on store change
      } else {
        setCollections([]);
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [selectedStore?.id]);

  // Auto-refresh toutes les 30 secondes pour détecter les suppressions Shopify
  useEffect(() => {
    if (!selectedStore?.id) return;
    
    const interval = setInterval(() => {
      fetchCollections();
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [selectedStore?.id]);

  // Réagir aux changements de filtre dans l'URL
  useEffect(() => {
    const filterParam = searchParams.get("filter") as QualityFilter;
    if (filterParam && ['all', 'excellent', 'good', 'medium', 'poor'].includes(filterParam)) {
      setQualityFilter(filterParam);
    }
  }, [searchParams]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user');
        setLoading(false);
        return;
      }

      if (!selectedStore) {
        setLoading(false);
        return;
      }

      // ✅ PAGINATION CÔTÉ SERVEUR pour récupérer TOUTES les collections
      let allCollections: any[] = [];
      let hasMore = true;
      let page = 0;
      const PAGE_SIZE = 1000;

      console.log('🔄 [COLLECTIONS] Starting paginated fetch...');

      while (hasMore) {
        const start = page * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;
        
        console.log(`📄 [COLLECTIONS] Fetching page ${page + 1} (${start}-${end})...`);
        
        const { data: pageData, error: pageError } = await supabase
          .from('shopify_collections')
          .select('*')
          .eq('user_id', user.id)
          .eq('store_id', selectedStore.id)
          .range(start, end)
          .order('title', { ascending: true });
        
        if (pageError) throw pageError;
        
        if (pageData && pageData.length > 0) {
          console.log(`✅ [COLLECTIONS] Page ${page + 1} loaded: ${pageData.length} collections`);
          allCollections = [...allCollections, ...pageData];
          
          if (pageData.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      console.log('✅ [COLLECTIONS] Total collections fetched:', allCollections.length);
      setCollections(allCollections);
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error(t.collections.loadError);
    } finally {
      setLoading(false);
    }
  };

  // Statistics - distinguishing between existing data and AI-optimized data
  const totalEmpty = collections.filter(c => !c.seo_title && !c.seo_description).length;
  const existingData = collections.filter(c => (c.seo_title || c.seo_description) && (!c.optimization_count || c.optimization_count === 0)).length;
  const aiOptimized = collections.filter(c => c.optimization_count && c.optimization_count > 0).length;
  const notOptimizedCount = totalEmpty + existingData;
  const optimizedCount = aiOptimized;
  const pendingSyncCount = collections.filter(c => c.optimization_count && c.optimization_count > 0 && !c.last_synced_at).length;
  const syncedCount = collections.filter(c => c.last_synced_at).length;
  const optimizationRate = collections.length > 0 ? Math.round((aiOptimized / collections.length) * 100) : 0;

  // Calculate global SEO score with 30/70 weighting
  const collectionsNotOptimized = collections.filter(c => !c.optimization_count || c.optimization_count === 0);
  const collectionsOptimized = collections.filter(c => c.optimization_count && c.optimization_count > 0);

  const scoreWithoutAI = collectionsNotOptimized.length > 0
    ? Math.round(
        collectionsNotOptimized.reduce((sum, c) => {
          const score = calculateDetailedSeoScore(
            c.title,
            c.body_html?.substring(0, 160) || '',
            !!c.image_url,
            true,
            undefined,
            0
          );
          return sum + score.score;
        }, 0) / collectionsNotOptimized.length
      )
    : 0;

  const scoreWithAI = collectionsOptimized.length > 0
    ? Math.round(
        collectionsOptimized.reduce((sum, c) => {
          const score = calculateDetailedSeoScore(
            c.seo_title || c.title,
            c.seo_description || c.body_html?.substring(0, 160) || '',
            !!c.image_url,
            true,
            undefined,
            c.optimization_count || 0
          );
          return sum + score.score;
        }, 0) / collectionsOptimized.length
      )
    : 0;

  // Calculate global score as the average of ALL collections (not weighted 30/70)
  const globalSeoScore = collections.length > 0
    ? Math.round(
        collections.reduce((sum, c) => {
          const score = calculateDetailedSeoScore(
            c.seo_title || c.title,
            c.seo_description || c.body_html?.substring(0, 160) || '',
            !!c.image_url,
            true,
            undefined,
            c.optimization_count || 0
          );
          return sum + score.score;
        }, 0) / collections.length
      )
    : 0;

  // Define helper function before using it
  const calculateCollectionSeoScore = (collection: Collection): number => {
    // Use detailed SEO score calculation like products
    const seoScore = calculateDetailedSeoScore(
      collection.seo_title || collection.title,
      collection.seo_description || collection.body_html?.substring(0, 160) || '',
      !!collection.image_url,
      true,
      undefined, // No tags for collections
      collection.optimization_count || 0
    );
    
    return seoScore.score;
  };

  const filteredCollections = collections.filter((collection) => {
    if (activeTab === 'not-optimized' && collection.optimization_count && collection.optimization_count > 0) return false;
    if (activeTab === 'optimized' && (!collection.optimization_count || collection.optimization_count === 0)) return false;
    if (activeTab === 'pending-sync') return false; // No sync yet
    if (activeTab === 'synced') return false; // No sync yet

    // Status filter
    if (statusFilter === 'optimized' && (!collection.optimization_count || collection.optimization_count === 0)) return false;
    if (statusFilter === 'not-optimized' && collection.optimization_count && collection.optimization_count > 0) return false;

    // Sync filter
    if (syncFilter === 'synced' && !collection.last_synced_at) return false;
    if (syncFilter === 'not-synced' && collection.last_synced_at) return false;

    // Quality filter
    if (qualityFilter !== 'all') {
      const score = calculateCollectionSeoScore(collection);
      if (!passesQualityFilter(score, qualityFilter)) return false;
    }
    
    // Collection status filter
    if (collectionStatusFilter !== 'all') {
      const collectionStatus = (collection as any).status?.toLowerCase() || 'active';
      if (collectionStatusFilter === 'active' && collectionStatus !== 'active') return false;
      if (collectionStatusFilter === 'draft' && collectionStatus !== 'draft') return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        collection.title?.toLowerCase().includes(term) ||
        collection.handle?.toLowerCase().includes(term)
      );
    }

    return true;
  });

  // Apply SEO score sorting
  const sortedCollections = [...filteredCollections];
  if (seoScoreSort !== 'none') {
    sortedCollections.sort((a, b) => {
      const scoreA = calculateCollectionSeoScore(a);
      const scoreB = calculateCollectionSeoScore(b);
      
      return seoScoreSort === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    });
  }

  // Pagination with cache and scroll
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedCollections,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage,
    hasPreviousPage,
  } = usePaginatedSeo({
    items: sortedCollections,
    itemsPerPage: 50,
    cacheKey: 'seo-collections',
  });

  const tabs = [
    { id: 'all' as QuickFilterTab, label: t.collections.optimization.tabs.all, count: collections.length },
    { id: 'not-optimized' as QuickFilterTab, label: t.collections.optimization.tabs.notOptimized, count: notOptimizedCount },
    { id: 'optimized' as QuickFilterTab, label: t.collections.optimization.tabs.optimized, count: optimizedCount },
  ];

  // Clickable stats handlers
  const handleNotOptimizedClick = () => {
    setActiveTab('not-optimized');
    toast.info(t.collections.optimization.messages.collectionsToOptimize.replace('{{count}}', String(notOptimizedCount)));
  };

  const handleOptimizedClick = () => {
    setActiveTab('optimized');
    toast.info(t.collections.optimization.messages.collectionsOptimized.replace('{{count}}', String(optimizedCount)));
  };

  const handleGenerateAll = () => {
    if (notOptimizedCount === 0) {
      toast.info(t.collections.optimization.messages.allOptimized);
      return;
    }
    setActiveTab('not-optimized');
    setTimeout(() => {
      handleOptimizeAllCollections();
    }, 100);
  };

  const handleSelectAll = () => {
    if (selectedCollections.size === paginatedCollections.length) {
      setSelectedCollections(new Set());
    } else {
      setSelectedCollections(new Set(paginatedCollections.map((c) => c.id)));
    }
  };

  const handleSelectCollection = (collectionId: string) => {
    const newSelected = new Set(selectedCollections);
    if (newSelected.has(collectionId)) {
      newSelected.delete(collectionId);
    } else {
      newSelected.add(collectionId);
    }
    setSelectedCollections(newSelected);
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

  const handleOptimizeSelected = async (collectionIds?: string[]) => {
    if (!limits?.canUseOptimizations || limits?.limitReached.optimizations) {
      toast.error(t.collections.optimization.messages.trialLimitReached);
      setShowUpgradeDialog(true);
      return;
    }

    // Use provided collectionIds or fall back to selectedCollections
    const idsToUse = collectionIds ? new Set(collectionIds) : selectedCollections;

    const collectionsToOptimize = collections.filter(c => idsToUse.has(c.id));

    if (collectionsToOptimize.length === 0) {
      toast.info(t.collections.optimization.messages.noneSelected);
      return;
    }

    // Validate collection IDs are proper UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = collectionsToOptimize.filter(c => !uuidRegex.test(c.id));
    
    if (invalidIds.length > 0) {
      console.error('❌ Invalid collection IDs detected:', invalidIds.map(c => ({ id: c.id, title: c.title })));
      toast.error(t.collections.optimization.messages.invalidIds);
      return;
    }

    // Check if any collections have already been optimized
    const alreadyOptimized = collectionsToOptimize.filter(c => (c.optimization_count || 0) > 0);
    
    if (alreadyOptimized.length > 0) {
      // Show confirmation dialog for re-optimization
      setPendingOptimizationCollections(collectionsToOptimize);
      setShowReoptimizeDialog(true);
      return;
    }

    // If none are optimized, proceed directly
    await executeOptimization(collectionsToOptimize);
  };

  const executeOptimization = async (collectionsToOptimize: Collection[]) => {

    setOptimizing(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: collectionsToOptimize.length });

    let successCount = 0;
    for (let i = 0; i < collectionsToOptimize.length; i++) {
      try {
        const { data, error } = await supabase.functions.invoke('generate-collection-seo', {
          body: { 
            collection_ids: [collectionsToOptimize[i].id],
            force: true  // Allow re-optimization
          }
        });
        
        if (error) {
          console.error(`❌ Error optimizing collection ${collectionsToOptimize[i].id}:`, error);
          toast.error(tf('collections.optimization.messages.optimizationError', { message: error.message || t.collections.optimization.messages.optimizationFailed }));
          throw error;
        }
        
        // Check if optimization was successful
        if (data?.results?.[0]?.success) {
          successCount++;
        } else {
          const errorMsg = data?.results?.[0]?.error || t.collections.optimization.messages.optimizationFailed;
          console.warn(`⚠️ Collection ${collectionsToOptimize[i].id} - ${errorMsg}`);
          toast.warning(tf('collections.optimization.messages.collectionError', { title: collectionsToOptimize[i].title, message: errorMsg }));
        }
        
        setProgress({ current: i + 1, total: collectionsToOptimize.length });
      } catch (error: any) {
        console.error('❌ Error optimizing collection:', error);
        
        // Handle specific error types
        if (error.message?.includes('trial_limit_reached') || error.message?.includes('monthly_limit_reached')) {
          // Afficher le bon message selon le statut de l'utilisateur
          if (limits?.isTrialing) {
            toast.error(t.collections.optimization.messages.trialLimitReached);
          } else if (limits?.isPaid) {
            toast.error(t.collections.optimization.messages.monthlyLimitReached);
          } else {
            toast.error(t.collections.optimization.messages.trialLimitReached);
          }
          setShowUpgradeDialog(true);
          setShowProgressDialog(false);
          setOptimizing(false);
          return;
        } else if (error.message?.includes('already_optimized')) {
          toast.error(t.collections.optimization.messages.alreadyOptimizedTrial);
          setShowUpgradeDialog(true);
          setShowProgressDialog(false);
          setOptimizing(false);
          return;
        } else {
          toast.error(tf('collections.optimization.messages.optimizationError', { message: error.message || t.collections.optimization.messages.optimizationFailed }));
        }
      }
    }

    setOptimizing(false);
    setIsOptimizationComplete(true);
    setShowProgressDialog(false);
    
    // Refresh data
    await fetchCollections();
    await refreshLimits();

    // ✅ CRITICAL: Get fresh optimized data with all SEO fields
    const { data: freshCollections } = await supabase
      .from('shopify_collections')
      .select('*')
      .in('id', collectionsToOptimize.map(c => c.id));

    const optimized = (freshCollections || []).filter(c => 
      c.seo_title || c.seo_description || c.body_html
    ) as Collection[];
    
    console.log('📊 [PREVIEW] Freshly loaded optimized collections:', optimized);
    setOptimizedCollections(optimized);
    
    toast.success(t.collections.optimization.messages.optimizationSuccess.replace('{{count}}', String(successCount)));
    
    // Check if auto-sync is enabled
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: syncSettings } = await supabase
        .from('shopify_sync_settings')
        .select('export_after_optimization')
        .eq('user_id', user.id)
        .maybeSingle();

      if (syncSettings?.export_after_optimization) {
        // Auto-sync enabled - synchronize automatically without showing dialog
        console.log('🔄 Auto-sync enabled, syncing collections automatically...');
        setCollectionsToSync(optimized);
        
        // Trigger automatic sync after a small delay
        setTimeout(async () => {
          try {
            // Collections are already set via setCollectionsToSync above
            await handleSyncCollections();
          } catch (error) {
            console.error('Auto-sync error:', error);
          }
        }, 1000);
      } else {
        // Show results dialog to let user decide
        setTimeout(() => {
          setShowResultsDialog(true);
        }, 800);
      }
    } else {
      setTimeout(() => {
        setShowResultsDialog(true);
      }, 800);
    }
  };

  const handleOptimizeAllCollections = async () => {
    if (!limits?.canUseOptimizations || limits?.limitReached.optimizations) {
      toast.error(t.collections.optimization.messages.trialLimitReached);
      setShowUpgradeDialog(true);
      return;
    }

    const collectionsToOptimize = collections.filter(c => !c.optimization_count || c.optimization_count === 0);

    if (collectionsToOptimize.length === 0) {
      toast.info(t.collections.optimization.messages.allOptimized);
      return;
    }

    setOptimizing(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: collectionsToOptimize.length });

    let successCount = 0;
    const BATCH_SIZE = 3;
    for (let i = 0; i < collectionsToOptimize.length; i += BATCH_SIZE) {
      const batch = collectionsToOptimize.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (collection) => {
        try {
          const { data, error } = await supabase.functions.invoke('generate-collection-seo', {
            body: { 
              collection_ids: [collection.id],
              force: false  // Only optimize new ones
            }
          });
          
          if (!error && data?.results?.[0]?.success) {
            successCount++;
          }
        } catch (error: any) {
          console.error('❌ Error:', error);
          if (error.message?.includes('trial_limit_reached') || error.message?.includes('monthly_limit_reached')) {
            // Afficher le bon message selon le statut de l'utilisateur
            if (limits?.isTrialing) {
              toast.error(t.collections.optimization.messages.trialLimitReached);
            } else if (limits?.isPaid) {
              toast.error(t.collections.optimization.messages.monthlyLimitReached);
            } else {
              toast.error(t.collections.optimization.messages.trialLimitReached);
            }
            setShowUpgradeDialog(true);
            setShowProgressDialog(false);
            setOptimizing(false);
            return;
          } else if (error.message?.includes('already_optimized')) {
            toast.error(t.collections.optimization.messages.alreadyOptimizedTrial);
            setShowUpgradeDialog(true);
            setShowProgressDialog(false);
            setOptimizing(false);
            return;
          }
        }
      }));

      setProgress({ current: Math.min(i + BATCH_SIZE, collectionsToOptimize.length), total: collectionsToOptimize.length });
    }

    setOptimizing(false);
    setIsOptimizationComplete(true);
    setShowProgressDialog(false);
    
    // Refresh data
    await fetchCollections();
    await refreshLimits();

    // Get updated collections
    const updatedCollections = await Promise.all(
      collectionsToOptimize.map(async (c) => {
        const { data } = await supabase
          .from('shopify_collections')
          .select('*')
          .eq('id', c.id)
          .single();
        return data;
      })
    );

    const optimized = updatedCollections.filter(Boolean) as Collection[];
    setOptimizedCollections(optimized);
    
    toast.success(`✅ ${successCount} collection(s) optimisée(s)`);
    
    // Show results dialog after delay
    setTimeout(() => {
      setShowResultsDialog(true);
    }, 800);
  };

  const handleSyncCollections = async () => {
    if (collectionsToSync.length === 0) return;

    try {
      setSyncing(true);
      setShowSyncDialog(false);
      
      // Small delay to ensure dialog closes smoothly
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setShowProgressDialog(true);
      setProgress({ current: 0, total: collectionsToSync.length });

      let successCount = 0;
      let imageSyncCount = 0;
      
      for (let i = 0; i < collectionsToSync.length; i++) {
        const collection = collectionsToSync[i];
        try {
          // 1. Synchroniser les metafields SEO (title_tag, description_tag, body_html)
          const { error: seoError } = await supabase.functions.invoke('sync-seo-to-shopify', {
            body: { 
              collectionId: collection.id,
              force: true // Allow immediate sync after collection optimization
            }
          });

          if (seoError) throw seoError;
          
          // 2. Synchroniser l'image si elle existe et n'est pas en base64
          if (collection.image_url && !collection.image_url.startsWith('data:')) {
            try {
              const { error: imageError } = await supabase.functions.invoke('sync-collection-image-to-shopify', {
                body: { collection_id: collection.id }
              });
              
              if (!imageError) {
                imageSyncCount++;
              } else {
                console.warn(`Image sync skipped for collection ${collection.id}:`, imageError);
              }
            } catch (imageErr) {
              // Log but don't fail the whole sync if image fails
              console.warn(`Image sync failed for collection ${collection.id}:`, imageErr);
            }
          }
          
          successCount++;
        } catch (error: any) {
          console.error(`Error syncing collection ${collection.id}:`, error);
        }
        setProgress({ current: i + 1, total: collectionsToSync.length });
      }

      setShowProgressDialog(false);
      
      // Small delay before showing success message
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Message détaillé avec info sur les images
      if (imageSyncCount > 0) {
        toast.success(`✅ ${successCount} collection(s) synchronisée(s) (SEO + ${imageSyncCount} image(s))`);
      } else {
        toast.success(`✅ ${successCount} collection(s) synchronisée(s) avec Shopify`);
      }
      
      await fetchCollections();
    } catch (error: any) {
      console.error('Error syncing collections:', error);
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
      setCollectionsToSync([]);
    }
  };

  const handleSyncAllCollections = async () => {
    const allOptimized = collections.filter(c => c.optimization_count && c.optimization_count > 0);
    
    if (allOptimized.length === 0) {
      toast.error('Aucune collection optimisée à synchroniser');
      return;
    }

    try {
      setSyncing(true);
      setShowProgressDialog(true);
      setProgress({ current: 0, total: allOptimized.length });

      let successCount = 0;
      let imageSyncCount = 0;
      
      for (let i = 0; i < allOptimized.length; i++) {
        const collection = allOptimized[i];
        try {
          // 1. Synchroniser les metafields SEO (title_tag, description_tag, body_html)
          const { error: seoError } = await supabase.functions.invoke('sync-seo-to-shopify', {
            body: { 
              collectionId: collection.id,
              force: true
            }
          });

          if (seoError) throw seoError;
          
          // 2. Synchroniser l'image si elle existe et n'est pas en base64
          if (collection.image_url && !collection.image_url.startsWith('data:')) {
            try {
              const { error: imageError } = await supabase.functions.invoke('sync-collection-image-to-shopify', {
                body: { collection_id: collection.id }
              });
              
              if (!imageError) {
                imageSyncCount++;
              } else {
                console.warn(`Image sync skipped for collection ${collection.id}:`, imageError);
              }
            } catch (imageErr) {
              // Log but don't fail the whole sync if image fails
              console.warn(`Image sync failed for collection ${collection.id}:`, imageErr);
            }
          }
          
          successCount++;
        } catch (error: any) {
          console.error(`Error syncing collection ${collection.id}:`, error);
        }
        setProgress({ current: i + 1, total: allOptimized.length });
      }

      setShowProgressDialog(false);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Message détaillé avec info sur les images
      if (imageSyncCount > 0) {
        toast.success(`✅ ${successCount} collection(s) synchronisée(s) (SEO + ${imageSyncCount} image(s))`);
      } else {
        toast.success(`✅ ${successCount} collection(s) synchronisée(s) avec Shopify`);
      }
      
      await fetchCollections();
    } catch (error: any) {
      console.error('Error syncing all collections:', error);
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncProductCollections = async () => {
    try {
      setSyncing(true);
      const toastId = toast.loading('Synchronisation des liens produits-collections...');

      const { data, error } = await supabase.functions.invoke('sync-product-collections');

      if (error) throw error;

      toast.success(`${data.updated_count || 0} produits mis à jour`, { id: toastId });
      await fetchCollections();
    } catch (error: any) {
      console.error('Error syncing product collections:', error);
      toast.error(error.message || 'Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleImportCollectionsFromShopify = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Non authentifié");
        return;
      }

      const toastId = toast.loading("Import des collections depuis Shopify...");

      const { data, error } = await supabase.functions.invoke("import-shopify-collections", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(`✅ ${data.imported} collections importées!`, {
        id: toastId,
        description: `Smart: ${data.smart_collections}, Custom: ${data.custom_collections}`,
      });

      fetchCollections();
    } catch (error: any) {
      console.error("Error importing collections:", error);
      toast.error("Erreur lors de l'import", {
        description: error.message,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleImportCollections = async () => {
    try {
      setSyncing(true);
      const toastId = toast.loading('Import des images de collections depuis Shopify...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: storeData } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!storeData) {
        toast.error("Aucune connexion Shopify active", { id: toastId });
        return;
      }

      const { data, error } = await supabase.functions.invoke('import-content-images', {
        body: { storeId: storeData.id, types: ['collections'] }
      });

      if (error) throw error;

      const totalImported = data?.totalImported || 0;
      toast.success(`✅ ${totalImported} images importées`, { id: toastId });
      await fetchCollections();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || "Échec de l'import");
    } finally {
      setSyncing(false);
    }
  };

  const handleCloseProgressDialog = () => {
    setShowProgressDialog(false);
    setIsOptimizationComplete(false);
  };

  const handleCloseResultsDialog = () => {
    setShowResultsDialog(false);
    setOptimizedCollections([]);
    setSelectedCollections(new Set());
  };

  if (!selectedStore) {
    return (
      <Alert className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Aucune boutique sélectionnée</AlertTitle>
        <AlertDescription>
          Veuillez sélectionner une boutique dans le menu en haut pour afficher les collections.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {limits?.limitReached && !limits?.canUseOptimizations && (
        <TrialLimitBanner
          resourceType="optimisations"
          usage={limits.usage.optimizations_count}
          limit={limits.limits.max_optimizations}
        />
      )}

      <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 border-2 border-blue-200 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl md:text-3xl font-bold">{t.collections.optimization.title}</h2>
                  <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {t.seo.optimization.visionAI.badge}
                  </Badge>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
              {t.collections.optimization.description}
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{t.collections.optimization.features.intelligent}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-medium">{t.collections.optimization.features.visibility}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-purple-600" />
                <span className="font-medium">{t.collections.optimization.features.fast}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 items-center">
            <div className="text-center">
              <div className={`text-3xl md:text-4xl font-bold ${
                globalSeoScore >= 80 ? 'text-green-600' : 
                globalSeoScore >= 60 ? 'text-orange-600' : 
                'text-red-600'
              }`}>
                {globalSeoScore}/100
              </div>
              <div className="text-sm text-muted-foreground">{t.collections.optimization.globalScore}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {optimizationRate}% {t.collections.optimization.optimized}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                size="lg"
                onClick={handleGenerateAll}
                disabled={optimizing || notOptimizedCount === 0}
                className="bg-gradient-to-r from-accent via-accent to-accent/80 hover:from-accent/90 hover:via-accent hover:to-accent/70 gap-2 shadow-lg hover:shadow-accent/50 text-accent-foreground font-semibold transition-all duration-300"
              >
                <Sparkles className="w-5 h-5" />
                {t.collections.optimization.optimizeAll}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <VisionAIBanner />

      {/* Clickable Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleNotOptimizedClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-300">To Optimize</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-100">{notOptimizedCount}</p>
              <div className="flex gap-2 mt-1 text-xs text-orange-600 dark:text-orange-400">
                <span>Vides: {totalEmpty}</span>
                <span>•</span>
                <span>Shopify: {existingData}</span>
              </div>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-xs text-orange-600 dark:text-orange-300 mt-2">Cliquer pour voir</p>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleOptimizedClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">AI-Optimized</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{optimizedCount}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Générées par IA
              </p>
            </div>
            <Sparkles className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 mt-2">Cliquer pour voir</p>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={() => {
            toast.info('Fonction de synchronisation à venir');
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">To Synchronize</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{pendingSyncCount}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                AI-optimisées seulement
              </p>
            </div>
            <Upload className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">Bientôt disponible</p>
        </Card>
        
        <Card 
          className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={() => {
            setSyncFilter('synced');
            toast.info(`${syncedCount} collections synchronisées`);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Synchronized</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{syncedCount}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Synced to Shopify
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">Cliquer pour voir</p>
        </Card>
      </div>

      {/* Usage limits alert */}
      {limits && limits.isTrialing && (
        <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <AlertDescription className="text-sm">
            {limits.limitReached?.optimizations ? (
              <span className="text-orange-600 dark:text-orange-100 font-medium">
                ⚠️ Limite trial atteinte: {limits.usage.optimizations_count}/{limits.limits.max_optimizations} optimisations utilisées
              </span>
            ) : (
              <span>
                📊 Essai Gratuit: {limits.usage.optimizations_count}/{limits.limits.max_optimizations} optimisations utilisées
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Checkbox 
              checked={selectedCollections.size === paginatedCollections.length && paginatedCollections.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              {selectedCollections.size > 0 ? (
                <span className="text-primary">{selectedCollections.size} collection(s) sélectionnée(s)</span>
              ) : (
                <span className="text-muted-foreground">Sélectionner tout</span>
              )}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => handleOptimizeSelected()}
              disabled={selectedCollections.size === 0 || optimizing}
              size="sm"
            >
              <Sparkles className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Optimiser</span>
            </Button>
            <Button
              onClick={handleOptimizeAllCollections}
              disabled={optimizing || notOptimizedCount === 0}
              variant="outline"
              size="sm"
            >
              <Sparkles className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Optimiser tout</span>
            </Button>
            <Button
              onClick={() => {
                const collectionsToSync = collections.filter(c => 
                  selectedCollections.has(c.id) && c.optimization_count && c.optimization_count > 0
                );
                if (collectionsToSync.length > 0) {
                  setCollectionsToSync(collectionsToSync);
                  setShowSyncDialog(true);
                } else {
                  toast.info("Aucune collection à synchroniser");
                }
              }}
              disabled={selectedCollections.size === 0 || syncing}
              variant="outline"
              size="sm"
            >
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Synchroniser</span>
            </Button>
            <Button
              onClick={fetchCollections}
              disabled={loading}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <Card className="p-4 bg-background/50">
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
              <Input
                placeholder="Rechercher des collections par titre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-base relative z-20"
              />
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
              <SelectTrigger className="h-10 flex-1 sm:min-w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                <SelectItem value="all">Tous Statuts</SelectItem>
                <SelectItem value="optimized">Optimisées</SelectItem>
                <SelectItem value="not-optimized">Non Optimisées</SelectItem>
              </SelectContent>
            </Select>
            
            <select
              value={collectionStatusFilter}
              onChange={(e) => setCollectionStatusFilter(e.target.value)}
              className="h-10 px-4 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring flex-1 sm:min-w-[180px]"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Publié</option>
              <option value="draft">Brouillon</option>
            </select>

            <Select value={syncFilter} onValueChange={(value: SyncFilter) => setSyncFilter(value)}>
              <SelectTrigger className="h-10 flex-1 sm:min-w-[180px]">
                <SelectValue placeholder="Sync" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes Sync</SelectItem>
                <SelectItem value="synced">Synchronisées</SelectItem>
                <SelectItem value="not-synced">Non Synchronisées</SelectItem>
              </SelectContent>
            </Select>

            <Select value={qualityFilter} onValueChange={(value: any) => setQualityFilter(value as QualityFilter)}>
              <SelectTrigger className="h-12 min-w-[180px]">
                <SelectValue placeholder="Qualité SEO" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes Qualités</SelectItem>
                <SelectItem value="excellent">Excellent (≥80)</SelectItem>
                <SelectItem value="good">Bon (60-79)</SelectItem>
                <SelectItem value="medium">Moyen (40-59)</SelectItem>
                <SelectItem value="poor">Faible (&lt;40)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="flex items-center gap-2"
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
                <span className="hidden sm:inline">{viewMode === 'grid' ? 'Liste' : 'Grille'}</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="lg:hidden flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                <span>Filtres</span>
              </Button>
            </div>

            {/* Bulk Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => handleOptimizeSelected()}
                disabled={optimizing || selectedCollections.size === 0}
                className="flex items-center gap-2 bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary shadow-lg hover:shadow-primary/50 border-0 text-primary-foreground font-semibold transition-all duration-300"
              >
                <Zap className="w-4 h-4" />
                Optimiser sélection ({selectedCollections.size})
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAll}
                disabled={optimizing || notOptimizedCount === 0}
                className="flex items-center gap-2 bg-gradient-to-r from-accent via-accent to-accent/80 hover:from-accent/90 hover:via-accent hover:to-accent/70 shadow-lg hover:shadow-accent/50 border-accent/30 text-accent-foreground font-semibold transition-all duration-300"
              >
                <Sparkles className="w-4 h-4" />
                Optimiser tout
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const optimized = filteredCollections.filter(c => c.optimization_count && c.optimization_count > 0);
                  if (optimized.length === 0) {
                    toast.error('Aucune collection optimisée à synchroniser');
                    return;
                  }
                  setCollectionsToSync(optimized);
                  setShowSyncDialog(true);
                }}
                disabled={syncing || collections.filter(c => c.optimization_count && c.optimization_count > 0).length === 0}
                className="flex items-center gap-2 bg-gradient-to-r from-secondary/80 to-secondary hover:from-secondary hover:to-secondary/90 shadow-md hover:shadow-lg border-secondary/40 text-secondary-foreground font-medium transition-all duration-300"
              >
                <Upload className="w-4 h-4" />
                {t.collections.optimization.actions.syncToShopify}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncAllCollections}
                disabled={syncing || collections.filter(c => c.optimization_count && c.optimization_count > 0).length === 0}
                className="flex items-center gap-2 bg-gradient-to-r from-green-500/80 to-green-600 hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg border-green-600/40 text-white font-medium transition-all duration-300"
              >
                <Upload className="w-4 h-4" />
                {t.collections.optimization.actions.syncAll}
              </Button>
              
              <Button
                variant="outline" 
                size="icon" 
                onClick={fetchCollections}
                className="hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Filters */}
        {showMobileFilters && (
          <div className="lg:hidden mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label} ({tab.count})
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Desktop Tabs */}
      <div className="hidden lg:flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab.id)}
            className="whitespace-nowrap"
          >
            {tab.label}
            <Badge variant="secondary" className="ml-2">
              {tab.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Collections Table/Grid */}
      {(optimizing || syncing) && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {optimizing ? 'Optimisation en cours...' : 'Synchronisation en cours...'}
          </p>
        </div>
      )}

      {!optimizing && !syncing && paginatedCollections.length === 0 && filteredCollections.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune collection trouvée</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'Ajustez votre recherche ou réimportez depuis l\'onglet Intégration' : 'Importez vos collections depuis l\'onglet Intégration'}
          </p>
        </Card>
      )}

      {!optimizing && !syncing && paginatedCollections.length > 0 && viewMode === 'list' && (
        <Card className="overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedCollections.size === paginatedCollections.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-20">{t.collections.optimization.table.image}</TableHead>
                  <TableHead>{t.collections.optimization.table.title}</TableHead>
                  <TableHead className="w-24">{t.collections.optimization.table.products}</TableHead>
                  <TableHead className="min-w-[200px]">{t.collections.optimization.table.description}</TableHead>
                  <TableHead className="min-w-[400px]">Aperçu Google</TableHead>
                  <TableHead className="w-32">
                    <button
                      onClick={handleSeoScoreSortToggle}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      {t.collections.optimization.table.seoScore}
                      {seoScoreSort === 'none' && <ArrowUpDown className="w-4 h-4" />}
                      {seoScoreSort === 'asc' && <ArrowUp className="w-4 h-4" />}
                      {seoScoreSort === 'desc' && <ArrowDown className="w-4 h-4" />}
                    </button>
                  </TableHead>
                  <TableHead className="w-32">{t.collections.optimization.table.status}</TableHead>
                  <TableHead className="w-32">{t.collections.optimization.table.synced}</TableHead>
                  <TableHead className="w-24">{t.collections.optimization.table.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCollections.map((collection) => {
                  const seoScore = calculateCollectionSeoScore(collection);
                  const scoreBadge = getSeoScoreBadge(seoScore);
                  
                  return (
                    <TableRow key={collection.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedCollections.has(collection.id)}
                          onCheckedChange={() => handleSelectCollection(collection.id)}
                        />
                      </TableCell>
                      <TableCell>
                        {collection.image_url ? (
                          <img
                            src={collection.image_url}
                            alt={collection.image_alt || collection.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div 
                            className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded flex items-center justify-center cursor-pointer hover:scale-110 transition-transform border-2 border-dashed border-indigo-300"
                            onClick={() => {
                              setSelectedCollectionForImage(collection);
                              setShowImageDialog(true);
                            }}
                            title="Cliquer pour générer une image avec AI"
                          >
                            <Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium line-clamp-2">{collection.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{collection.handle}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Badge variant="secondary" className="font-semibold">
                            {collection.products_count || 0}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          {collection.body_html && collection.body_html.trim() ? (
                            <div className="flex items-start gap-2">
                              <p className="text-sm line-clamp-2 text-muted-foreground flex-1">
                                {collection.body_html.replace(/<[^>]*>/g, '').substring(0, 150)}...
                              </p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => {
                                  setSelectedCollectionForDescription(collection);
                                  setShowGenerateDescriptionDialog(true);
                                }}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto py-1 px-2 text-sm text-muted-foreground/70 italic hover:text-primary"
                              onClick={() => {
                                setSelectedCollectionForDescription(collection);
                                setShowGenerateDescriptionDialog(true);
                              }}
                            >
                              <Sparkles className="w-3 h-3 mr-1" />
                              Ajouter une description...
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {collection.seo_title && collection.seo_description ? (
                          <GoogleSearchPreview
                            title={collection.seo_title}
                            description={collection.seo_description}
                            url={buildPublicUrl(`/collections/${collection.handle}`, storeDomain)}
                            compact
                          />
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Not optimized
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const scoreBadge = getSeoScoreBadge(seoScore);
                              return (
                                <span className={`text-2xl font-bold ${scoreBadge.color}`}>
                                  {Math.round(seoScore)}%
                                </span>
                              );
                            })()}
                            {collection.optimization_count && collection.optimization_count > 0 && (
                              <Sparkles className="w-3 h-3 text-primary" />
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-muted-foreground">{scoreBadge.label}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={collection.optimization_count && collection.optimization_count > 0 ? 'default' : 'secondary'}>
                          {collection.optimization_count && collection.optimization_count > 0 ? (
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
                        {collection.last_synced_at ? (
                          <Badge variant="default" className="bg-green-600 text-white">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Synced
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
                              // Optimiser directement cette collection
                              handleOptimizeSelected([collection.id]);
                            }}
                            disabled={optimizing}
                            title="Optimize"
                            className="bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary shadow-lg hover:shadow-primary/50 text-primary-foreground font-semibold transition-all duration-300"
                          >
                            <Zap className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedCollectionForImage(collection);
                              setShowImageDialog(true);
                            }}
                            title="Add Image"
                            className="hover:bg-purple-50"
                          >
                            <ImageIcon className="w-5 h-5 text-purple-600" />
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
      )}

      {!optimizing && !syncing && paginatedCollections.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedCollections.map((collection) => {
            const seoScore = calculateCollectionSeoScore(collection);
            const scoreBadge = getSeoScoreBadge(seoScore);
            
            return (
              <Card key={collection.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <Checkbox
                    checked={selectedCollections.has(collection.id)}
                    onCheckedChange={() => handleSelectCollection(collection.id)}
                  />
                  {collection.image_url ? (
                    <img
                      src={collection.image_url}
                      alt={collection.image_alt || collection.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold line-clamp-1">{collection.title}</h3>
                    <p className="text-xs text-muted-foreground">{collection.handle}</p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {collection.products_count || 0} produit{(collection.products_count || 0) > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Score SEO</span>
                    <div className="flex flex-col items-end gap-1">
                      {(() => {
                        const scoreBadge = getSeoScoreBadge(seoScore);
                        return (
                          <span className={`text-xl font-bold ${scoreBadge.color}`}>
                            {Math.round(seoScore)}%
                          </span>
                        );
                      })()}
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-muted-foreground">{scoreBadge.label}</span>
                      </div>
                    </div>
                  </div>
                  
                  {collection.seo_title && (
                    <div>
                      <p className="text-xs text-muted-foreground">SEO Title</p>
                      <p className="text-sm line-clamp-1">{collection.seo_title}</p>
                    </div>
                  )}
                  
                  {collection.seo_description && (
                    <div>
                      <p className="text-xs text-muted-foreground">SEO Description</p>
                      <p className="text-sm line-clamp-2">{collection.seo_description}</p>
                    </div>
                  )}

                  {collection.optimization_count && collection.optimization_count > 0 && (
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <Sparkles className="w-3 h-3" />
                      Optimisé {collection.optimization_count}x
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedCollectionForImage(collection);
                      setShowImageDialog(true);
                    }}
                  >
                    <ImageIcon className="w-3 h-3 mr-1" />
                    Image
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.info("Détails à venir")}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={previousPage}
                  className={!hasPreviousPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1;
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
                  return <PaginationEllipsis key={page} />;
                }
                return null;
              })}
              
              <PaginationItem>
                <PaginationNext
                  onClick={nextPage}
                  className={!hasNextPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Dialogs */}
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
        items={optimizedCollections.map(c => ({
          id: c.id,
          title: c.title,
          handle: c.handle,  // Add handle for correct URL generation
          seo_title: c.seo_title || '',
          seo_description: c.seo_description || '',
          body_html: c.body_html || '',
          image_url: c.image_url || ''
        }))}
        onSyncClick={() => {
          setCollectionsToSync(optimizedCollections);
          setShowResultsDialog(false);
          setShowSyncDialog(true);
        }}
        onClose={handleCloseResultsDialog}
      />

      <SyncConfirmationDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        type="seo"
        itemCount={collectionsToSync.length}
        onConfirm={handleSyncCollections}
        loading={syncing}
      />

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType="optimizations"
        usage={limits?.usage.optimizations_count}
        limit={limits?.limits.max_optimizations}
      />

      <ReoptimizeConfirmDialog
        open={showReoptimizeDialog}
        onOpenChange={setShowReoptimizeDialog}
        collections={pendingOptimizationCollections}
        onConfirm={() => executeOptimization(pendingOptimizationCollections)}
      />

      {selectedCollectionForDescription && (
        <GenerateDescriptionDialog
          open={showGenerateDescriptionDialog}
          onOpenChange={setShowGenerateDescriptionDialog}
          collectionId={selectedCollectionForDescription.id}
          collectionTitle={selectedCollectionForDescription.title}
          collectionHandle={selectedCollectionForDescription.handle}
          onSuccess={() => fetchCollections()}
        />
      )}

      {selectedCollectionForImage && (
        <CollectionImageDialog
          open={showImageDialog}
          onOpenChange={setShowImageDialog}
          collection={selectedCollectionForImage}
          onImageUpdated={fetchCollections}
        />
      )}
    </div>
  );
}
