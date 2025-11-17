import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArticleWizard } from './ArticleWizard';

export function QuickPress() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [storeId, setStoreId] = useState<string>('');
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    loadCollections();
    loadStoreId();
  }, [user]);

  const loadStoreId = async () => {
    try {
      const { data } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      if (data) setStoreId(data.id);
    } catch (error) {
      console.error('Error loading store:', error);
    }
  };

  useEffect(() => {
    if (selectedCollection) {
      loadSuggestedKeywords();
      loadProducts();
    }
  }, [selectedCollection]);

  const loadCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('shopify_collections')
        .select('id, title')
        .eq('user_id', user?.id)
        .order('title');

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('shopify_products')
        .select('id, title, price, image_url, category, handle')
        .contains('collection_ids', [selectedCollection])
        .limit(20);

      if (error) throw error;
      setProducts(data || []);
      setSelectedProducts(data?.slice(0, 6).map(p => p.id) || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadSuggestedKeywords = async () => {
    try {
      const { data: products } = await supabase
        .from('shopify_products')
        .select('title, tags, category')
        .contains('collection_ids', [selectedCollection])
        .limit(10);

      const keywords = new Set<string>();
      
      products?.forEach(product => {
        product.title?.split(' ').forEach((word: string) => {
          if (word.length > 3) keywords.add(word.toLowerCase());
        });
        
        product.tags?.split(',').forEach((tag: string) => {
          if (tag.trim().length > 2) keywords.add(tag.trim().toLowerCase());
        });
        
        if (product.category) keywords.add(product.category.toLowerCase());
      });

      setSuggestedKeywords(Array.from(keywords).slice(0, 15));
      setSelectedKeywords(Array.from(keywords).slice(0, 5));
    } catch (error) {
      console.error('Error loading keywords:', error);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAllProducts = () => {
    setSelectedProducts(products.map(p => p.id));
  };

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords(prev => 
      prev.includes(keyword) 
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword]
    );
  };

  const selectAllKeywords = () => {
    setSelectedKeywords(suggestedKeywords);
  };

  if (!selectedCollection) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950 dark:via-pink-950 dark:to-orange-950 border-2 border-purple-200 dark:border-purple-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Quick Press Pro</h2>
              <p className="text-muted-foreground">
                Création d'articles professionnels avec IA
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Choisissez une collection</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {collections.map(collection => (
              <button
                key={collection.id}
                onClick={() => setSelectedCollection(collection.id)}
                className="p-4 rounded-lg border-2 border-border hover:border-primary transition-all text-left hover:shadow-md"
              >
                <h4 className="font-medium">{collection.title}</h4>
              </button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950 dark:via-pink-950 dark:to-orange-950 border-2 border-purple-200 dark:border-purple-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Quick Press Pro</h2>
              <p className="text-muted-foreground">
                {products.length} produits • {selectedKeywords.length} mots-clés
              </p>
            </div>
            <Button
              onClick={() => setSelectedCollection('')}
              variant="outline"
            >
              Changer
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Produits sélectionnés</h3>
                <div className="flex gap-2">
                  <Button onClick={selectAllProducts} variant="outline" size="sm">
                    Tout sélectionner
                  </Button>
                  <Badge variant="secondary">{selectedProducts.length}/{products.length}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                {products.map(product => (
                  <div
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all ${
                      selectedProducts.includes(product.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                    )}
                    <p className="font-medium text-sm line-clamp-2">{product.title}</p>
                    {selectedProducts.includes(product.id) && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Mots-clés</h3>
                <div className="flex gap-2">
                  <Button onClick={selectAllKeywords} variant="outline" size="sm">
                    Tout sélectionner
                  </Button>
                  <Badge variant="secondary">{selectedKeywords.length}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedKeywords.map(keyword => (
                  <Badge
                    key={keyword}
                    variant={selectedKeywords.includes(keyword) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleKeyword(keyword)}
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setWizardOpen(true)}
              disabled={selectedProducts.length === 0 || selectedKeywords.length === 0}
              size="lg"
              className="w-full"
            >
              <Zap className="w-5 h-5 mr-2" />
              Quick Press - Générer l'article
            </Button>
          </div>
        </Card>
      </div>

      <ArticleWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        collections={collections}
        selectedCollection={selectedCollection}
        products={products}
        selectedProducts={selectedProducts}
        suggestedKeywords={suggestedKeywords}
        selectedKeywords={selectedKeywords}
        onToggleProduct={toggleProduct}
        onToggleKeyword={toggleKeyword}
        userId={user?.id || ''}
        storeId={storeId}
      />
    </>
  );
}
