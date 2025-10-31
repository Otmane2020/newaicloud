import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
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

  const fetchCollections = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('shopify_collections')
        .select('*')
        .order('title', { ascending: true });

      if (error) throw error;

      // Count products and images per collection
      const collectionsWithCounts = await Promise.all(
        (data || []).map(async (collection) => {
          const { count: productCount } = await supabase
            .from('shopify_products')
            .select('*', { count: 'exact', head: true })
            .contains('collection_ids', [collection.id]);

          const { count: imageCount } = await supabase
            .from('content_images')
            .select('*', { count: 'exact', head: true })
            .eq('content_type', 'collection')
            .eq('content_id', collection.id);

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
      toast.error('Erreur lors du chargement des collections');
    } finally {
      setLoading(false);
    }
  };

  const handleImportCollections = async () => {
    setImporting(true);
    const toastId = toast.loading("Import des collections...");
    
    try {
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

      toast.success(`✅ ${data.totalImported || 0} images de collections importées`, { id: toastId });
      await fetchCollections();
    } catch (error: any) {
      console.error('Error importing collections:', error);
      toast.error(error.message || "Erreur lors de l'import", { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  const handleImportArticles = async () => {
    setImporting(true);
    const toastId = toast.loading("Import des articles...");
    
    try {
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

      toast.loading("Import des articles en cours...", { id: toastId });
      const { data: articlesData, error: articlesError } = await supabase.functions.invoke('import-shopify-articles', {
        body: { 
          shopName: storeData.store_url.replace('.myshopify.com', ''),
          authToken: storeData.access_token,
          storeId: storeData.id
        }
      });

      if (articlesError) throw articlesError;

      toast.loading("Import des images d'articles...", { id: toastId });
      const { data: imagesData, error: imagesError } = await supabase.functions.invoke('import-content-images', {
        body: { storeId: storeData.id, types: ['articles'] }
      });

      if (imagesError) throw imagesError;

      const totalArticles = articlesData?.count || 0;
      const totalImages = imagesData?.totalImported || 0;
      toast.success(`✅ ${totalArticles} articles et ${totalImages} images importés`, { id: toastId });
    } catch (error: any) {
      console.error('Error importing articles:', error);
      toast.error(error.message || "Erreur lors de l'import", { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  const handleFullImport = async () => {
    setImporting(true);
    const toastId = toast.loading("Import complet en cours...");
    
    try {
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

      let totalImported = 0;

      // Import collections
      toast.loading("1/3 - Import des collections...", { id: toastId });
      const { data: collectionsData } = await supabase.functions.invoke('import-content-images', {
        body: { storeId: storeData.id, types: ['collections'] }
      });
      totalImported += collectionsData?.totalImported || 0;

      // Import articles
      toast.loading("2/3 - Import des articles...", { id: toastId });
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
      totalImported += articlesImagesData?.totalImported || 0;

      // Import pages
      toast.loading("3/3 - Import des pages...", { id: toastId });
      const { data: pagesData } = await supabase.functions.invoke('import-content-images', {
        body: { storeId: storeData.id, types: ['pages'] }
      });
      totalImported += pagesData?.totalImported || 0;

      toast.success(`✅ Import complet terminé: ${totalImported} images importées`, { id: toastId });
      await fetchCollections();
    } catch (error: any) {
      console.error('Error during full import:', error);
      toast.error(error.message || "Erreur lors de l'import", { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const filteredCollections = collections.filter((col) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      col.title.toLowerCase().includes(term) ||
      col.handle?.toLowerCase().includes(term)
    );
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
          <h1 className="text-3xl font-bold">Collections</h1>
          <p className="text-muted-foreground">Gérez vos collections de produits</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleImportCollections} variant="outline" disabled={importing}>
            <Package className="w-4 h-4 mr-2" />
            Importer Collections
          </Button>
          
          <Button onClick={handleImportArticles} variant="outline" disabled={importing}>
            <FileText className="w-4 h-4 mr-2" />
            Importer Articles
          </Button>
          
          <Button onClick={handleFullImport} disabled={importing}>
            <Upload className="w-4 h-4 mr-2" />
            Tout Importer
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
              <p className="text-sm text-muted-foreground">Collections</p>
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
              <p className="text-sm text-muted-foreground">Images totales</p>
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
              <p className="text-sm text-muted-foreground">Produits</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher des collections..."
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
          <p className="text-lg font-medium mb-2">Aucune collection trouvée</p>
          <p className="text-muted-foreground">
            Importez vos collections depuis Shopify
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
                    <span>{collection.product_count || 0} produits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    <span>{collection.image_count || 0} images</span>
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
                        {collection.product_count || 0} produits
                      </Badge>
                      <Badge variant="outline">
                        {collection.image_count || 0} images
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Handle: {collection.handle}
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
    </div>
  );
}