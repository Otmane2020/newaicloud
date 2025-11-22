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
  LayoutGrid,
  BookOpen,
  Scale,
  Star,
  GraduationCap,
  ExternalLink,
  Upload
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { responsiveDialogClasses } from '@/lib/dialogUtils';

interface ArticleWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: any[];
  userId: string;
  storeId: string;
  onArticleCreated?: () => void;
  initialData?: {
    title?: string;
    collectionId?: string;
    productIds?: string[];
    keywords?: string[];
    angle?: string;
    wordCount?: number;
    metaDescription?: string;
  };
  autoGenerate?: boolean;
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
  { id: 'modern', name: 'Moderne', colors: ['#1a1a1a', '#4a4a4a', '#808080', '#c0c0c0', '#e8e8e8'] },
  { id: 'earth', name: 'Terreux', colors: ['#3d2817', '#6b4423', '#9c8577', '#c9b5a0', '#e8d9cc'] },
  { id: 'green', name: 'Frais Vert', colors: ['#1b5e20', '#43a047', '#66bb6a', '#81c784', '#a5d6a7'] },
  { id: 'blue', name: 'Professionnel Bleu', colors: ['#003d82', '#0066cc', '#3399ff', '#66b3ff', '#99ccff'] },
  { id: 'gold', name: 'Luxe Or', colors: ['#1a1a1a', '#4a4a4a', '#c5a647', '#d4af37', '#f0e68c'] },
  { id: 'vibrant', name: 'Vibrant', colors: ['#c62828', '#e53935', '#ef5350', '#e57373', '#ef9a9a'] },
  { id: 'custom', name: 'Personnalisé', colors: ['#000000', '#ffffff', '#0066cc'] },
];

const ARTICLE_LENGTHS = [
  { value: 700, label: '700 mots', description: 'Article court et concis' },
  { value: 2000, label: '2000 mots', description: 'Article détaillé et complet' },
];

const EDITORIAL_ANGLES = [
  {
    id: 'guide',
    name: 'Guide',
    description: 'Guide complet',
    icon: BookOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    hoverBg: 'hover:bg-blue-100',
    borderColor: 'border-blue-200'
  },
  {
    id: 'comparatif',
    name: 'Comparatif',
    description: 'Comparaison produits',
    icon: Scale,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    hoverBg: 'hover:bg-amber-100',
    borderColor: 'border-amber-200'
  },
  {
    id: 'avis',
    name: 'Avis',
    description: 'Tests et avis',
    icon: Star,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    hoverBg: 'hover:bg-yellow-100',
    borderColor: 'border-yellow-200'
  },
  {
    id: 'tutoriel',
    name: 'Tutoriel',
    description: 'Guide pratique',
    icon: GraduationCap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    hoverBg: 'hover:bg-purple-100',
    borderColor: 'border-purple-200'
  }
];

