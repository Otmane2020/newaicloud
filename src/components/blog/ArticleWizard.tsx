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
  X,
  Search,
  Grid3x3,
  Image,
  FileText,
  LayoutGrid
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
  { 
    id: 'editorial', 
    name: 'Éditorial', 
    description: 'Style magazine avec grandes images et texte riche',
    icon: FileText
  },
  { 
    id: 'gallery', 
    name: 'Galerie', 
    description: 'Focus sur les visuels avec grille d\'images',
    icon: LayoutGrid
  },
  { 
    id: 'grid', 
    name: 'Grille Produits', 
    description: 'Présentation structurée des produits',
    icon: Grid3x3
  },
  { 
    id: 'story', 
    name: 'Storytelling', 
    description: 'Narration immersive avec produits intégrés',
    icon: Image
  },
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
  const [productSearch, setProductSearch] = useState('');

  const allKeywords = [...selectedKeywords, ...customKeywords];
  const totalSteps = 6;

  // Load products when collection changes
  useEffect(() => {
    if (selectedCollection && open) {
      loadProducts();
    }
  }, [selectedCollection, open]);

  // Generate keywords when products are selected
  useEffect(() => {
    if (selectedProducts.length > 0) {
      generateKeywords();
    }
  }, [selectedProducts]);

  const loadProducts = async () => {
    if (!selectedCollection || !storeId) {
      console.log('Cannot load products: missing collection or store_id', { selectedCollection, storeId });
      return;
    }
    
    try {
      console.log('Loading products for collection:', selectedCollection, 'store:', storeId);
      
      const { data, error } = await supabase
        .from('shopify_products')
        .select('id, title, price, image_url, category, handle, tags, description')
        .eq('store_id', storeId)
        .contains('collection_ids', [selectedCollection])
        .limit(30);

      console.log('Products loaded:', { count: data?.length, error });

      if (error) throw error;
      setProducts(data || []);
      setSelectedProducts([]);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const generateKeywords = async () => {
    if (selectedProducts.length === 0) return;
    
    try {
      const { data: products } = await supabase
        .from('shopify_products')
        .select('title, tags, category, description')
        .in('id', selectedProducts);

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
      setSelectedKeywords([]);
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
    setSelectedKeywords(prev => {
      if (prev.includes(keyword)) {
        return prev.filter(k => k !== keyword);
      } else {
        return [...prev, keyword];
      }
    });
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
              {[
                { num: 1, label: 'Layout' },
                { num: 2, label: 'Collection' },
                { num: 3, label: 'Couleurs' },
                { num: 4, label: 'Produits' },
                { num: 5, label: 'Mots-clés' },
                { num: 6, label: 'Génération' }
              ].map((s, idx) => (
                <div key={s.num} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      step > s.num ? 'bg-primary text-primary-foreground' :
                      step === s.num ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                    </div>
                    <span className={`text-xs mt-1 ${step === s.num ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      {s.label}
                    </span>
                  </div>
                  {idx < 5 && (
                <div className={`h-1 w-8 mx-2 transition-all ${
                  step > s.num ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
      </Card>

          {/* Step 1: Layout Selection */}
          {step === 1 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Layout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-serif">Layout de la page</h2>
              <p className="text-muted-foreground">Choisissez la structure visuelle de votre article</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Editorial Layout */}
            <button
              onClick={() => setSelectedLayout('editorial')}
              className={`group relative p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                selectedLayout === 'editorial'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {selectedLayout === 'editorial' && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="mb-3">
                <div className="bg-gradient-to-b from-muted to-muted/50 rounded p-2 h-20 flex flex-col gap-1.5">
                  <div className="h-10 bg-primary/20 rounded animate-fade-in" />
                  <div className="space-y-1">
                    <div className="h-1 bg-foreground/10 rounded w-full" />
                    <div className="h-1 bg-foreground/10 rounded w-4/5" />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-sm mb-0.5 font-serif">Éditorial</h3>
                <p className="text-xs text-muted-foreground">Magazine, grandes images</p>
              </div>
            </button>

            {/* Gallery Layout */}
            <button
              onClick={() => setSelectedLayout('gallery')}
              className={`group relative p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                selectedLayout === 'gallery'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {selectedLayout === 'gallery' && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="mb-3">
                <div className="bg-gradient-to-b from-muted to-muted/50 rounded p-2 h-20">
                  <div className="grid grid-cols-3 gap-1.5 h-full">
                    <div className="bg-primary/20 rounded" />
                    <div className="bg-primary/20 rounded" />
                    <div className="bg-primary/20 rounded" />
                    <div className="bg-primary/20 rounded" />
                    <div className="bg-primary/20 rounded" />
                    <div className="bg-primary/20 rounded" />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-sm mb-0.5 font-serif">Galerie</h3>
                <p className="text-xs text-muted-foreground">Grille d'images</p>
              </div>
            </button>

            {/* Grid Layout */}
            <button
              onClick={() => setSelectedLayout('grid')}
              className={`group relative p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                selectedLayout === 'grid'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {selectedLayout === 'grid' && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="mb-3">
                <div className="bg-gradient-to-b from-muted to-muted/50 rounded p-2 h-20 flex gap-2">
                  <div className="flex-1 bg-primary/20 rounded" />
                  <div className="flex-1 space-y-1">
                    <div className="h-1 bg-foreground/10 rounded" />
                    <div className="h-1 bg-foreground/10 rounded w-4/5" />
                    <div className="h-1 bg-foreground/10 rounded w-3/4" />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-sm mb-0.5 font-serif">Grille Produits</h3>
                <p className="text-xs text-muted-foreground">Image + Texte</p>
              </div>
            </button>

            {/* Story Layout */}
            <button
              onClick={() => setSelectedLayout('story')}
              className={`group relative p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                selectedLayout === 'story'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {selectedLayout === 'story' && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="mb-3">
                <div className="bg-gradient-to-b from-muted to-muted/50 rounded p-2 h-20 flex gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="h-1 bg-foreground/10 rounded" />
                    <div className="h-1 bg-foreground/10 rounded w-4/5" />
                    <div className="h-1 bg-foreground/10 rounded w-3/4" />
                  </div>
                  <div className="flex-1 bg-primary/20 rounded" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-sm mb-0.5 font-serif">Hero Droite</h3>
                <p className="text-xs text-muted-foreground">Image dominante</p>
              </div>
            </button>
          </div>

          </Card>
        )}

          {/* Step 2: Collection Selection */}
          {step === 2 && (
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

              {collections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune collection trouvée. Veuillez importer vos collections Shopify.
                </div>
              ) : (
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
                      <p className="text-xs text-muted-foreground mb-2">
                        {collection.products_count || 0} produit{(collection.products_count || 0) !== 1 ? 's' : ''}
                      </p>
                      {selectedCollection === collection.id && (
                        <div className="flex items-center gap-2 text-primary text-sm mt-2">
                          <Check className="w-4 h-4" />
                          <span>Sélectionné</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

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
            <div className="flex-1">
              <h2 className="text-2xl font-bold font-serif">Sélection des produits</h2>
            </div>
          </div>

          <div className="mb-4">
            <Input
              type="text"
              placeholder="Rechercher un produit..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {(() => {
                const filteredProducts = products.filter(product => 
                  product.title.toLowerCase().includes(productSearch.toLowerCase()) ||
                  product.category?.toLowerCase().includes(productSearch.toLowerCase())
                );
                return `${selectedProducts.length} produit${selectedProducts.length !== 1 ? 's' : ''} sélectionné${selectedProducts.length !== 1 ? 's' : ''} sur ${filteredProducts.length}`;
              })()}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const filteredProducts = products.filter(product => 
                  product.title.toLowerCase().includes(productSearch.toLowerCase()) ||
                  product.category?.toLowerCase().includes(productSearch.toLowerCase())
                );
                const filteredIds = filteredProducts.map(p => p.id);
                const allFilteredSelected = filteredIds.every(id => selectedProducts.includes(id));
                
                if (allFilteredSelected) {
                  setSelectedProducts(selectedProducts.filter(id => !filteredIds.includes(id)));
                } else {
                  setSelectedProducts([...new Set([...selectedProducts, ...filteredIds])]);
                }
              }}
            >
              Tout sélectionner
            </Button>
          </div>

          <ScrollArea className="h-[400px] w-full rounded-md border p-4 mb-6">
            <div className="space-y-3">
              {products
                .filter(product => 
                  product.title.toLowerCase().includes(productSearch.toLowerCase()) ||
                  product.category?.toLowerCase().includes(productSearch.toLowerCase())
                )
                .map((product) => (
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
                <Label className="text-base font-semibold">
                  Mots-clés suggérés ({suggestedKeywords.filter(kw => !selectedKeywords.includes(kw)).length})
                </Label>
                <Button onClick={selectAllKeywords} variant="outline" size="sm">
                  Tout sélectionner
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Cliquez sur un mot-clé pour l'ajouter
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedKeywords
                  .filter(keyword => !selectedKeywords.includes(keyword))
                  .map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="outline"
                    className="cursor-pointer text-sm py-1.5 px-3 hover:scale-105 transition-transform"
                    onClick={() => toggleKeyword(keyword)}
                  >
                    {keyword}
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
              disabled={!selectedLayout}
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
              <Button onClick={() => setStep(3)} className="flex-1" size="lg" disabled={!selectedCollection}>
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
