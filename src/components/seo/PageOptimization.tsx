import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Search, Loader2, FileText, Sparkles, CheckCircle, Upload, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { SeoConfidenceBadge } from './SeoConfidenceBadge';
import { calculateDetailedSeoScore } from '@/lib/seoQuality';
import { Progress } from '@/components/ui/progress';

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

export function PageOptimization() {
  const [pages, setPages] = useState<ShopifyPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importingPages, setImportingPages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());

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
          body: { pageId: pageIds[i] }
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
          body: { pageId: pagesToOptimize[i].id }
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
      {/* Hero Banner with Stats */}
      <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950 dark:via-pink-950 dark:to-rose-950 border-2 border-purple-200 p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-600" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Page Optimization
              </h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Optimize the SEO of all your Shopify pages. Generate effective meta titles and descriptions to maximize your traffic.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="font-medium">Automated SEO</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-pink-600" />
                <span className="font-medium">Complete pages</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Upload className="w-4 h-4 text-rose-600" />
                <span className="font-medium">Shopify Sync</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 items-center">
            <div className="text-center">
              <div className={`text-4xl font-bold ${
                globalPageSeoScore >= 70 ? 'text-green-600' : 
                globalPageSeoScore >= 40 ? 'text-orange-600' : 
                'text-red-600'
              }`}>
                {globalPageSeoScore}/100
              </div>
              <div className="text-sm text-muted-foreground">SEO Score</div>
            </div>
            <Button
              size="lg"
              onClick={handleOptimizeAll}
              disabled={optimizing || pages.filter(p => !p.optimized).length === 0}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2 shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              Optimize All
            </Button>
          </div>
        </div>
      </Card>

      {/* Clickable Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{pages.length}</p>
              <p className="text-sm text-muted-foreground">Total pages</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 border-2 border-success hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-success" />
            <div>
              <p className="text-2xl font-bold">{pages.filter(p => p.optimized).length}</p>
              <p className="text-sm text-muted-foreground">Optimized</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform duration-200">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{pages.filter(p => !p.optimized).length}</p>
              <p className="text-sm text-muted-foreground">To Optimize</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pages Table */}
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
      ) : (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Shopify Pages</h3>
              <div className="flex gap-2">
                <Button
                  onClick={handleImportPages}
                  disabled={importingPages}
                  variant="outline"
                  size="sm"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {importingPages ? 'Importing...' : 'Import Pages'}
                </Button>
                <Button
                  onClick={handleOptimizeSelected}
                  disabled={optimizing || selectedPages.size === 0}
                  variant="default"
                  size="sm"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Optimize Selected ({selectedPages.size})
                </Button>
                <Button
                  onClick={handleSyncSelected}
                  disabled={syncing || selectedPages.size === 0}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Sync Selected
                </Button>
              </div>
            </div>

            <div className="relative flex-1 mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for a page..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedPages.size === filteredPages.length && filteredPages.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>SEO Title</TableHead>
                <TableHead>Meta Description</TableHead>
                <TableHead className="text-center">SEO Score</TableHead>
                <TableHead className="text-center">Optimized</TableHead>
                <TableHead className="text-center">Synchronized</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
              <TableBody>
                {filteredPages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedPages.has(page.id)}
                        onCheckedChange={() => handleSelectPage(page.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{page.title}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {page.seo_title || '-'}
                    </TableCell>
                    <TableCell className="max-w-sm truncate text-sm text-muted-foreground">
                      {page.seo_description || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <SeoConfidenceBadge 
                        seoTitle={page.seo_title}
                        seoDescription={page.seo_description}
                        showLabel={false}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {page.optimized ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <Clock className="w-5 h-5 text-orange-600 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={page.last_synced_at ? 'default' : 'secondary'}>
                        {page.last_synced_at ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!page.optimized && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOptimizePage(page.id)}
                            disabled={optimizing}
                          >
                            <Sparkles className="w-4 h-4" />
                          </Button>
                        )}
                        {page.optimized && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSyncPage(page.id)}
                            disabled={syncing}
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