export function ArticleWizard({ 
  open, 
  onOpenChange, 
  collections, 
  userId, 
  storeId,
  onArticleCreated,
  initialData,
  autoGenerate = false
}: ArticleWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedAngle, setSelectedAngle] = useState('guide');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedLayout, setSelectedLayout] = useState('editorial');
  const [selectedPalette, setSelectedPalette] = useState('modern');
  const [customColors, setCustomColors] = useState({ primary: '#000000', secondary: '#ffffff', accent: '#0066cc' });
  const [customKeywords, setCustomKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [articleLength, setArticleLength] = useState(2000);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [preview, setPreview] = useState<string>('');
  const [articleId, setArticleId] = useState<string>('');
  const [syncedToShopify, setSyncedToShopify] = useState(false);
  const [shopifyArticleUrl, setShopifyArticleUrl] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [suggestedTitle, setSuggestedTitle] = useState<string>('');
  const [generatingKeywords, setGeneratingKeywords] = useState(false);
  const PRODUCTS_PER_PAGE = 50;

  const allKeywords = [...selectedKeywords, ...customKeywords];
  const totalSteps = 7;

  // Initialize with opportunity data
  useEffect(() => {
    if (initialData && open) {
      console.log('📋 ArticleWizard - Initializing with data:', initialData);
      if (initialData.collectionId) {
        setSelectedCollection(initialData.collectionId);
        console.log('✅ Set collection:', initialData.collectionId);
      }
      if (initialData.productIds && initialData.productIds.length > 0) {
        setSelectedProducts(initialData.productIds);
        console.log('✅ Set products:', initialData.productIds);
      }
      if (initialData.keywords && initialData.keywords.length > 0) {
        setSelectedKeywords(initialData.keywords.slice(0, 3));
        setCustomKeywords(initialData.keywords.slice(3));
        console.log('✅ Set keywords:', initialData.keywords);
      }
      if (initialData.title) {
        setSuggestedTitle(initialData.title);
        console.log('✅ Set title:', initialData.title);
      }
      if (initialData.angle) {
        const angleMap: Record<string, string> = {
          'guide': 'guide',
          'comparison': 'comparatif',
          'tutorial': 'tutoriel',
          'selection': 'avis'
        };
        setSelectedAngle(angleMap[initialData.angle] || 'guide');
      }
      if (initialData.wordCount) setArticleLength(initialData.wordCount);
      if (initialData.title) setSuggestedTitle(initialData.title);
      
      // If auto-generate, skip to final step
      if (autoGenerate) {
        setStep(7);
        setTimeout(() => generateArticle(), 1000);
      }
    }
  }, [initialData, open, autoGenerate]);

  // Load products when collection changes
  useEffect(() => {
    if (selectedCollection && open) {
      setProductPage(1);
      loadProducts(1);
    }
  }, [selectedCollection, open]);
  
  // Afficher toutes les collections passées (déjà filtrées dans Blog.tsx)
  const filteredCollections = collections;
  
  console.log('ArticleWizard - Collections:', {
    totalCollections: collections.length,
    storeId,
    collections: collections.map(c => ({ id: c.id, title: c.title, store_id: c.store_id }))
  });

  // Reload products when search changes (with debounce)
  useEffect(() => {
    if (selectedCollection) {
      const timer = setTimeout(() => {
        setProductPage(1);
        loadProducts(1, productSearch);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [productSearch]);

  // Generate keywords when products are selected
  useEffect(() => {
    if (selectedProducts.length > 0) {
      generateKeywords();
    }
  }, [selectedProducts]);

  const loadProducts = async (page: number = 1, search: string = productSearch) => {
    if (!selectedCollection || !storeId) {
      console.log('Cannot load products: missing collection or store_id', { selectedCollection, storeId });
      return;
    }
    
    try {
      console.log('Loading products for collection:', selectedCollection, 'store:', storeId, 'page:', page, 'search:', search);
      
      const from = (page - 1) * PRODUCTS_PER_PAGE;
      const to = from + PRODUCTS_PER_PAGE - 1;
      
      // Build query with search
      let query = supabase
        .from('shopify_products')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .contains('collection_ids', [selectedCollection]);
      
      if (search) {
        query = query.or(`title.ilike.%${search}%,category.ilike.%${search}%`);
      }
      
      const { count } = await query;
      setTotalProducts(count || 0);
      
      // Get products for current page
      let dataQuery = supabase
        .from('shopify_products')
        .select('id, title, price, image_url, category, handle, tags, description')
        .eq('store_id', storeId)
        .contains('collection_ids', [selectedCollection]);
      
      if (search) {
        dataQuery = dataQuery.or(`title.ilike.%${search}%,category.ilike.%${search}%`);
      }
      
      const { data, error } = await dataQuery
        .range(from, to)
        .order('title');

      console.log('Products loaded:', { count: data?.length, total: count, error });

      if (error) throw error;
      
      // Si on est en page 1, remplacer, sinon ajouter (infinite scroll)
      if (page === 1) {
        setProducts(data || []);
      } else {
        setProducts(prev => [...prev, ...(data || [])]);
      }
      
      setProductPage(page);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Erreur lors du chargement des produits');
    }
  };

  const generateKeywords = async () => {
    if (selectedProducts.length === 0) return;
    
    setGeneratingKeywords(true);
    try {
      const collectionName = collections.find(c => c.id === selectedCollection)?.title || '';
      
      const { data, error } = await supabase.functions.invoke('generate-article-keywords', {
        body: {
          productIds: selectedProducts,
          collectionName
        }
      });

      if (error) throw error;

      if (data?.success) {
        // Combiner les mots-clés courts et longs
        const allKeywords = [
          ...(data.shortKeywords || []),
          ...(data.longKeywords || [])
        ];
        
        setSuggestedKeywords(allKeywords);
        setSuggestedTitle(data.articleTitle || '');
        setSelectedKeywords([]);
        
        toast.success('Mots-clés intelligents générés avec DeepSeek AI');
      } else {
        throw new Error(data?.error || 'Failed to generate keywords');
      }
    } catch (error) {
      console.error('Error generating keywords:', error);
      toast.error('Erreur lors de la génération des mots-clés');
    } finally {
      setGeneratingKeywords(false);
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
    setStep(7);

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
          articleLength: articleLength,
          layout: selectedLayout,
          colorPalette: selectedPalette,
          customColors: selectedPalette === 'custom' ? customColors : undefined,
          editorialAngle: selectedAngle,
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
        onArticleCreated?.(); // Notify parent that article was created
      } else {
        throw new Error('Erreur lors de la génération');
      }
    } catch (error: any) {
      console.error('Error generating article:', error);
      toast.error(error.message || 'Erreur lors de la génération');
      setStep(6);
    } finally {
      setGenerating(false);
    }
  };

  const publishToShopify = async () => {
    if (!articleId || !storeId) return;

    try {
      const { data, error } = await supabase.functions.invoke('sync-blog-to-shopify', {
        body: { 
          articleId,
          shopify_connection_id: storeId
        }
      });

      if (error) throw error;

      setSyncedToShopify(true);
      if (data?.articleUrl) {
        setShopifyArticleUrl(data.articleUrl);
      }

      toast.success('Article publié sur Shopify!');

      if (onArticleCreated) {
        onArticleCreated();
      }
    } catch (error: any) {
      console.error('Error publishing:', error);
      toast.error('Erreur lors de la publication');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl font-serif">
            Assistant de Création d'Article
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-6 pb-6">
          {/* Progress Indicator - Hidden on preview step */}
          {step !== 7 && (
            <div className="p-6 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-4">
                {[
                  { num: 1, label: 'Angle' },
                  { num: 2, label: 'Layout' },
                  { num: 3, label: 'Collection' },
                  { num: 4, label: 'Couleurs' },
                  { num: 5, label: 'Produits' },
                  { num: 6, label: 'Mots-clés' },
                  { num: 7, label: 'Génération' }
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
                    {idx < 6 && (
                  <div className={`h-1 w-8 mx-2 transition-all ${
                    step > s.num ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

          {/* Step 1: Editorial Angle Selection */}
          {step === 1 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-serif">Angle éditorial</h2>
              <p className="text-muted-foreground">Choisissez le type d'article que vous souhaitez créer</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {EDITORIAL_ANGLES.map((angle) => {
              const Icon = angle.icon;
              return (
                <button
                  key={angle.id}
                  onClick={() => setSelectedAngle(angle.id)}
                  className={`group relative p-6 rounded-lg border-2 transition-all hover:shadow-md ${
                    selectedAngle === angle.id
                      ? `border-primary bg-primary/5 ring-2 ring-primary/20`
                      : `border-border ${angle.hoverBg}`
                  }`}
                >
                  {selectedAngle === angle.id && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className={`w-14 h-14 rounded-full ${angle.bgColor} flex items-center justify-center border-2 ${angle.borderColor}`}>
                      <Icon className={`w-7 h-7 ${angle.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1 font-serif">{angle.name}</h3>
                      <p className="text-sm text-muted-foreground">{angle.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
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

          {/* Step 3: Collection Selection */}
          {step === 3 && (
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

              {filteredCollections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-2">Aucune collection trouvée.</p>
                  {collections.length > 0 ? (
                    <div className="text-xs space-y-1">
                      <p>Collections totales: {collections.length}</p>
                      <p>Store ID actuel: {storeId || 'non défini'}</p>
                      <p className="text-destructive">Les collections ne correspondent pas au store actuel.</p>
                      <p>Veuillez vérifier votre connexion Shopify.</p>
                    </div>
                  ) : (
                    <p className="text-xs">Veuillez importer vos collections Shopify.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {filteredCollections.map((collection) => (
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

        {/* Step 4: Color Palette */}
        {step === 4 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-serif">Palette de couleurs</h2>
              <p className="text-muted-foreground">Choisissez des couleurs professionnelles</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {COLOR_PALETTES.map((palette) => (
              <button
                key={palette.id}
                onClick={() => setSelectedPalette(palette.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedPalette === palette.id
                    ? 'border-primary ring-4 ring-primary/20 shadow-lg'
                    : 'border-border hover:border-primary/50 hover:shadow-md'
                }`}
              >
                <div className="flex gap-1.5 mb-3 justify-center">
                  {palette.colors.map((color, i) => {
                    const isLight = color.toLowerCase() === '#ffffff' || color.toLowerCase() === '#fff' || 
                                   color.toLowerCase() === '#fafafa' || color.toLowerCase() === '#e8e8e8' ||
                                   color.toLowerCase() === '#f8f9fa' || color.toLowerCase() === '#c0c0c0' ||
                                   color.toLowerCase() === '#e8d9cc' || color.toLowerCase() === '#a5d6a7' ||
                                   color.toLowerCase() === '#99ccff' || color.toLowerCase() === '#f0e68c' ||
                                   color.toLowerCase() === '#ef9a9a';
                    return (
                      <div
                        key={i}
                        className={`w-7 h-7 rounded-md shadow-sm ${isLight ? 'border border-gray-300' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    );
                  })}
                </div>
                <p className="text-xs font-medium text-center">{palette.name}</p>
              </button>
            ))}
          </div>

          {/* Article Length Selection */}
          <div className="mb-6">
            <Label className="text-base font-semibold mb-3 block">Longueur de l'article</Label>
            <div className="grid grid-cols-2 gap-3">
              {ARTICLE_LENGTHS.map((length) => (
                <button
                  key={length.value}
                  onClick={() => setArticleLength(length.value)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    articleLength === length.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{length.label}</span>
                    {articleLength === length.value && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{length.description}</p>
                </button>
              ))}
            </div>
          </div>

          {selectedPalette === 'custom' && (
            <div className="mt-6 p-6 bg-muted/50 rounded-lg border-2 border-dashed border-border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Couleurs personnalisées
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Couleur principale</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={customColors.primary}
                      onChange={(e) => setCustomColors({...customColors, primary: e.target.value})}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={customColors.primary}
                      onChange={(e) => setCustomColors({...customColors, primary: e.target.value})}
                      placeholder="#000000"
                      className="flex-1"
                      pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Couleur secondaire</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={customColors.secondary}
                      onChange={(e) => setCustomColors({...customColors, secondary: e.target.value})}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={customColors.secondary}
                      onChange={(e) => setCustomColors({...customColors, secondary: e.target.value})}
                      placeholder="#ffffff"
                      className="flex-1"
                      pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Couleur accent</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={customColors.accent}
                      onChange={(e) => setCustomColors({...customColors, accent: e.target.value})}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={customColors.accent}
                      onChange={(e) => setCustomColors({...customColors, accent: e.target.value})}
                      placeholder="#0066cc"
                      className="flex-1"
                      pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                💡 Astuce : Utilisez des codes hexadécimaux (#000000) pour des couleurs précises
              </p>
            </div>
          )}

        </Card>
      )}

      {/* Step 5: Products Selection */}
      {step === 5 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold font-serif">Sélection des produits</h2>
            </div>
          </div>

          <div className="mb-4 sticky top-0 bg-background z-10 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher un produit..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {selectedProducts.length} produit{selectedProducts.length !== 1 ? 's' : ''} sélectionné{selectedProducts.length !== 1 ? 's' : ''} sur {totalProducts}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allSelected = products.every(p => selectedProducts.includes(p.id));
                if (allSelected) {
                  setSelectedProducts(selectedProducts.filter(id => !products.map(p => p.id).includes(id)));
                } else {
                  setSelectedProducts([...new Set([...selectedProducts, ...products.map(p => p.id)])]);
                }
              }}
            >
              {products.every(p => selectedProducts.includes(p.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
            </Button>
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

          {/* Pagination moderne */}
          {totalProducts > PRODUCTS_PER_PAGE && (
            <div className="flex flex-col items-center gap-4 mt-6">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    const newPage = Math.max(1, productPage - 1);
                    setProductPage(newPage);
                    loadProducts(newPage, productSearch);
                  }}
                  variant="outline"
                  size="sm"
                  disabled={productPage === 1}
                >
                  Précédent
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(totalProducts / PRODUCTS_PER_PAGE)) }, (_, i) => {
                    const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);
                    let pageNum;
                    
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (productPage <= 3) {
                      pageNum = i + 1;
                    } else if (productPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = productPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => {
                          setProductPage(pageNum);
                          loadProducts(pageNum, productSearch);
                        }}
                        variant={productPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  onClick={() => {
                    const newPage = Math.min(Math.ceil(totalProducts / PRODUCTS_PER_PAGE), productPage + 1);
                    setProductPage(newPage);
                    loadProducts(newPage, productSearch);
                  }}
                  variant="outline"
                  size="sm"
                  disabled={productPage >= Math.ceil(totalProducts / PRODUCTS_PER_PAGE)}
                >
                  Suivant
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Page {productPage} sur {Math.ceil(totalProducts / PRODUCTS_PER_PAGE)} ({totalProducts} produits au total)
              </p>
            </div>
          )}

        </Card>
      )}

      {/* Step 6: Keywords */}
      {step === 6 && (
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
            {/* Titre suggéré */}
            {suggestedTitle && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <Label className="text-sm font-semibold text-primary mb-2 block flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Titre d'article suggéré par l'IA
                </Label>
                <p className="text-lg font-serif font-bold">{suggestedTitle}</p>
              </div>
            )}

            {/* Loading state */}
            {generatingKeywords && (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-muted-foreground">Génération de mots-clés intelligents avec DeepSeek AI...</p>
              </div>
            )}

            {/* Keywords section */}
            {!generatingKeywords && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Mots-clés suggérés par l'IA ({suggestedKeywords.filter(kw => !selectedKeywords.includes(kw)).length})
                    </Label>
                    <Button onClick={selectAllKeywords} variant="outline" size="sm">
                      Tout sélectionner
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Mots-clés courts et phrases longues optimisés SEO - Cliquez pour ajouter
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedKeywords
                      .filter(keyword => !selectedKeywords.includes(keyword))
                      .map((keyword) => (
                      <Badge
                        key={keyword}
                        variant="outline"
                        className="cursor-pointer text-sm py-1.5 px-3 hover:scale-105 transition-transform hover:bg-primary/10"
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
              </>
            )}
          </div>

        </Card>
      )}

      {/* Step 7: Generation & Preview */}
      {step === 7 && (
        <div className="space-y-6">
          {generating && (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium animate-pulse">{currentStep}</span>
                  <span className="text-sm text-muted-foreground animate-fade-in">{progress}%</span>
                </div>
                <Progress value={progress} showPercentage={false} className="h-3" />
              </div>
            </Card>
          )}

          {preview && !generating && (
            <Dialog open={true} onOpenChange={() => setPreview("")}>
              <DialogContent className={`${responsiveDialogClasses.xxlarge} max-h-[90vh] p-0`}>
                {/* Compact Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    <DialogTitle className="text-base font-semibold">Aperçu de l'article</DialogTitle>
                  </div>
                </div>
                
                <ScrollArea className="h-[calc(90vh-130px)] px-8 py-6">
                  <div className="max-w-5xl mx-auto">
                    <div 
                      className="prose prose-xl dark:prose-invert max-w-none font-serif"
                      dangerouslySetInnerHTML={{ __html: preview }}
                    />
                  </div>
                </ScrollArea>

                <div className="flex gap-2 p-4 border-t bg-muted/10">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setPreview("");
                      setStep(1);
                    }}
                  >
                    Créer un autre article
                  </Button>
                  {syncedToShopify ? (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        if (shopifyArticleUrl) {
                          window.open(shopifyArticleUrl, '_blank');
                        }
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Visualiser en ligne
                    </Button>
                  ) : (
                    <Button onClick={publishToShopify} className="flex-1">
                      <Upload className="w-4 h-4 mr-2" />
                      Synchroniser
                    </Button>
                  )}
                </div>
              </DialogContent>
            </Dialog>
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
              disabled={!selectedAngle}
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
              <Button onClick={() => setStep(3)} className="flex-1" size="lg" disabled={!selectedLayout}>
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
              <Button onClick={() => setStep(4)} className="flex-1" size="lg" disabled={!selectedCollection}>
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
              <Button onClick={() => setStep(5)} className="flex-1" size="lg">
                <ArrowRight className="w-4 h-4 mr-2" />
                Continuer
              </Button>
            </div>
          )}

          {step === 5 && (
            <div className="flex gap-3">
              <Button onClick={() => setStep(4)} variant="outline" className="flex-1" size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <Button onClick={() => setStep(6)} className="flex-1" size="lg" disabled={selectedProducts.length === 0}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Continuer
              </Button>
            </div>
          )}

          {step === 6 && !generating && !preview && (
            <div className="flex gap-3">
              <Button onClick={() => setStep(5)} variant="outline" className="flex-1" size="lg">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
