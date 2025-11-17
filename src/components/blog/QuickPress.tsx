import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Zap, Package, Tag, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';
import { ScrollArea } from '@/components/ui/scroll-area';

export function QuickPress() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [preview, setPreview] = useState<string>('');
  const [articleId, setArticleId] = useState<string>('');

  useEffect(() => {
    loadCollections();
  }, [user]);

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

  const generateQuickPress = async () => {
    if (!selectedCollection || selectedKeywords.length === 0) {
      toast.error('Sélectionnez une collection et au moins un mot-clé');
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error('Sélectionnez au moins un produit');
      return;
    }

    setGenerating(true);
    setProgress(0);
    setPreview('');
    setArticleId('');

    try {
      setCurrentStep('Préparation de la génération...');
      setProgress(20);

      const { data: storeData } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      setCurrentStep('Génération de l\'article...');
      setProgress(40);

      const { data, error } = await supabase.functions.invoke('generate-blog-article', {
        body: {
          user_id: user?.id,
          store_id: storeData?.id,
          productIds: selectedProducts,
          collectionIds: [selectedCollection],
          keywords: selectedKeywords,
          category: collections.find(c => c.id === selectedCollection)?.title,
          articleLength: 2000,
        }
      });

      setProgress(80);

      if (error) throw error;

      if (data?.success && data?.article) {
        setArticleId(data.article.id);
        setPreview(data.article.preview || data.article.content?.substring(0, 500));
        setProgress(100);
        setCurrentStep('Article généré avec succès!');
        toast.success('Quick Press généré!');
      } else {
        throw new Error('Erreur lors de la génération');
      }
    } catch (error: any) {
      console.error('Error generating quick press:', error);
      toast.error(error.message || 'Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950 dark:via-pink-950 dark:to-orange-950 border-2 border-purple-200 dark:border-purple-800 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Quick Press</h2>
            <p className="text-muted-foreground">
              Générez rapidement un article basé sur vos produits
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Configuration
        </h3>
        
        <div className="space-y-6">
          <div>
            <Label className="text-base font-semibold flex items-center gap-2 mb-3">
              <Package className="w-4 h-4" />
              Choisissez une collection
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {collections.map(collection => (
                <Button
                  key={collection.id}
                  variant={selectedCollection === collection.id ? "default" : "outline"}
                  className="h-auto py-4"
                  onClick={() => setSelectedCollection(collection.id)}
                >
                  {collection.title}
                </Button>
              ))}
            </div>
          </div>

          {selectedCollection && (
            <>
              <div>
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Produits à inclure
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Sélectionnez les produits à afficher dans l'article
                </p>
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {products.map(product => (
                      <div
                        key={product.id}
                        onClick={() => toggleProduct(product.id)}
                        className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-md ${
                          selectedProducts.includes(product.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border'
                        }`}
                      >
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-full h-24 object-cover rounded mb-2"
                          />
                        )}
                        <h4 className="font-medium text-sm line-clamp-2">{product.title}</h4>
                        {product.price && (
                          <p className="text-sm text-muted-foreground mt-1">{product.price}€</p>
                        )}
                        {selectedProducts.includes(product.id) && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-primary-foreground text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllProducts}
                    disabled={selectedProducts.length === products.length}
                  >
                    Tout sélectionner
                  </Button>
                  <Badge variant="secondary">
                    {selectedProducts.length} produit{selectedProducts.length > 1 ? 's' : ''} sélectionné{selectedProducts.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Mots-clés suggérés
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Basés sur les produits de cette collection
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllKeywords}
                  disabled={selectedKeywords.length === suggestedKeywords.length}
                >
                  Tout sélectionner
                </Button>
              </div>

              <Button 
                onClick={generateQuickPress}
                disabled={generating || selectedProducts.length === 0 || selectedKeywords.length === 0}
                className="w-full"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Générer Quick Press
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </Card>

      {generating && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{currentStep}</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </Card>
      )}

      {preview && articleId && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Aperçu de l'article</h3>
            {articleId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = `/blog?subtab=articles&id=${articleId}`}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Voir l'article complet
              </Button>
            )}
          </div>
          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
