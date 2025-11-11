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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { BackgroundDialog } from "@/components/seo/BackgroundDialog";
import { ProductTitleLandingDialog } from "@/components/seo/ProductTitleLandingDialog";
import RegenerateLanding from "@/components/seo/RegenerateLanding";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OptimizationConfigDialog, OptimizationConfig } from "@/components/seo/OptimizationConfigDialog";
import { LandingConfigDialog, LandingConfig } from "@/components/seo/LandingConfigDialog";
import { AiBackgroundConfigDialog, AiBackgroundConfig } from "@/components/seo/AiBackgroundConfigDialog";
import { OptimizationConfirmDialog } from "@/components/seo/OptimizationConfirmDialog";
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
  landing_page: string | null;
  seo_title: string | null;
  seo_description: string | null;
  image_url: string | null;
  shopify_id: number | null;
  vendor: string | null;
}

interface ProductImage {
  id: string;
  src: string;
  alt_text: string | null;
  position: number | null;
}

// Check if product has rich HTML description or landing page
const hasRichHtmlDescription = (product: Product): boolean => {
  return !!((product.landing_page && product.landing_page.includes('<h1')) || 
            (product.description && product.description.includes('<h1')));
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
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
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
  const [currentProcessing, setCurrentProcessing] = useState<{ index: number; total: number; title: string; vendor?: string | null } | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showOptimizationConfirm, setShowOptimizationConfirm] = useState(false);
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

  // Rafraîchir les limites au montage et toutes les 10 secondes
  useEffect(() => {
    refreshLimits();
    const interval = setInterval(() => {
      refreshLimits();
    }, 10000); // 10 secondes

    return () => clearInterval(interval);
  }, [refreshLimits]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("shopify_products")
        .select("id, title, description, landing_page, seo_title, seo_description, image_url, shopify_id, vendor")
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

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

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
          title: product.title,
          vendor: product.vendor
        });
        
        toast.loading(`Génération ${i + 1}/${productArray.length}: ${product.title.substring(0, 40)}... (SEO + HTML)`, { id: toastId });

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
            throw new Error('CREDITS_DEPLETED: Les crédits IA sont épuisés. Contactez le support pour plus d\'informations.');
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
          .select("id, title, description, landing_page, seo_title, seo_description, image_url, shopify_id, vendor")
          .eq("id", productId)
          .single();

        if (updatedProduct) {
          // Check if landing_page or description already has HTML (skip regeneration if present)
          const hasExistingHtml = (updatedProduct.landing_page && 
            (updatedProduct.landing_page.includes('<div') || updatedProduct.landing_page.includes('<section'))) ||
            (updatedProduct.description && 
            (updatedProduct.description.includes('<div') || updatedProduct.description.includes('<section')));

          if (!hasExistingHtml) {
            // Generate HTML landing page
            try {
              console.log("🎨 Génération du HTML de landing page pour:", updatedProduct.title);
              
              const { data: htmlData, error: htmlError } = await supabase.functions.invoke(
                'generate-product-description-html',
                {
                  body: {
                    title: updatedProduct.seo_title || updatedProduct.title,
                    existingDescription: updatedProduct.seo_description,
                    images: [updatedProduct.image_url].filter(Boolean),
                    visionAnalysis: null,
                    template: 'ecommerce',
                    productId: productId
                  }
                }
              );

              if (!htmlError && htmlData?.success && htmlData?.htmlLandingPage) {
                console.log("✅ HTML landing page généré (10 optimisations consommées)");
                
                // Save HTML to shopify_products.landing_page instead of description
                await supabase
                  .from("shopify_products")
                  .update({ landing_page: htmlData.htmlLandingPage })
                  .eq("id", productId);
                
                // Update local product with HTML in landing_page
                updatedProduct.landing_page = htmlData.htmlLandingPage;
              } else {
                console.warn("⚠️ Génération HTML échouée:", htmlError || htmlData?.error);
                // Don't block the process, continue with SEO only
              }
            } catch (htmlErr) {
              console.error("❌ Erreur génération HTML:", htmlErr);
              // Don't block the process, continue with SEO only
            }
          } else {
            console.log("✅ HTML déjà présent, pas de régénération");
          }

          // Update optimizedProducts progressively
          setOptimizedProducts((prev) => [...prev, updatedProduct]);
          setProducts((prev) =>
            prev.map((p) =>
              p.id === productId
                ? { 
                    ...p, 
                    seo_title: updatedProduct.seo_title, 
                    seo_description: updatedProduct.seo_description,
                    description: updatedProduct.description,
                    landing_page: updatedProduct.landing_page
                  }
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
    
    // Validation: ensure prompt is not empty
    if (!promptToUse || !promptToUse.trim()) {
      toast.error('Veuillez entrer un prompt avant de régénérer');
      return;
    }

    // Get the selected image URL for this product (gallery or main image)
    const selectedImageUrl = selectedGalleryImages.get(productId) || product.image_url;

    setAiBgPreviews((prev) =>
      prev.map((p) =>
        p.productId === productId ? { ...p, status: 'generating', error: undefined } : p
      )
    );

    try {
      const { data, error } = await supabase.functions.invoke('generate-image-background', {
        body: {
          imageUrl: selectedImageUrl,
          prompt: promptToUse.trim(),
          productTitle: product.title,
          imageType: selectedImageType,
          format: selectedImageFormat,
          similarity: selectedSimilarity
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
        toast.success('Arrière-plan régénéré avec succès');
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
      toast.error('Erreur lors de la régénération');
    }
  };

  const handleSyncToShopify = async () => {
    setSyncingToShopify(true);
    const toastId = toast.loading("Synchronisation avec Shopify...");

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const product of optimizedProducts) {
        if (!product.shopify_id) {
          console.warn(`Product ${product.id} has no shopify_id, skipping`);
          errorCount++;
          continue;
        }

        // Get product handle from database
        const { data: productData } = await supabase
          .from('shopify_products')
          .select('handle')
          .eq('id', product.id)
          .single();

        if (!productData?.handle) {
          console.error(`Product ${product.id} has no handle, skipping`);
          errorCount++;
          continue;
        }

        try {
          // Use sync-landing-to-shopify to sync both product description and landing page
          const { data, error } = await supabase.functions.invoke('sync-landing-to-shopify', {
            body: {
              productId: product.id,
              productTitle: product.title,
              productHandle: productData.handle,
              htmlContent: product.landing_page || product.description || '', // Use landing_page first
            }
          });

          if (error) {
            console.error(`Error syncing product ${product.id}:`, error);
            errorCount++;
          } else if (data?.success) {
            console.log(`✅ Product ${product.id} synced:`, data.operation);
            successCount++;
          } else {
            console.error(`Failed to sync product ${product.id}:`, data?.error);
            errorCount++;
          }
        } catch (err) {
          console.error(`Exception syncing product ${product.id}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} produit(s) synchronisé(s) avec Shopify`, { id: toastId });
      }
      
      if (errorCount > 0) {
        toast.error(`${errorCount} produit(s) n'ont pas pu être synchronisés`, { duration: 5000 });
      }

      if (successCount === optimizedProducts.length) {
        setShowLandingPreviewDialog(false);
        setOptimizedProducts([]);
      }
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
                {t.contentOptimization.hero.title}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {t.contentOptimization.hero.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  if (!canDoAction('optimizations')) {
                    toast.error("Limite d'optimisations atteinte");
                    setShowUpgradeDialog(true);
                    return;
                  }
                  handleOptimizeAll();
                }}
                disabled={generating || filteredProducts.length === 0}
                size="lg"
                className="gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.contentOptimization.buttons.optimizing}
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    {t.contentOptimization.buttons.optimizeAll}
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
                    toast.error(t.contentOptimization.toasts.noProductToSync);
                    return;
                  }
                  
                  const toastId = toast.loading(`${t.contentOptimization.buttons.synchronizing} ${productsToSync.length} ${t.contentOptimization.toasts.productsSynced}...`);
                  
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
                    toast.success(`${productsToSync.length} ${t.contentOptimization.toasts.productsSynced}`, { id: toastId });
                  } catch (error) {
                    console.error("Sync error:", error);
                    toast.error(t.contentOptimization.toasts.syncError, { id: toastId });
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
                {t.contentOptimization.buttons.syncAll}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const productsToSync = Array.from(selectedProducts)
                    .map(id => products.find(p => p.id === id))
                    .filter(p => p && p.shopify_id && (hasRichHtmlDescription(p) || p.seo_title)) as Product[];
                  
                  if (productsToSync.length === 0) {
                    toast.error(t.contentOptimization.toasts.noSelectedProduct);
                    return;
                  }
                  
                  const toastId = toast.loading(`${t.contentOptimization.buttons.synchronizing} ${productsToSync.length} ${t.contentOptimization.toasts.productsSynced}...`);
                  
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
                    toast.success(`${productsToSync.length} ${t.contentOptimization.toasts.productsSynced}`, { id: toastId });
                    setSelectedProducts(new Set());
                  } catch (error) {
                    console.error("Sync error:", error);
                    toast.error(t.contentOptimization.toasts.syncError, { id: toastId });
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
                {t.contentOptimization.buttons.syncSelected} ({selectedProducts.size})
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
                <p className="text-sm text-muted-foreground">{t.contentOptimization.stats.totalProducts}</p>
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
                <p className="text-sm text-muted-foreground">{t.contentOptimization.stats.optimized}</p>
                <p className="text-2xl font-bold">
                  {products.filter((p) => hasRichHtmlDescription(p)).length}
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
                <p className="text-sm text-muted-foreground">{t.contentOptimization.stats.selected}</p>
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
                  placeholder={t.contentOptimization.search.placeholder}
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
                onClick={() => {
                  if (!canDoAction('optimizations')) {
                    toast.error(t.contentOptimization.toasts.limitReached);
                    setShowUpgradeDialog(true);
                    return;
                  }
                  setShowOptimizationConfirm(true);
                }}
                disabled={generating || selectedProducts.size === 0}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {t.contentOptimization.buttons.optimize} ({selectedProducts.size})
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!canDoAction('optimizations')) {
                    toast.error(t.contentOptimization.toasts.limitReached);
                    setShowUpgradeDialog(true);
                    return;
                  }
                  setShowWhiteBgConfigDialog(true);
                  loadGalleryImages(Array.from(selectedProducts)); // Chargement en arrière-plan
                }}
                disabled={generatingWhiteBg || selectedProducts.size === 0}
              >
                {generatingWhiteBg ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Square className="h-4 w-4 mr-2" />
                )}
                {t.contentOptimization.buttons.whiteBg} ({selectedProducts.size})
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  if (!canDoAction('optimizations')) {
                    toast.error(t.contentOptimization.toasts.limitReached);
                    setShowUpgradeDialog(true);
                    return;
                  }
                  setShowAiConfigDialog(true);
                  loadGalleryImages(Array.from(selectedProducts)); // Chargement en arrière-plan
                }}
                disabled={generatingAiBg || selectedProducts.size === 0}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
              >
                {generatingAiBg ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Palette className="h-4 w-4 mr-2" />
                )}
                {t.contentOptimization.buttons.aiBg} ({selectedProducts.size})
              </Button>
            </div>
          </div>
        </Card>

        {/* Info Alert */}
        <Alert>
          <ImageIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>{t.contentOptimization.buttons.whiteBg} :</strong> {t.contentOptimization.alerts.whiteBg}
            {" "}<strong>{t.contentOptimization.buttons.aiBg} :</strong> {t.contentOptimization.alerts.aiBg}
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
                  <TableHead className="w-20">{t.contentOptimization.table.headers.image}</TableHead>
                  <TableHead className="w-32">Marque</TableHead>
                  <TableHead>{t.contentOptimization.table.headers.title}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t.contentOptimization.table.headers.description}</TableHead>
                  <TableHead className="w-32">{t.contentOptimization.table.headers.status}</TableHead>
                  <TableHead className="w-40">{t.contentOptimization.table.headers.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => (
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
                      <div className="text-sm">
                        {product.vendor ? (
                          <Badge variant="outline" className="font-normal">
                            {product.vendor}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">Non définie</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{product.seo_title || product.title}</p>
                          {product.description && product.description.includes('<!DOCTYPE html>') && (
                            <Badge variant="default" className="gap-1 text-xs">
                              <FileText className="h-3 w-3" />
                              Landing
                            </Badge>
                          )}
                        </div>
                         {product.seo_title && product.title !== product.seo_title && (
                           <p className="text-xs text-muted-foreground line-clamp-1">
                             {t.contentOptimization.table.original}: {product.title}
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
                        <p className="text-sm text-muted-foreground italic">{t.contentOptimization.table.noOptimizedDesc}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasRichHtmlDescription(product) ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          ✨ {t.contentOptimization.table.status.premiumContent}
                        </Badge>
                      ) : product.seo_title || product.seo_description ? (
                        <Badge variant="secondary">
                          {t.contentOptimization.table.status.basicContent} ✓
                        </Badge>
                      ) : (
                        <Badge variant="outline">{t.contentOptimization.table.status.toOptimize}</Badge>
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
                                  toast.error(t.contentOptimization.toasts.limitReached);
                                  setShowUpgradeDialog(true);
                                  return;
                                }
                                setSelectedProducts(new Set([product.id]));
                                setTimeout(() => handleOptimizeSelected(), 0);
                              }}
                              disabled={generating}
                            >
                              <Sparkles className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t.contentOptimization.tooltips.optimize}</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                // Vérifier les limites AVANT d'ouvrir le dialog
                                if (!canDoAction('optimizations')) {
                                  toast.error(t.contentOptimization.toasts.limitReached);
                                  setShowUpgradeDialog(true);
                                  return;
                                }
                                setSelectedProducts(new Set([product.id]));
                                setShowWhiteBgConfigDialog(true);
                                loadGalleryImages([product.id]); // Chargement en arrière-plan
                              }}
                              disabled={generatingWhiteBg}
                            >
                              {generatingWhiteBg && selectedProducts.has(product.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t.contentOptimization.tooltips.whiteBg}</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                // Vérifier les limites AVANT d'ouvrir le dialog
                                if (!canDoAction('optimizations')) {
                                  toast.error(t.contentOptimization.toasts.limitReached);
                                  setShowUpgradeDialog(true);
                                  return;
                                }
                                setSelectedProducts(new Set([product.id]));
                                setShowAiConfigDialog(true);
                                loadGalleryImages([product.id]); // Chargement en arrière-plan
                              }}
                              disabled={generatingAiBg}
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
                            <p>{t.contentOptimization.tooltips.aiBg}</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (hasRichHtmlDescription(product) || product.seo_title || product.seo_description) {
                                  setOptimizedProducts([product]);
                                  setShowLandingPreviewDialog(true);
                                } else {
                                  toast.error(t.contentOptimization.toasts.notOptimizedYet);
                                }
                              }}
                              className="h-8 gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              {hasRichHtmlDescription(product) && (
                                <span className="text-xs">generated landing page</span>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t.contentOptimization.tooltips.view}</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                // Vérifier les limites AVANT d'ouvrir le dialog
                                if (!canDoAction('optimizations')) {
                                  toast.error(t.contentOptimization.toasts.limitReached);
                                  setShowUpgradeDialog(true);
                                  return;
                                }
                                setSelectedLandingProduct(product);
                                setShowLandingConfigDialog(true);
                              }}
                              className="hover:bg-primary/10"
                            >
                              <FileText className="h-4 w-4 text-primary" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t.contentOptimization.tooltips.generateLanding}</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        {product.shopify_id && (hasRichHtmlDescription(product) || product.seo_title) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  const toastId = toast.loading(t.contentOptimization.buttons.synchronizing);
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
                                    toast.success(t.contentOptimization.toasts.productsSynced, { id: toastId });
                                  } catch (error) {
                                    console.error("Sync error:", error);
                                    toast.error(t.contentOptimization.toasts.syncError, { id: toastId });
                                  }
                                }}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t.contentOptimization.tooltips.sync}</p>
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
                {t.contentOptimization.empty.title}
              </div>
            )}
          </ScrollArea>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center py-4 border-t">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </Card>
      </div>

      {/* Dialogs */}
      {/* White Background Configuration Dialog */}
      <Dialog open={showWhiteBgConfigDialog} onOpenChange={setShowWhiteBgConfigDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Square className="h-5 w-5 text-primary" />
              {t.contentOptimization.dialogs.whiteBg.title}
            </DialogTitle>
            <DialogDescription>
              {t.contentOptimization.dialogs.whiteBg.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Gallery Image Selection */}
            {Array.from(selectedProducts).length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">{t.contentOptimization.dialogs.whiteBg.imageSelection}</Label>
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

      <OptimizationConfirmDialog
        open={showOptimizationConfirm}
        onOpenChange={setShowOptimizationConfirm}
        onConfirm={() => handleOptimizeSelected()}
        selectedCount={selectedProducts.size}
        currentUsage={limits?.usage.optimizations_count || 0}
        maxOptimizations={limits?.limits.max_optimizations || 50}
        isTrialing={limits?.isTrialing || false}
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
