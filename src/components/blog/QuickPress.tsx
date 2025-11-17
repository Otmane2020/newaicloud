import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Zap } from 'lucide-react';
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

      <ArticleWizard
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
    </div>
  );
}
