import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { calculateDescriptionScore } from '@/lib/seoQuality';
import { 
  ProgressDialog, 
  ResultsDialog, 
  SyncConfirmationDialog 
} from './SeoWorkflowDialogs';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CollectionImageDialog } from './CollectionImageDialog';
import { VisionAIBanner } from './VisionAIBanner';
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
  ArrowDown
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<QuickFilterTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [seoScoreSort, setSeoScoreSort] = useState<SeoScoreSort>('none');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [syncFilter, setSyncFilter] = useState<SyncFilter>('all');
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all');
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
  const { limits, loading: limitsLoading, refresh: refreshLimits } = useUsageLimits();

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      
      // Récupérer les collections avec le compteur de produits
      const { data: collectionsData, error } = await supabase
        .from('shopify_collections')
        .select('*')
        .gt('products_count', 0) // Filtrer uniquement les collections avec au moins 1 produit
        .order('title', { ascending: true });

      if (error) throw error;

      setCollections(collectionsData || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error('Failed to load collections');
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
          const titleScore = calculateDescriptionScore(c.title);
          const descScore = calculateDescriptionScore(c.body_html?.substring(0, 160) || '');
          return sum + (titleScore.score + descScore.score) / 2;
        }, 0) / collectionsNotOptimized.length
      )
    : 0;

  const scoreWithAI = collectionsOptimized.length > 0
    ? Math.round(
        collectionsOptimized.reduce((sum, c) => {
          const titleScore = calculateDescriptionScore(c.seo_title || c.title);
          const descScore = calculateDescriptionScore(c.seo_description || c.body_html?.substring(0, 160) || '');
          return sum + (titleScore.score + descScore.score) / 2;
        }, 0) / collectionsOptimized.length
      )
    : 0;

  const globalSeoScore = collections.length > 0
    ? Math.round((0.3 * scoreWithoutAI) + (0.7 * scoreWithAI))
    : 0;

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

      if (qualityFilter === 'excellent' && score < 80) return false;
      if (qualityFilter === 'good' && (score < 60 || score >= 80)) return false;
      if (qualityFilter === 'medium' && (score < 40 || score >= 60)) return false;
      if (qualityFilter === 'poor' && score >= 40) return false;
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

  const tabs = [
    { id: 'all' as QuickFilterTab, label: 'Toutes', count: collections.length },
    { id: 'not-optimized' as QuickFilterTab, label: 'À optimiser', count: notOptimizedCount },
    { id: 'optimized' as QuickFilterTab, label: 'Optimisées', count: optimizedCount },
  ];

  // Clickable stats handlers
  const handleNotOptimizedClick = () => {
    setActiveTab('not-optimized');
    toast.info(`${notOptimizedCount} collections à optimiser`);
  };

  const handleOptimizedClick = () => {
    setActiveTab('optimized');
    toast.info(`${optimizedCount} collections optimisées`);
  };

  const handleGenerateAll = () => {
    if (notOptimizedCount === 0) {
      toast.info('Toutes les collections sont déjà optimisées');
      return;
    }
    setActiveTab('not-optimized');
    setTimeout(() => {
      handleOptimizeAllCollections();
    }, 100);
  };

  const handleSelectAll = () => {
    if (selectedCollections.size === sortedCollections.length) {
      setSelectedCollections(new Set());
    } else {
      setSelectedCollections(new Set(sortedCollections.map((c) => c.id)));
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

  const handleOptimizeSelected = async () => {
    if (!limits?.canUseOptimizations || limits?.limitReached.optimizations) {
      toast.error('Limite trial atteinte pour les optimisations SEO');
      setShowUpgradeDialog(true);
      return;
    }

    const collectionsToOptimize = collections.filter(c => selectedCollections.has(c.id));

    if (collectionsToOptimize.length === 0) {
      toast.info('Aucune collection sélectionnée');
      return;
    }

    // Validate collection IDs are proper UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = collectionsToOptimize.filter(c => !uuidRegex.test(c.id));
    
    if (invalidIds.length > 0) {
      console.error('❌ Invalid collection IDs detected:', invalidIds.map(c => ({ id: c.id, title: c.title })));
      toast.error('Erreur: IDs de collection invalides détectés. Veuillez rafraîchir la page.');
      return;
    }

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
          toast.error(`Erreur: ${error.message || 'Échec de l\'optimisation'}`);
          throw error;
        }
        
        // Check if optimization was successful
        if (data?.results?.[0]?.success) {
          successCount++;
        } else {
          const errorMsg = data?.results?.[0]?.error || 'Échec de l\'optimisation';
          console.warn(`⚠️ Collection ${collectionsToOptimize[i].id} - ${errorMsg}`);
          toast.warning(`Collection "${collectionsToOptimize[i].title}": ${errorMsg}`);
        }
        
        setProgress({ current: i + 1, total: collectionsToOptimize.length });
      } catch (error: any) {
        console.error('❌ Error optimizing collection:', error);
        
        // Handle specific error types
        if (error.message?.includes('trial_limit_reached')) {
          toast.error('Limite d\'essai atteinte. Passez à un plan payant pour continuer.');
          setShowUpgradeDialog(true);
          setShowProgressDialog(false);
          setOptimizing(false);
          return;
        } else if (error.message?.includes('monthly_limit_reached')) {
          toast.error('Limite mensuelle d\'optimisations atteinte. Passez à un plan supérieur.');
          setShowProgressDialog(false);
          setOptimizing(false);
          return;
        } else if (error.message?.includes('already_optimized')) {
          toast.error('Limite d\'essai atteinte. Cette collection est déjà optimisée.');
          setShowUpgradeDialog(true);
          setShowProgressDialog(false);
          setOptimizing(false);
          return;
        } else {
          toast.error(`Erreur: ${error.message || 'Échec de l\'optimisation'}`);
        }
      }
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
    
    // Check if auto-sync is enabled
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: syncSettings } = await supabase
        .from('shopify_sync_settings')
        .select('export_after_optimization')
        .eq('user_id', user.id)
        .maybeSingle();

      if (syncSettings?.export_after_optimization) {
        // Auto-sync enabled - show sync dialog after delay
        setTimeout(() => {
          setCollectionsToSync(optimized);
          setShowSyncDialog(true);
        }, 800);
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
      toast.error('Limite trial atteinte pour les optimisations SEO');
      setShowUpgradeDialog(true);
      return;
    }

    const collectionsToOptimize = collections.filter(c => !c.optimization_count || c.optimization_count === 0);

    if (collectionsToOptimize.length === 0) {
      toast.info('Toutes les collections sont déjà optimisées');
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
          if (error.message?.includes('trial_limit_reached')) {
            toast.error('Limite d\'essai atteinte. Passez à un plan payant.');
            setShowUpgradeDialog(true);
            setShowProgressDialog(false);
            setOptimizing(false);
            return;
          } else if (error.message?.includes('monthly_limit_reached')) {
            toast.error('Limite mensuelle atteinte. Passez à un plan supérieur.');
            setShowProgressDialog(false);
            setOptimizing(false);
            return;
          } else if (error.message?.includes('already_optimized')) {
            toast.error('Limite d\'essai atteinte. Certaines collections sont déjà optimisées.');
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
      for (let i = 0; i < collectionsToSync.length; i++) {
        const collection = collectionsToSync[i];
        try {
          const { error } = await supabase.functions.invoke('sync-seo-to-shopify', {
            body: { collectionId: collection.id }
          });

          if (error) throw error;
          successCount++;
        } catch (error: any) {
          console.error(`Error syncing collection ${collection.id}:`, error);
        }
        setProgress({ current: i + 1, total: collectionsToSync.length });
      }

      setShowProgressDialog(false);
      
      // Small delay before showing success message
      await new Promise(resolve => setTimeout(resolve, 200));
      
      toast.success(`✅ ${successCount} collection(s) synchronisée(s) avec Shopify`);
      await fetchCollections();
    } catch (error: any) {
      console.error('Error syncing collections:', error);
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
      setCollectionsToSync([]);
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

  const calculateCollectionSeoScore = (collection: Collection): number => {
    const titleScore = calculateDescriptionScore(collection.seo_title || collection.title);
    const descScore = calculateDescriptionScore(collection.seo_description || collection.body_html?.substring(0, 160) || '');
    
    // Base score from title and description
    let score = Math.round((titleScore.score + descScore.score) / 2);
    
    // Bonus for AI optimization
    if (collection.optimization_count && collection.optimization_count > 0) {
      score = Math.min(100, score + 10); // +10 bonus for AI optimization
    }
    
    return score;
  };

  const getSeoScoreBadge = (score: number) => {
    if (score >= 80) return { variant: 'default' as const, label: 'Excellent', color: 'text-green-600' };
    if (score >= 60) return { variant: 'secondary' as const, label: 'Bon', color: 'text-blue-600' };
    if (score >= 40) return { variant: 'outline' as const, label: 'Moyen', color: 'text-yellow-600' };
    return { variant: 'outline' as const, label: 'Faible', color: 'text-red-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 border-2 border-blue-200 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl md:text-3xl font-bold">Collection SEO</h2>
                  <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Vision AI
                  </Badge>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
              Optimisez vos collections Shopify avec l'IA. Générez des titres, descriptions SEO et images avec <span className="font-semibold">Vision AI</span>
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="font-medium">SEO Intelligent</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-medium">+40% visibilité</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-purple-600" />
                <span className="font-medium">Génération rapide</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 items-center">
            <div className="text-center">
              <div className={`text-3xl md:text-4xl font-bold ${
                globalSeoScore >= 80 ? 'text-green-600' : 
                globalSeoScore >= 70 ? 'text-orange-600' : 
                'text-red-600'
              }`}>
                {globalSeoScore}/100
              </div>
              <div className="text-sm text-muted-foreground">Score SEO Global</div>
              <div className="text-xs text-muted-foreground mt-1">
                30% non-optimisé + 70% IA-optimisé
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {optimizationRate}% optimisé
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
                Optimiser tout
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Vision AI Banner */}
      <VisionAIBanner />

      {/* Clickable Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200"
          onClick={handleNotOptimizedClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">To Optimize</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{notOptimizedCount}</p>
              <div className="flex gap-2 mt-1 text-xs text-orange-600 dark:text-orange-400">
                <span>Vides: {totalEmpty}</span>
                <span>•</span>
                <span>Shopify: {existingData}</span>
              </div>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">Cliquer pour voir</p>
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
            {limits.limitReached.optimizations ? (
              <span className="text-orange-900 dark:text-orange-100 font-medium">
                ⚠️ Limite trial atteinte: {limits.usage.optimizations_count}/{limits.limits.max_optimizations} optimisations utilisées
              </span>
            ) : (
              <span>
                📊 Essai gratuit: {limits.usage.optimizations_count}/{limits.limits.max_optimizations} optimisations utilisées
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Controls Section */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher des collections par titre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>

            <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
              <SelectTrigger className="h-12 min-w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous Statuts</SelectItem>
                <SelectItem value="optimized">Optimisées</SelectItem>
                <SelectItem value="not-optimized">Non Optimisées</SelectItem>
              </SelectContent>
            </Select>

            <Select value={syncFilter} onValueChange={(value: SyncFilter) => setSyncFilter(value)}>
              <SelectTrigger className="h-12 min-w-[180px]">
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
                onClick={handleOptimizeSelected}
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
                Sync à Shopify
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

      {!optimizing && !syncing && sortedCollections.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune collection trouvée</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'Ajustez votre recherche ou réimportez depuis l\'onglet Intégration' : 'Importez vos collections depuis l\'onglet Intégration'}
          </p>
        </Card>
      )}

      {!optimizing && !syncing && sortedCollections.length > 0 && viewMode === 'list' && (
        <Card className="overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedCollections.size === sortedCollections.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-20">Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-24">Produits</TableHead>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead className="min-w-[200px]">SEO Title</TableHead>
                  <TableHead className="min-w-[250px]">SEO Description</TableHead>
                  <TableHead className="w-32">
                    <button
                      onClick={handleSeoScoreSortToggle}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      SEO Score
                      {seoScoreSort === 'none' && <ArrowUpDown className="w-4 h-4" />}
                      {seoScoreSort === 'asc' && <ArrowUp className="w-4 h-4" />}
                      {seoScoreSort === 'desc' && <ArrowDown className="w-4 h-4" />}
                    </button>
                  </TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-32">Synced</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCollections.map((collection) => {
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
                          {collection.body_html ? (
                            <p className="text-sm line-clamp-2 text-muted-foreground" dangerouslySetInnerHTML={{ __html: collection.body_html.substring(0, 150) + '...' }} />
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Pas de description
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          {collection.seo_title ? (
                            <p className="text-sm line-clamp-2">{collection.seo_title}</p>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Not optimized
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[250px]">
                          {collection.seo_description ? (
                            <p className="text-sm line-clamp-2 text-muted-foreground">{collection.seo_description}</p>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Not optimized
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={scoreBadge.variant}>
                            <span className={scoreBadge.color}>{seoScore}/100</span>
                          </Badge>
                          {collection.optimization_count && collection.optimization_count > 0 && (
                            <Sparkles className="w-3 h-3 text-primary" />
                          )}
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
                          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
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
                            variant="ghost"
                            onClick={async () => {
                              setOptimizing(true);
                              try {
                                const { data, error } = await supabase.functions.invoke('generate-collection-seo', {
                                  body: { collection_ids: [collection.id] }
                                });
                                
                                if (error) throw error;
                                
                                // Fetch updated collection
                                const { data: updatedCollection } = await supabase
                                  .from('shopify_collections')
                                  .select('*')
                                  .eq('id', collection.id)
                                  .single();
                                
                                if (updatedCollection) {
                                  setOptimizedCollections([updatedCollection]);
                                  setShowResultsDialog(true);
                                  toast.success('Collection optimisée !');
                                }
                                
                                await fetchCollections();
                                await refreshLimits();
                              } catch (error: any) {
                                toast.error(error.message || 'Erreur lors de l\'optimisation');
                              } finally {
                                setOptimizing(false);
                              }
                            }}
                            disabled={optimizing}
                            title="Optimize"
                            className="hover:bg-blue-50"
                          >
                            <Sparkles className="w-5 h-5 text-blue-600" />
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

      {!optimizing && !syncing && sortedCollections.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCollections.map((collection) => {
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
                    <Badge variant={scoreBadge.variant}>
                      <span className={scoreBadge.color}>{seoScore}/100</span>
                    </Badge>
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
