import { useState } from 'react';
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
  selectedCollection: string;
  products: any[];
  selectedProducts: string[];
  suggestedKeywords: string[];
  selectedKeywords: string[];
  onToggleProduct: (id: string) => void;
  onToggleKeyword: (keyword: string) => void;
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
  selectedCollection,
  products,
  selectedProducts,
  suggestedKeywords,
  selectedKeywords,
  onToggleProduct,
  onToggleKeyword,
  userId,
  storeId
}: ArticleWizardProps) {
  const [step, setStep] = useState(1);
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
  const totalSteps = 5;

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
    setStep(5);

    try {
      setCurrentStep('Analyse des produits...');
      setProgress(15);

      const collectionTitle = collections.find(c => c.id === selectedCollection)?.title;

      setCurrentStep('Génération de l\'image featured...');
      setProgress(30);

      setCurrentStep('Rédaction de l\'article...');
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

      setProgress(85);
      setCurrentStep('Finalisation...');

      if (error) throw error;

      if (data?.success && data?.article) {
        setArticleId(data.article.id);
        setPreview(data.article.content || '');
        setProgress(100);
        setCurrentStep('Article généré avec succès!');
        toast.success('Article créé avec succès!');
      } else {
        throw new Error('Erreur lors de la génération');
      }
    } catch (error: any) {
      console.error('Error generating article:', error);
      toast.error(error.message || 'Erreur lors de la génération');
      setStep(4);
    } finally {
      setGenerating(false);
    }
  };

  const publishToShopify = async () => {
    if (!articleId) return;

    try {
      const { error } = await supabase.functions.invoke('sync-blog-to-shopify', {
        body: { article_ids: [articleId] }
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
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

        <div className="space-y-6 mt-4">
          {/* Progress Indicator */}
          <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                step > s ? 'bg-primary text-primary-foreground' :
                step === s ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                'bg-muted text-muted-foreground'
              }`}>
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 5 && (
                <div className={`h-1 w-12 mx-2 transition-all ${
                  step > s ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-muted-foreground">
          Étape {step} sur {totalSteps}
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

          <Button onClick={() => setStep(2)} className="w-full" size="lg">
            <ArrowRight className="w-4 h-4 mr-2" />
            Continuer
          </Button>
        </Card>
      )}

      {/* Step 2: Color Palette */}
      {step === 2 && (
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

          <div className="flex gap-3">
            <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <Button onClick={() => setStep(3)} className="flex-1">
              <ArrowRight className="w-4 h-4 mr-2" />
              Continuer
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Products Selection */}
      {step === 3 && (
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => onToggleProduct(product.id)}
                  className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-lg ${
                    selectedProducts.includes(product.id)
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
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
                  <h4 className="font-medium text-sm line-clamp-2 mb-1">{product.title}</h4>
                  {product.price && (
                    <p className="text-sm text-primary font-semibold">{product.price}€</p>
                  )}
                  {selectedProducts.includes(product.id) && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex gap-3">
            <Button onClick={() => setStep(2)} variant="outline" className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <Button onClick={() => setStep(4)} className="flex-1" disabled={selectedProducts.length === 0}>
              <ArrowRight className="w-4 h-4 mr-2" />
              Continuer
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Keywords */}
      {step === 4 && (
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
              <Label className="text-base font-semibold mb-3 block">Mots-clés suggérés</Label>
              <div className="flex flex-wrap gap-2">
                {suggestedKeywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant={selectedKeywords.includes(keyword) ? "default" : "outline"}
                    className="cursor-pointer text-sm py-1 px-3"
                    onClick={() => onToggleKeyword(keyword)}
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block">Ajouter vos mots-clés</Label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomKeyword()}
                  placeholder="Ex: décoration moderne, tendance 2024..."
                  className="flex-1"
                />
                <Button onClick={addCustomKeyword} variant="outline">
                  Ajouter
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {customKeywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="secondary"
                    className="cursor-pointer text-sm py-1 px-3"
                    onClick={() => removeCustomKeyword(keyword)}
                  >
                    {keyword} ×
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => setStep(3)} variant="outline" className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <Button 
              onClick={generateArticle} 
              className="flex-1"
              disabled={allKeywords.length === 0}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Générer l'article
            </Button>
          </div>
        </Card>
      )}

      {/* Step 5: Generation & Preview */}
      {step === 5 && (
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
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = `/blog?subtab=articles&id=${articleId}`}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Voir l'article
                  </Button>
                  <Button onClick={publishToShopify}>
                    <Check className="w-4 h-4 mr-2" />
                    Publier sur Shopify
                  </Button>
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
      </DialogContent>
    </Dialog>
  );
}
