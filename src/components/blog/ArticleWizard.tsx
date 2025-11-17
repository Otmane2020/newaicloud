import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Sparkles, 
  Layout, 
  Palette, 
  Type, 
  Package, 
  Tag, 
  Loader2,
  Check,
  ArrowLeft,
  ArrowRight,
  Eye,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ArticleWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: any[];
  userId: string;
  storeId: string;
}

const LAYOUTS = [
  { id: 'editorial', name: 'Éditorial', description: 'Style magazine avec grandes images' },
  { id: 'grid', name: 'Grille', description: 'Produits en grille organisée' },
  { id: 'story', name: 'Story', description: 'Narration avec produits intégrés' },
];

const COLOR_PALETTES = [
  { id: 'classic', name: 'Classique', colors: ['#1a1a1a', '#ffffff', '#4a90e2'] },
  { id: 'warm', name: 'Chaleureux', colors: ['#8b4513', '#faf0e6', '#d2691e'] },
  { id: 'cool', name: 'Frais', colors: ['#2c3e50', '#ecf0f1', '#3498db'] },
  { id: 'elegant', name: 'Élégant', colors: ['#2d2d2d', '#f5f5f5', '#c9a961'] },
  { id: 'modern', name: 'Moderne', colors: ['#0a0a0a', '#ffffff', '#00d4aa'] },
];

