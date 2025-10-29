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
        toast.error('Utilisateur non connecté');
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
      toast.error('Erreur lors du chargement des pages');
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
        toast.error('Utilisateur non connecté');
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
        toast.error('Aucune boutique Shopify connectée');
        setImportingPages(false);
        return;
      }
      
      // Import pages for all connected stores
      let totalImported = 0;
      for (const store of connections) {
        toast.loading(`Import des pages de ${store.store_name || 'votre boutique'}...`, { id: store.id });
        
        const { data, error } = await supabase.functions.invoke('import-shopify-pages', {
          body: { storeId: store.id }
        });
        
        if (error) {
          toast.error(`Erreur: ${error.message}`, { id: store.id });
        } else if (data.permissionError) {
          toast.warning(data.message, { id: store.id });
        } else {
          toast.success(`✅ ${data.count} pages importées`, { id: store.id });
          totalImported += data.count;
        }
      }
      
      // Refresh pages list
      await fetchPages();
      
      if (totalImported > 0) {
        toast.success(`🎉 ${totalImported} pages importées au total !`);
      }
    } catch (error) {
      console.error('Error importing pages:', error);
      toast.error('Erreur lors de l\'import des pages');
    } finally {
      setImportingPages(false);
    }
  };

  const handleOptimizePages = async () => {
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
        toast.success(`Page ${i + 1}/${pageIds.length} optimisée`);
      } catch (error) {
        console.error('Error optimizing page:', error);
        toast.error(`Erreur pour la page ${i + 1}`);
      }
    }
    
    setOptimizing(false);
    setSelectedPages(new Set());
    fetchPages();
    
    if (successCount === pageIds.length) {
      toast.success('🎉 Toutes les pages ont été optimisées !');
    } else {
      toast.warning(`${successCount}/${pageIds.length} pages optimisées`);
    }
  };

  const handleOptimizeAll = async () => {
    const pagesToOptimize = pages.filter(p => !p.optimized);
    if (pagesToOptimize.length === 0) {
      toast.info('Toutes les pages sont déjà optimisées');
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
    toast.success(`${successCount}/${pagesToOptimize.length} pages optimisées !`);
    fetchPages();
  };

  const handleSyncAll = async () => {
    const pagesToSync = pages.filter(p => p.optimized);
    if (pagesToSync.length === 0) {
      toast.info('Aucune page optimisée à synchroniser');
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
    toast.success(`${successCount}/${pagesToSync.length} pages synchronisées !`);
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
    toast.success(`${successCount}/${pageIds.length} pages synchronisées !`);
    fetchPages();
  };

  const handleOptimizePage = async (pageId: string) => {
    try {
      setOptimizing(true);
      const { error } = await supabase.functions.invoke('generate-page-seo', {
        body: { pageId }
      });
      
      if (error) throw error;
      toast.success('Page optimisée !');
      fetchPages();
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
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
      toast.success('Page synchronisée !');
      fetchPages();
    } catch (error: any) {
      toast.error(error.message || 'Erreur');
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
      {/* Global SEO Score Card */}
      <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950 dark:via-emerald-950 dark:to-teal-950 border-2 border-green-200 dark:border-green-800 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-muted-foreground">Score SEO Global des Pages</h3>
            <div className="flex items-center gap-3">
              <div className="text-5xl font-bold">{globalPageSeoScore}</div>
              <div className="text-muted-foreground">/100</div>
            </div>
            <p className="text-sm text-muted-foreground">
              {pages.length} pages analysées
            </p>
          </div>
          <div className="text-right space-y-2">
            <SeoConfidenceBadge 
              seoTitle={pages.length > 0 ? "Global" : null}
              seoDescription={pages.length > 0 ? "Score moyen de toutes les pages" : null}
              showLabel={false}
              className="text-lg px-4 py-2"
            />
            <Progress value={globalPageSeoScore} className="w-32 h-2" />
          </div>
        </div>
      </Card>

      {/* Hero Banner */}
      <Card className="bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-indigo-950 dark:via-blue-950 dark:to-cyan-950 border-2 border-indigo-200 p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                Optimisation des Pages
              </h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Optimisez le référencement de vos pages Shopify avec des meta tags générés par IA
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{pages.length}</p>
              <p className="text-sm text-muted-foreground">Total pages</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 border-success">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-success" />
            <div>
              <p className="text-2xl font-bold">{pages.filter(p => p.optimized).length}</p>
              <p className="text-sm text-muted-foreground">Optimisées</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 border-warning">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-warning" />
            <div>
              <p className="text-2xl font-bold">{pages.filter(p => !p.optimized).length}</p>
              <p className="text-sm text-muted-foreground">À optimiser</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pages Table */}
      {pages.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Aucune page trouvée</h3>
          <p className="text-muted-foreground mb-6">
            Importez vos pages Shopify pour commencer l'optimisation SEO
          </p>
          <Button 
            onClick={handleImportPages}
            disabled={importingPages}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            {importingPages ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Import en cours...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Importer les pages Shopify
              </>
            )}
          </Button>
        </Card>
      ) : (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Pages Shopify</h3>
              <div className="flex gap-2">
                <Button
                  onClick={handleOptimizeAll}
                  disabled={optimizing || pages.filter(p => !p.optimized).length === 0}
                  variant="default"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Optimiser tout ({pages.filter(p => !p.optimized).length})
                </Button>
                <Button
                  onClick={handleSyncAll}
                  disabled={syncing || pages.filter(p => p.optimized).length === 0}
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Synchroniser tout
                </Button>
                <Button
                  onClick={handleSyncSelected}
                  disabled={syncing || selectedPages.size === 0}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Synchroniser ({selectedPages.size})
                </Button>
              </div>
            </div>

            <div className="relative flex-1 mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher une page..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedPages.size === filteredPages.length && filteredPages.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>SEO Title</TableHead>
                  <TableHead>Méta Description</TableHead>
                  <TableHead className="text-center">Score SEO</TableHead>
                  <TableHead className="text-center">Optimisé</TableHead>
                  <TableHead className="text-center">Synchronisé</TableHead>
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
                        {page.last_synced_at ? 'Oui' : 'Non'}
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
