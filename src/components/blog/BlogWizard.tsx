// src/components/blog/BlogWizard.tsx
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
  Eye,
  CheckCircle,
  Loader2,
  Search,
  Package,
  X,
  Check,
  Layers,
  Palette,
  Star,
  Zap,
  Target,
  Users,
  TrendingUp,
} from "lucide-react";
import { ArticleConfigDialog, ArticleConfig } from "./ArticleConfigDialog";
import { ArticleGenerationProgress } from "./ArticleGenerationProgress";
import { useStore } from "@/contexts/StoreContext";

interface WizardStep {
  id: number;
  title: string;
  icon: typeof FileText;
  description: string;
}

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
  handle?: string;
  product_type?: string;
  vendor?: string;
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

  // État pour les suggestions de mots-clés IA
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Dialog states
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showGenerationProgress, setShowGenerationProgress] = useState(false);
  const [isOptimizationComplete, setIsOptimizationComplete] = useState(false);
  const [generatedArticle, setGeneratedArticle] = useState<any>(null);
  const [generatedArticleId, setGeneratedArticleId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    collection_ids: [] as string[],
    collectionTitles: [] as string[],
    keywords: "",
    productCount: 3,
    articleLength: "2000" as "700" | "2000" | "4000",
    articleAngle: "guide" as "guide" | "comparison" | "review" | "tutorial",
    targetAudience: "general" as "beginner" | "general" | "expert",
  });

  const [collectionSearchTerm, setCollectionSearchTerm] = useState("");

  // Article configuration for visual design
  const [articleConfig, setArticleConfig] = useState<ArticleConfig>({
    style: "magazine",
    layout: "2-colonnes",
    colorScheme: "#2563eb",
    contentLength: "2000",
    includeTOC: true,
    productDisplay: "grid",
    typography: "sans-serif",
    imageIntensity: "medium",
    includeFAQ: true,
    includeComparison: true,
  });

  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { limits, loading: limitsLoading, refresh: refreshLimits } = useUsageLimits();

  // Steps with translations - Enhanced steps
  const steps: WizardStep[] = [
    { 
      id: 1, 
      title: t.wizards.blog.steps.topic, 
      icon: Target, 
      description: t.wizards.blog.descriptions.topic 
    },
    { 
      id: 2, 
      title: t.wizards.blog.steps.products, 
      icon: Package, 
      description: t.wizards.blog.descriptions.products 
    },
    { 
      id: 3, 
      title: t.wizards.blog.steps.keywords, 
      icon: TrendingUp, 
      description: t.wizards.blog.descriptions.keywords 
    },
    { 
      id: 4, 
      title: t.wizards.blog.steps.design, 
      icon: Palette, 
      description: t.wizards.blog.descriptions.design 
    },
    { 
      id: 5, 
      title: t.wizards.blog.steps.generate, 
      icon: Sparkles, 
      description: t.wizards.blog.descriptions.generate 
    },
  ];

  // Génération de suggestions de mots-clés IA
  const generateAISuggestions = async (products: Product[]) => {
    if (products.length === 0) return;

    setLoadingSuggestions(true);
    try {
      const productTitles = products.map(p => p.title).slice(0, 5);
      const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
      
      const response = await supabase.functions.invoke("generate-keyword-suggestions", {
        body: {
          products: productTitles,
          categories,
          maxKeywords: 15
        }
      });

      if (response.data?.suggestions) {
        setKeywordSuggestions(response.data.suggestions);
        toast.success("Suggestions de mots-clés générées par IA");
      }
    } catch (error) {
      console.error("Erreur génération suggestions IA:", error);
      // Fallback aux suggestions basiques
      generateFallbackSuggestions(products);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Fallback suggestions
  const generateFallbackSuggestions = (products: Product[]) => {
    const suggestions: string[] = [];

    // Mots-clés des titres
    products.forEach(product => {
      const words = product.title.toLowerCase()
        .split(/[\s\-,]+/)
        .filter(word => word.length > 3 && !['avec', 'sans', 'pour', 'dans', 'sur'].includes(word))
        .slice(0, 3);
      suggestions.push(...words);
    });

    // Catégories et types
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    const types = [...new Set(products.map(p => p.product_type).filter(Boolean))];
    
    suggestions.push(...categories);
    suggestions.push(...types);

    // Phrases longues
    products.forEach(product => {
      const words = product.title.toLowerCase().split(' ');
      if (words.length >= 3) {
        suggestions.push(words.slice(0, 3).join(' '));
        suggestions.push(words.slice(-3).join(' '));
      }
    });

    // Dédupliquer et limiter
    const uniqueSuggestions = [...new Set(suggestions)]
      .filter(s => s.length > 2)
      .slice(0, 12);

    setKeywordSuggestions(uniqueSuggestions);
  };

  // Sélectionner tous les mots-clés suggérés
  const selectAllKeywords = () => {
    const allKeywords = [...new Set([...keywords, ...keywordSuggestions])];
    setKeywords(allKeywords);
    toast.success(`${keywordSuggestions.length - keywords.length} mots-clés ajoutés`);
  };

  // Prefill from URL params (opportunity data)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const opportunityId = params.get("opportunityId");

    if (opportunityId) {
      // Prefill keywords
      const primaryKeywords = params.get("primaryKeywords")?.split(",").filter(Boolean) || [];
      const secondaryKeywords = params.get("secondaryKeywords")?.split(",").filter(Boolean) || [];
      setKeywords([...primaryKeywords, ...secondaryKeywords]);

      // Prefill estimated word count
      const estimatedWordCount = params.get("estimatedWordCount");
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
      const collectionIds = params.get("collectionIds")?.split(",").filter(Boolean) || [];
      if (collectionIds.length > 0) {
        setFormData(prev => ({ ...prev, collection_ids: collectionIds }));
      }

      // Prefill product IDs
      const productIds = params.get("productIds")?.split(",").filter(Boolean) || [];
      if (productIds.length > 0) {
        (window as any).__preselectedProductIds = productIds;
      }
    }
  }, []);

  // Charger les produits et collections
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user?.id && selectedStore?.id) {
        fetchProducts();
        fetchCollections();
      } else {
        setProducts([]);
        setCollections([]);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [user?.id, selectedStore?.id]);

  // Sélectionner les produits après chargement
  useEffect(() => {
    const preselectedIds = (window as any).__preselectedProductIds;
    if (preselectedIds && products.length > 0) {
      const productsToSelect = products.filter((p) => preselectedIds.includes(p.id));
      setSelectedProducts(productsToSelect);
      delete (window as any).__preselectedProductIds;
    }
  }, [products]);

  // Générer suggestions quand produits changent
  useEffect(() => {
    if (selectedProducts.length > 0) {
      generateAISuggestions(selectedProducts);
    } else {
      setKeywordSuggestions([]);
    }
  }, [selectedProducts]);

  const fetchCollections = async () => {
    if (!user?.id || !selectedStore?.id) return;

    try {
      const { data: collectionsData, error: collError } = await supabase
        .from("shopify_collections")
        .select("id, title, store_id")
        .eq("user_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("title", { ascending: true });

      if (collError) throw collError;

      if (!collectionsData || collectionsData.length === 0) {
        setCollections([]);
        return;
      }

      // Compter les produits par collection
      const { data: productsData } = await supabase
        .from("shopify_products")
        .select("id, collection_ids")
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id);

      const collectionsWithCount = collectionsData.map((col) => {
        const count = (productsData || []).filter(
          (prod) => prod.collection_ids && prod.collection_ids.includes(col.id),
        ).length;
        return { ...col, productCount: count };
      });

      const collectionsWithProducts = collectionsWithCount.filter((col) => col.productCount > 0);
      setCollections(collectionsWithProducts as any);

    } catch (err) {
      console.error("Error fetching collections:", err);
      toast.error(t.wizards.blog.loadingError);
    }
  };

  const fetchProducts = async () => {
    if (!user?.id || !selectedStore?.id) return;

    try {
      const { data, error } = await supabase
        .from("shopify_products")
        .select("id, title, description, category, image_url, price, product_type, vendor, collection_ids, handle")
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setProducts(data || []);

    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error(t.wizards.blog.productsLoadingError);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesCollection =
      formData.collection_ids.length === 0 ||
      formData.collection_ids.some((colId) => product.collection_ids?.includes(colId));

    const matchesSearch = !searchTerm || 
      product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCollection && matchesSearch;
  });

  const filteredCollections = collections.filter((col) =>
    col.title.toLowerCase().includes(collectionSearchTerm.toLowerCase()),
  );

  const productsInCollection =
    formData.collection_ids.length > 0
      ? products.filter((p) => formData.collection_ids.some((colId) => p.collection_ids?.includes(colId))).length
      : products.length;

  const toggleCollection = (collectionId: string, collectionTitle: string) => {
    setFormData((prev) => {
      const isSelected = prev.collection_ids.includes(collectionId);
      if (isSelected) {
        return {
          ...prev,
          collection_ids: prev.collection_ids.filter((id) => id !== collectionId),
          collectionTitles: prev.collectionTitles.filter((_, idx) => prev.collection_ids[idx] !== collectionId),
        };
      } else {
        return {
          ...prev,
          collection_ids: [...prev.collection_ids, collectionId],
          collectionTitles: [...prev.collectionTitles, collectionTitle],
        };
      }
    });
  };

  const addKeyword = () => {
    const newKeyword = keywordInput.trim();
    if (newKeyword && !keywords.includes(newKeyword)) {
      setKeywords([...keywords, newKeyword]);
      setKeywordInput("");
      toast.success("Mot-clé ajouté");
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    setKeywords(keywords.filter((k) => k !== keywordToRemove));
  };

  const addSuggestedKeyword = (suggestion: string) => {
    if (!keywords.includes(suggestion)) {
      setKeywords([...keywords, suggestion]);
      toast.success("Mot-clé suggéré ajouté");
    }
  };

  const handleNext = () => {
    // Validation selon l'étape
    if (currentStep === 1 && formData.collection_ids.length === 0) {
      toast.error("Veuillez sélectionner au moins une collection");
      return;
    }
    
    if (currentStep === 2 && selectedProducts.length === 0) {
      toast.error("Veuillez sélectionner au moins un produit");
      return;
    }

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
    // Vérification des limites
    if (!limits?.canUseArticles) {
      toast.error("Limite d'articles atteinte", {
        description: `Vous avez utilisé ${limits?.usage.articles_count}/${limits?.limits.max_articles} articles.`
      });
      setShowUpgradeDialog(true);
      return;
    }

    // Validation finale
    if (selectedProducts.length === 0 && formData.collection_ids.length === 0) {
      toast.error("Veuillez sélectionner au moins des produits ou une collection");
      return;
    }

    try {
      setGenerating(true);
      setShowGenerationProgress(true);

      if (!user?.id || !selectedStore?.id) {
        throw new Error("Utilisateur non connecté ou boutique non sélectionnée");
      }

      console.log("🚀 [WIZARD] Lancement de la génération:");
      console.log("  - Produits:", selectedProducts.length);
      console.log("  - Collections:", formData.collection_ids.length);
      console.log("  - Mots-clés:", keywords.length);
      console.log("  - Longueur:", formData.articleLength);
      console.log("  - Angle:", formData.articleAngle);

      const response = await supabase.functions.invoke("generate-blog-article", {
        body: {
          user_id: user.id,
          store_id: selectedStore.id,
          collection_ids: formData.collection_ids,
          collectionTitles: formData.collectionTitles,
          keywords: keywords,
          productIds: selectedProducts.map((p) => p.id),
          articleLength: formData.articleLength,
          articleConfig: {
            ...articleConfig,
            articleAngle: formData.articleAngle,
            targetAudience: formData.targetAudience,
          },
          context: {
            hasSelectedProducts: selectedProducts.length > 0,
            hasCollections: formData.collection_ids.length > 0,
            productCount: selectedProducts.length,
            collectionCount: formData.collection_ids.length,
            storeName: selectedStore.name
          }
        },
      });

      if (response.error) throw response.error;

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
        
        toast.success("🎉 Article généré avec succès !", {
          description: "Votre contenu SEO optimisé est prêt."
        });
        
        setShowResultsDialog(true);
      } else {
        throw new Error("Aucun article généré");
      }
    } catch (error: any) {
      console.error("❌ Erreur génération:", error);
      
      if (error.message?.includes("trial_limit_reached") || error.message?.includes("monthly_limit_reached")) {
        if (limits?.isTrialing) {
          toast.error("Limite d'essai atteinte", {
            description: "Passez à un abonnement pour continuer à générer des articles."
          });
        } else {
          toast.error("Limite mensuelle atteinte", {
            description: "Votre forfait mensuel est épuisé."
          });
        }
        setShowUpgradeDialog(true);
      } else {
        toast.error("Erreur lors de la génération", {
          description: error.message || "Une erreur est survenue"
        });
      }
    } finally {
      setGenerating(false);
      setShowGenerationProgress(false);
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
        throw syncResponse.error;
      } else {
        setIsOptimizationComplete(true);
        toast.success("✅ Article publié sur Shopify", {
          description: "Votre article est maintenant en ligne."
        });
      }
    } catch (error) {
      console.error("Error publishing to Shopify:", error);
      toast.error("Erreur lors de la publication");
    }
  };

  const handleSkipPublish = () => {
    setShowResultsDialog(false);
    onClose();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Sélection de l'angle éditorial */}
            <div>
              <label className="block text-sm font-semibold mb-3">Angle éditorial</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: "guide", label: "📚 Guide", description: "Guide complet" },
                  { value: "comparison", label: "⚖️ Comparatif", description: "Comparaison produits" },
                  { value: "review", label: "⭐ Avis", description: "Tests et avis" },
                  { value: "tutorial", label: "🎓 Tutoriel", description: "Guide pratique" },
                ].map((angle) => (
                  <button
                    key={angle.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, articleAngle: angle.value as any })}
                    className={`p-4 border-2 rounded-xl text-center transition-all ${
                      formData.articleAngle === angle.value
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-primary/50"
                    }`}
                  >
                    <div className="font-semibold">{angle.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{angle.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Audience cible */}
            <div>
              <label className="block text-sm font-semibold mb-3">Audience cible</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "beginner", label: "👶 Débutant", icon: Users },
                  { value: "general", label: "👥 Général", icon: Target },
                  { value: "expert", label: "🎯 Expert", icon: Zap },
                ].map((audience) => {
                  const Icon = audience.icon;
                  return (
                    <button
                      key={audience.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, targetAudience: audience.value as any })}
                      className={`p-4 border-2 rounded-xl text-center transition-all ${
                        formData.targetAudience === audience.value
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-primary/50"
                      }`}
                    >
                      <Icon className="w-6 h-6 mx-auto mb-2" />
                      <div className="font-semibold text-sm">{audience.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sélection des collections */}
            <div>
              <label className="block text-sm font-semibold mb-3">Collections</label>
              
              {formData.collection_ids.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.collection_ids.map((colId, idx) => {
                    const collection = collections.find((c) => c.id === colId);
                    return (
                      <Badge key={colId} variant="secondary" className="flex items-center gap-1 py-1">
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

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une collection..."
                  value={collectionSearchTerm}
                  onChange={(e) => setCollectionSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="border rounded-lg max-h-[300px] overflow-auto">
                {collections.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Aucune collection trouvée. Importez d'abord vos collections depuis Shopify.
                  </div>
                ) : filteredCollections.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Aucune collection ne correspond à votre recherche.
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
                            isSelected ? "bg-accent/50" : ""
                          }`}
                        >
                          <div
                            className={`flex-shrink-0 w-5 h-5 border-2 rounded flex items-center justify-center ${
                              isSelected ? "bg-primary border-primary" : "border-input"
                            }`}
                          >
                            {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                          </div>
                          <span className="flex-1 text-sm font-medium">{collection.title}</span>
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
                <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {productsInCollection} produit(s) dans les collections sélectionnées
                </div>
              )}
            </div>

            {/* Longueur de l'article */}
            <div>
              <label className="block text-sm font-semibold mb-3">Longueur de l'article</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "700", label: "Court", words: "~700 mots", time: "3-4 min" },
                  { value: "2000", label: "Long", words: "~2000 mots", time: "8-10 min" },
                  { value: "4000", label: "Complet", words: "~4000 mots", time: "15-20 min" },
                ].map((length) => (
                  <button
                    key={length.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, articleLength: length.value as any })}
                    className={`p-4 border-2 rounded-xl text-center transition-all ${
                      formData.articleLength === length.value
                        ? "bg-primary text-white border-primary"
                        : "bg-white border-gray-300 hover:border-primary"
                    }`}
                  >
                    <div className="font-semibold">{length.label}</div>
                    <div className="text-sm opacity-80">{length.words}</div>
                    <div className="text-xs opacity-60">{length.time}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {formData.collection_ids.length > 0 && (
              <Alert className="bg-blue-50 border-blue-200">
                <Layers className="w-4 h-4 text-blue-600" />
                <AlertDescription>
                  <span className="font-medium">Collections sélectionnées:</span>{" "}
                  <strong>{formData.collectionTitles.join(", ")}</strong>
                </AlertDescription>
              </Alert>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher un produit par nom, description ou catégorie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-blue-900">
                    {selectedProducts.length} produit(s) sélectionné(s)
                  </p>
                  <p className="text-sm text-blue-700">
                    {filteredProducts.length} produit(s) disponible(s)
                  </p>
                </div>
                {selectedProducts.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProducts([])}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Tout désélectionner
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto">
              {filteredProducts.map((product) => {
                const isSelected = selectedProducts.some((p) => p.id === product.id);

                return (
                  <Card
                    key={product.id}
                    className={`p-4 cursor-pointer transition-all border-2 ${
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-gray-200 hover:border-primary/50"
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
                      <div className={`w-6 h-6 border-2 rounded flex items-center justify-center ${
                        isSelected ? "bg-primary border-primary" : "border-gray-300"
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                      
                      <img
                        src={product.image_url || "/placeholder.svg"}
                        alt={product.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-lg line-clamp-2 mb-1">{product.title}</p>
                        <p className="text-sm text-gray-600 line-clamp-1 mb-2">{product.description}</p>
                        
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="text-lg font-bold text-blue-600">{product.price}€</p>
                          
                          {product.category && (
                            <Badge variant="secondary" className="text-xs">
                              {product.category}
                            </Badge>
                          )}
                          
                          {product.product_type && (
                            <Badge variant="outline" className="text-xs">
                              {product.product_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold mb-2">Aucun produit trouvé</p>
                  <p className="text-sm">
                    {searchTerm 
                      ? "Aucun produit ne correspond à votre recherche." 
                      : "Aucun produit disponible dans les collections sélectionnées."}
                  </p>
                </div>
              )}
            </div>

            {selectedProducts.length === 0 && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertDescription className="text-amber-800">
                  💡 Sélectionnez au moins un produit pour générer un article pertinent.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-3">Gestion des mots-clés</label>
              <p className="text-sm text-muted-foreground mb-4">
                Ajoutez des mots-clés pertinents pour optimiser le référencement de votre article.
              </p>

              {/* Suggestions IA */}
              {keywordSuggestions.length > 0 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Suggestions IA ({keywordSuggestions.length})
                      </h4>
                      <p className="text-xs text-blue-700 mt-1">
                        Mots-clés générés automatiquement basés sur vos produits
                      </p>
                    </div>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      onClick={selectAllKeywords}
                      disabled={loadingSuggestions}
                    >
                      {loadingSuggestions ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Tout sélectionner
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {keywordSuggestions.map((suggestion, idx) => (
                      <Badge
                        key={idx}
                        variant={keywords.includes(suggestion) ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${
                          keywords.includes(suggestion)
                            ? "bg-primary hover:bg-primary/90"
                            : "hover:bg-blue-100 hover:text-blue-900"
                        }`}
                        onClick={() => addSuggestedKeyword(suggestion)}
                      >
                        {suggestion}
                        {keywords.includes(suggestion) && <Check className="ml-1 h-3 w-3" />}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Ajout manuel */}
              <div className="flex gap-2 mb-4">
                <Input
                  type="text"
                  placeholder="Ajouter un mot-clé (ex: produit qualité, guide d'achat...)"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                  className="flex-1"
                />
                <Button onClick={addKeyword} type="button">
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </div>

              {/* Mots-clés sélectionnés */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold">
                    Mots-clés sélectionnés ({keywords.length})
                  </label>
                  {keywords.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setKeywords([])}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Tout supprimer
                    </Button>
                  )}
                </div>

                {keywords.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <Tag className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500">Aucun mot-clé sélectionné</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Ajoutez des mots-clés pour améliorer le référencement
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg min-h-[80px]">
                    {keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="gap-2 py-1.5 px-3 text-sm">
                        <Hash className="w-3 h-3" />
                        {keyword}
                        <button 
                          onClick={() => removeKeyword(keyword)}
                          className="hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Conseils SEO */}
              <Alert className="bg-green-50 border-green-200">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Conseil SEO :</strong> Utilisez 5-10 mots-clés pertinents incluant votre produit principal, 
                  des mots-clés longue traîne et des termes de recherche courants.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <ArticleConfigDialog 
              config={articleConfig} 
              onConfigChange={setArticleConfig} 
            />
            
            {/* Aperçu rapide de la configuration */}
            <Card className="p-4 bg-gradient-to-r from-gray-50 to-blue-50">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Aperçu de la configuration
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Style :</span>
                  <span className="font-medium ml-2 capitalize">{articleConfig.style}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Layout :</span>
                  <span className="font-medium ml-2">{articleConfig.layout}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Couleur :</span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: articleConfig.colorScheme }}
                    />
                    <span className="font-medium">{articleConfig.colorScheme}</span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Typographie :</span>
                  <span className="font-medium ml-2">{articleConfig.typography}</span>
                </div>
              </div>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            {/* Résumé de la configuration */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Récapitulatif de votre article
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Angle éditorial :</span>
                    <span className="font-semibold capitalize">
                      {formData.articleAngle === "guide" && "📚 Guide complet"}
                      {formData.articleAngle === "comparison" && "⚖️ Comparatif"}
                      {formData.articleAngle === "review" && "⭐ Avis expert"}
                      {formData.articleAngle === "tutorial" && "🎓 Tutoriel"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Audience :</span>
                    <span className="font-semibold capitalize">
                      {formData.targetAudience === "beginner" && "👶 Débutant"}
                      {formData.targetAudience === "general" && "👥 Général"}
                      {formData.targetAudience === "expert" && "🎯 Expert"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Longueur :</span>
                    <span className="font-semibold">
                      {formData.articleLength === "700" && "Court (~700 mots)"}
                      {formData.articleLength === "2000" && "Long (~2000 mots)"}
                      {formData.articleLength === "4000" && "Complet (~4000 mots)"}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Produits :</span>
                    <span className="font-semibold">{selectedProducts.length} sélectionné(s)</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Collections :</span>
                    <span className="font-semibold">{formData.collection_ids.length} sélectionnée(s)</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mots-clés :</span>
                    <span className="font-semibold">{keywords.length} défini(s)</span>
                  </div>
                </div>
              </div>
              
              {/* Aperçu des produits */}
              {selectedProducts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <h4 className="font-semibold mb-2">Produits sélectionnés :</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProducts.slice(0, 5).map((product) => (
                      <Badge key={product.id} variant="outline" className="text-xs">
                        {product.title}
                      </Badge>
                    ))}
                    {selectedProducts.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{selectedProducts.length - 5} autres...
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* Dernières options */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Options de génération</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Optimisation SEO avancée</p>
                    <p className="text-sm text-muted-foreground">
                      Structure optimisée pour le référencement Google
                    </p>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Activée
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Design mobile-first</p>
                    <p className="text-sm text-muted-foreground">
                      Optimisé pour les mobiles et tablettes
                    </p>
                  </div>
                  <Badge variant="default" className="bg-blue-100 text-blue-800">
                    Activé
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Structured Data</p>
                    <p className="text-sm text-muted-foreground">
                      Balises schema.org pour les rich snippets
                    </p>
                  </div>
                  <Badge variant="default" className="bg-purple-100 text-purple-800">
                    Activé
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Message de confirmation */}
            <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <Sparkles className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Prêt à générer !</strong> Votre article sera optimisé pour le référencement 
                et inclura tous les produits sélectionnés avec un design professionnel.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                {t.wizards.blog.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Créez un article SEO optimisé avec vos produits
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Usage limits alert */}
          {limits && limits.isTrialing && (
            <Alert className="mb-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <AlertDescription className="text-sm">
                {limits.limitReached.articles ? (
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    ⚠️ Limite atteinte : {limits.usage.articles_count}/{limits.limits.max_articles} articles utilisés
                  </span>
                ) : (
                  <span>
                    🚀 Essai gratuit : {limits.usage.articles_count}/{limits.limits.max_articles} articles utilisés
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
                  <div className="flex flex-col items-center relative">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? "bg-primary text-white shadow-lg shadow-primary/25"
                          : isCompleted
                            ? "bg-green-500 text-white shadow-lg shadow-green-500/25"
                            : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <span className={`text-sm mt-2 text-center font-medium ${
                      isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-gray-500"
                    }`}>
                      {step.title}
                    </span>
                    {isActive && (
                      <div className="absolute -bottom-6 w-32 text-xs text-center text-primary font-medium">
                        {step.description}
                      </div>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 transition-colors ${
                      isCompleted ? "bg-green-500" : "bg-gray-200"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="mb-8 min-h-[400px]">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm p-4 border-t z-10 flex items-center justify-between -mx-6 -mb-6 mt-6">
            <Button 
              variant="outline" 
              onClick={handlePrevious} 
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              {t.common.previous}
            </Button>

            {currentStep < steps.length ? (
              <Button onClick={handleNext} className="gap-2">
                {t.common.next}
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleGenerate} 
                disabled={generating}
                className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Générer l'article SEO
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Dialogs */}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType="articles"
        usage={limits?.usage.articles_count}
        limit={limits?.limits.max_articles}
      />

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

      <ArticleGenerationProgress 
        open={showGenerationProgress} 
        onClose={() => setShowGenerationProgress(false)} 
      />
    </div>
  );
}

// Composants d'icônes manquants
const Plus = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const Hash = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
  </svg>
);