export function ArticleWizard({
  open,
  onOpenChange,
  collections,
  userId,
  storeId
}: ArticleWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedLayout, setSelectedLayout] = useState('editorial');
  const [selectedPalette, setSelectedPalette] = useState('classic');
  const [customKeywords, setCustomKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [preview, setPreview] = useState<string>('');
  const [articleId, setArticleId] = useState<string>('');

  const allKeywords = [...selectedKeywords, ...customKeywords];
  const totalSteps = 6;

  // Load products when collection changes
  useEffect(() => {
    if (selectedCollection && open) {
      loadProducts();
      generateKeywords();
    }
  }, [selectedCollection, open]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('shopify_products')
        .select('id, title, price, image_url, category, handle, tags, description')
        .contains('collection_ids', [selectedCollection])
        .limit(30);

      if (error) throw error;
      setProducts(data || []);
      setSelectedProducts(data?.slice(0, 6).map(p => p.id) || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const generateKeywords = async () => {
    try {
      const { data: products } = await supabase
        .from('shopify_products')
        .select('title, tags, category, description')
        .contains('collection_ids', [selectedCollection])
        .limit(20);

      const shortPhrases = new Set<string>();
      const longPhrases = new Set<string>();
      
      products?.forEach(product => {
        // Short keywords (1-2 mots)
        product.title?.split(' ').forEach((word: string) => {
          if (word.length > 3) shortPhrases.add(word.toLowerCase());
        });
        
        product.tags?.split(',').forEach((tag: string) => {
          const cleaned = tag.trim().toLowerCase();
          if (cleaned.length > 2 && cleaned.split(' ').length <= 2) {
            shortPhrases.add(cleaned);
          }
        });
        
        if (product.category) shortPhrases.add(product.category.toLowerCase());
        
        // Long keywords (3-5 mots) - extraire des phrases du titre et description
        const titleWords = product.title?.split(' ') || [];
        for (let i = 0; i < titleWords.length - 2; i++) {
          const phrase = titleWords.slice(i, i + 3).join(' ').toLowerCase();
          if (phrase.length > 10) longPhrases.add(phrase);
        }
        
        // Extraire des phrases de la description
        if (product.description) {
          const sentences = product.description.split(/[.!?]/);
          sentences.slice(0, 3).forEach((sentence: string) => {
            const words = sentence.trim().split(' ').filter((w: string) => w.length > 2);
            if (words.length >= 3 && words.length <= 5) {
              longPhrases.add(words.join(' ').toLowerCase());
            }
          });
        }
      });

      const allSuggestions = [
        ...Array.from(shortPhrases).slice(0, 10),
        ...Array.from(longPhrases).slice(0, 10)
      ];
      
      setSuggestedKeywords(allSuggestions);
      setSelectedKeywords(allSuggestions.slice(0, 5));
    } catch (error) {
      console.error('Error generating keywords:', error);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
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

  const addCustomKeyword = () => {
    if (keywordInput.trim() && !customKeywords.includes(keywordInput.trim())) {
      setCustomKeywords([...customKeywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const removeCustomKeyword = (keyword: string) => {
    setCustomKeywords(customKeywords.filter(k => k !== keyword));
  };

  const generateArticle = async () => {
    if (allKeywords.length === 0 || selectedProducts.length === 0) {
      toast.error('Sélectionnez au moins un produit et un mot-clé');
      return;
    }

    setGenerating(true);
    setProgress(0);
    setPreview('');
    setArticleId('');
    setStep(6);

    try {
      setCurrentStep('🔍 Analyse des produits sélectionnés...');
      setProgress(10);
      await new Promise(r => setTimeout(r, 500));

      const collectionTitle = collections.find(c => c.id === selectedCollection)?.title;

      setCurrentStep('🎨 Génération de l\'image de couverture...');
      setProgress(20);
      await new Promise(r => setTimeout(r, 800));

      setCurrentStep('📝 Rédaction de l\'introduction...');
      setProgress(35);
      await new Promise(r => setTimeout(r, 600));

      setCurrentStep('🛍️ Intégration des produits...');
      setProgress(50);

      const { data, error } = await supabase.functions.invoke('generate-blog-article', {
        body: {
          user_id: userId,
          store_id: storeId,
          productIds: selectedProducts,
          collectionIds: [selectedCollection],
          keywords: allKeywords,
          category: collectionTitle,
          articleLength: 2500,
          layout: selectedLayout,
          colorPalette: selectedPalette,
          generateFeaturedImage: true,
        }
      });

      setProgress(70);
      setCurrentStep('🔗 Ajout du netlinking et des liens internes...');
      await new Promise(r => setTimeout(r, 500));

      setProgress(85);
      setCurrentStep('✨ Optimisation SEO et méta-données...');
      await new Promise(r => setTimeout(r, 500));

      setProgress(95);
      setCurrentStep('🎯 Finalisation de l\'article...');

      if (error) throw error;

      if (data?.success && data?.article) {
        setArticleId(data.article.id);
        setPreview(data.article.content || '');
        setProgress(100);
        setCurrentStep('✅ Article généré avec succès!');
        toast.success('Article créé avec succès!');
      } else {
        throw new Error('Erreur lors de la génération');
      }
    } catch (error: any) {
      console.error('Error generating article:', error);
      toast.error(error.message || 'Erreur lors de la génération');
      setStep(5);
    } finally {
      setGenerating(false);
    }
  };

  const publishToShopify = async () => {
    if (!articleId) return;

    try {
      const { error } = await supabase.functions.invoke('sync-blog-to-shopify', {
        body: { articleId }
      });

      if (error) throw error;
      toast.success('Article publié sur Shopify!');
    } catch (error: any) {
      console.error('Error publishing:', error);
      toast.error('Erreur lors de la publication');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl font-serif flex items-center justify-between">
            <span>Assistant de Création d'Article</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-6 pb-6">
          {/* Progress Indicator */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    step > s ? 'bg-primary text-primary-foreground' :
                    step === s ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {step > s ? <Check className="w-5 h-5" /> : s}
                  </div>
                  {s < 6 && (
                <div className={`h-1 w-12 mx-2 transition-all ${
                  step > s ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
        {step < 6 && (
          <div className="text-center text-sm text-muted-foreground">
            Étape {step} sur {totalSteps - 1}
          </div>
        )}
      </Card>

          {/* Step 1: Collection Selection */}
          {step === 1 && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-serif">Choisissez une collection</h2>
                  <p className="text-muted-foreground">Point de départ de votre article</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {collections.map((collection) => (
                  <button
                    key={collection.id}
                    onClick={() => setSelectedCollection(collection.id)}
                    className={`p-6 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                      selectedCollection === collection.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <h3 className="font-semibold mb-2 font-serif">{collection.title}</h3>
                    {selectedCollection === collection.id && (
                      <div className="flex items-center gap-2 text-primary text-sm mt-2">
                        <Check className="w-4 h-4" />
                        <span>Sélectionné</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

            </Card>
          )}

          {/* Step 2: Layout Selection */}
          {step === 2 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Layout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-serif">Choisissez un layout</h2>
              <p className="text-muted-foreground">Style New York Times</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                onClick={() => setSelectedLayout(layout.id)}
                className={`p-6 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                  selectedLayout === layout.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <h3 className="font-semibold mb-2 font-serif">{layout.name}</h3>
                <p className="text-sm text-muted-foreground">{layout.description}</p>
              </button>
            ))}
          </div>

          </Card>
        )}

        {/* Step 3: Color Palette */}
        {step === 3 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-serif">Palette de couleurs</h2>
              <p className="text-muted-foreground">Choisissez l'ambiance visuelle</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4 mb-6">
            {COLOR_PALETTES.map((palette) => (
              <button
                key={palette.id}
                onClick={() => setSelectedPalette(palette.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedPalette === palette.id
                    ? 'border-primary ring-4 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex gap-1 mb-2">
                  {palette.colors.map((color, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-sm font-medium text-center">{palette.name}</p>
              </button>
            ))}
          </div>

        </Card>
      )}

      {/* Step 4: Products Selection */}
      {step === 4 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-serif">Sélection des produits</h2>
              <p className="text-muted-foreground">
                {selectedProducts.length} produit{selectedProducts.length > 1 ? 's' : ''} sélectionné{selectedProducts.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <ScrollArea className="h-[400px] w-full rounded-md border p-4 mb-6">
            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => toggleProduct(product.id)}
                  className={`flex gap-4 cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-lg ${
                    selectedProducts.includes(product.id)
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-24 h-24 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-base mb-1 line-clamp-2">{product.title}</h4>
                    {product.price && (
                      <p className="text-sm text-primary font-semibold mb-1">{product.price}€</p>
                    )}
                    {product.category && (
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                    )}
                  </div>
                  {selectedProducts.includes(product.id) && (
                    <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center self-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

        </Card>
      )}

      {/* Step 5: Keywords */}
      {step === 5 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Tag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-serif">Mots-clés SEO</h2>
              <p className="text-muted-foreground">Suggestions et personnalisation</p>
            </div>
          </div>

          <div className="space-y-6 mb-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Mots-clés suggérés ({suggestedKeywords.length})</Label>
                <Button onClick={selectAllKeywords} variant="outline" size="sm">
                  Tout sélectionner ({selectedKeywords.length}/{suggestedKeywords.length})
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Cliquez sur un mot-clé pour l'ajouter
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedKeywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant={selectedKeywords.includes(keyword) ? "default" : "outline"}
                    className="cursor-pointer text-sm py-1.5 px-3 hover:scale-105 transition-transform"
                    onClick={() => toggleKeyword(keyword)}
                  >
                    {keyword}
                    {selectedKeywords.includes(keyword) && <Check className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block">Vos mots-clés personnalisés</Label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomKeyword()}
                  placeholder="Ex: décoration moderne, tendance 2024..."
                  className="flex-1"
                />
                <Button onClick={addCustomKeyword} variant="outline">Ajouter</Button>
              </div>
              {(selectedKeywords.length > 0 || customKeywords.length > 0) && (
                <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                  {selectedKeywords.map((kw) => (
                    <Badge key={kw} variant="default" className="text-sm py-1.5 px-3">{kw}</Badge>
                  ))}
                  {customKeywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="cursor-pointer text-sm py-1.5 px-3 hover:bg-destructive/10" onClick={() => removeCustomKeyword(kw)}>
                      {kw} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

        </Card>
      )}

      {/* Step 6: Generation & Preview */}
      {step === 6 && (
        <div className="space-y-6">
          {generating && (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{currentStep}</span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} showPercentage={false} className="h-3" />
              </div>
            </Card>
          )}

          {preview && !generating && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold font-serif">Aperçu de l'article</h2>
                    <p className="text-muted-foreground">Prêt à publier</p>
                  </div>
                </div>
              </div>

              <ScrollArea className="h-[600px] w-full rounded-md border p-6">
                <div 
                  className="prose prose-lg dark:prose-invert max-w-none font-serif"
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
              </ScrollArea>
            </Card>
          )}
          </div>
        )}
          </div>
        </div>

        {/* Sticky Footer with Navigation */}
        <div className="sticky bottom-0 border-t bg-background px-6 py-4">
          {step === 1 && (
            <Button 
              onClick={() => setStep(2)} 
              className="w-full" 
              size="lg"
              disabled={!selectedCollection}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Continuer
            </Button>
          )}

          {step === 2 && (
            <div className="flex gap-3">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1" size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1" size="lg">
                <ArrowRight className="w-4 h-4 mr-2" />
                Continuer
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="flex gap-3">
              <Button onClick={() => setStep(2)} variant="outline" className="flex-1" size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <Button onClick={() => setStep(4)} className="flex-1" size="lg">
                <ArrowRight className="w-4 h-4 mr-2" />
                Continuer
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="flex gap-3">
              <Button onClick={() => setStep(3)} variant="outline" className="flex-1" size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <Button onClick={() => setStep(5)} className="flex-1" size="lg" disabled={selectedProducts.length === 0}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Continuer
              </Button>
            </div>
          )}

          {step === 5 && !generating && !preview && (
            <div className="flex gap-3">
              <Button onClick={() => setStep(4)} variant="outline" className="flex-1" size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <Button 
                onClick={generateArticle} 
                className="flex-1"
                size="lg"
                disabled={allKeywords.length === 0}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Générer l'article
              </Button>
            </div>
          )}

          {step === 6 && preview && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                size="lg"
                onClick={() => window.location.href = `/blog?subtab=articles&id=${articleId}`}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Voir l'article
              </Button>
              <Button onClick={publishToShopify} className="flex-1" size="lg">
                <Check className="w-4 h-4 mr-2" />
                Publier sur Shopify
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
