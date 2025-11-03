import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ProgressDialog, ResultsDialog } from "./SeoWorkflowDialogs";
import { TrialLimitDialog } from "@/components/TrialLimitDialog";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { calculateAltTextScore } from "@/lib/seoQuality";
import { useTranslation } from "@/lib/language";
import {
  Search,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Loader2,
  CheckCircle,
  Clock,
  Grid3x3,
  List,
  TrendingUp,
  Eye,
  Zap,
  ArrowRight,
  ShoppingBag,
  Package,
  FileText,
  PenSquare,
  ChevronDown,
  ChevronRight,
  Play,
  Sync,
  EyeOff,
} from "lucide-react";

interface ProductImage {
  id: string;
  product_id?: string;
  content_id?: string;
  content_type?: "product" | "collection" | "page" | "article" | "homepage";
  src: string;
  alt_text: string | null;
  position: number;
  shopify_image_id: number;
  created_at: string;
  updated_at: string;
  width: number;
  height: number;
  optimization_count: number;
  last_optimization_at: string | null;
  image_type: "product" | "content";
  last_synced_at?: string | null;
}

interface Product {
  id: string;
  title: string;
  vendor?: string;
  category?: string;
  image_url?: string;
  handle?: string;
  body_html?: string;
  content?: string;
}

interface ImageWithProduct extends ProductImage {
  product: Product;
}

type AltImageTab = "all" | "needs-alt" | "has-alt" | "to-sync" | "not-synced" | "not-optimized" | "ai-optimized";
type ContentTypeFilter = "all" | "products" | "collections" | "pages" | "articles" | "homepage";
type ImageStatus = "not-optimized" | "shopify-alt" | "ai-optimized" | "to-sync" | "synced";

