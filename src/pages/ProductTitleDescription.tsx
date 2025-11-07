import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Loader2,
  Search,
  Paintbrush,
  Palette,
  Eye,
  RefreshCw,
  Square,
  FileText,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WhiteBackgroundPreviewDialog } from "@/components/seo/WhiteBackgroundPreviewDialog";
import { BackgroundDialog } from "@/components/seo/BackgroundDialog";
import { ProductTitleLandingDialog } from "@/components/seo/ProductTitleLandingDialog";
import RegenerateLanding from "@/components/seo/RegenerateLanding";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OptimizationConfigDialog, OptimizationConfig } from "@/components/seo/OptimizationConfigDialog";
import { LandingConfigDialog, LandingConfig } from "@/components/seo/LandingConfigDialog";
import { AiBackgroundConfigDialog, AiBackgroundConfig } from "@/components/seo/AiBackgroundConfigDialog";
// Removed useBackgroundRemoval - now using generate-white-background edge function
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Product {
  id: string;
  title: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  image_url: string | null;
  shopify_id: number | null;
}

interface ProductImage {
  id: string;
  src: string;
  alt_text: string | null;
  position: number | null;
}

// Check if product has rich HTML description
const hasRichHtmlDescription = (product: Product): boolean => {
  return !!(product.description && product.description.includes('<h1'));
};

interface PreviewImage {
  productId: string;
  productTitle: string;
  originalUrl: string;
  generatedUrl: string | null;
  status: 'pending' | 'generating' | 'success' | 'error';
  error?: string;
}

