import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Zap, Package, Tag, Loader2 } from 'lucide-react';
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

  const loadSuggestedKeywords = async () => {
    try {
      const { data: products } = await supabase
        .from('shopify_products')
        .select('title, tags, category')
        .contains('collection_ids', [selectedCollection])
        .limit(10);

      const keywords = new Set<string>();
      
      products?.forEach(product => {
        // Extract from title
        product.title?.split(' ').forEach((word: string) => {
          if (word.length > 3) keywords.add(word.toLowerCase());
        });
        
        // Extract from tags
        product.tags?.split(',').forEach((tag: string) => {
          if (tag.trim().length > 2) keywords.add(tag.trim().toLowerCase());
        });
        
        // Add category
        if (product.category) keywords.add(product.category.toLowerCase());
      });

      setSuggestedKeywords(Array.from(keywords).slice(0, 15));
      setSelectedKeywords(Array.from(keywords).slice(0, 5));
    } catch (error) {
      console.error('Error loading keywords:', error);
    }
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

    setGenerating(true);
    setProgress(0);
    setPreview('');
    setArticleId('');

    try {
      // Get products from collection
      const { data: products } = await supabase
        .from('shopify_products')
        .select('id')
        .contains('collection_ids', [selectedCollection])
        .limit(6);

      const productIds = products?.map(p => p.id) || [];

      // Generate article
      setCurrentStep('Préparation de la génération...');
      setProgress(20);

      const { data: storeData } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      setCurrentStep('Génération du contenu IA...');
      setProgress(40);

      const { data, error } = await supabase.functions.invoke('generate-blog-article', {
        body: {
          user_id: user?.id,
          store_id: storeData?.id,
          productIds,
          collectionIds: [selectedCollection],
          keywords: selectedKeywords,
          category: 'Guide',
          articleLength: '1500',
          targetAudience: 'Grand public',
          articleAngle: 'Guide d\'achat'
        }
      });

      if (error) throw error;

      setCurrentStep('Finalisation...');
      setProgress(80);

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
      {/* Header */}
      <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950 dark:via-pink-950 dark:to-orange-950 border-2 border-purple-200 dark:border-purple-800 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground mb-2">Quick Press</h2>
            <p className="text-muted-foreground">
              Créez rapidement un article de blog optimisé SEO basé sur une collection et des mots-clés suggérés.
            </p>
          </div>
        </div>
      </Card>

      {/* Configuration */}
      <Card className="p-6 space-y-6">
        <div className="space-y-4">
          {/* Collection Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Sélectionner une collection
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {collections.map(collection => (
                <Button
                  key={collection.id}
                  variant={selectedCollection === collection.id ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setSelectedCollection(collection.id)}
                >
                  {collection.title}
                </Button>
              ))}
            </div>
          </div>

          {/* Keywords */}
          {suggestedKeywords.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Mots-clés suggérés ({selectedKeywords.length}/{suggestedKeywords.length})
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllKeywords}
                  disabled={selectedKeywords.length === suggestedKeywords.length}
                >
                  Tout sélectionner
                </Button>
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
          )}

          {/* Generate Button */}
          <Button
            onClick={generateQuickPress}
            disabled={!selectedCollection || selectedKeywords.length === 0 || generating}
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
                <Sparkles className="w-4 h-4 mr-2" />
                Générer Quick Press
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Progress */}
      {generating && (
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{currentStep}</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </Card>
      )}

      {/* Preview */}
      {preview && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Aperçu de l'article</h3>
            {articleId && (
              <Button
                onClick={() => window.location.href = `/blog?subtab=articles&articleId=${articleId}`}
              >
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
