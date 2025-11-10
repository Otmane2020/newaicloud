import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import {
  Sparkles,
  Loader2,
  Search,
  FileText,
  Eye,
  Palette,
  Layout,
  Type,
  Upload,
  Monitor,
  Smartphone,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Product {
  id: string;
  title: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  image_url: string | null;
  shopify_id: number | null;
  landing_page_html: string | null;
}

interface LandingConfig {
  layout: string;
  colorTheme: string;
  style: string;
  highlights: string[];
  customText: string;
}

const LAYOUTS = [
  { id: "hero-features", name: "Hero + Features", description: "Grande image hero avec grille de fonctionnalités" },
  { id: "split-screen", name: "Split Screen", description: "Image à gauche, contenu à droite" },
  { id: "magazine", name: "Magazine", description: "Style éditorial avec sections imbriquées" },
  { id: "minimal", name: "Minimal", description: "Design épuré centré sur le produit" },
];

const COLOR_THEMES = [
  { id: "elegant", name: "Élégant", colors: { primary: "#1a1a1a", secondary: "#f5f5f5", accent: "#d4af37" } },
  { id: "fresh", name: "Frais", colors: { primary: "#0ea5e9", secondary: "#ffffff", accent: "#06b6d4" } },
  { id: "warm", name: "Chaleureux", colors: { primary: "#ea580c", secondary: "#fff7ed", accent: "#fb923c" } },
  { id: "nature", name: "Nature", colors: { primary: "#16a34a", secondary: "#f0fdf4", accent: "#4ade80" } },
];

const STYLES = [
  { id: "modern", name: "Moderne", description: "Design contemporain avec animations" },
  { id: "luxury", name: "Luxe", description: "Élégance et sophistication" },
  { id: "playful", name: "Ludique", description: "Coloré et dynamique" },
  { id: "professional", name: "Professionnel", description: "Corporate et sérieux" },
];

export default function ProductLandingPages() {
  const { t } = useTranslation();
  const { limits, canDoAction, refresh: refreshLimits } = useUsageLimits();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState("");
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [syncingToShopify, setSyncingToShopify] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  const [config, setConfig] = useState<LandingConfig>({
    layout: "hero-features",
    colorTheme: "elegant",
    style: "modern",
    highlights: [],
    customText: "",
  });

  const [currentHighlight, setCurrentHighlight] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    refreshLimits();
    const interval = setInterval(() => {
      refreshLimits();
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshLimits]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("shopify_products")
        .select("id, title, description, seo_title, seo_description, image_url, shopify_id, landing_page_html")
        .eq("seller_id", user.id)
        .order("imported_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Erreur lors du chargement des produits");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleAddHighlight = () => {
    if (currentHighlight.trim()) {
      setConfig({
        ...config,
        highlights: [...config.highlights, currentHighlight.trim()],
      });
      setCurrentHighlight("");
    }
  };

  const handleRemoveHighlight = (index: number) => {
    setConfig({
      ...config,
      highlights: config.highlights.filter((_, i) => i !== index),
    });
  };

  const handleGenerate = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Veuillez sélectionner au moins un produit");
      return;
    }

    if (!canDoAction("optimizations")) {
      setShowUpgradeDialog(true);
      return;
    }

    setGenerating(true);
    setShowConfigDialog(false);
    const toastId = toast.loading("Génération des landing pages...");
    
    const productsArray = Array.from(selectedProducts);
    setTotalProducts(productsArray.length);
    setCurrentProductIndex(0);
    setGenerationProgress(0);

    try {
      let successCount = 0;

      for (let i = 0; i < productsArray.length; i++) {
        const productId = productsArray[i];
        const product = products.find((p) => p.id === productId);
        if (!product) continue;

        setCurrentProductIndex(i + 1);
        const baseProgress = (i / productsArray.length) * 100;

        // Paralléliser Vision AI et enrichissement pour gagner du temps
        setGenerationStep(`Analyse IA (${i + 1}/${productsArray.length})`);
        setGenerationProgress(baseProgress + 10);
        
        const [visionResult, enrichResult] = await Promise.all([
          // Vision AI si image disponible
          product.image_url
            ? supabase.functions.invoke("analyze-image-with-vision", {
                body: { imageUrl: product.image_url },
              }).catch(err => {
                console.error("Vision AI error:", err);
                return { data: null };
              })
            : Promise.resolve({ data: null }),
          
          // Enrichissement du produit
          supabase.functions.invoke("enrich-product", {
            body: {
              title: product.title,
              description: product.description,
              imageUrl: product.image_url,
            },
          }).catch(err => {
            console.error("Enrich error:", err);
            return { data: null };
          })
        ]);

        const enrichedContent = visionResult.data?.analysis || "";
        
        // Générer le titre et description optimisés
        setGenerationStep(`Optimisation SEO (${i + 1}/${productsArray.length})`);
        setGenerationProgress(baseProgress + 25);
        
        const { data: titleData } = await supabase.functions.invoke("generate-title-description", {
          body: {
            currentTitle: product.title,
            imageUrl: product.image_url,
            config: {
              contentLength: "detailed",
              tone: config.style,
              includeEmojis: config.style === "playful",
            },
            customDescription: enrichedContent,
          },
        });

        // Générer le HTML de la landing page
        setGenerationStep(`Génération landing page (${i + 1}/${productsArray.length})`);
        setGenerationProgress(baseProgress + 50);
        
        const selectedTheme = COLOR_THEMES.find((t) => t.id === config.colorTheme);
        const { data: landingData } = await supabase.functions.invoke("generate-landing-ai", {
          body: {
            productTitle: titleData?.seoTitle || product.title,
            productDescription: titleData?.seoDescription || product.description,
            productImage: product.image_url,
            layout: config.layout,
            colorTheme: selectedTheme?.colors,
            style: config.style,
            highlights: config.highlights,
            customText: config.customText,
            enrichedContent,
          },
        });

        if (landingData?.generatedCode) {
          // Sauvegarder la landing page
          setGenerationStep(`Sauvegarde (${i + 1}/${productsArray.length})`);
          setGenerationProgress(baseProgress + 25);
          
          await supabase
            .from("shopify_products")
            .update({
              landing_page_html: landingData.generatedCode,
              seo_title: titleData?.seoTitle,
              seo_description: titleData?.seoDescription,
            })
            .eq("id", productId);

          successCount++;
        }
      }

      setGenerationProgress(100);
      setGenerationStep("Terminé !");
      
      toast.success(`${successCount} landing page(s) générée(s)`, { id: toastId });
      await fetchProducts();
      await refreshLimits();
      setSelectedProducts(new Set());
    } catch (error: any) {
      console.error("Error generating:", error);
      toast.error("Erreur lors de la génération", { id: toastId });
    } finally {
      // Fermer immédiatement le dialogue
      setGenerating(false);
      setGenerationProgress(0);
      setGenerationStep("");
      setCurrentProductIndex(0);
      setTotalProducts(0);
    }
  };

  const handlePreview = (product: Product) => {
    setPreviewProduct(product);
    setShowPreviewDialog(true);
  };

  const handleSyncToShopify = async (product: Product) => {
    if (!product.landing_page_html) {
      toast.error("Aucune landing page à synchroniser");
      return;
    }

    setSyncingToShopify(true);
    const toastId = toast.loading("Synchronisation vers Shopify...");

    try {
      const { data, error } = await supabase.functions.invoke("sync-landing-to-shopify", {
        body: {
          productId: product.id,
          shopifyProductId: product.shopify_id,
          landingPageHtml: product.landing_page_html,
          title: product.seo_title || product.title,
          description: product.seo_description || product.description,
        },
      });

      if (error) throw error;

      toast.success("Landing page synchronisée avec Shopify !", { id: toastId });
    } catch (error: any) {
      console.error("Error syncing to Shopify:", error);
      toast.error(error.message || "Erreur lors de la synchronisation", { id: toastId });
    } finally {
      setSyncingToShopify(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Banner */}
        <Card className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-primary/10 border-primary/20 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                Landing Pages Produits
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Créez des landing pages époustouflantes avec Vision AI et bonnes pratiques UX
              </p>
            </div>
            <Button
              onClick={() => {
                if (!canDoAction("optimizations")) {
                  setShowUpgradeDialog(true);
                  return;
                }
                if (selectedProducts.size === 0) {
                  toast.error("Sélectionnez au moins un produit");
                  return;
                }
                setShowConfigDialog(true);
              }}
              disabled={generating || selectedProducts.size === 0}
              size="lg"
              className="gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Générer ({selectedProducts.size})
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total produits</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avec landing page</p>
                <p className="text-2xl font-bold">{products.filter((p) => p.landing_page_html).length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Checkbox className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sélectionnés</p>
                <p className="text-2xl font-bold">{selectedProducts.size}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search Bar */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </Card>

        {/* Products Table */}
        <Card>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-20">Image</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead className="hidden lg:table-cell">Description</TableHead>
                  <TableHead className="w-32">Statut</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={() => handleSelectProduct(product.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.title} className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{product.seo_title || product.title}</p>
                        {product.seo_title && product.title !== product.seo_title && (
                          <p className="text-xs text-muted-foreground line-clamp-1">Original: {product.title}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {product.seo_description ? (
                        <p className="text-sm text-muted-foreground line-clamp-2">{product.seo_description}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Aucune description</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.landing_page_html ? (
                        <Badge className="bg-green-50 text-green-700 border-green-200">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Prêt
                        </Badge>
                      ) : (
                        <Badge variant="outline">À créer</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {product.landing_page_html && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handlePreview(product)}
                              title="Aperçu"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSyncToShopify(product)}
                              disabled={syncingToShopify}
                              title="Synchroniser avec Shopify"
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedProducts(new Set([product.id]));
                            setShowConfigDialog(true);
                          }}
                          disabled={generating}
                          title="Générer landing page"
                        >
                          <Sparkles className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredProducts.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">Aucun produit trouvé</div>
            )}
          </ScrollArea>
        </Card>
      </div>

      {/* Loading Dialog */}
      <Dialog open={generating && generationProgress > 0} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Génération en cours</DialogTitle>
            <DialogDescription>
              {currentProductIndex > 0 && `Produit ${currentProductIndex} sur ${totalProducts}`}
            </DialogDescription>
          </DialogHeader>
          <LoadingState
            message={generationStep}
            progress={generationProgress}
            estimatedTime={
              generationProgress < 30 
                ? "30-40 sec" 
                : generationProgress < 70 
                ? "15-20 sec" 
                : "5 sec"
            }
            details="L'IA analyse vos produits avec Vision AI et génère des landing pages optimisées"
          />
        </DialogContent>
      </Dialog>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Palette className="h-6 w-6 text-primary" />
              Configuration Landing Page
            </DialogTitle>
            <DialogDescription>
              Personnalisez le design et le contenu de votre landing page
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Layout Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Layout className="h-4 w-4" />
                Mise en page
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {LAYOUTS.map((layout) => (
                  <Card
                    key={layout.id}
                    className={`p-4 cursor-pointer transition-all ${
                      config.layout === layout.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setConfig({ ...config, layout: layout.id })}
                  >
                    <div className="space-y-2">
                      <h4 className="font-semibold">{layout.name}</h4>
                      <p className="text-xs text-muted-foreground">{layout.description}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Color Theme */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Thème de couleur
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {COLOR_THEMES.map((theme) => (
                  <Card
                    key={theme.id}
                    className={`p-4 cursor-pointer transition-all ${
                      config.colorTheme === theme.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setConfig({ ...config, colorTheme: theme.id })}
                  >
                    <div className="space-y-2">
                      <h4 className="font-semibold">{theme.name}</h4>
                      <div className="flex gap-2">
                        {Object.values(theme.colors).map((color, idx) => (
                          <div
                            key={idx}
                            className="w-8 h-8 rounded-full border-2 border-background shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Style */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Type className="h-4 w-4" />
                Style
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {STYLES.map((style) => (
                  <Card
                    key={style.id}
                    className={`p-4 cursor-pointer transition-all ${
                      config.style === style.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setConfig({ ...config, style: style.id })}
                  >
                    <div className="space-y-1">
                      <h4 className="font-semibold">{style.name}</h4>
                      <p className="text-xs text-muted-foreground">{style.description}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Highlights */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Points forts à mettre en avant</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Livraison gratuite"
                  value={currentHighlight}
                  onChange={(e) => setCurrentHighlight(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddHighlight()}
                />
                <Button type="button" onClick={handleAddHighlight}>
                  Ajouter
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {config.highlights.map((highlight, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1 cursor-pointer" onClick={() => handleRemoveHighlight(idx)}>
                    {highlight}
                    <span className="ml-1 text-xs">×</span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Custom Text */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Texte additionnel (optionnel)</Label>
              <Textarea
                placeholder="Ajoutez des informations supplémentaires à inclure dans la landing page..."
                value={config.customText}
                onChange={(e) => setConfig({ ...config, customText: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleGenerate} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Générer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-7xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Eye className="h-6 w-6 text-primary" />
                Aperçu Landing Page
              </DialogTitle>
              <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as "desktop" | "mobile")}>
                <TabsList>
                  <TabsTrigger value="desktop">Desktop</TabsTrigger>
                  <TabsTrigger value="mobile">Mobile</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </DialogHeader>

          <div className="p-6 bg-muted/30">
            <div
              className={`mx-auto bg-white rounded-lg shadow-2xl overflow-hidden transition-all ${
                previewMode === "mobile" ? "max-w-[375px]" : "max-w-full"
              }`}
            >
              {previewProduct?.landing_page_html ? (
                <iframe
                  srcDoc={previewProduct.landing_page_html}
                  className="w-full border-0"
                  style={{ height: "600px" }}
                  title="Landing page preview"
                />
              ) : (
                <div className="flex items-center justify-center h-[600px] text-muted-foreground">
                  Aucun aperçu disponible
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 gap-2">
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Fermer
            </Button>
            {previewProduct?.landing_page_html && (
              <Button 
                onClick={() => previewProduct && handleSyncToShopify(previewProduct)}
                disabled={syncingToShopify}
                className="gap-2"
              >
                {syncingToShopify ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Synchronisation...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Synchroniser vers Shopify
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType="optimizations"
        usage={limits?.usage.optimizations_count}
        limit={limits?.limits.max_optimizations}
        onUpgradeComplete={() => {
          refreshLimits();
          setShowUpgradeDialog(false);
        }}
      />
    </div>
  );
}
