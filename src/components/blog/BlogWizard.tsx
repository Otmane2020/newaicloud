import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
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
  const [currentStep, setCurrentStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  const [formData, setFormData] = useState({
    category: '',
    keywords: '',
    productCount: 3,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('shopify_products')
        .select('*')
        .limit(50);

      if (error) throw error;
      setProducts(data || []);
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
    try {
      setGenerating(true);

      const finalKeywords = keywords.length > 0 ? keywords : formData.keywords.split(',').map(k => k.trim()).filter(Boolean);

      const response = await supabase.functions.invoke('generate-blog-article', {
        body: {
          category: formData.category,
          keywords: finalKeywords,
          productIds: selectedProducts.map(p => p.id),
        }
      });

      if (response.error) throw response.error;

      toast.success('Article généré avec succès !');
      onClose();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
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
                <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {filteredProducts.slice(0, formData.productCount).map((product) => (
                    <Card key={product.id} className="p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        if (selectedProducts.find(p => p.id === product.id)) {
                          setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
                        } else if (selectedProducts.length < formData.productCount) {
                          setSelectedProducts([...selectedProducts, product]);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={!!selectedProducts.find(p => p.id === product.id)}
                          readOnly
                          className="rounded"
                        />
                        <img src={product.image_url} alt={product.title} className="w-16 h-16 object-cover rounded" />
                        <div className="flex-1">
                          <p className="font-medium text-sm line-clamp-2">{product.title}</p>
                          <p className="text-xs text-gray-500">{product.price}€</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <p className="text-sm text-gray-600">
                  {selectedProducts.length} / {formData.productCount} produits sélectionnés
                </p>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Mots-clés</label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Ajouter un mot-clé"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    />
                    <Button onClick={addKeyword} type="button">Ajouter</Button>
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
    </div>
  );
}
