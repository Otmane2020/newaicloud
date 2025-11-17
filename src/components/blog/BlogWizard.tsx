import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProgressDialog, ResultsDialog, SuccessDialog } from "@/components/seo/SeoWorkflowDialogs";
import { ArticleSyncDialog } from "./ArticleSyncDialog";
import { useTranslation } from "@/lib/language";
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
  X,
  Check,
  Layers,
  Palette,
} from "lucide-react";
import { ArticleConfigDialog, ArticleConfig } from "./ArticleConfigDialog";
import { ArticleGenerationProgress } from "./ArticleGenerationProgress";
import { useStore } from '@/contexts/StoreContext';

interface WizardStep {
  id: number;
  title: string;
  icon: typeof FileText;
  description: string;
}

// Steps will be defined with translations inside the component

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
  collection_ids?: string[];
}

interface Collection {
  id: string;
  title: string;
  productCount?: number;
}

export function BlogWizard({ onClose, categories }: BlogWizardProps) {
  const { user } = useAuth();
  const { selectedStore } = useStore();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

  // Fonction pour générer des suggestions de mots-clés basées sur les produits
  const generateKeywordSuggestions = () => {
    if (selectedProducts.length === 0) return [];
    
    const suggestions: string[] = [];
    
    // Mots-clés des titres produits (mots de plus de 3 caractères)
    selectedProducts.forEach(product => {
      const words = product.title.toLowerCase().split(' ').filter(w => w.length > 3);
      suggestions.push(...words.slice(0, 3));
    });
    
    // Mots-clés des catégories
    const categories = [...new Set(selectedProducts.map(p => p.category).filter(Boolean))];
    suggestions.push(...categories);
    
    // Phrases longues (3 mots consécutifs des titres produits)
    const longPhrases = selectedProducts.map(p => {
      const words = p.title.toLowerCase().split(' ');
      if (words.length >= 3) {
        return words.slice(0, 3).join(' ');
      }
      return null;
    }).filter(Boolean) as string[];
    suggestions.push(...longPhrases);
    
    // Dédupliquer et limiter à 15 suggestions
    return [...new Set(suggestions)].slice(0, 15);
  };

  // Fonction pour ajouter un mot-clé suggéré
  const addSuggestedKeyword = (keyword: string) => {
    if (!keywords.includes(keyword)) {
      setKeywords([...keywords, keyword]);
    }
  };

  // Fonction pour sélectionner tous les mots-clés
  const selectAllKeywords = () => {
    const allKeywords = [...new Set([...keywords, ...keywordSuggestions])];
    setKeywords(allKeywords);
    toast.success(`${keywordSuggestions.length} mots-clés ajoutés`);
  };

  // Générer suggestions quand produits changent
  useEffect(() => {
    if (selectedProducts.length > 0) {
      setKeywordSuggestions(generateKeywordSuggestions());
    } else {
      setKeywordSuggestions([]);
    }
  }, [selectedProducts]);

  // Dialog states
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showGenerationProgress, setShowGenerationProgress] = useState(false);
  const [isOptimizationComplete, setIsOptimizationComplete] = useState(false);
  const [generatedArticle, setGeneratedArticle] = useState<any>(null);
  const [generatedArticleId, setGeneratedArticleId] = useState<string | null>(null);
  
  // ✅ Phase 4: Suggestions de mots-clés intelligentes
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    collection_ids: [] as string[],
    collectionTitles: [] as string[],
    keywords: "",
    productCount: 3,
    articleLength: "700" as "700" | "2000" | "4000",
  });
  const [collectionSearchTerm, setCollectionSearchTerm] = useState("");

  // Article configuration for visual design
  const [articleConfig, setArticleConfig] = useState<ArticleConfig>({
    style: "magazine",
    layout: "1-colonne",
    colorScheme: "#000000",
    contentLength: "2000",
    includeTOC: true,
    productDisplay: "grid",
    typography: "sans-serif",
    imageIntensity: "medium",
  });

  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { limits, loading: limitsLoading, refresh: refreshLimits } = useUsageLimits();

  // Steps with translations - Added Design step
  const steps: WizardStep[] = [
    { id: 1, title: t.wizards.blog.steps.topic, icon: FileText, description: t.wizards.blog.descriptions.topic },
    { id: 2, title: t.wizards.blog.steps.products, icon: Package, description: t.wizards.blog.descriptions.products },
    { id: 3, title: t.wizards.blog.steps.keywords, icon: Tag, description: t.wizards.blog.descriptions.keywords },
    { id: 4, title: t.wizards.blog.steps.design, icon: Palette, description: t.wizards.blog.descriptions.design },
    { id: 5, title: t.wizards.blog.steps.generate, icon: Sparkles, description: t.wizards.blog.descriptions.generate },
  ];

  // Prefill from URL params (opportunity data)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const opportunityId = params.get('opportunityId');
    
    if (opportunityId) {
      // Prefill keywords
      const primaryKeywords = params.get('primaryKeywords')?.split(',').filter(Boolean) || [];
      const secondaryKeywords = params.get('secondaryKeywords')?.split(',').filter(Boolean) || [];
      setKeywords([...primaryKeywords, ...secondaryKeywords]);
      
      // Prefill estimated word count as articleLength
      const estimatedWordCount = params.get('estimatedWordCount');
      if (estimatedWordCount) {
        const wordCount = parseInt(estimatedWordCount, 10);
        if (wordCount <= 1000) {
          setFormData(prev => ({ ...prev, articleLength: "700" }));
          setArticleConfig(prev => ({ ...prev, contentLength: "700" }));
        } else if (wordCount <= 3000) {
          setFormData(prev => ({ ...prev, articleLength: "2000" }));
          setArticleConfig(prev => ({ ...prev, contentLength: "2000" }));
        } else {
          setFormData(prev => ({ ...prev, articleLength: "4000" }));
          setArticleConfig(prev => ({ ...prev, contentLength: "4000" }));
        }
      }
      
      // Prefill collection IDs
      const collectionIds = params.get('collectionIds')?.split(',').filter(Boolean) || [];
      if (collectionIds.length > 0) {
        setFormData(prev => ({ ...prev, collection_ids: collectionIds }));
      }
      
      // Prefill product IDs - will select them once products are loaded
      const productIds = params.get('productIds')?.split(',').filter(Boolean) || [];
      if (productIds.length > 0) {
        // Store temporarily to select after products are loaded
        (window as any).__preselectedProductIds = productIds;
      }
    }
  }, []);

  // Select products after they're loaded from opportunity
  useEffect(() => {
    const preselectedIds = (window as any).__preselectedProductIds;
    if (preselectedIds && products.length > 0) {
      const productsToSelect = products.filter(p => preselectedIds.includes(p.id));
      setSelectedProducts(productsToSelect);
      delete (window as any).__preselectedProductIds;
    }
  }, [products]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user?.id && selectedStore?.id) {
        fetchProducts();
        fetchCollections();
        setSelectedProducts([]); // Clear selections on store change
      } else {
        setProducts([]);
        setCollections([]);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [user?.id, selectedStore?.id]);

  const fetchCollections = async () => {
    if (!user?.id || !selectedStore?.id) return;

    try {
      console.log("🔍 Chargement des collections pour user:", user.id, "store:", selectedStore.id);
      
      // Fetch collections
      const { data: collectionsData, error: collError } = await supabase
        .from("shopify_collections")
        .select("id, title, store_id")
        .eq("user_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("title", { ascending: true });

      if (collError) {
        console.error("❌ Erreur fetch collections:", collError);
        throw collError;
      }

      console.log(`📦 ${collectionsData?.length || 0} collections trouvées`);

      if (!collectionsData || collectionsData.length === 0) {
        console.log("⚠️ Aucune collection trouvée - l'utilisateur doit d'abord importer depuis Shopify");
        setCollections([]);
        toast.info("Aucune collection trouvée. Importez d'abord vos collections depuis Shopify.");
        return;
      }

      // Fetch all products once to count by collection
      const { data: productsData, error: prodError } = await supabase
        .from("shopify_products")
        .select("id, collection_ids")
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id);

      if (prodError) {
        console.error("❌ Erreur fetch produits:", prodError);
        throw prodError;
      }

      console.log(`📦 ${productsData?.length || 0} produits trouvés`);

      // Count products for each collection
      const collectionsWithCount = (collectionsData || []).map((col) => {
        const count = (productsData || []).filter(
          (prod) => prod.collection_ids && prod.collection_ids.includes(col.id)
        ).length;

        console.log(`  - ${col.title}: ${count} produits`);
        return {
          ...col,
          productCount: count,
        };
      });

      // Filter collections with products only
      const collectionsWithProducts = collectionsWithCount.filter((col) => col.productCount > 0);
      console.log(`✅ ${collectionsWithProducts.length} collections avec produits`);
      
      setCollections(collectionsWithProducts as any);
      
      if (collectionsWithProducts.length === 0) {
        toast.info("Aucune collection avec produits trouvée. Assurez-vous d'avoir des produits assignés à vos collections.");
      }
    } catch (err) {
      console.error("Error fetching collections:", err);
      toast.error(t.wizards.blog.loadingError);
    }
  };

  const fetchProducts = async () => {
    if (!user?.id || !selectedStore?.id) return;

    try {
      console.log("🔍 Chargement des produits pour user:", user.id, "store:", selectedStore.id);
      
      const { data, error } = await supabase
        .from("shopify_products")
        .select("id, title, description, category, image_url, price, product_type, collection_ids, store_id")
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.error("❌ Erreur fetch produits:", error);
        throw error;
      }
      
      console.log(`📦 ${data?.length || 0} produits trouvés`);
      
      if (!data || data.length === 0) {
        console.log("⚠️ Aucun produit trouvé - l'utilisateur doit d'abord importer depuis Shopify");
        toast.info("Aucun produit trouvé. Importez d'abord vos produits depuis Shopify.");
      }
      
      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error(t.wizards.blog.productsLoadingError);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesCollection = formData.collection_ids.length === 0 || 
      formData.collection_ids.some(colId => product.collection_ids?.includes(colId));

    const matchesSearch = !searchTerm || product.title?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCollection && matchesSearch;
  });

  const filteredCollections = collections.filter((col) => 
    col.title.toLowerCase().includes(collectionSearchTerm.toLowerCase())
  );

  const productsInCollection = formData.collection_ids.length > 0
    ? products.filter((p) => formData.collection_ids.some(colId => p.collection_ids?.includes(colId))).length
    : products.length;

  const toggleCollection = (collectionId: string, collectionTitle: string) => {
    setFormData(prev => {
      const isSelected = prev.collection_ids.includes(collectionId);
      if (isSelected) {
        return {
          ...prev,
          collection_ids: prev.collection_ids.filter(id => id !== collectionId),
          collectionTitles: prev.collectionTitles.filter((_, idx) => prev.collection_ids[idx] !== collectionId)
        };
      } else {
        return {
          ...prev,
          collection_ids: [...prev.collection_ids, collectionId],
          collectionTitles: [...prev.collectionTitles, collectionTitle]
        };
      }
    });
  };

  const addKeyword = () => {
    const newKeyword = keywordInput.trim();
    if (newKeyword && !keywords.includes(newKeyword)) {
      setKeywords([...keywords, newKeyword]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    setKeywords(keywords.filter((k) => k !== keywordToRemove));
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
    // Check usage limits - only check articles limit specifically
    if (!limits?.canUseArticles) {
      toast.error("Article limit reached", {
        description: `You have used ${limits?.usage.articles_count}/${limits?.limits.max_articles} articles. Upgrade to create more.`,
      });
      setShowUpgradeDialog(true);
      return;
    }

    try {
      setGenerating(true);

      if (!user?.id) {
        throw new Error("Utilisateur non connecté");
      }

      if (!selectedStore?.id) {
        toast.error("Aucune boutique sélectionnée. Veuillez sélectionner une boutique.");
        console.error("❌ [WIZARD] store_id manquant");
        setGenerating(false);
        return;
      }

      console.log("📤 [WIZARD] Envoi de la requête de génération:");
      console.log(`  - user_id: ${user.id}`);
      console.log(`  - store_id: ${selectedStore.id}`);
      console.log(`  - productIds: ${selectedProducts.length}`);
      console.log(`  - collections: ${formData.collection_ids?.length || 0}`);

      const finalKeywords =
        keywords.length > 0
          ? keywords
          : formData.keywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean);

      // Animation de génération
      toast.loading(t.wizards.blog.generating, { id: "generating" });

      const response = await supabase.functions.invoke("generate-blog-article", {
        body: {
          user_id: user.id,
          store_id: selectedStore.id,
          collection_ids: formData.collection_ids,
          collectionTitles: formData.collectionTitles,
          keywords: finalKeywords,
          productIds: selectedProducts.map((p) => p.id),
          articleLength: formData.articleLength,
          articleConfig,
        },
      });

      if (response.error) throw response.error;

      toast.success(t.wizards.blog.articleGenerated, { id: "generating" });

      // Stocker l'article généré et afficher le dialog de résultats
      if (response.data?.article) {
        setGeneratedArticle({
          id: response.data.article.id,
          title: response.data.article.title,
          seo_title: response.data.article.seo_title,
          seo_description: response.data.article.seo_description,
          content: response.data.article.content,
          featured_image: response.data.article.featured_image,
        });
        setGeneratedArticleId(response.data.article.id);
        setGenerating(false);
        setShowResultsDialog(true);
      } else {
        onClose();
      }
    } catch (error: any) {
      console.error("Error:", error);
      if (error.message?.includes("trial_limit_reached") || error.message?.includes("monthly_limit_reached")) {
        // Afficher le bon message selon le statut de l'utilisateur
        if (limits?.isTrialing) {
          toast.error(t.wizards.blog.trialLimitReached);
        } else if (limits?.isPaid) {
          toast.error(t.wizards.blog.monthlyLimitReached);
        } else {
          toast.error(t.wizards.blog.trialLimitReached);
        }
        setShowUpgradeDialog(true);
      } else {
        toast.error(error.message || t.wizards.blog.generationError, { id: "generating" });
      }
    } finally {
      setGenerating(false);
      setShowGenerationProgress(false); // ✅ Fermer le pop-up de progression
    }
  };

  const handlePublishToShopify = async () => {
    if (!generatedArticleId) return;

    setShowSyncDialog(false);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);

    try {
      const syncResponse = await supabase.functions.invoke("sync-blog-to-shopify", {
        body: { articleId: generatedArticleId },
      });

      if (syncResponse.error) {
        toast.error(t.wizards.blog.publishError);
        console.error(syncResponse.error);
      } else {
        setIsOptimizationComplete(true);
        toast.success(t.wizards.blog.syncComplete, {
          description: t.wizards.blog.articleSynced,
        });
      }
    } catch (error) {
      console.error("Error publishing to Shopify:", error);
      toast.error(t.wizards.blog.syncError);
    }
  };

  const handleSkipPublish = () => {
    setShowResultsDialog(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{t.wizards.blog.title}</h2>
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
                    {t.wizards.blog.limitReached}: {limits.usage.articles_count}/{limits.limits.max_articles}{" "}
                    {t.wizards.blog.articlesUsed}
                  </span>
                ) : (
                  <span>
                    {t.wizards.blog.trialUsage}: {limits.usage.articles_count}/{limits.limits.max_articles}{" "}
                    {t.wizards.blog.articlesUsed}
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
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isActive
                          ? "bg-primary text-white"
                          : isCompleted
                            ? "bg-green-600 text-white"
                            : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                    </div>
                    <span className="text-sm mt-2 text-center">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 ${isCompleted ? "bg-green-600" : "bg-gray-200"}`} />
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
                  <label className="block text-sm font-medium mb-2">{t.wizards.blog.collection}</label>
                  
                  {/* Selected collections display */}
                  {formData.collection_ids.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.collection_ids.map((colId, idx) => {
                        const collection = collections.find(c => c.id === colId);
                        return (
                          <Badge key={colId} variant="secondary" className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {collection?.title || formData.collectionTitles[idx]}
                            <button
                              onClick={() => toggleCollection(colId, formData.collectionTitles[idx])}
                              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Search input */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t.wizards.blog.searchPlaceholder}
                      value={collectionSearchTerm}
                      onChange={(e) => setCollectionSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Collections list with checkboxes */}
                  <div className="border rounded-lg max-h-[300px] overflow-auto">
                  {collections.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {collectionSearchTerm 
                          ? t.wizards.blog.noCollectionFound 
                          : "Aucune collection trouvée. Importez d'abord vos collections depuis Shopify dans l'onglet Intégration."}
                      </div>
                    ) : filteredCollections.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {t.wizards.blog.noCollectionFound}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredCollections.map((collection) => {
                          const isSelected = formData.collection_ids.includes(collection.id);
                          const productCount = collection.productCount || 0;

                          return (
                            <div
                              key={collection.id}
                              onClick={() => toggleCollection(collection.id, collection.title)}
                              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-accent ${
                                isSelected ? 'bg-accent/50' : ''
                              }`}
                            >
                              <div className={`flex-shrink-0 w-5 h-5 border-2 rounded flex items-center justify-center ${
                                isSelected ? 'bg-primary border-primary' : 'border-input'
                              }`}>
                                {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                              </div>
                              <span className="flex-1 text-sm">{collection.title}</span>
                              <Badge variant="outline" className="ml-auto">
                                {productCount} produit(s)
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {formData.collection_ids.length > 0 && (
                    <div className="mt-3 text-sm text-muted-foreground">
                      {productsInCollection} produit(s) dans les collections sélectionnées
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Longueur de l'article</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, articleLength: "700" })}
                      className={`px-4 py-3 border rounded-lg text-center transition-all ${
                        formData.articleLength === "700"
                          ? "bg-primary text-white border-primary"
                          : "bg-white border-gray-300 hover:border-primary"
                      }`}
                    >
                      <div className="font-semibold">Court</div>
                      <div className="text-sm opacity-80">~700 mots</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, articleLength: "2000" })}
                      className={`px-4 py-3 border rounded-lg text-center transition-all ${
                        formData.articleLength === "2000"
                          ? "bg-primary text-white border-primary"
                          : "bg-white border-gray-300 hover:border-primary"
                      }`}
                    >
                      <div className="font-semibold">Long</div>
                      <div className="text-sm opacity-80">~2000 mots</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, articleLength: "4000" })}
                      className={`px-4 py-3 border rounded-lg text-center transition-all ${
                        formData.articleLength === "4000"
                          ? "bg-primary text-white border-primary"
                          : "bg-white border-gray-300 hover:border-primary"
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
                {formData.collection_ids.length > 0 && (
                  <Alert className="bg-purple-50 border-purple-200">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <AlertDescription>
                      <span className="font-medium">{t.wizards.blog.collection}:</span>{" "}
                      <strong>{formData.collectionTitles.join(", ")}</strong>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t.wizards.blog.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                  <p className="text-sm">
                    <strong>{selectedProducts.length}</strong> {t.wizards.blog.selected} •{" "}
                    <strong>{filteredProducts.length}</strong> {t.wizards.blog.products}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto border rounded-lg p-4">
                  {filteredProducts.map((product) => {
                    const isSelected = !!selectedProducts.find((p) => p.id === product.id);

                    return (
                      <Card
                        key={product.id}
                        className={`p-4 cursor-pointer transition-all ${
                          isSelected ? "bg-blue-50 border-blue-500" : "hover:bg-gray-50"
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedProducts(selectedProducts.filter((p) => p.id !== product.id));
                          } else {
                            setSelectedProducts([...selectedProducts, product]);
                          }
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <input type="checkbox" checked={isSelected} readOnly className="w-5 h-5 rounded" />
                          <img
                            src={product.image_url || "/placeholder.svg"}
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
                      <p>{t.wizards.blog.noProductFound}</p>
                    </div>
                  )}
                </div>

                {selectedProducts.length === 0 && (
                  <Alert>
                    <AlertDescription>{t.wizards.blog.selectAtLeast}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t.wizards.blog.keywordManagement}</label>
                  <p className="text-xs text-muted-foreground mb-2">{t.wizards.blog.keywordDescription}</p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder={t.wizards.blog.keywordPlaceholder}
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                    />
                    <Button onClick={addKeyword} type="button">
                      {t.wizards.blog.add}
                    </Button>
                  </div>
                  
                  {/* ✅ Suggestions de mots-clés */}
                  {keywordSuggestions.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Suggestions IA ({keywordSuggestions.length})
                        </h4>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={selectAllKeywords}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Tout sélectionner
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {keywordSuggestions.map((suggestion, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="cursor-pointer hover:bg-blue-200 transition-colors"
                            onClick={() => addSuggestedKeyword(suggestion)}
                          >
                            {suggestion}
                            {keywords.includes(suggestion) && (
                              <Check className="ml-1 h-3 w-3 text-green-600" />
                            )}
                          </Badge>
                        ))}
                      </div>
                      
                      <p className="text-xs text-blue-700 mt-2">
                        💡 Basé sur vos produits sélectionnés. Cliquez pour ajouter.
                      </p>
                    </div>
                  )}
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
                <ArticleConfigDialog config={articleConfig} onConfigChange={setArticleConfig} />
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold mb-4">{t.common.summary}</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>{t.wizards.blog.collection}:</strong>{" "}
                      {formData.collectionTitles.length > 0 ? formData.collectionTitles.join(", ") : t.common.none}
                    </p>
                    <p>
                      <strong>{t.wizards.blog.articleLength}:</strong>{" "}
                      {formData.articleLength === "700"
                        ? `${t.wizards.blog.short} (~700 ${t.wizards.blog.words})`
                        : formData.articleLength === "2000"
                          ? `${t.wizards.blog.medium} (~2000 ${t.wizards.blog.words})`
                          : `${t.wizards.blog.long} (~4000 ${t.wizards.blog.words})`}
                    </p>
                    <p>
                      <strong>{t.wizards.blog.products}:</strong> {selectedProducts.length}
                    </p>
                    <p>
                      <strong>{t.wizards.blog.keywords}:</strong> {keywords.join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm p-4 border-t z-10 flex items-center justify-between -mx-6 -mb-6 mt-6">
            <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              {t.common.previous}
            </Button>

            {currentStep < steps.length ? (
              <Button onClick={handleNext}>
                {t.common.next}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.wizards.blog.generating}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t.wizards.blog.generateArticle}
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

      {/* Dialogs */}
      <ResultsDialog
        open={showResultsDialog}
        onOpenChange={setShowResultsDialog}
        type="seo"
        items={
          generatedArticle
            ? [
                {
                  id: generatedArticle.id,
                  title: generatedArticle.title,
                  seo_title: generatedArticle.seo_title,
                  seo_description: generatedArticle.seo_description,
                  content: generatedArticle.content,
                  featured_image: generatedArticle.featured_image,
                },
              ]
            : []
        }
        onSyncClick={() => {
          setShowResultsDialog(false);
          setShowSyncDialog(true);
        }}
        onClose={handleSkipPublish}
      />

      <ArticleSyncDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        article={generatedArticle || { title: "" }}
        onConfirm={handlePublishToShopify}
        loading={false}
      />

      <ProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        type="seo"
        operation="syncing"
        current={1}
        total={1}
      />

      <SuccessDialog
        open={isOptimizationComplete && showProgressDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowProgressDialog(false);
            onClose();
          }
        }}
        type="seo"
        count={1}
        onClose={() => {
          setShowProgressDialog(false);
          onClose();
        }}
      />
    </div>
  );
}
