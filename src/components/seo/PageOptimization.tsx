import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Search, Loader2, FileText, Sparkles, CheckCircle, Upload, Clock, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { SeoConfidenceBadge } from './SeoConfidenceBadge';
import { calculateDetailedSeoScore } from '@/lib/seoQuality';
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

interface ShopifyPage {
  id: string;
  title: string;
  handle: string;
  body_html: string;
  seo_title: string | null;
  seo_description: string | null;
  optimized: boolean;
  last_synced_at?: string | null;
}

type StatusFilter = 'all' | 'optimized' | 'not-optimized';
type SyncFilter = 'all' | 'synced' | 'not-synced';
type QualityFilter = 'all' | 'excellent' | 'good' | 'medium' | 'poor';

export function PageOptimization() {
  const [pages, setPages] = useState<ShopifyPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importingPages, setImportingPages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [syncFilter, setSyncFilter] = useState<SyncFilter>('all');
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all');

  useEffect(() => {
    fetchPages();
  }, []);

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

      const { data, error } = await supabase
        .from('shopify_pages')
        .select('*')
        .eq('user_id', user.id)
        .order('published_at', { ascending: false });

      if (error) throw error;
      
      // Map Shopify pages to our interface
      const mappedPages: ShopifyPage[] = (data || []).map((page: any) => ({
        id: page.id,
        title: page.title,
        handle: page.handle,
        body_html: page.body_html || '',
        seo_title: page.seo_title,
        seo_description: page.seo_description,
        optimized: !!(page.seo_title && page.seo_description),
        last_synced_at: page.last_synced_at
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
        page.optimized ? 1 : 0
      ).score;

      if (qualityFilter === 'excellent' && score < 80) return false;
      if (qualityFilter === 'good' && (score < 60 || score >= 80)) return false;
      if (qualityFilter === 'medium' && (score < 40 || score >= 60)) return false;
      if (qualityFilter === 'poor' && score >= 40) return false;
    }

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return page.title.toLowerCase().includes(term);
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

  const handleOptimizeSelected = async () => {
    if (selectedPages.size === 0) return;
    
    setOptimizing(true);
    const pageIds = Array.from(selectedPages);
    let successCount = 0;
    
    for (let i = 0; i < pageIds.length; i++) {
      try {
        const { error } = await supabase.functions.invoke('generate-page-seo', {
          body: { pageId: pageIds[i], force: true }
        });
        
        if (error) throw error;
        
        successCount++;
        toast.success(`Page ${i + 1}/${pageIds.length} optimized`);
      } catch (error) {
        console.error('Error optimizing page:', error);
        toast.error(`Error for page ${i + 1}`);
      }
    }
    
    setOptimizing(false);
    setSelectedPages(new Set());
    fetchPages();
    
    if (successCount === pageIds.length) {
      toast.success('🎉 All pages optimized!');
    } else {
      toast.warning(`${successCount}/${pageIds.length} pages optimized`);
    }
  };

  const handleOptimizeAll = async () => {
    const pagesToOptimize = pages.filter(p => !p.optimized);
    if (pagesToOptimize.length === 0) {
      toast.info('All pages are already optimized');
      return;
    }
    
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
    fetchPages();
  };

  const handleSyncAll = async () => {
    const pagesToSync = pages.filter(p => p.optimized);
    if (pagesToSync.length === 0) {
      toast.info('No optimized pages to sync');
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
    
    const pageIds = Array.from(selectedPages);
    setSyncing(true);
    let successCount = 0;
    
    for (const pageId of pageIds) {
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
    toast.success(`${successCount}/${pageIds.length} pages synchronized!`);
    fetchPages();
  };

  const handleOptimizePage = async (pageId: string, forceReoptimize = false) => {
    try {
      setOptimizing(true);
      const { error } = await supabase.functions.invoke('generate-page-seo', {
        body: { pageId, force: forceReoptimize }
      });
      
      if (error) throw error;
      toast.success('Page optimized!');
      fetchPages();
    } catch (error: any) {
      toast.error(error.message || 'Error');
    } finally {
      setOptimizing(false);
    }
  };

  const handleSyncPage = async (pageId: string) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate global SEO score for pages
  const globalPageSeoScore = pages.length > 0 
    ? Math.round(
        pages.reduce((sum, p) => {
          const score = calculateDetailedSeoScore(
            p.seo_title,
            p.seo_description,
            false,
            true
          );
          return sum + score.score;
        }, 0) / pages.length
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Hero Banner with Stats - Modern Design */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 border-2 border-indigo-200 dark:border-indigo-800 p-8">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00ek0yNiAyNGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6TTQ2IDQ0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] animate-[pulse_4s_ease-in-out_infinite]"></div>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 dark:text-indigo-100">
                  Pages SEO
                </h2>
                <p className="text-indigo-700 dark:text-indigo-300 text-sm">Optimisation intelligente IA</p>
              </div>
            </div>
            <p className="text-indigo-800 dark:text-indigo-200 text-lg max-w-2xl leading-relaxed">
              Transformez vos pages Shopify en machines de conversion SEO. IA génère des meta titles et descriptions optimisés pour maximiser votre visibilité.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white border border-white/20">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium text-sm">SEO Automatisé</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white border border-white/20">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium text-sm">Pages Complètes</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white border border-white/20">
                <Upload className="w-4 h-4" />
                <span className="font-medium text-sm">Sync Shopify</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 items-center bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="text-center">
              <div className={`text-5xl font-bold ${
                globalPageSeoScore >= 70 ? 'text-green-300' : 
                globalPageSeoScore >= 40 ? 'text-yellow-300' : 
                'text-red-300'
              }`}>
                {globalPageSeoScore}
              </div>
              <div className="text-white/80 text-sm font-medium">Score SEO Global</div>
              <Progress value={globalPageSeoScore} className="mt-2 h-2 bg-white/20" />
            </div>
            <Button
              size="lg"
              onClick={handleOptimizeAll}
              disabled={optimizing || pages.filter(p => !p.optimized).length === 0}
              className="bg-white text-purple-600 hover:bg-white/90 gap-2 shadow-xl font-semibold px-6 py-3 text-base"
            >
              {optimizing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Optimisation...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Optimiser Tout
                  <FileText className="w-5 h-5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Vision AI Banner */}
      <VisionAIBanner />

      {/* Stats Cards - Enhanced Design */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  onClick={handleOptimizeSelected}
                  disabled={optimizing || selectedPages.size === 0}
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg border-0"
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
                <TableHead className="min-w-[200px]">SEO Title</TableHead>
                <TableHead className="min-w-[250px]">SEO Description</TableHead>
                <TableHead className="w-32">SEO Score</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-40">Sync Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
              <TableBody>
                {filteredPages.map((page) => {
                  const seoScore = calculateDetailedSeoScore(
                    page.seo_title,
                    page.seo_description,
                    false,
                    true
                  );
                  const getSeoScoreBadge = (score: number) => {
                    if (score >= 80) return { variant: 'default' as const, color: 'text-green-600' };
                    if (score >= 60) return { variant: 'secondary' as const, color: 'text-blue-600' };
                    if (score >= 40) return { variant: 'outline' as const, color: 'text-yellow-600' };
                    return { variant: 'outline' as const, color: 'text-red-600' };
                  };
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
                        <div className="max-w-[200px]">
                          {page.seo_title ? (
                            <p className="text-sm line-clamp-2">{page.seo_title}</p>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Not optimized
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[250px]">
                          {page.seo_description ? (
                            <p className="text-sm line-clamp-2 text-muted-foreground">{page.seo_description}</p>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Not optimized
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={scoreBadge.variant}>
                          <span className={scoreBadge.color}>{seoScore.score}/100</span>
                        </Badge>
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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700 cursor-help">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Synced
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  Last synced: {new Date(page.last_synced_at).toLocaleString()}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : page.optimized ? (
                          <Badge variant="secondary" className="bg-yellow-600 text-white">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Not synced
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOptimizePage(page.id, page.optimized)}
                            disabled={optimizing}
                            title={page.optimized ? "Re-optimize" : "Optimize"}
                            className="hover:bg-blue-50"
                          >
                            <Sparkles className="w-5 h-5 text-blue-600" />
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
        </Card>
      )}
    </div>
  );
}