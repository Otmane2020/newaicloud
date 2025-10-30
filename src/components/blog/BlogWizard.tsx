import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  FileText,
  Tag,
  Settings as SettingsIcon,
  Eye,
  CheckCircle,
  Loader2,
  Search,
  Package,
  X
} from 'lucide-react';

interface WizardStep {
  id: number;
  title: string;
  icon: typeof FileText;
  description: string;
}

const steps: WizardStep[] = [
  { id: 1, title: 'Topic', icon: FileText, description: 'Choose topic' },
  { id: 2, title: 'Products', icon: Package, description: 'Select products' },
  { id: 3, title: 'Keywords', icon: Tag, description: 'Add keywords' },
  { id: 4, title: 'Generate', icon: Sparkles, description: 'Create article' },
];

interface BlogWizardProps {
  onClose: () => void;
  categories: string[];
}

interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string;
  price: number;
}

export function BlogWizard({ onClose, categories }: BlogWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [generatedArticleId, setGeneratedArticleId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    category: '',
    keywords: '',
    productCount: 3,
    articleLength: '700' as '700' | '2000' | '4000',
  });

  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { limits, loading: limitsLoading, refresh: refreshLimits } = useUsageLimits();

  useEffect(() => {
    if (user?.id) {
      fetchProducts();
    }
  }, [user?.id]);

  const fetchProducts = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('shopify_products')
        .select('id, title, description, category, image_url, price, product_type')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setProducts(data || []);
      
      // Extraire les catégories uniques
      const uniqueCategories = Array.from(
        new Set(data?.map(p => p.category).filter(Boolean))
      ) as string[];
      
      console.log('📦 Catégories trouvées:', uniqueCategories);
    } catch (err) {
      console.error('Error fetching products:', err);
      toast.error('Erreur lors du chargement des produits');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = !formData.category || 
      product.category?.toLowerCase().includes(formData.category.toLowerCase());
    
    const matchesSearch = !searchTerm || 
      product.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const addKeyword = () => {
    const newKeyword = keywordInput.trim();
    if (newKeyword && !keywords.includes(newKeyword)) {
      setKeywords([...keywords, newKeyword]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    setKeywords(keywords.filter(k => k !== keywordToRemove));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = async () => {
    // Check usage limits first
    if (!limits?.canUseArticles || limits?.shouldForcePayment || limits?.limitReached.articles) {
      toast.error('Limite d\'essai atteinte pour la création d\'articles');
      setShowUpgradeDialog(true);
      return;
    }

    try {
      setGenerating(true);

      if (!user?.id) {
        throw new Error('Utilisateur non connecté');
      }

      const finalKeywords = keywords.length > 0 ? keywords : formData.keywords.split(',').map(k => k.trim()).filter(Boolean);

      // Animation de génération
      toast.loading('🎨 Génération en cours...', { id: 'generating' });

      const response = await supabase.functions.invoke('generate-blog-article', {
        body: {
          user_id: user.id,
          category: formData.category,
          keywords: finalKeywords,
          productIds: selectedProducts.map(p => p.id),
          articleLength: formData.articleLength,
        }
      });

      if (response.error) throw response.error;

      toast.success('✅ Article généré avec succès !', { id: 'generating' });

      // Afficher le dialogue de publication Shopify personnalisé
      if (response.data?.article_id) {
        setGeneratedArticleId(response.data.article_id);
        setShowPublishDialog(true);
      } else {
        onClose();
      }

    } catch (error: any) {
      console.error('Error:', error);
      if (error.message?.includes('trial_limit_reached')) {
        toast.error('Limite d\'essai atteinte. Activez votre abonnement pour continuer.');
        setShowUpgradeDialog(true);
      } else {
        toast.error(error.message || 'Erreur lors de la génération', { id: 'generating' });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handlePublishToShopify = async () => {
    if (!generatedArticleId) return;
    
    try {
      toast.loading('📤 Publication sur Shopify...', { id: 'publishing' });
      
      const syncResponse = await supabase.functions.invoke('sync-blog-to-shopify', {
        body: { articleId: generatedArticleId }
      });

      if (syncResponse.error) {
        toast.error('Erreur de publication Shopify', { id: 'publishing' });
        console.error(syncResponse.error);
      } else {
        toast.success('✅ Article publié sur Shopify !', { id: 'publishing' });
      }
    } catch (error) {
      console.error('Error publishing to Shopify:', error);
      toast.error('Erreur lors de la publication', { id: 'publishing' });
    } finally {
      setShowPublishDialog(false);
      onClose();
    }
  };

  const handleSkipPublish = () => {
    setShowPublishDialog(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Créer un Article Blog</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Usage limits alert */}
          {limits && limits.isTrialing && (
            <Alert className="mb-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <AlertDescription className="text-sm">
                {limits.limitReached.articles ? (
                  <span className="text-orange-900 dark:text-orange-100 font-medium">
                    ⚠️ Limite d'essai atteinte : {limits.usage.articles_count}/{limits.limits.max_articles} articles utilisés
                  </span>
                ) : (
                  <span>
                    📊 Essai gratuit : {limits.usage.articles_count}/{limits.limits.max_articles} articles utilisés
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-primary text-white' :
                      isCompleted ? 'bg-green-600 text-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                    </div>
                    <span className="text-sm mt-2 text-center">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="mb-8">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Catégorie</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Longueur de l'article</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, articleLength: '700' })}
                      className={`px-4 py-3 border rounded-lg text-center transition-all ${
                        formData.articleLength === '700' 
                          ? 'bg-primary text-white border-primary' 
                          : 'bg-white border-gray-300 hover:border-primary'
                      }`}
                    >
                      <div className="font-semibold">Court</div>
                      <div className="text-sm opacity-80">~700 mots</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, articleLength: '2000' })}
                      className={`px-4 py-3 border rounded-lg text-center transition-all ${
                        formData.articleLength === '2000' 
                          ? 'bg-primary text-white border-primary' 
                          : 'bg-white border-gray-300 hover:border-primary'
                      }`}
                    >
                      <div className="font-semibold">Long</div>
                      <div className="text-sm opacity-80">~2000 mots</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, articleLength: '4000' })}
                      className={`px-4 py-3 border rounded-lg text-center transition-all ${
                        formData.articleLength === '4000' 
                          ? 'bg-primary text-white border-primary' 
                          : 'bg-white border-gray-300 hover:border-primary'
                      }`}
                    >
                      <div className="font-semibold">Large</div>
                      <div className="text-sm opacity-80">~4000 mots</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Rechercher des produits..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                  <p className="text-sm">
                    <strong>{selectedProducts.length}</strong> produit(s) sélectionné(s)
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto border rounded-lg p-4">
                  {filteredProducts.map((product) => {
                    const isSelected = !!selectedProducts.find(p => p.id === product.id);
                    
                    return (
                      <Card 
                        key={product.id} 
                        className={`p-4 cursor-pointer transition-all ${
                          isSelected ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
                          } else {
                            setSelectedProducts([...selectedProducts, product]);
                          }
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="w-5 h-5 rounded"
                          />
                          <img 
                            src={product.image_url || '/placeholder.svg'} 
                            alt={product.title} 
                            className="w-20 h-20 object-cover rounded" 
                          />
                          <div className="flex-1">
                            <p className="font-medium line-clamp-2">{product.title}</p>
                            <p className="text-sm text-gray-600 line-clamp-1">{product.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-sm font-semibold text-blue-600">{product.price}€</p>
                              {product.category && (
                                <Badge variant="outline" className="text-xs">
                                  {product.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  
                  {filteredProducts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Aucun produit trouvé</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('blog.keywords_label')}</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t('blog.keyword_tip')}
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder={t('blog.keyword_placeholder')}
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    />
                    <Button onClick={addKeyword} type="button">{t('blog.keyword_add')}</Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="gap-2">
                      {keyword}
                      <button onClick={() => removeKeyword(keyword)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold mb-4">Résumé</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Catégorie:</strong> {formData.category}</p>
                    <p><strong>Longueur:</strong> {formData.articleLength === '700' ? 'Court (~700 mots)' : formData.articleLength === '2000' ? 'Long (~2000 mots)' : 'Large (~4000 mots)'}</p>
                    <p><strong>Produits:</strong> {selectedProducts.length}</p>
                    <p><strong>Mots-clés:</strong> {keywords.join(', ')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
            
            {currentStep < steps.length ? (
              <Button onClick={handleNext}>
                Suivant
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Générer l'article
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>
      
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType="articles"
        usage={limits?.usage.articles_count}
        limit={limits?.limits.max_articles}
      />

      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              🚀 Votre article est prêt !
            </AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous le publier immédiatement sur Shopify ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipPublish}>
              Plus tard
            </AlertDialogCancel>
            <AlertDialogAction onClick={handlePublishToShopify}>
              Publier sur Shopify
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