export default function ProductTitleDescription() {
  const { t } = useTranslation();
  const { limits, canDoAction, refresh: refreshLimits } = useUsageLimits();
  // Removed local background removal hook - using edge function instead
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingWhiteBg, setGeneratingWhiteBg] = useState(false);
  const [generatingAiBg, setGeneratingAiBg] = useState(false);
  const [showWhiteBgDialog, setShowWhiteBgDialog] = useState(false);
  const [showAiBgDialog, setShowAiBgDialog] = useState(false);
  const [whiteBgPreviews, setWhiteBgPreviews] = useState<PreviewImage[]>([]);
  const [aiBgPreviews, setAiBgPreviews] = useState<PreviewImage[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showAiConfigDialog, setShowAiConfigDialog] = useState(false);
  const [showLandingPreviewDialog, setShowLandingPreviewDialog] = useState(false);
  const [optimizedProducts, setOptimizedProducts] = useState<Product[]>([]);
  const [syncingToShopify, setSyncingToShopify] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedImageType, setSelectedImageType] = useState<"primary" | "secondary">("primary");
  const [showWhiteBgConfigDialog, setShowWhiteBgConfigDialog] = useState(false);
  const [currentProcessing, setCurrentProcessing] = useState<{ index: number; total: number; title: string } | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showLandingDialog, setShowLandingDialog] = useState(false);
  const [selectedLandingProduct, setSelectedLandingProduct] = useState<Product | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [optimizationConfig, setOptimizationConfig] = useState<OptimizationConfig | null>(null);
  const [showLandingConfigDialog, setShowLandingConfigDialog] = useState(false);
  const [landingConfig, setLandingConfig] = useState<LandingConfig | null>(null);
  const [galleryImages, setGalleryImages] = useState<Map<string, ProductImage[]>>(new Map());
  const [selectedGalleryImages, setSelectedGalleryImages] = useState<Map<string, string>>(new Map());
  const [selectedImageFormat, setSelectedImageFormat] = useState<string>('square');
  const [selectedSimilarity, setSelectedSimilarity] = useState<string>('medium');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("shopify_products")
        .select("id, title, description, seo_title, seo_description, image_url, shopify_id")
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

  const handleOptimizeSelected = async (config?: OptimizationConfig) => {
    if (selectedProducts.size === 0) {
      toast.error("Veuillez sélectionner au moins un produit à optimiser");
      return;
    }

    // Vérifier les limites d'utilisation
    if (!canDoAction('optimizations')) {
      setShowUpgradeDialog(true);
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setGenerating(true);
    setIsOptimizing(true);
    setOptimizedProducts([]);
    setShowLandingPreviewDialog(true);
    
    const productArray = Array.from(selectedProducts);
    const toastId = toast.loading(`Génération 0/${productArray.length} produit(s)...`);

    try {
      for (let i = 0; i < productArray.length; i++) {
        // Vérifier si annulation demandée
        if (controller.signal.aborted) {
          throw new Error('CANCELLED: Génération annulée par l\'utilisateur');
        }

        const productId = productArray[i];
        const product = products.find((p) => p.id === productId);
        if (!product) continue;

        // Mettre à jour l'indicateur de progression
        setCurrentProcessing({
          index: i + 1,
          total: productArray.length,
          title: product.title
        });
        
        toast.loading(`Génération ${i + 1}/${productArray.length}: ${product.title.substring(0, 40)}...`, { id: toastId });

        // Timeout réduit à 45 secondes
        const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: 'TIMEOUT' } }), 45000)
        );

        const invokePromise = supabase.functions.invoke("generate-title-description", {
          body: {
            currentTitle: product.title,
            imageUrl: (config || optimizationConfig)?.selectedImageUrl || product.image_url || null,
            config: config || optimizationConfig,
            customDescription: (config || optimizationConfig)?.customDescription || '',
            vendor: '',
          },
        });

        const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

        if (error) {
          // Check for specific error types
          const errorMessage = error.message || String(error);
          
          if (errorMessage.includes('LIMIT_REACHED') || errorMessage.includes('Limite d\'optimisations atteinte')) {
            throw new Error('LIMIT_REACHED: Limite d\'optimisations atteinte. Veuillez passer à un plan supérieur.');
          }
          
          if (errorMessage.includes('CREDITS_DEPLETED') || errorMessage.includes('402')) {
            throw new Error('CREDITS_DEPLETED: Les crédits Lovable AI sont épuisés. Veuillez ajouter des crédits dans Settings → Workspace → Usage.');
          }
          
          if (errorMessage.includes('RATE_LIMIT') || errorMessage.includes('429')) {
            throw new Error('RATE_LIMIT: Limite de taux atteinte. Veuillez patienter quelques instants.');
          }

          if (errorMessage.includes('TIMEOUT')) {
            throw new Error('TIMEOUT: La génération prend trop de temps. Le contenu demandé est peut-être trop complexe.');
          }

          if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
            throw new Error('NETWORK: Erreur réseau. Vérifiez votre connexion et réessayez.');
          }
          
          throw error;
        }

        // Update local state
        const { data: updatedProduct } = await supabase
          .from("shopify_products")
          .select("id, title, description, seo_title, seo_description, image_url, shopify_id")
          .eq("id", productId)
          .single();

        if (updatedProduct) {
          // Update optimizedProducts progressively
          setOptimizedProducts((prev) => [...prev, updatedProduct]);
          setProducts((prev) =>
            prev.map((p) =>
              p.id === productId
                ? { ...p, seo_title: updatedProduct.seo_title, seo_description: updatedProduct.seo_description }
                : p
            )
          );
        }
      }

      toast.success(`${optimizedProducts.length}/${productArray.length} produit(s) optimisé(s)`, { id: toastId });
      setSelectedProducts(new Set());
      await refreshLimits(); // Rafraîchir les limites après optimisation
    } catch (error: any) {
      console.error("Error optimizing:", error);
      
      const errorMessage = error?.message || String(error);
      
      if (errorMessage.includes('CANCELLED')) {
        toast.info("Génération annulée", {
          id: toastId,
          description: `${optimizedProducts.length} produit(s) ont été optimisé(s) avant l'annulation.`
        });
      } else if (errorMessage.includes('LIMIT_REACHED')) {
        toast.error("Limite atteinte", {
          id: toastId,
          description: "Vous avez atteint votre limite d'optimisations. Passez à un plan supérieur."
        });
        setShowUpgradeDialog(true);
      } else if (errorMessage.includes('CREDITS_DEPLETED')) {
        toast.error("Crédits IA épuisés", {
          id: toastId,
          description: "Ajoutez des crédits dans Settings → Workspace → Usage."
        });
      } else if (errorMessage.includes('RATE_LIMIT')) {
        toast.error("Trop de requêtes", {
          id: toastId,
          description: "Patientez quelques instants avant de réessayer."
        });
      } else if (errorMessage.includes('TIMEOUT')) {
        toast.error("Génération trop longue (>45s)", {
          id: toastId,
          description: "Le contenu est peut-être trop complexe. Réessayez."
        });
      } else if (errorMessage.includes('NETWORK')) {
        toast.error("Erreur réseau", {
          id: toastId,
          description: "Vérifiez votre connexion internet."
        });
      } else {
        toast.error("Erreur lors de l'optimisation", { 
          id: toastId,
          description: errorMessage || "Erreur inconnue"
        });
      }
    } finally {
      setGenerating(false);
      setIsOptimizing(false);
      setCurrentProcessing(null);
      setAbortController(null);
    }
  };
  
  const handleCancelGeneration = () => {
    if (abortController) {
      abortController.abort();
      toast.info("Annulation en cours...");
    }
  };

  const handleOptimizeAll = async () => {
    if (filteredProducts.length === 0) {
      toast.error("Aucun produit à optimiser");
      return;
    }

    setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
    setShowConfigDialog(true);
  };

  const handleConfigConfirm = (config: OptimizationConfig) => {
    setOptimizationConfig(config);
    setTimeout(() => handleOptimizeSelected(config), 100);
  };

  const handleLandingConfigConfirm = (config: LandingConfig) => {
    setLandingConfig(config);
    setShowLandingConfigDialog(false);
    setTimeout(() => setShowLandingDialog(true), 100);
  };

  const loadGalleryImages = async (productIds: string[]) => {
    const imagesMap = new Map<string, ProductImage[]>();
    
    for (const productId of productIds) {
      const { data, error } = await supabase
        .from('product_images')
        .select('id, src, alt_text, position')
        .eq('product_id', productId)
        .order('position', { ascending: true });
      
      if (!error && data) {
        imagesMap.set(productId, data);
      }
    }
    
    setGalleryImages(imagesMap);
  };

  const handleWhiteBackground = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Veuillez sélectionner au moins un produit");
      return;
    }

    // Vérifier les limites d'utilisation
    if (!canDoAction('optimizations')) {
      setShowUpgradeDialog(true);
      return;
    }

    const selectedProductsList = products.filter((p) =>
      selectedProducts.has(p.id) && p.image_url
    );

    if (selectedProductsList.length === 0) {
      toast.error("Aucun produit sélectionné n'a d'image");
      return;
    }

    // Close config dialog and start generation
    setShowWhiteBgConfigDialog(false);
    setGeneratingWhiteBg(true);
    
    const previews: PreviewImage[] = selectedProductsList.map((p) => {
      const selectedImageUrl = selectedGalleryImages.get(p.id) || p.image_url!;
      return {
        productId: p.id,
        productTitle: p.title,
        originalUrl: selectedImageUrl,
        generatedUrl: null,
        status: 'pending' as const,
      };
    });

    setWhiteBgPreviews(previews);
    setShowWhiteBgDialog(true);

    for (let i = 0; i < selectedProductsList.length; i++) {
      const product = selectedProductsList[i];
      const selectedImageUrl = selectedGalleryImages.get(product.id) || product.image_url!;
      
      setWhiteBgPreviews((prev) =>
        prev.map((p) =>
          p.productId === product.id ? { ...p, status: 'generating' } : p
        )
      );

      try {
        const { data, error } = await supabase.functions.invoke('generate-white-background', {
          body: { 
            imageUrl: selectedImageUrl,
            productTitle: product.title,
            imageType: selectedImageType
          }
        });

        if (error) throw error;

        if (data.success && data.imageUrl) {
          setWhiteBgPreviews((prev) =>
            prev.map((p) =>
              p.productId === product.id
                ? { ...p, status: 'success', generatedUrl: data.imageUrl }
                : p
            )
          );
        } else {
          throw new Error(data.error || 'Échec de la génération');
        }
      } catch (error: any) {
        console.error('Error generating white background:', error);
        setWhiteBgPreviews((prev) =>
          prev.map((p) =>
            p.productId === product.id
              ? { ...p, status: 'error', error: error.message || 'Erreur de génération' }
              : p
          )
        );
      }
    }

    setGeneratingWhiteBg(false);
    await refreshLimits();
  };

  const handleStartAiBackground = async (prompt: string, format: string, similarity: string) => {
    // Vérifier les limites d'utilisation
    if (!canDoAction('optimizations')) {
      setShowUpgradeDialog(true);
      return;
    }

    const selectedProductsList = products.filter((p) =>
      selectedProducts.has(p.id) && p.image_url
    );

    if (selectedProductsList.length === 0) {
      toast.error("Aucun produit sélectionné n'a d'image");
      return;
    }

    setShowPromptDialog(false);
    setGeneratingAiBg(true);
    
    const previews: PreviewImage[] = selectedProductsList.map((p) => {
      const selectedImageUrl = selectedGalleryImages.get(p.id) || p.image_url!;
      return {
        productId: p.id,
        productTitle: p.title,
        originalUrl: selectedImageUrl,
        generatedUrl: null,
        status: 'pending' as const,
      };
    });

    setAiBgPreviews(previews);
    setShowAiBgDialog(true);

    for (let i = 0; i < selectedProductsList.length; i++) {
      const product = selectedProductsList[i];
      const selectedImageUrl = selectedGalleryImages.get(product.id) || product.image_url!;
      
      setAiBgPreviews((prev) =>
        prev.map((p) =>
          p.productId === product.id ? { ...p, status: 'generating' } : p
        )
      );

      try {
        const { data, error } = await supabase.functions.invoke('generate-image-background', {
          body: {
            imageUrl: selectedImageUrl,
            prompt: prompt,
            productTitle: product.title,
            imageType: selectedImageType,
            format: format,
            similarity: similarity
          }
        });

        if (error) throw error;

        if (data.success && data.imageUrl) {
          setAiBgPreviews((prev) =>
            prev.map((p) =>
              p.productId === product.id
                ? { ...p, status: 'success', generatedUrl: data.imageUrl }
                : p
            )
          );
        } else {
          throw new Error('No image generated');
        }
      } catch (error: any) {
        console.error('Error generating AI background:', error);
        setAiBgPreviews((prev) =>
          prev.map((p) =>
            p.productId === product.id
              ? { ...p, status: 'error', error: error.message || 'Erreur de génération' }
              : p
          )
        );
      }
    }

    setGeneratingAiBg(false);
    await refreshLimits();
  };

  const handleApplyWhiteBackground = async (productIds: string[], format: string) => {
    const toastId = toast.loading("Application des images...");
    console.log('Applying white background with format:', format);

    try {
      for (const productId of productIds) {
        const preview = whiteBgPreviews.find((p) => p.productId === productId);
        if (!preview?.generatedUrl) continue;

        await supabase
          .from("shopify_products")
          .update({ image_url: preview.generatedUrl })
          .eq("id", productId);
      }

      toast.success("Images appliquées avec succès", { id: toastId });
      await fetchProducts();
      setWhiteBgPreviews([]);
    } catch (error) {
      console.error("Error applying images:", error);
      toast.error("Erreur lors de l'application", { id: toastId });
    }
  };

  const handleApplyAiBackground = async (productIds: string[]) => {
    const toastId = toast.loading("Application des images...");

    try {
      for (const productId of productIds) {
        const preview = aiBgPreviews.find((p) => p.productId === productId);
        if (!preview?.generatedUrl) continue;

        await supabase
          .from("shopify_products")
          .update({ image_url: preview.generatedUrl })
          .eq("id", productId);
      }

      toast.success("Images appliquées avec succès", { id: toastId });
      await fetchProducts();
      setAiBgPreviews([]);
    } catch (error) {
      console.error("Error applying images:", error);
      toast.error("Erreur lors de l'application", { id: toastId });
    }
  };

  const handleRegenerateWhiteBg = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product?.image_url) return;

    setWhiteBgPreviews((prev) =>
      prev.map((p) =>
        p.productId === productId ? { ...p, status: 'generating', error: undefined } : p
      )
    );

      try {
        const { data, error } = await supabase.functions.invoke('generate-white-background', {
          body: { 
            imageUrl: product.image_url,
            productTitle: product.title,
            imageType: selectedImageType
          }
        });

      if (error) throw error;

      if (data.success && data.imageUrl) {
        setWhiteBgPreviews((prev) =>
          prev.map((p) =>
            p.productId === productId
              ? { ...p, status: 'success', generatedUrl: data.imageUrl }
              : p
          )
        );
      } else {
        throw new Error(data.error || 'Échec de la régénération');
      }
    } catch (error: any) {
      console.error('Error regenerating:', error);
      setWhiteBgPreviews((prev) =>
        prev.map((p) =>
          p.productId === productId
            ? { ...p, status: 'error', error: error.message || 'Erreur de génération' }
            : p
        )
      );
    }
  };

  const handleRegenerateAiBg = async (productId: string, prompt?: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product?.image_url) return;

    const promptToUse = prompt || customPrompt;

    setAiBgPreviews((prev) =>
      prev.map((p) =>
        p.productId === productId ? { ...p, status: 'generating', error: undefined } : p
      )
    );

    try {
      const { data, error } = await supabase.functions.invoke('generate-image-background', {
        body: {
          imageUrl: product.image_url,
          prompt: promptToUse,
          productTitle: product.title,
          imageType: selectedImageType
        }
      });

      if (error) throw error;

      if (data.success && data.imageUrl) {
        setAiBgPreviews((prev) =>
          prev.map((p) =>
            p.productId === productId
              ? { ...p, status: 'success', generatedUrl: data.imageUrl }
              : p
          )
        );
      } else {
        throw new Error('No image generated');
      }
    } catch (error: any) {
      console.error('Error regenerating:', error);
      setAiBgPreviews((prev) =>
        prev.map((p) =>
          p.productId === productId
            ? { ...p, status: 'error', error: error.message || 'Erreur de génération' }
            : p
        )
      );
    }
  };

  const handleSyncToShopify = async () => {
    setSyncingToShopify(true);
    const toastId = toast.loading("Synchronisation avec Shopify...");

    try {
      for (const product of optimizedProducts) {
        if (!product.shopify_id) continue;

        const { error } = await supabase.functions.invoke('sync-seo-to-shopify', {
          body: {
            productId: product.id,
            shopifyId: product.shopify_id,
            seoTitle: product.seo_title,
            seoDescription: product.seo_description,
          }
        });

        if (error) {
          console.error(`Error syncing product ${product.id}:`, error);
        }
      }

      toast.success(`${optimizedProducts.length} produit(s) synchronisé(s) avec Shopify`, { id: toastId });
      setShowLandingPreviewDialog(false);
      setOptimizedProducts([]);
    } catch (error) {
      console.error("Error syncing to Shopify:", error);
      toast.error("Erreur lors de la synchronisation", { id: toastId });
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
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 sm:h-8 sm:h-8 text-primary" />
                Contenu Produit Optimisé
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Créez des titres captivants et des descriptions riches en HTML pour séduire vos clients et améliorer votre visibilité naturelle
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleOptimizeAll}
                disabled={generating || filteredProducts.length === 0}
                size="lg"
                className="gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Optimisation...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Optimiser tout
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const productsToSync = filteredProducts.filter(p => 
                    p.shopify_id && (hasRichHtmlDescription(p) || p.seo_title)
                  );
                  
                  if (productsToSync.length === 0) {
                    toast.error("Aucun produit optimisé à synchroniser");
                    return;
                  }
                  
                  const toastId = toast.loading(`Synchronisation de ${productsToSync.length} produit(s)...`);
                  
                  try {
                    for (const product of productsToSync) {
                      await supabase.functions.invoke('sync-seo-to-shopify', {
                        body: {
                          productId: product.id,
                          shopifyId: product.shopify_id,
                          seoTitle: product.seo_title,
                          seoDescription: product.seo_description,
                        }
                      });
                    }
                    toast.success(`${productsToSync.length} produit(s) synchronisé(s)`, { id: toastId });
                  } catch (error) {
                    console.error("Sync error:", error);
                    toast.error("Erreur lors de la synchronisation", { id: toastId });
                  }
                }}
                disabled={syncingToShopify}
                size="lg"
                className="gap-2"
              >
                {syncingToShopify ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Synchroniser tout
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const productsToSync = Array.from(selectedProducts)
                    .map(id => products.find(p => p.id === id))
                    .filter(p => p && p.shopify_id && (hasRichHtmlDescription(p) || p.seo_title)) as Product[];
                  
                  if (productsToSync.length === 0) {
                    toast.error("Aucun produit sélectionné à synchroniser");
                    return;
                  }
                  
                  const toastId = toast.loading(`Synchronisation de ${productsToSync.length} produit(s)...`);
                  
                  try {
                    for (const product of productsToSync) {
                      await supabase.functions.invoke('sync-seo-to-shopify', {
                        body: {
                          productId: product.id,
                          shopifyId: product.shopify_id,
                          seoTitle: product.seo_title,
                          seoDescription: product.seo_description,
                        }
                      });
                    }
                    toast.success(`${productsToSync.length} produit(s) synchronisé(s)`, { id: toastId });
                    setSelectedProducts(new Set());
                  } catch (error) {
                    console.error("Sync error:", error);
                    toast.error("Erreur lors de la synchronisation", { id: toastId });
                  }
                }}
                disabled={syncingToShopify || selectedProducts.size === 0}
                size="lg"
                className="gap-2"
              >
                {syncingToShopify ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Synchroniser sélectionnés ({selectedProducts.size})
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats & Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ImageIcon className="h-5 w-5 text-primary" />
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
                <p className="text-sm text-muted-foreground">Optimisés</p>
                <p className="text-2xl font-bold">
                  {products.filter((p) => p.seo_title || p.seo_description).length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Wand2 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sélectionnés</p>
                <p className="text-2xl font-bold">{selectedProducts.size}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions Bar */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 justify-between">
            <div className="flex-1 w-full lg:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOptimizeSelected()}
                disabled={generating || selectedProducts.size === 0}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Optimiser ({selectedProducts.size})
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await loadGalleryImages(Array.from(selectedProducts));
                  setShowWhiteBgConfigDialog(true);
                }}
                disabled={generatingWhiteBg || selectedProducts.size === 0}
              >
                {generatingWhiteBg ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Square className="h-4 w-4 mr-2" />
                )}
                Fond blanc ({selectedProducts.size})
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={async () => {
                  await loadGalleryImages(Array.from(selectedProducts));
                  setShowAiConfigDialog(true);
                }}
                disabled={generatingAiBg || selectedProducts.size === 0}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
              >
                {generatingAiBg ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Palette className="h-4 w-4 mr-2" />
                )}
                Arrière-plan IA ({selectedProducts.size})
              </Button>
            </div>
          </div>
        </Card>

        {/* Info Alert */}
        <Alert>
          <ImageIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Fond blanc :</strong> Supprime automatiquement l'arrière-plan et ajoute un fond blanc professionnel.
            {" "}<strong>Arrière-plan IA :</strong> Génère un nouvel arrière-plan personnalisé avec l'intelligence artificielle.
          </AlertDescription>
        </Alert>

        {/* Products Table */}
        <Card className="overflow-hidden">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
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
                  <TableHead className="w-40">Actions</TableHead>
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
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{product.seo_title || product.title}</p>
                        {product.seo_title && product.title !== product.seo_title && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            Original: {product.title}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {product.seo_description ? (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.seo_description}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Aucune description optimisée</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasRichHtmlDescription(product) ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          ✨ Contenu Premium
                        </Badge>
                      ) : product.seo_title || product.seo_description ? (
                        <Badge variant="secondary">
                          Contenu Basique ✓
                        </Badge>
                      ) : (
                        <Badge variant="outline">À optimiser</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                // Vérifier les limites AVANT de sélectionner et optimiser
                                if (!canDoAction('optimizations')) {
                                  setShowUpgradeDialog(true);
                                  return;
                                }
                                setSelectedProducts(new Set([product.id]));
                                setTimeout(() => handleOptimizeSelected(), 0);
                              }}
                              disabled={generating || !canDoAction('optimizations')}
                            >
                              <Sparkles className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Optimiser</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                // Vérifier les limites AVANT d'ouvrir le dialog
                                if (!canDoAction('optimizations')) {
                                  setShowUpgradeDialog(true);
                                  return;
                                }
                                setSelectedProducts(new Set([product.id]));
                                await loadGalleryImages([product.id]);
                                setShowWhiteBgConfigDialog(true);
                              }}
                              disabled={generatingWhiteBg || !canDoAction('optimizations')}
                            >
                              {generatingWhiteBg && selectedProducts.has(product.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Fond blanc</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                // Vérifier les limites AVANT d'ouvrir le dialog
                                if (!canDoAction('optimizations')) {
                                  setShowUpgradeDialog(true);
                                  return;
                                }
                                setSelectedProducts(new Set([product.id]));
                                await loadGalleryImages([product.id]);
                                setShowAiConfigDialog(true);
                              }}
                              disabled={generatingAiBg || !canDoAction('optimizations')}
                              className="hover:bg-purple-50 dark:hover:bg-purple-950"
                            >
                              {generatingAiBg && selectedProducts.has(product.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Palette className="h-4 w-4 text-purple-600" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Arrière-plan IA</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (hasRichHtmlDescription(product) || product.seo_title || product.seo_description) {
                                  setOptimizedProducts([product]);
                                  setShowLandingPreviewDialog(true);
                                } else {
                                  toast.error("Ce produit n'a pas encore été optimisé");
                                }
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Visualiser</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedLandingProduct(product);
                                setShowLandingConfigDialog(true);
                              }}
                              className="hover:bg-primary/10"
                            >
                              <FileText className="h-4 w-4 text-primary" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Générer Landing Page IA</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        {product.shopify_id && (hasRichHtmlDescription(product) || product.seo_title) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  const toastId = toast.loading("Synchronisation...");
                                  try {
                                    const { error } = await supabase.functions.invoke('sync-seo-to-shopify', {
                                      body: {
                                        productId: product.id,
                                        shopifyId: product.shopify_id,
                                        seoTitle: product.seo_title,
                                        seoDescription: product.seo_description,
                                      }
                                    });
                                    
                                    if (error) throw error;
                                    toast.success("Synchronisé avec Shopify", { id: toastId });
                                  } catch (error) {
                                    console.error("Sync error:", error);
                                    toast.error("Erreur lors de la synchronisation", { id: toastId });
                                  }
                                }}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Synchroniser</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredProducts.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                Aucun produit trouvé
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>

      {/* Dialogs */}
      {/* White Background Configuration Dialog */}
      <Dialog open={showWhiteBgConfigDialog} onOpenChange={setShowWhiteBgConfigDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Square className="h-5 w-5 text-primary" />
              Configuration Fond Blanc
            </DialogTitle>
            <DialogDescription>
              Choisissez quelle photo de la galerie vous souhaitez retravailler
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Gallery Image Selection */}
            {Array.from(selectedProducts).length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Sélection de la photo à retravailler</Label>
                {Array.from(selectedProducts).map((productId) => {
                  const product = products.find(p => p.id === productId);
                  const images = galleryImages.get(productId) || [];
                  const hasGallery = images.length > 0;
                  
                  if (!product) return null;
                  
                  return (
                    <Card key={productId} className="p-4">
                      <h4 className="font-semibold mb-3 text-sm">{product.title}</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {/* Image principale */}
                        <div
                          className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                            (!selectedGalleryImages.get(productId) || selectedGalleryImages.get(productId) === product.image_url)
                              ? 'border-primary ring-2 ring-primary'
                              : 'border-muted hover:border-primary/50'
                          }`}
                          onClick={() => {
                            const newMap = new Map(selectedGalleryImages);
                            newMap.set(productId, product.image_url!);
                            setSelectedGalleryImages(newMap);
                          }}
                        >
                          <img
                            src={product.image_url || ''}
                            alt="Image principale"
                            className="w-full h-24 object-cover rounded"
                          />
                          <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                            Principal
                          </div>
                        </div>
                        
                        {/* Images de galerie */}
                        {images.map((img, idx) => (
                          <div
                            key={img.id}
                            className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                              selectedGalleryImages.get(productId) === img.src
                                ? 'border-primary ring-2 ring-primary'
                                : 'border-muted hover:border-primary/50'
                            }`}
                            onClick={() => {
                              const newMap = new Map(selectedGalleryImages);
                              newMap.set(productId, img.src);
                              setSelectedGalleryImages(newMap);
                            }}
                          >
                            <img
                              src={img.src}
                              alt={img.alt_text || `Galerie ${idx + 1}`}
                              className="w-full h-24 object-cover rounded"
                            />
                            <div className="absolute top-1 right-1 bg-secondary text-secondary-foreground text-xs px-1.5 py-0.5 rounded">
                              #{idx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                      {!hasGallery && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Aucune image de galerie disponible
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
            
            {/* Type d'image */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Type d'image (obligatoire) *</Label>
              <div className="grid grid-cols-2 gap-3">
                <Card 
                  className={`p-4 cursor-pointer transition-all ${
                    selectedImageType === "primary" 
                      ? "border-primary bg-primary/5 ring-2 ring-primary" 
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedImageType("primary")}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                      selectedImageType === "primary" 
                        ? "border-primary bg-primary" 
                        : "border-muted-foreground"
                    }`}>
                      {selectedImageType === "primary" && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold text-sm">Image Principale</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Produit <strong>centré</strong> et bien visible sur fond blanc. Format carré professionnel.
                      </p>
                    </div>
                  </div>
                </Card>
                <Card 
                  className={`p-4 cursor-pointer transition-all ${
                    selectedImageType === "secondary" 
                      ? "border-primary bg-primary/5 ring-2 ring-primary" 
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedImageType("secondary")}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                      selectedImageType === "secondary" 
                        ? "border-primary bg-primary" 
                        : "border-muted-foreground"
                    }`}>
                      {selectedImageType === "secondary" && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold text-sm">Image Secondaire</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Photo d'ambiance sur fond blanc. Composition créative, centrage non obligatoire.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowWhiteBgConfigDialog(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleWhiteBackground}
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Générer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WhiteBackgroundPreviewDialog
        open={showWhiteBgDialog}
        onOpenChange={setShowWhiteBgDialog}
        previews={whiteBgPreviews}
        onApply={handleApplyWhiteBackground}
        onRegenerate={handleRegenerateWhiteBg}
      />

      {/* AI Background Configuration Dialog */}
      <AiBackgroundConfigDialog
        open={showAiConfigDialog}
        onOpenChange={setShowAiConfigDialog}
        onConfirm={(config: AiBackgroundConfig) => {
          setSelectedImageType(config.imageType);
          setSelectedImageFormat(config.format);
          setSelectedSimilarity(config.similarity);
          setSelectedGalleryImages(config.selectedGalleryImages);
          handleStartAiBackground(config.prompt, config.format, config.similarity);
        }}
        productImages={galleryImages}
        selectedProducts={Array.from(selectedProducts)}
        products={products}
      />

      <BackgroundDialog
        open={showAiBgDialog}
        onOpenChange={setShowAiBgDialog}
        previews={aiBgPreviews}
        onApply={handleApplyAiBackground}
        onRegenerate={handleRegenerateAiBg}
        customPrompt={customPrompt}
        onCustomPromptChange={setCustomPrompt}
      />

      <ProductTitleLandingDialog
        open={showLandingPreviewDialog}
        onOpenChange={setShowLandingPreviewDialog}
        products={optimizedProducts}
        isGenerating={isOptimizing}
        currentProcessing={currentProcessing}
        onCancel={generating ? handleCancelGeneration : undefined}
        onSync={handleSyncToShopify}
        syncLoading={syncingToShopify}
      />

      {/* Landing Config Dialog */}
      <LandingConfigDialog
        open={showLandingConfigDialog}
        onOpenChange={setShowLandingConfigDialog}
        onConfirm={handleLandingConfigConfirm}
        productTitle={selectedLandingProduct?.title}
      />

      {/* Landing Page Generator Dialog */}
      <Dialog open={showLandingDialog} onOpenChange={setShowLandingDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Générateur de Landing Page IA
            </DialogTitle>
            <DialogDescription>
              Créez une landing page personnalisée et optimisée pour votre produit
            </DialogDescription>
          </DialogHeader>
          {selectedLandingProduct && landingConfig && (
            <RegenerateLanding 
              product={selectedLandingProduct}
              config={landingConfig}
              autoGenerate={true}
              onGenerated={(html) => {
                console.log('Generated HTML:', html.substring(0, 100));
              }}
              onClose={() => setShowLandingDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <OptimizationConfigDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        onConfirm={handleConfigConfirm}
        productCount={filteredProducts.length}
        productImages={
          filteredProducts[0]?.id 
            ? (galleryImages.get(filteredProducts[0].id) || []).map(img => ({
                id: img.id,
                image_url: img.src,
                alt_text: img.alt_text || undefined
              }))
            : []
        }
        mainImageUrl={filteredProducts[0]?.image_url}
      />

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
