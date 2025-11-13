import { useEffect, useState } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestProductCard } from '@/components/test/TestProductCard';
import { TestCollectionCard } from '@/components/test/TestCollectionCard';
import { TestArticleCard } from '@/components/test/TestArticleCard';
import { TestPageCard } from '@/components/test/TestPageCard';
import { TestImageGrid } from '@/components/test/TestImageGrid';
import { GlobalActionsPanel } from '@/components/test/GlobalActionsPanel';
import { MonitoringPanel } from '@/components/test/MonitoringPanel';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function TestGlobale() {
  const { selectedStore } = useStore();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [collection, setCollection] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);

  const loadTestData = async () => {
    if (!selectedStore?.id) return;

    setLoading(true);
    try {
      // Load 5 random products
      const { data: productsData } = await supabase
        .from('shopify_products')
        .select('*')
        .eq('store_id', selectedStore.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Load 1 random collection
      const { data: collectionData } = await supabase
        .from('shopify_collections' as any)
        .select('*')
        .eq('store_id', selectedStore.id)
        .limit(1)
        .maybeSingle();

      // Load 3 random articles
      const { data: articlesData } = await supabase
        .from('shopify_articles' as any)
        .select('*')
        .eq('store_id', selectedStore.id)
        .limit(3);

      // Load 2 random pages
      const { data: pagesData } = await supabase
        .from('shopify_pages' as any)
        .select('*')
        .eq('store_id', selectedStore.id)
        .limit(2);

      // Load 10 random images (mix of types)
      const { data: imagesData } = await supabase
        .from('seo_alt_images' as any)
        .select('*')
        .eq('store_id', selectedStore.id)
        .limit(10);

      setProducts(productsData || []);
      setCollection(collectionData);
      setArticles(articlesData || []);
      setPages(pagesData || []);
      setImages(imagesData || []);
    } catch (error) {
      console.error('Error loading test data:', error);
      toast.error('Erreur lors du chargement des données de test');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTestData();
  }, [selectedStore?.id]);

  if (!selectedStore) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Aucune boutique sélectionnée</h2>
          <p className="text-muted-foreground">
            Veuillez sélectionner une boutique pour accéder aux tests.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">🧪 Page de Test Globale</h1>
          <p className="text-muted-foreground">
            Testez toutes les fonctionnalités de l'application en un seul endroit
          </p>
        </div>
        <Button onClick={loadTestData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Recharger les données
        </Button>
      </div>

      <GlobalActionsPanel storeId={selectedStore.id} />

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="products">Produits ({products.length})</TabsTrigger>
          <TabsTrigger value="collection">Collection</TabsTrigger>
          <TabsTrigger value="articles">Articles ({articles.length})</TabsTrigger>
          <TabsTrigger value="pages">Pages ({pages.length})</TabsTrigger>
          <TabsTrigger value="images">Images ({images.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">5 Produits de test</h2>
          </div>
          {products.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Aucun produit disponible</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <TestProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="collection" className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">1 Collection de test</h2>
          {collection ? (
            <TestCollectionCard collection={collection} />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Aucune collection disponible</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="articles" className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">3 Articles de test</h2>
          {articles.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Aucun article disponible</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <TestArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">2 Pages de test</h2>
          {pages.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Aucune page disponible</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {pages.map((page) => (
                <TestPageCard key={page.id} page={page} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="images" className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">10 Images de test</h2>
          {images.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Aucune image disponible</p>
            </Card>
          ) : (
            <TestImageGrid images={images} />
          )}
        </TabsContent>
      </Tabs>

      <MonitoringPanel />
    </div>
  );
}
