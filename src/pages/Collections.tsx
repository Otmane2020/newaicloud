import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';
import { useStore } from '@/contexts/StoreContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertCircle } from 'lucide-react';
import {
  Search, 
  Grid3x3, 
  List, 
  RefreshCw, 
  Loader2,
  Image as ImageIcon,
  Package,
  Upload,
  FileText
} from 'lucide-react';

interface Collection {
  id: string;
  title: string;
  handle: string;
  body_html: string | null;
  image_url: string | null;
  image_alt: string | null;
  shopify_collection_id: number;
  created_at: string;
  updated_at: string;
  product_count?: number;
  image_count?: number;
}

export default function Collections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  const { t, tf } = useTranslation();
  const { selectedStore } = useStore();

  const fetchCollections = async () => {
    if (!selectedStore?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t.sync.notAuthenticated);
      
      // Count total collections for this store
      const { count } = await supabase
        .from('shopify_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('store_id', selectedStore.id);
      
      // Fetch collections with pagination
      const { data, error } = await supabase
        .from('shopify_collections')
        .select('*')
        .eq('user_id', user.id)
        .eq('store_id', selectedStore.id)
        .order('title', { ascending: true })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      // Count products and images per collection
      const collectionsWithCounts = await Promise.all(
        (data || []).map(async (collection) => {
          const { count: productCount } = await supabase
            .from('shopify_products')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', selectedStore.id)
            .contains('collection_ids', [collection.id]);

          const { count: imageCount } = await supabase
            .from('content_images')
            .select('*', { count: 'exact', head: true })
            .eq('content_type', 'collection')
            .eq('content_id', collection.id)
            .eq('store_id', selectedStore.id);

          return {
            ...collection,
            product_count: productCount || 0,
            image_count: imageCount || 0
          };
        })
      );

      setCollections(collectionsWithCounts);
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error(t.collections.loadError);
    } finally {
      setLoading(false);
    }
  };

  // Reload collections when store changes
  useEffect(() => {
    fetchCollections();
  }, [selectedStore?.id, currentPage]);

  const handleSyncProductCollections = async () => {
    if (!selectedStore?.id) {
      toast.error("Aucune boutique sélectionnée");
      return;
    }

    setSyncing(true);
    toast.info("Synchronisation en cours, cela peut prendre plusieurs minutes pour de nombreux produits...");
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

      const { data, error: syncError } = await supabase.functions.invoke('sync-product-collections', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (syncError) throw syncError;

      const updatedCount = data?.updated_count || 0;
      const errorCount = data?.error_count || 0;
      const totalProducts = data?.total_products || 0;
      
      if (errorCount > 0) {
        toast.warning(
          `⚠️ Synchronisation terminée avec erreurs: ${updatedCount} produits mis à jour, ${errorCount} erreurs sur ${totalProducts}`,
          { duration: 6000 }
        );
      } else {
        toast.success(
          `✅ Synchronisation terminée: ${updatedCount} produits mis à jour sur ${totalProducts}`,
          { duration: 5000 }
        );
      }
      
      // Reload collections to show updated product counts
      await fetchCollections();
    } catch (error) {
      console.error('Error syncing product collections:', error);
      toast.error("Erreur lors de la synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  const handleImportCollections = async () => {
    if (!selectedStore?.id) {
      toast.error("Aucune boutique sélectionnée");
      return;
    }

    setImporting(true);
    const toastId = toast.loading(t.sync.importingCollections);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t.sync.notAuthenticated);

      // Import collections from Shopify
      toast.loading(t.sync.importingFromShopify, { id: toastId });
      const { data: collectionsData, error: collectionsError } = await supabase.functions.invoke('import-shopify-collections');

      if (collectionsError) throw collectionsError;

      const importedCount = collectionsData?.imported || 0;

      // Synchronize products with collections
      toast.loading("Synchronisation des produits avec les collections...", { id: toastId });
      const { error: syncError } = await supabase.functions.invoke('sync-product-collections');
      
      if (syncError) {
        console.error("Erreur sync:", syncError);
        // Continue même en cas d'erreur de sync
      }

      // Import collection images
      toast.loading(t.sync.importingCollectionImages, { id: toastId });
      const { data: imagesData, error: imagesError } = await supabase.functions.invoke('import-content-images', {
        body: { storeId: selectedStore.id, types: ['collections'] }
      });

      if (imagesError) throw imagesError;

      const imagesCount = imagesData?.totalImported || 0;

      toast.success(tf('sync.collectionsAndImagesImported', { count: importedCount, images: imagesCount }), { id: toastId });
      await fetchCollections();
    } catch (error: any) {
      console.error('Error importing collections:', error);
      toast.error(error.message || t.sync.importError, { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  const handleImportArticles = async () => {
    setImporting(true);
    const toastId = toast.loading(t.sync.importingArticles);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t.sync.notAuthenticated);

      const { data: storeData } = await supabase
        .from('shopify_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!storeData) {
        toast.error(t.sync.noActiveConnection, { id: toastId });
        return;
      }

      toast.loading(t.sync.importingArticlesInProgress, { id: toastId });
      const { data: articlesData, error: articlesError } = await supabase.functions.invoke('import-shopify-articles', {
        body: { 
          shopName: storeData.store_url.replace('.myshopify.com', ''),
          authToken: storeData.access_token,
          storeId: storeData.id
        }
      });

      if (articlesError) throw articlesError;

      toast.loading(t.sync.importingArticleImages, { id: toastId });
      const { data: imagesData, error: imagesError } = await supabase.functions.invoke('import-content-images', {
        body: { storeId: storeData.id, types: ['articles'] }
      });

      if (imagesError) throw imagesError;

      const totalArticles = articlesData?.count || 0;
      const totalImages = imagesData?.totalImported || 0;
      toast.success(tf('sync.articlesAndImagesImported', { totalArticles, totalImages }), { id: toastId });
    } catch (error: any) {
      console.error('Error importing articles:', error);
      toast.error(error.message || t.sync.importError, { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  const handleFullImport = async () => {
    setImporting(true);
    const toastId = toast.loading(t.sync.fullImportInProgress);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t.sync.notAuthenticated);

      const { data: storeData } = await supabase
        .from('shopify_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!storeData) {
        toast.error(t.sync.noActiveConnection, { id: toastId });
        return;
      }

      let totalImages = 0;
      let collectionsCount = 0;
      let articlesCount = 0;
      let pagesCount = 0;

      // Import collections
      toast.loading(t.sync.step1, { id: toastId });
      const { data: collectionsData } = await supabase.functions.invoke('import-content-images', {
        body: { storeId: storeData.id, types: ['collections'] }
      });
      totalImages += collectionsData?.totalImported || 0;

      // Check collections count
      const { count: colCount } = await supabase
        .from('shopify_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      collectionsCount = colCount || 0;

      // Import articles
      toast.loading(t.sync.step2, { id: toastId });
      await supabase.functions.invoke('import-shopify-articles', {
        body: { 
          shopName: storeData.store_url.replace('.myshopify.com', ''),
          authToken: storeData.access_token,
          storeId: storeData.id
        }
      });
      const { data: articlesImagesData } = await supabase.functions.invoke('import-content-images', {
        body: { storeId: storeData.id, types: ['articles'] }
      });
      totalImages += articlesImagesData?.totalImported || 0;

      // Check articles count
      const { count: artCount } = await supabase
        .from('blog_articles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      articlesCount = artCount || 0;

      // Import pages
      toast.loading(t.sync.step3, { id: toastId });
      const { data: pagesData } = await supabase.functions.invoke('import-content-images', {
        body: { storeId: storeData.id, types: ['pages'] }
      });
      totalImages += pagesData?.totalImported || 0;

      // Check pages count
      const { count: pageCount } = await supabase
        .from('shopify_pages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      pagesCount = pageCount || 0;

      // Build detailed result message
      const parts = [];
      if (collectionsCount > 0) parts.push(`${collectionsCount} collections`);
      if (articlesCount > 0) parts.push(`${articlesCount} articles`);
      if (pagesCount > 0) parts.push(`${pagesCount} pages`);
      if (totalImages > 0) parts.push(`${totalImages} images`);

      if (parts.length === 0) {
        toast.info(t.sync.noContentFound, { id: toastId });
      } else {
        toast.success(tf('sync.fullImportComplete', { parts: parts.join(', ') }), { id: toastId });
      }

      await fetchCollections();
    } catch (error: any) {
      console.error('Error during full import:', error);
      toast.error(error.message || t.sync.importError, { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const filteredCollections = collections.filter((col) => {
    if (!searchTerm) return true;
    
    // Fonction pour normaliser le texte (enlever accents, ponctuation, minuscules)
    const normalizeText = (text: string | null | undefined): string => {
      if (!text) return '';
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Enlève les accents
        .replace(/[^\w\s]/g, ' ') // Remplace la ponctuation par des espaces
        .replace(/\s+/g, ' ') // Remplace les espaces multiples par un seul
        .trim();
    };

    // Normaliser le terme de recherche et le diviser en mots-clés
    const searchKeywords = normalizeText(searchTerm).split(' ').filter(k => k.length > 0);
    
    if (searchKeywords.length === 0) return true;

    // Construire une chaîne de recherche avec tous les champs de la collection
    const searchableText = normalizeText([
      col.title,
      col.handle,
      col.body_html
    ].filter(Boolean).join(' '));

    // Vérifier que tous les mots-clés sont présents
    return searchKeywords.every(keyword => searchableText.includes(keyword));
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t.collections.title}</h1>
          <p className="text-muted-foreground">{t.collections.subtitle}</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleImportCollections}
            disabled={importing || syncing}
            variant="outline"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.collections.import.importing}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Importer Collections + Images
              </>
            )}
          </Button>
          <Button
            onClick={handleSyncProductCollections}
            disabled={importing || syncing}
            variant="outline"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Synchronisation...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Synchroniser
              </>
            )}
          </Button>
          <Button
            onClick={handleFullImport}
            disabled={importing || syncing}
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Import complet...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Import Complet
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{collections.length}</p>
              <p className="text-sm text-muted-foreground">{t.collections.stats.collections}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-xl">
              <ImageIcon className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {collections.reduce((sum, c) => sum + (c.image_count || 0), 0)}
              </p>
              <p className="text-sm text-muted-foreground">{t.collections.stats.totalImages}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Package className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {collections.reduce((sum, c) => sum + (c.product_count || 0), 0)}
              </p>
              <p className="text-sm text-muted-foreground">{t.collections.stats.products}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Alert if no products in collections */}
      {collections.length > 0 && collections.every(c => (c.product_count || 0) === 0) && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Aucun produit n'est associé aux collections. Cliquez sur "Synchroniser" pour connecter vos produits aux collections.
          </AlertDescription>
        </Alert>
      )}

      {/* Alert if no store selected */}
      {!selectedStore && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Veuillez sélectionner une boutique pour voir vos collections.
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t.collections.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={fetchCollections}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Collections Grid/List */}
      {filteredCollections.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">{t.collections.noCollections}</p>
          <p className="text-muted-foreground">
            {t.collections.empty.description}
          </p>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCollections.map((collection) => (
            <Card key={collection.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {collection.image_url ? (
                <div className="aspect-video relative bg-gray-100">
                  <img 
                    src={collection.image_url} 
                    alt={collection.image_alt || collection.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{collection.title}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>{collection.product_count || 0} {t.collections.card.products}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    <span>{collection.image_count || 0} {t.collections.card.images}</span>
                  </div>
                </div>
                {collection.body_html && (
                  <p 
                    className="text-sm text-muted-foreground line-clamp-3"
                    dangerouslySetInnerHTML={{ 
                      __html: collection.body_html.replace(/<[^>]*>/g, '') 
                    }}
                  />
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCollections.map((collection) => (
            <Card key={collection.id} className="p-6">
              <div className="flex gap-6">
                {collection.image_url ? (
                  <img 
                    src={collection.image_url} 
                    alt={collection.image_alt || collection.title}
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg">{collection.title}</h3>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        {collection.product_count || 0} {t.collections.card.products}
                      </Badge>
                      <Badge variant="outline">
                        {collection.image_count || 0} {t.collections.card.images}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t.collections.card.handle}: {collection.handle}
                  </p>
                  {collection.body_html && (
                    <p 
                      className="text-sm text-muted-foreground line-clamp-2"
                      dangerouslySetInnerHTML={{ 
                        __html: collection.body_html.replace(/<[^>]*>/g, '') 
                      }}
                    />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {filteredCollections.length > 0 && collections.length >= ITEMS_PER_PAGE && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setCurrentPage(p => Math.max(1, p - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage === 1}
          >
            Précédent
          </Button>
          <span className="text-muted-foreground px-4">
            Page {currentPage}
          </span>
          <Button
            variant="outline"
            onClick={() => {
              setCurrentPage(p => p + 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={collections.length < ITEMS_PER_PAGE}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}