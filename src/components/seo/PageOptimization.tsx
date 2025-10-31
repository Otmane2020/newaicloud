import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Search, 
  Loader2, 
  FileText, 
  Sparkles, 
  CheckCircle, 
  Upload, 
  Clock,
  Filter,
  RefreshCw,
  Download,
  BarChart3,
  Eye,
  Edit3,
  MoreVertical,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { SeoConfidenceBadge } from './SeoConfidenceBadge';
import { calculateDetailedSeoScore } from '@/lib/seoQuality';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ShopifyPage {
  id: string;
  title: string;
  handle: string;
  body_html: string;
  seo_title: string | null;
  seo_description: string | null;
  optimized: boolean;
  last_synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

type FilterStatus = 'all' | 'optimized' | 'not-optimized' | 'synced' | 'not-synced';
type SortField = 'title' | 'seo_score' | 'updated_at' | 'created_at';
type SortOrder = 'asc' | 'desc';

export function PageOptimization() {
  const [pages, setPages] = useState<ShopifyPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importingPages, setImportingPages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [bulkAction, setBulkAction] = useState<'optimize' | 'sync' | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      
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
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      const mappedPages: ShopifyPage[] = (data || []).map((page: any) => ({
        id: page.id,
        title: page.title,
        handle: page.handle,
        body_html: page.body_html || '',
        seo_title: page.seo_title,
        seo_description: page.seo_description,
        optimized: !!(page.seo_title && page.seo_description),
        last_synced_at: page.last_synced_at,
        created_at: page.created_at,
        updated_at: page.updated_at
      }));
      
      setPages(mappedPages);
    } catch (error) {
      console.error('Error fetching pages:', error);
      toast.error('Error loading pages');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedPages = useMemo(() => {
    let filtered = pages.filter((page) => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          page.title.toLowerCase().includes(term) ||
          page.handle.toLowerCase().includes(term) ||
          (page.seo_title && page.seo_title.toLowerCase().includes(term)) ||
          (page.seo_description && page.seo_description.toLowerCase().includes(term));
        if (!matchesSearch) return false;
      }

      // Status filter
      switch (statusFilter) {
        case 'optimized':
          return page.optimized;
        case 'not-optimized':
          return !page.optimized;
        case 'synced':
          return !!page.last_synced_at;
        case 'not-synced':
          return page.optimized && !page.last_synced_at;
        default:
          return true;
      }
    });

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'seo_score') {
        aValue = calculateDetailedSeoScore(a.seo_title, a.seo_description, false, true).score;
        bValue = calculateDetailedSeoScore(b.seo_title, b.seo_description, false, true).score;
      }

      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [pages, searchTerm, statusFilter, sortField, sortOrder]);

  const handleSelectAll = () => {
    if (selectedPages.size === filteredAndSortedPages.length) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(filteredAndSortedPages.map((p) => p.id)));
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleImportPages = async () => {
    try {
      setImportingPages(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not connected');
        return;
      }
      
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

  const handleBulkAction = async () => {
    if (selectedPages.size === 0 || !bulkAction) return;
    
    const pageIds = Array.from(selectedPages);
    
    if (bulkAction === 'optimize') {
      setOptimizing(true);
      let successCount = 0;
      
      for (let i = 0; i < pageIds.length; i++) {
        try {
          const { error } = await supabase.functions.invoke('generate-page-seo', {
            body: { pageId: pageIds[i] }
          });
          
          if (error) throw error;
          successCount++;
          
          // Update progress in toast
          if (pageIds.length > 1) {
            toast.loading(`Optimizing ${i + 1}/${pageIds.length} pages...`, { id: 'bulk-optimize' });
          }
        } catch (error) {
          console.error('Error optimizing page:', error);
        }
      }
      
      setOptimizing(false);
      setBulkAction(null);
      setSelectedPages(new Set());
      fetchPages();
      
      toast.success(`🎉 ${successCount}/${pageIds.length} pages optimized!`, { id: 'bulk-optimize' });
    } else if (bulkAction === 'sync') {
      setSyncing(true);
      let successCount = 0;
      
      for (let i = 0; i < pageIds.length; i++) {
        try {
          const { error } = await supabase.functions.invoke('sync-page-to-shopify', {
            body: { pageId: pageIds[i] }
          });
          
          if (error) throw error;
          successCount++;
          
          if (pageIds.length > 1) {
            toast.loading(`Syncing ${i + 1}/${pageIds.length} pages...`, { id: 'bulk-sync' });
          }
        } catch (error) {
          console.error('Error syncing page:', error);
        }
      }
      
      setSyncing(false);
      setBulkAction(null);
      setSelectedPages(new Set());
      fetchPages();
      
      toast.success(`🔄 ${successCount}/${pageIds.length} pages synchronized!`, { id: 'bulk-sync' });
    }
  };

  const handleOptimizePage = async (pageId: string) => {
    try {
      setOptimizing(true);
      const { error } = await supabase.functions.invoke('generate-page-seo', {
        body: { pageId }
      });
      
      if (error) throw error;
      toast.success('Page optimized!');
      fetchPages();
    } catch (error: any) {
      toast.error(error.message || 'Error optimizing page');
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
      toast.error(error.message || 'Error syncing page');
    } finally {
      setSyncing(false);
    }
  };

  const handlePreviewPage = (page: ShopifyPage) => {
    // Implement page preview logic
    toast.info(`Previewing: ${page.title}`);
  };

  const handleEditPage = (pageId: string) => {
    // Implement edit page logic
    toast.info(`Editing page: ${pageId}`);
  };

  // Statistics
  const stats = useMemo(() => {
    const total = pages.length;
    const optimized = pages.filter(p => p.optimized).length;
    const synced = pages.filter(p => p.last_synced_at).length;
    const optimizationProgress = total > 0 ? (optimized / total) * 100 : 0;
    const syncProgress = optimized > 0 ? (synced / optimized) * 100 : 0;

    return { total, optimized, synced, optimizationProgress, syncProgress };
  }, [pages]);

  const globalPageSeoScore = useMemo(() => {
    if (pages.length === 0) return 0;
    
    const totalScore = pages.reduce((sum, p) => {
      const score = calculateDetailedSeoScore(
        p.seo_title,
        p.seo_description,
        false,
        true
      );
      return sum + score.score;
    }, 0);
    
    return Math.round(totalScore / pages.length);
  }, [pages]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading pages...</p>
      </div>
    );
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 opacity-50" />;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Hero Banner */}
      <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950 dark:via-pink-950 dark:to-rose-950 border-2 border-purple-200">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-purple-900 rounded-lg">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-3xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Page Optimization
                  </CardTitle>
                  <CardDescription className="text-lg">
                    Optimize SEO for all your Shopify pages with AI-powered meta titles and descriptions
                  </CardDescription>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2 text-sm bg-white/50 dark:bg-purple-900/50 px-3 py-1 rounded-full">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">AI-Powered SEO</span>
                </div>
                <div className="flex items-center gap-2 text-sm bg-white/50 dark:bg-purple-900/50 px-3 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4 text-pink-600" />
                  <span className="font-medium">Bulk Operations</span>
                </div>
                <div className="flex items-center gap-2 text-sm bg-white/50 dark:bg-purple-900/50 px-3 py-1 rounded-full">
                  <Upload className="w-4 h-4 text-rose-600" />
                  <span className="font-medium">Auto Sync</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-4 items-center">
              <div className="text-center space-y-2">
                <div className={`text-4xl font-bold ${
                  globalPageSeoScore >= 70 ? 'text-green-600' : 
                  globalPageSeoScore >= 40 ? 'text-orange-600' : 
                  'text-red-600'
                }`}>
                  {globalPageSeoScore}/100
                </div>
                <div className="text-sm text-muted-foreground">Average SEO Score</div>
                <Progress value={globalPageSeoScore} className="w-32" />
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const pagesToOptimize = pages.filter(p => !p.optimized);
                    if (pagesToOptimize.length === 0) {
                      toast.info('All pages are already optimized');
                      return;
                    }
                    setSelectedPages(new Set(pagesToOptimize.map(p => p.id)));
                    setBulkAction('optimize');
                  }}
                  disabled={pages.filter(p => !p.optimized).length === 0}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Optimize All
                </Button>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={fetchPages}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh pages</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Enhanced Stats Cards with Progress */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-0">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Pages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="p-4 border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-0">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.optimized}</p>
                <p className="text-sm text-muted-foreground">Optimized</p>
                <Progress value={stats.optimizationProgress} className="mt-1 h-1" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="p-4 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-0">
            <div className="flex items-center gap-3">
              <Upload className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.synced}</p>
                <p className="text-sm text-muted-foreground">Synced</p>
                <Progress value={stats.syncProgress} className="mt-1 h-1" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="p-4 border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-0">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.total - stats.optimized}</p>
                <p className="text-sm text-muted-foreground">To Optimize</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      {selectedPages.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm">
                  {selectedPages.size} selected
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Choose an action for selected pages
                </span>
              </div>
              
              <div className="flex gap-2">
                <Select value={bulkAction || ''} onValueChange={(value: 'optimize' | 'sync') => setBulkAction(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="optimize">Optimize SEO</SelectItem>
                    <SelectItem value="sync">Sync to Shopify</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={handleBulkAction}
                  disabled={!bulkAction || optimizing || syncing}
                  size="sm"
                >
                  {(optimizing || syncing) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Apply'
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPages(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search pages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={(value: FilterStatus) => setStatusFilter(value)}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pages</SelectItem>
                  <SelectItem value="optimized">Optimized</SelectItem>
                  <SelectItem value="not-optimized">Not Optimized</SelectItem>
                  <SelectItem value="synced">Synced</SelectItem>
                  <SelectItem value="not-synced">Not Synced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={handleImportPages}
                disabled={importingPages}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <FileText className="w-4 h-4 mr-2" />
                {importingPages ? 'Importing...' : 'Import Pages'}
              </Button>
              
              <Tabs value={viewMode} onValueChange={(value: 'table' | 'grid') => setViewMode(value)} className="w-auto">
                <TabsList className="grid w-20 grid-cols-2">
                  <TabsTrigger value="table">Table</TabsTrigger>
                  <TabsTrigger value="grid">Grid</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pages Display */}
      {pages.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No pages found</h3>
          <p className="text-muted-foreground mb-6">
            Import your Shopify pages to start SEO optimization
          </p>
          <Button 
            onClick={handleImportPages}
            disabled={importingPages}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            {importingPages ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Import Shopify Pages
              </>
            )}
          </Button>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedPages.size === filteredAndSortedPages.length && filteredAndSortedPages.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center gap-1">
                      Title
                      <SortIcon field="title" />
                    </div>
                  </TableHead>
                  <TableHead>SEO Title</TableHead>
                  <TableHead>Meta Description</TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('seo_score')}
                  >
                    <div className="flex items-center gap-1 justify-center">
                      SEO Score
                      <SortIcon field="seo_score" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('updated_at')}
                  >
                    <div className="flex items-center gap-1">
                      Last Updated
                      <SortIcon field="updated_at" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedPages.map((page) => (
                  <TableRow key={page.id} className="group">
                    <TableCell>
                      <Checkbox
                        checked={selectedPages.has(page.id)}
                        onCheckedChange={() => handleSelectPage(page.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div>{page.title}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          /{page.handle}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="truncate">
                              {page.seo_title || (
                                <span className="text-muted-foreground italic">No SEO title</span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{page.seo_title || 'No SEO title'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="max-w-sm">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="truncate text-sm text-muted-foreground">
                              {page.seo_description || (
                                <span className="text-muted-foreground italic">No meta description</span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p>{page.seo_description || 'No meta description'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-center">
                      <SeoConfidenceBadge 
                        seoTitle={page.seo_title}
                        seoDescription={page.seo_description}
                        showLabel={false}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-1 items-center">
                        {page.optimized ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Optimized
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="w-3 h-3" />
                            Pending
                          </Badge>
                        )}
                        {page.last_synced_at && (
                          <Badge variant="outline" className="text-xs">
                            Synced
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {page.updated_at ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm text-muted-foreground">
                                {new Date(page.updated_at).toLocaleDateString()}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{new Date(page.updated_at).toLocaleString()}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handlePreviewPage(page)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Preview page</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {!page.optimized ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOptimizePage(page.id)}
                                  disabled={optimizing}
                                >
                                  <Sparkles className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Optimize SEO</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSyncPage(page.id)}
                                  disabled={syncing}
                                >
                                  <Upload className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Sync to Shopify</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditPage(page.id)}>
                              <Edit3 className="w-4 h-4 mr-2" />
                              Edit Manually
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handlePreviewPage(page)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredAndSortedPages.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pages found matching your criteria</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedPages.map((page) => (
            <Card key={page.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Checkbox
                      checked={selectedPages.has(page.id)}
                      onCheckedChange={() => handleSelectPage(page.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{page.title}</CardTitle>
                      <CardDescription className="truncate">/{page.handle}</CardDescription>
                    </div>
                  </div>
                  <SeoConfidenceBadge 
                    seoTitle={page.seo_title}
                    seoDescription={page.seo_description}
                    showLabel={false}
                  />
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">SEO Title</div>
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {page.seo_title || 'No SEO title'}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Meta Description</div>
                  <div className="text-sm text-muted-foreground line-clamp-3">
                    {page.seo_description || 'No meta description'}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <div className="flex gap-2">
                    {page.optimized ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Optimized
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="w-3 h-3" />
                        Pending
                      </Badge>
                    )}
                    {page.last_synced_at && (
                      <Badge variant="outline">Synced</Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    {!page.optimized ? (
                      <Button
                        size="sm"
                        onClick={() => handleOptimizePage(page.id)}
                        disabled={optimizing}
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSyncPage(page.id)}
                        disabled={syncing}
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}