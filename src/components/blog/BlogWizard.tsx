/* --- BLOG WIZARD — VERSION COMPACTE STABLE 2025 --- */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UpgradeDialog } from "@/components/UpgradeDialog";

import { ProgressDialog, ResultsDialog, SuccessDialog } from "@/components/seo/SeoWorkflowDialogs";

import { ArticleSyncDialog } from "./ArticleSyncDialog";
import { ArticleConfigDialog, ArticleConfig } from "./ArticleConfigDialog";
import { ArticleGenerationProgress } from "./ArticleGenerationProgress";

import { toast } from "sonner";
import { useUsageLimits } from "@/hooks/useUsageLimits";

import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  FileText,
  Tag,
  Search,
  Package,
  X,
  Check,
  Layers,
  Palette,
  CheckCircle,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------ */
/* TYPES */
/* ------------------------------------------------------ */

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
}

interface Collection {
  id: string;
  title: string;
  productCount?: number;
}

/* ------------------------------------------------------ */
/* MAIN COMPONENT */
/* ------------------------------------------------------ */

export function BlogWizard({ onClose }: BlogWizardProps) {
  const { user } = useAuth();
  const { selectedStore } = useStore();
  const { t } = useTranslation();
  const { limits } = useUsageLimits();

  /* --- STATES --- */
  const [currentStep, setCurrentStep] = useState(1);
  const [generating, setGenerating] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [collectionSearchTerm, setCollectionSearchTerm] = useState("");

  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);

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
    articleLength: "2000" as "700" | "2000" | "4000",
  });

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

  /* ------------------------------------------------------ */
  /* STEPS CONFIG */
  /* ------------------------------------------------------ */
  const steps: WizardStep[] = [
    { id: 1, title: t.wizards.blog.steps.topic, icon: FileText, description: "" },
    { id: 2, title: t.wizards.blog.steps.products, icon: Package, description: "" },
    { id: 3, title: t.wizards.blog.steps.keywords, icon: Tag, description: "" },
    { id: 4, title: t.wizards.blog.steps.design, icon: Palette, description: "" },
    { id: 5, title: t.wizards.blog.steps.generate, icon: Sparkles, description: "" },
  ];

  /* ------------------------------------------------------ */
  /* FETCH COLLECTIONS + PRODUCTS */
  /* ------------------------------------------------------ */

  const fetchCollections = async () => {
    if (!user?.id || !selectedStore?.id) return;

    const { data: cols } = await supabase
      .from("shopify_collections")
      .select("id, title")
      .eq("user_id", user.id)
      .eq("store_id", selectedStore.id);

    const { data: allProducts } = await supabase
      .from("shopify_products")
      .select("id, collection_ids")
      .eq("seller_id", user.id)
      .eq("store_id", selectedStore.id);

    const withCount =
      cols?.map((c) => ({
        ...c,
        productCount: allProducts?.filter((p) => p.collection_ids?.includes(c.id)).length,
      })) || [];

    setCollections(withCount);
  };

  const fetchProducts = async () => {
    if (!user?.id || !selectedStore?.id) return;

    const { data } = await supabase
      .from("shopify_products")
      .select("id, title, description, category, image_url, price, collection_ids")
      .eq("seller_id", user.id)
      .eq("store_id", selectedStore.id)
      .order("created_at", { ascending: false })
      .limit(200);

    setProducts(data || []);
  };

  useEffect(() => {
    fetchCollections();
    fetchProducts();
  }, [user?.id, selectedStore?.id]);

  /* ------------------------------------------------------ */
  /* FILTERS */
  /* ------------------------------------------------------ */

  const filteredCollections = collections.filter((c) =>
    c.title.toLowerCase().includes(collectionSearchTerm.toLowerCase()),
  );

  const filteredProducts = products.filter((p) => {
    const okCollection =
      formData.collection_ids.length === 0 || formData.collection_ids.some((id) => p.collection_ids?.includes(id));

    const okSearch = !searchTerm || p.title.toLowerCase().includes(searchTerm.toLowerCase());

    return okCollection && okSearch;
  });

  /* ------------------------------------------------------ */
  /* KEYWORDS */
  /* ------------------------------------------------------ */

  const generateKeywordSuggestions = () => {
    if (selectedProducts.length === 0) return [];
    const list: string[] = [];

    selectedProducts.forEach((p) => {
      const words = p.title.toLowerCase().split(" ");
      list.push(...words.filter((w) => w.length > 3).slice(0, 3));
    });

    const cats = [...new Set(selectedProducts.map((p) => p.category).filter(Boolean))];

    list.push(...cats);

    return [...new Set(list)].slice(0, 15);
  };

  useEffect(() => {
    setKeywordSuggestions(selectedProducts.length > 0 ? generateKeywordSuggestions() : []);
  }, [selectedProducts]);

  /* ------------------------------------------------------ */
  /* KEYWORD CRUD */
  /* ------------------------------------------------------ */

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !keywords.includes(kw)) setKeywords([...keywords, kw]);
    setKeywordInput("");
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  /* ------------------------------------------------------ */
  /* NAVIGATION */
  /* ------------------------------------------------------ */

  const handleNext = () => {
    if (currentStep < steps.length) setCurrentStep(currentStep + 1);
  };
  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  /* ------------------------------------------------------ */
  /* GENERATION */
  /* ------------------------------------------------------ */

  const handleGenerate = async () => {
    if (!user?.id || !selectedStore?.id) return;

    if (!limits?.canUseArticles) {
      setShowUpgradeDialog(true);
      return;
    }

    setGenerating(true);
    setShowGenerationProgress(true);

    const body = {
      user_id: user.id,
      store_id: selectedStore.id,

      category: formData.collectionTitles[0] || "Guide",
      collectionTitle: formData.collectionTitles[0] || null,
      collection_ids: formData.collection_ids,

      keywords,
      productIds: selectedProducts.map((p) => p.id),
      articleLength: formData.articleLength,

      articleConfig: {
        style: articleConfig.style,
        layout: articleConfig.layout,
        colorScheme: articleConfig.colorScheme,
      },
    };

    try {
      const res = await supabase.functions.invoke("generate-blog-article", {
        body,
      });

      if (res.error) throw res.error;
      if (res.data?.article) {
        setGeneratedArticle(res.data.article);
        setGeneratedArticleId(res.data.article.id);
        setShowGenerationProgress(false);
        setGenerating(false);
        setShowResultsDialog(true);
      }
    } catch (err: any) {
      toast.error(err.message);
    }

    setGenerating(false);
    setShowGenerationProgress(false);
  };

  /* ------------------------------------------------------ */
  /* SYNC SHOPIFY */
  /* ------------------------------------------------------ */

  const handlePublishToShopify = async () => {
    if (!generatedArticleId) return;

    setShowSyncDialog(false);
    setShowProgressDialog(true);

    try {
      const sync = await supabase.functions.invoke("sync-blog-to-shopify", {
        body: { articleId: generatedArticleId },
      });

      if (sync.error) throw sync.error;

      setIsOptimizationComplete(true);
      toast.success("Article publié !");
    } catch {
      toast.error("Erreur sync");
    }
  };

  /* ------------------------------------------------------ */
  /* UI / RENDER */
  /* ------------------------------------------------------ */

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{t.wizards.blog.title}</h2>
            <button onClick={onClose} className="p-2">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* STEPS */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const active = currentStep === s.id;
              const done = currentStep > s.id;

              return (
                <div key={s.id} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 flex items-center justify-center rounded-full ${
                      active ? "bg-primary text-white" : done ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {done ? <CheckCircle /> : <Icon />}
                  </div>
                  <div className="text-sm mt-2">{s.title}</div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 ${done ? "bg-green-600" : "bg-gray-300"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* CONTENT */}
          <div className="mb-8">
            {/* STEP 1 — COLLECTION */}
            {currentStep === 1 && (
              <div className="space-y-4">
                {/* search */}
                <Input
                  placeholder="Rechercher une collection..."
                  value={collectionSearchTerm}
                  onChange={(e) => setCollectionSearchTerm(e.target.value)}
                />

                <div className="max-h-[300px] overflow-y-auto border rounded">
                  {filteredCollections.map((col) => {
                    const isSel = formData.collection_ids.includes(col.id);
                    return (
                      <div
                        key={col.id}
                        onClick={() => {
                          if (isSel) {
                            setFormData({
                              ...formData,
                              collection_ids: formData.collection_ids.filter((id) => id !== col.id),
                              collectionTitles: formData.collectionTitles.filter((t) => t !== col.title),
                            });
                          } else {
                            setFormData({
                              ...formData,
                              collection_ids: [...formData.collection_ids, col.id],
                              collectionTitles: [...formData.collectionTitles, col.title],
                            });
                          }
                        }}
                        className={`p-3 flex justify-between items-center cursor-pointer ${isSel ? "bg-blue-50" : ""}`}
                      >
                        <div>{col.title}</div>
                        <Badge variant="outline">{col.productCount}</Badge>
                      </div>
                    );
                  })}
                </div>

                {/* ARTICLE LENGTH */}
                <div>
                  <div className="font-medium text-sm mb-2">Longueur d'article</div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: "700", label: "~700 mots" },
                      { key: "2000", label: "~2000 mots" },
                      { key: "4000", label: "~4000 mots" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            articleLength: opt.key as any,
                          })
                        }
                        className={`p-3 rounded border ${
                          formData.articleLength === opt.key ? "bg-primary text-white" : "hover:border-primary"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 — PRODUCTS */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div className="max-h-[500px] overflow-y-auto space-y-3">
                  {filteredProducts.map((prod) => {
                    const sel = selectedProducts.find((p) => p.id === prod.id);
                    return (
                      <Card
                        key={prod.id}
                        className={`p-4 cursor-pointer ${sel ? "bg-blue-50 border-blue-500" : ""}`}
                        onClick={() =>
                          sel
                            ? setSelectedProducts(selectedProducts.filter((p) => p.id !== prod.id))
                            : setSelectedProducts([...selectedProducts, prod])
                        }
                      >
                        <div className="flex gap-4 items-center">
                          <input type="checkbox" checked={!!sel} readOnly className="w-5 h-5" />
                          <img src={prod.image_url} className="w-20 h-20 rounded object-cover" />
                          <div className="flex-1">
                            <div className="font-medium">{prod.title}</div>
                            <div className="text-sm text-gray-600 line-clamp-1">{prod.description}</div>
                            <div className="flex gap-2 mt-1">
                              <span className="font-semibold text-blue-600">{prod.price}€</span>
                              {prod.category && <Badge variant="outline">{prod.category}</Badge>}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3 — KEYWORDS */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {keywordSuggestions.length > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                    <div className="font-semibold mb-2 flex items-center gap-2">
                      <Sparkles className="h-4" /> Suggestions IA
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {keywordSuggestions.map((kw, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => {
                            if (!keywords.includes(kw)) setKeywords([...keywords, kw]);
                          }}
                        >
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => (e.key === "Enter" ? addKeyword() : null)}
                    placeholder="Ajouter un mot-clé..."
                  />
                  <Button onClick={addKeyword}>Ajouter</Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="gap-2">
                      {kw}
                      <X onClick={() => removeKeyword(kw)} className="h-3 w-3 cursor-pointer" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4 — CONFIG */}
            {currentStep === 4 && <ArticleConfigDialog config={articleConfig} onConfigChange={setArticleConfig} />}

            {/* STEP 5 — SUMMARY */}
            {currentStep === 5 && (
              <div className="bg-blue-50 p-4 rounded border border-blue-200 text-sm space-y-2">
                <p>
                  <strong>Collections :</strong> {formData.collectionTitles.join(", ") || "Aucune"}
                </p>
                <p>
                  <strong>Produits :</strong> {selectedProducts.length}
                </p>
                <p>
                  <strong>Mots-clés :</strong> {keywords.join(", ")}
                </p>
                <p>
                  <strong>Taille :</strong> {formData.articleLength} mots
                </p>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="flex justify-between border-t pt-4">
            <Button onClick={handlePrevious} variant="outline" disabled={currentStep === 1}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>

            {currentStep < steps.length ? (
              <Button onClick={handleNext}>
                Suivant <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Génération…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Générer l'article
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* DIALOGS */}
      <UpgradeDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} limitType="articles" />

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
        onClose={onClose}
      />

      <ArticleSyncDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        article={generatedArticle}
        onConfirm={handlePublishToShopify}
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
        open={isOptimizationComplete}
        onOpenChange={setIsOptimizationComplete}
        onClose={() => {
          setIsOptimizationComplete(false);
          setShowProgressDialog(false);
          onClose();
        }}
        type="seo"
        count={1}
      />

      <ArticleGenerationProgress open={showGenerationProgress} onClose={() => setShowGenerationProgress(false)} />
    </div>
  );
}