export function SeoAltImage() {
  const [searchParams] = useSearchParams();
  const [images, setImages] = useState<ImageWithProduct[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<AltImageTab>("all");
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [isOptimizationComplete, setIsOptimizationComplete] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [optimizedImages, setOptimizedImages] = useState<ImageWithProduct[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [optimizingSingleImage, setOptimizingSingleImage] = useState<string | null>(null);
  const [syncingSingleImage, setSyncingSingleImage] = useState<string | null>(null);
  const { limits, loading: limitsLoading } = useUsageLimits();
  const { t, tf } = useTranslation();

  const IMAGES_PER_PAGE = 50;

  // Fonction pour déterminer le statut d'une image
  const getImageStatus = (img: ImageWithProduct): ImageStatus => {
    if (!img.alt_text) {
      return "not-optimized";
    }

    if (img.optimization_count > 0 && img.last_optimization_at) {
      if (img.last_synced_at && new Date(img.last_synced_at) >= new Date(img.last_optimization_at)) {
        return "synced";
      }
      return "to-sync";
    }

    if (img.alt_text && (!img.optimization_count || img.optimization_count === 0)) {
      return "shopify-alt";
    }

    return "ai-optimized";
  };

  // Fonction pour obtenir les badges de statut
  const getStatusBadge = (status: ImageStatus) => {
    const badges = {
      "not-optimized": {
        variant: "outline" as const,
        className: "border-gray-300 text-gray-700 bg-gray-50",
        icon: EyeOff,
        label: "Non optimisé",
      },
      "shopify-alt": {
        variant: "secondary" as const,
        className: "border-blue-300 text-blue-700 bg-blue-50",
        icon: CheckCircle,
        label: "ALT Shopify",
      },
      "ai-optimized": {
        variant: "default" as const,
        className: "border-green-300 text-green-700 bg-green-50",
        icon: Sparkles,
        label: "AI Optimisé",
      },
      "to-sync": {
        variant: "outline" as const,
        className: "border-orange-300 text-orange-700 bg-orange-50",
        icon: Sync,
        label: "À synchroniser",
      },
      synced: {
        variant: "default" as const,
        className: "border-purple-300 text-purple-700 bg-purple-50",
        icon: CheckCircle,
        label: "Synchronisé",
      },
    };

    const config = badges[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`gap-1 text-xs ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const fetchImages = async () => {
    try {
      setLoading(true);

      // Fetch product images
      const { data: productImagesData, error: productError } = await supabase
        .from("product_images")
        .select(
          `
          *,
          product:shopify_products(id, title, vendor, category)
        `,
        )
        .order("product_id", { ascending: true })
        .order("position", { ascending: true });

      if (productError) throw productError;

      // Fetch content images
      const { data: contentImagesData, error: contentError } = await supabase
        .from("content_images")
        .select("*")
        .order("content_id", { ascending: true })
        .order("position", { ascending: true });

      if (contentError) throw contentError;

      // Map product images
      const productImages = (productImagesData || [])
        .filter((img) => img.product && img.product.id)
        .map((img) => ({
          ...img,
          product: img.product,
          image_type: "product" as const,
        }));

      // Map content images and fetch their content details
      const contentImages = await Promise.all(
        (contentImagesData || []).map(async (img) => {
          let product: Product = { id: img.content_id, title: t.seo.altImage.unknownContent };

          if (img.content_type === "collection") {
            const { data } = await supabase
              .from("shopify_collections")
              .select("id, title, handle")
              .eq("id", img.content_id)
              .maybeSingle();
            if (data) product = { ...data, title: `📚 ${data.title}` };
          } else if (img.content_type === "page") {
            const { data } = await supabase
              .from("shopify_pages")
              .select("id, title, handle")
              .eq("id", img.content_id)
              .maybeSingle();
            if (data) product = { ...data, title: `📄 ${data.title}` };
          } else if (img.content_type === "article") {
            const { data } = await supabase
              .from("blog_articles")
              .select("id, title")
              .eq("id", img.content_id)
              .maybeSingle();
            if (data) product = { ...data, title: `📰 ${data.title}` };
          } else if (img.content_type === "homepage") {
            product = { id: img.content_id, title: `🏠 Page d'accueil` };
          }

          return {
            ...img,
            product,
            product_id: undefined,
            image_type: "content" as const,
          };
        }),
      );

      // Merge and set images
      const allImages = [...productImages, ...contentImages] as ImageWithProduct[];
      setImages(allImages);

      // Développer tous les produits par défaut
      const allProductIds = new Set(allImages.map((img) => img.product.id));
      setExpandedProducts(allProductIds);
    } catch (error) {
      console.error("Error fetching images:", error);
      toast.error(t.seo.altImage.errorLoading);
    } finally {
      setLoading(false);
    }
  };

  // Optimisation d'une seule image
  const handleOptimizeSingleImage = async (imageId: string, useVision = true) => {
    try {
      setOptimizingSingleImage(imageId);

      const image = images.find((img) => img.id === imageId);
      if (!image) {
        toast.error("Image non trouvée");
        return;
      }

      const imageType = image.image_type || "product";
      const functionName = useVision ? "generate-alt-texts-vision" : "generate-alt-texts";

      const { error } = await supabase.functions.invoke(functionName, {
        body: {
          imageId: image.id,
          imageType: useVision ? imageType : undefined,
        },
      });

      if (error) {
        console.error("Error generating ALT text:", error);
        toast.error("Erreur lors de la génération du texte ALT");
      } else {
        toast.success("Texte ALT généré avec succès");
        await fetchImages();
      }
    } catch (error) {
      console.error("Error generating ALT text:", error);
      toast.error("Erreur lors de la génération du texte ALT");
    } finally {
      setOptimizingSingleImage(null);
    }
  };

  // Synchronisation d'une seule image
  const handleSyncSingleImage = async (imageId: string) => {
    try {
      setSyncingSingleImage(imageId);

      const image = images.find((img) => img.id === imageId);
      if (!image || !image.alt_text) {
        toast.error("Aucun texte ALT à synchroniser");
        return;
      }

      if (image.content_type === "homepage") {
        toast.info("Les images homepage ne peuvent pas être synchronisées vers Shopify");
        return;
      }

      const { error } = await supabase.functions.invoke("sync-seo-to-shopify", {
        body: {
          imageId: image.id,
          syncAltText: true,
          force: true,
        },
      });

      if (error) {
        console.error("Error syncing:", error);
        toast.error("Erreur lors de la synchronisation");
      } else {
        toast.success("Image synchronisée avec succès");
        await fetchImages();
      }
    } catch (error) {
      console.error("Error in sync process:", error);
      toast.error("Erreur lors de la synchronisation");
    } finally {
      setSyncingSingleImage(null);
    }
  };

  // Gestion du développement/réduction des produits
  const toggleProductExpansion = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const toggleAllProductsExpansion = () => {
    const productIds = Array.from(new Set(images.map((img) => img.product.id)));
    if (expandedProducts.size === productIds.length) {
      setExpandedProducts(new Set());
    } else {
      setExpandedProducts(new Set(productIds));
    }
  };

  const handleImportContentImages = async () => {
    try {
      setImporting(true);

      const { data: stores } = await supabase.from("shopify_connections").select("id").limit(1).maybeSingle();

      if (!stores) {
        toast.error(t.seo.altImage.noStoreConnected);
        return;
      }

      const { data, error } = await supabase.functions.invoke("import-content-images", {
        body: { storeId: stores.id, types: ["collections", "pages", "articles", "homepage"] },
      });

      if (error) throw error;

      const totalImported = data?.totalImported || 0;
      if (totalImported > 0) {
        toast.success(tf("seo.altImage.imagesImported", { count: totalImported }));
      } else {
        toast.info(t.seo.altImage.noNewImages);
      }
      await fetchImages();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(t.seo.altImage.errorImport);
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  // Filtrage des images
  const filteredImages = images.filter((img) => {
    if (contentTypeFilter !== "all") {
      if (contentTypeFilter === "products" && img.image_type !== "product") return false;
      if (contentTypeFilter === "collections" && (!img.content_type || img.content_type !== "collection")) return false;
      if (contentTypeFilter === "pages" && (!img.content_type || img.content_type !== "page")) return false;
      if (contentTypeFilter === "articles" && (!img.content_type || img.content_type !== "article")) return false;
      if (contentTypeFilter === "homepage" && (!img.content_type || img.content_type !== "homepage")) return false;
    }

    const status = getImageStatus(img);

    if (activeTab === "needs-alt" && img.alt_text) return false;
    if (activeTab === "has-alt" && !img.alt_text) return false;
    if (activeTab === "to-sync" && status !== "to-sync") return false;
    if (activeTab === "not-synced" && status === "synced") return false;
    if (activeTab === "not-optimized" && status !== "not-optimized") return false;
    if (activeTab === "ai-optimized" && status !== "ai-optimized") return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        img.product.title.toLowerCase().includes(term) ||
        img.alt_text?.toLowerCase().includes(term) ||
        img.product.category?.toLowerCase().includes(term)
      );
    }

    return true;
  });

  // Grouper les images par produit
  const groupedImages = Array.from(
    filteredImages.reduce((acc, img) => {
      const productId = img.product.id;
      if (!acc.has(productId)) {
        acc.set(productId, []);
      }
      acc.get(productId)!.push(img);
      return acc;
    }, new Map<string, ImageWithProduct[]>()),
  ).sort(([productIdA, imagesA], [productIdB, imagesB]) =>
    imagesA[0].product.title.localeCompare(imagesB[0].product.title),
  );

  // Pagination
  const totalPages = Math.ceil(groupedImages.length / IMAGES_PER_PAGE);
  const startIndex = (currentPage - 1) * IMAGES_PER_PAGE;
  const paginatedGroups = groupedImages.slice(startIndex, startIndex + IMAGES_PER_PAGE);

  // Stats pour les onglets
  const tabs = [
    { id: "all" as AltImageTab, label: "Toutes", count: images.length },
    { id: "needs-alt" as AltImageTab, label: "Sans ALT", count: images.filter((img) => !img.alt_text).length },
    { id: "has-alt" as AltImageTab, label: "Avec ALT", count: images.filter((img) => img.alt_text).length },
    {
      id: "not-optimized" as AltImageTab,
      label: "Non optimisé",
      count: images.filter((img) => getImageStatus(img) === "not-optimized").length,
    },
    {
      id: "ai-optimized" as AltImageTab,
      label: "AI Optimisé",
      count: images.filter((img) => getImageStatus(img) === "ai-optimized").length,
    },
    {
      id: "to-sync" as AltImageTab,
      label: "À synchroniser",
      count: images.filter((img) => getImageStatus(img) === "to-sync").length,
    },
    {
      id: "not-synced" as AltImageTab,
      label: "Non synchronisé",
      count: images.filter((img) => getImageStatus(img) !== "synced" && img.alt_text).length,
    },
  ];

  // Fonctions de sélection
  const handleSelectAll = () => {
    if (selectedImages.size === filteredImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(filteredImages.map((img) => img.id)));
    }
  };

  const handleSelectImage = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  // Fonction pour optimiser les images sélectionnées
  const handleGenerateForSelected = async (useVision = true) => {
    const imagesToGenerate = images.filter((img) => selectedImages.has(img.id));

    if (imagesToGenerate.length === 0) {
      toast.info(t.seo.altImage.noSelection);
      return;
    }

    const remainingLimit = (limits?.limits.max_optimizations || 0) - (limits?.usage.optimizations_count || 0);
    let finalImagesToGenerate = imagesToGenerate;

    if (imagesToGenerate.length > remainingLimit) {
      if (limits?.isTrialing) {
        setShowUpgradeDialog(true);
        return;
      } else {
        toast.warning(tf("seo.altImage.limitReached", { count: remainingLimit }));
        finalImagesToGenerate = imagesToGenerate.slice(0, remainingLimit);
      }
    }

    setGenerating(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: finalImagesToGenerate.length });

    const functionName = useVision ? "generate-alt-texts-vision" : "generate-alt-texts";

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < finalImagesToGenerate.length; i++) {
      try {
        const img = finalImagesToGenerate[i];
        const imageType = img.image_type || "product";

        const { error } = await supabase.functions.invoke(functionName, {
          body: {
            imageId: img.id,
            imageType: useVision ? imageType : undefined,
          },
        });

        if (error) {
          console.error("Error generating ALT text:", error);
          errorCount++;
        } else {
          successCount++;
        }

        setProgress({ current: i + 1, total: finalImagesToGenerate.length });
      } catch (error) {
        console.error("Error generating ALT text:", error);
        errorCount++;
      }
    }

    if (errorCount > 0) {
      toast.warning(tf("seo.altImage.generatedWithErrors", { success: successCount, errors: errorCount }));
    }

    setGenerating(false);
    setIsOptimizationComplete(true);
    await fetchImages();

    const refreshedImages = images
      .filter((img) => finalImagesToGenerate.some((genImg) => genImg.id === img.id))
      .map((img) => ({
        ...img,
        image_url: img.src,
      }));
    setOptimizedImages(refreshedImages as any);
    setShowProgressDialog(false);
    setShowResultsDialog(true);
  };

  // Fonction pour synchroniser les images sélectionnées
  const handleSyncSelected = async () => {
    const imagesToSync = images.filter(
      (img) => selectedImages.has(img.id) && img.alt_text && img.shopify_image_id && img.content_type !== "homepage",
    );

    const homepageImagesSelected = images.filter(
      (img) => selectedImages.has(img.id) && img.content_type === "homepage",
    ).length;

    if (homepageImagesSelected > 0) {
      toast.info(`${homepageImagesSelected} image(s) homepage ne peuvent pas être synchronisées`);
    }

    if (imagesToSync.length === 0) {
      if (homepageImagesSelected > 0) {
        toast.error("Aucune image synchronisable sélectionnée");
      } else {
        toast.info("Aucune image à synchroniser");
      }
      return;
    }

    try {
      setSyncing(true);
      setShowProgressDialog(true);
      setIsOptimizationComplete(false);
      setProgress({ current: 0, total: imagesToSync.length });

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < imagesToSync.length; i++) {
        try {
          const { error } = await supabase.functions.invoke("sync-seo-to-shopify", {
            body: {
              imageId: imagesToSync[i].id,
              syncAltText: true,
              force: true,
            },
          });

          if (error) {
            console.error("Error syncing:", error);
            errorCount++;
          } else {
            successCount++;
          }

          setProgress({ current: i + 1, total: imagesToSync.length });
        } catch (error) {
          console.error("Error syncing:", error);
          errorCount++;
        }
      }

      if (errorCount > 0) {
        toast.warning(`${successCount} images synchronisées, ${errorCount} erreurs`);
      } else {
        toast.success(`${successCount} images synchronisées avec succès`);
      }

      setSyncing(false);
      setIsOptimizationComplete(true);
      setSelectedImages(new Set());
      await fetchImages();
    } catch (error) {
      console.error("Error in sync process:", error);
      toast.error("Erreur lors de la synchronisation");
      setSyncing(false);
      setShowProgressDialog(false);
    }
  };

  // Fonction pour optimiser toutes les images
  const handleOptimizeAllImages = async () => {
    const imagesToOptimize = images.filter((img) => !img.alt_text);

    if (imagesToOptimize.length === 0) {
      toast.info(t.seo.altImage.allHaveAlt);
      return;
    }

    const remainingLimit = (limits?.limits.max_optimizations || 0) - (limits?.usage.optimizations_count || 0);

    if (remainingLimit <= 0) {
      if (limits?.isTrialing) {
        toast.error(
          tf("seo.altImage.quotaReached", {
            used: limits?.usage.optimizations_count,
            max: limits?.limits.max_optimizations,
          }),
        );
        setShowUpgradeDialog(true);
        return;
      } else {
        toast.error(t.seo.altImage.monthlyLimitReached);
        return;
      }
    }

    let finalImagesToOptimize = imagesToOptimize;
    const willHitLimit = imagesToOptimize.length > remainingLimit;

    if (willHitLimit) {
      if (limits?.isTrialing) {
        finalImagesToOptimize = imagesToOptimize.slice(0, remainingLimit);
      } else {
        finalImagesToOptimize = imagesToOptimize.slice(0, remainingLimit);
      }
    }

    setGenerating(true);
    setShowProgressDialog(true);
    setIsOptimizationComplete(false);
    setProgress({ current: 0, total: finalImagesToOptimize.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < finalImagesToOptimize.length; i++) {
      try {
        const img = finalImagesToOptimize[i];
        const imageType = img.image_type || "product";

        const { error } = await supabase.functions.invoke("generate-alt-texts-vision", {
          body: {
            imageId: img.id,
            imageType: imageType,
          },
        });

        if (error) {
          console.error("Error generating ALT text:", error);
          errorCount++;
        } else {
          successCount++;
        }

        setProgress({ current: i + 1, total: finalImagesToOptimize.length });
      } catch (error) {
        console.error("Error generating ALT text:", error);
        errorCount++;
      }
    }

    const remainingImages = imagesToOptimize.length - finalImagesToOptimize.length;

    if (remainingImages > 0 && limits?.isTrialing) {
      toast.info(tf("seo.altImage.optimizedWithRemaining", { success: successCount, remaining: remainingImages }), {
        duration: 6000,
      });
      setTimeout(() => setShowUpgradeDialog(true), 1500);
    } else if (remainingImages > 0) {
      toast.info(tf("seo.altImage.optimizedWaitingNext", { success: successCount, remaining: remainingImages }));
    } else if (errorCount > 0) {
      toast.warning(tf("seo.altImage.generatedWithErrors", { success: successCount, errors: errorCount }));
    } else {
      toast.success(`Toutes les images ont été optimisées avec succès! 🎉`);
    }

    setGenerating(false);
    setIsOptimizationComplete(true);
    await fetchImages();

    const refreshedImages = images
      .filter((img) => finalImagesToOptimize.some((genImg) => genImg.id === img.id))
      .map((img) => ({
        ...img,
        image_url: img.src,
      }));
    setOptimizedImages(refreshedImages as any);
    setShowProgressDialog(false);
    setShowResultsDialog(true);
  };

  // Calcul des statistiques
  const imagesNeedingAlt = images.filter((img) => !img.alt_text).length;
  const imagesWithExistingAlt = images.filter(
    (img) => img.alt_text && (!img.optimization_count || img.optimization_count === 0),
  ).length;
  const imagesWithAIAlt = images.filter(
    (img) => img.alt_text && img.optimization_count && img.optimization_count > 0,
  ).length;
  const imagesWithAlt = imagesWithExistingAlt + imagesWithAIAlt;
  const altCompletionRate = images.length > 0 ? Math.round((imagesWithAlt / images.length) * 100) : 0;

  const altSeoScore =
    images.length > 0
      ? Math.round(
          images.reduce((sum, img) => {
            const isAI = img.alt_text && img.alt_text.length > 30;
            const altScore = calculateAltTextScore(img.alt_text, isAI);
            return sum + altScore.score;
          }, 0) / images.length,
        )
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950 dark:via-emerald-950 dark:to-teal-950 border-2 border-green-200 p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-green-600" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                Optimisation ALT Images
              </h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Générez automatiquement des descriptions ALT optimisées pour vos images. Améliorez l'accessibilité et le
              référencement de 35%.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4 text-green-600" />
                <span className="font-medium">Accessibilité maximale</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">+35% SEO images</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-teal-600" />
                <span className="font-medium">IA Vision avancée</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 items-center">
            <div className="text-center">
              <div
                className={`text-4xl font-bold ${
                  altSeoScore >= 70 ? "text-green-600" : altSeoScore >= 40 ? "text-orange-600" : "text-red-600"
                }`}
              >
                {altSeoScore}/100
              </div>
              <div className="text-sm text-muted-foreground">SEO Score</div>
            </div>
            <Button
              size="lg"
              onClick={handleOptimizeAllImages}
              disabled={generating || imagesNeedingAlt === 0 || limitsLoading}
              className="bg-gradient-to-r from-accent via-accent to-accent/80 hover:from-accent/90 hover:via-accent hover:to-accent/70 gap-2 shadow-lg hover:shadow-accent/50 text-accent-foreground font-semibold transition-all duration-300"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Optimisation en cours...
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  Optimiser Toutes les Images ({imagesNeedingAlt})
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <ImageIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Total Images</h3>
            </div>
          </div>
          <p className="text-4xl font-bold mb-1">{images.length}</p>
          <p className="text-sm text-muted-foreground">Dans votre catalogue</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-xl">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">Sans ALT text</h3>
            </div>
          </div>
          <p className="text-4xl font-bold text-orange-900 dark:text-orange-100 mb-1">{imagesNeedingAlt}</p>
          <p className="text-sm text-orange-700 dark:text-orange-300">À optimiser</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-green-900 dark:text-green-100">Avec ALT text</h3>
            </div>
            <Badge className="bg-green-600 text-white">{altCompletionRate}%</Badge>
          </div>
          <p className="text-4xl font-bold text-green-900 dark:text-green-100 mb-1">{imagesWithAlt}</p>
          <div className="flex gap-2 mt-1 text-xs text-green-700 dark:text-green-300">
            <span>Shopify: {imagesWithExistingAlt}</span>
            <span>•</span>
            <span>AI: {imagesWithAIAlt}</span>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
                <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">AI-optimisées</h3>
            </div>
          </div>
          <p className="text-4xl font-bold text-purple-900 dark:text-purple-100 mb-1">{imagesWithAIAlt}</p>
          <p className="text-sm text-purple-700 dark:text-purple-300">Générées par IA</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="bg-background border rounded-lg p-1 flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
            <Badge variant={activeTab === tab.id ? "secondary" : "outline"}>{tab.count}</Badge>
          </button>
        ))}
      </div>

      {/* Filtres de contenu */}
      <div className="bg-background border rounded-lg p-1 flex flex-wrap gap-1">
        {[
          { id: "all" as const, label: "Tous", icon: Search },
          { id: "products" as const, label: "Produits", icon: ShoppingBag },
          { id: "collections" as const, label: "Collections", icon: Package },
          { id: "pages" as const, label: "Pages", icon: FileText },
          { id: "articles" as const, label: "Articles", icon: PenSquare },
          { id: "homepage" as const, label: "Page d'accueil", icon: ImageIcon },
        ].map((filter) => {
          const Icon = filter.icon;
          return (
            <button
              key={filter.id}
              onClick={() => {
                setContentTypeFilter(filter.id);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                contentTypeFilter === filter.id
                  ? "bg-secondary text-secondary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Actions principales */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher des images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleImportContentImages} disabled={importing} className="gap-2">
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Import...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importer contenu
              </>
            )}
          </Button>

          <Button
            onClick={() => handleGenerateForSelected(true)}
            disabled={generating || selectedImages.size === 0}
            className="gap-2 bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary shadow-lg hover:shadow-primary/50 text-primary-foreground font-semibold transition-all duration-300"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyse Vision...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                ALT Vision ({selectedImages.size})
              </>
            )}
          </Button>

          <Button onClick={handleSyncSelected} disabled={syncing || selectedImages.size === 0} className="gap-2">
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Synchro...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Synchroniser ({selectedImages.size})
              </>
            )}
          </Button>

          <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
            {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={fetchImages}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tableau liste avec agrégation par produit */}
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={selectedImages.size === filteredImages.length && filteredImages.length > 0}
                  onChange={handleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="px-4 py-3 text-left font-semibold w-12">
                <Button variant="ghost" size="icon" onClick={toggleAllProductsExpansion} className="h-8 w-8 p-0">
                  {expandedProducts.size === new Set(images.map((img) => img.product.id)).size ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              </th>
              <th className="px-4 py-3 text-left font-semibold">Produit / Image</th>
              <th className="px-4 py-3 text-left font-semibold">Texte ALT</th>
              <th className="px-4 py-3 text-left font-semibold">Statut</th>
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedGroups.map(([productId, productImages]) => {
              const isExpanded = expandedProducts.has(productId);
              const mainImage = productImages.find((img) => img.position === 1) || productImages[0];

              return (
                <>
                  {/* Ligne produit (toujours visible) */}
                  <tr key={`product-${productId}`} className="hover:bg-muted/30 bg-muted/20">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={productImages.every((img) => selectedImages.has(img.id))}
                        onChange={() => {
                          const allSelected = productImages.every((img) => selectedImages.has(img.id));
                          const newSelected = new Set(selectedImages);

                          if (allSelected) {
                            productImages.forEach((img) => newSelected.delete(img.id));
                          } else {
                            productImages.forEach((img) => newSelected.add(img.id));
                          }
                          setSelectedImages(newSelected);
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleProductExpansion(productId)}
                        className="h-6 w-6 p-0"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={mainImage.src}
                          alt={mainImage.alt_text || ""}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div>
                          <div className="font-medium">{mainImage.product.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {productImages.length} image{productImages.length > 1 ? "s" : ""}
                            {mainImage.content_type && ` • ${mainImage.content_type}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-md line-clamp-2 text-sm">{mainImage.alt_text || "Aucun texte ALT"}</div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(getImageStatus(mainImage))}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOptimizeSingleImage(mainImage.id, true)}
                          disabled={optimizingSingleImage === mainImage.id}
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Optimiser avec IA Vision"
                        >
                          {optimizingSingleImage === mainImage.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        {getImageStatus(mainImage) === "to-sync" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSyncSingleImage(mainImage.id)}
                            disabled={syncingSingleImage === mainImage.id}
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Synchroniser vers Shopify"
                          >
                            {syncingSingleImage === mainImage.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sync className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Images détaillées (développées) */}
                  {isExpanded &&
                    productImages.map((img, index) => (
                      <tr key={img.id} className="hover:bg-muted/20 border-t border-muted/30">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedImages.has(img.id)}
                            onChange={() => handleSelectImage(img.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 pl-8">
                            <img src={img.src} alt={img.alt_text || ""} className="w-10 h-10 object-cover rounded" />
                            <div>
                              <div className="font-medium text-sm">
                                Image {index + 1} • Position {img.position}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {img.width}x{img.height}px
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-md line-clamp-3 text-sm">{img.alt_text || "Aucun texte ALT"}</div>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(getImageStatus(img))}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOptimizeSingleImage(img.id, true)}
                              disabled={optimizingSingleImage === img.id}
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Optimiser avec IA Vision"
                            >
                              {optimizingSingleImage === img.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            {getImageStatus(img) === "to-sync" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSyncSingleImage(img.id)}
                                disabled={syncingSingleImage === img.id}
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Synchroniser vers Shopify"
                              >
                                {syncingSingleImage === img.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Sync className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm text-muted-foreground">
            Affichage {startIndex + 1} à {Math.min(startIndex + IMAGES_PER_PAGE, groupedImages.length)} sur{" "}
            {groupedImages.length} produits
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            <span className="text-sm">
              Page {currentPage} sur {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        type="alt"
        operation={generating ? "optimizing" : "syncing"}
        current={progress.current}
        total={progress.total}
      />

      <ResultsDialog
        open={showResultsDialog}
        onOpenChange={setShowResultsDialog}
        type="alt"
        items={optimizedImages.map((img) => ({
          id: img.id,
          title: img.product.title,
          alt_text: img.alt_text || "",
          image_url: img.src,
        }))}
        onSyncClick={() => {
          setShowResultsDialog(false);
          handleSyncSelected();
        }}
        onClose={() => {
          setShowResultsDialog(false);
          setOptimizedImages([]);
          setSelectedImages(new Set());
        }}
      />

      <TrialLimitDialog
        open={showUpgradeDialog && limits?.shouldForcePayment === true}
        onOpenChange={setShowUpgradeDialog}
        limitType="optimizations"
        currentUsage={limits?.usage.optimizations_count || 0}
        maxUsage={limits?.limits.max_optimizations || 100}
        trialMaxUsage={limits?.isTrialing ? limits?.limits.max_optimizations : undefined}
      />

      <UpgradeDialog
        open={showUpgradeDialog && limits?.shouldForcePayment !== true}
        onOpenChange={setShowUpgradeDialog}
        limitType="optimizations"
      />
    </div>
  );
}
