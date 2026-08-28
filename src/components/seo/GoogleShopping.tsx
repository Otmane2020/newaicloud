import { useState, useEffect } from 'react';
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { useStore } from '@/contexts/StoreContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ShoppingBag, 
  TrendingUp, 
  Package, 
  Search,
  Loader2,
  Upload,
  Sparkles,
  RefreshCw,
  Save,
  X,
  CheckCircle,
  Hash,
  Image as ImageIcon,
  Zap,
  BookOpen,
  Clock,
  Download
} from 'lucide-react';
import { WhiteBackgroundPreviewDialog } from './WhiteBackgroundPreviewDialog';
import { ShopifyOptimizationGuide } from './ShopifyOptimizationGuide';
import { OptimizeAllDialog } from './OptimizeAllDialog';
import { GoogleCategoryImport } from './GoogleCategoryImport';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/lib/language';
import { usePaginatedSeo } from '@/hooks/usePaginatedSeo';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface PreviewImage {
  productId: string;
  productTitle: string;
  originalUrl: string;
  generatedUrl: string | null;
  status: 'pending' | 'generating' | 'success' | 'error';
  error?: string;
}

interface Product {
  id: string;
  title: string;
  image_url: string;
  google_product_category: string | null;
  google_mpn: string | null;
  google_condition: string | null;
  google_gtin: string | null;
  google_white_background: boolean | null;
  seo_synced_to_shopify: boolean;
}

export function GoogleShopping() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { selectedStore } = useStore();
  const { limits } = useUsageLimits();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [generatingGtins, setGeneratingGtins] = useState(false);
  const [generatingCategories, setGeneratingCategories] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previews, setPreviews] = useState<PreviewImage[]>([]);
  const [optimizationScore, setOptimizationScore] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [showOptimizeDialog, setShowOptimizeDialog] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<any[]>([]);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [currentOptimizingProduct, setCurrentOptimizingProduct] = useState<string>('');
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Listen for upgrade dialog events
  useEffect(() => {
    const handleShowUpgrade = (event: any) => {
      setShowUpgradeDialog(true);
    };
    window.addEventListener('show-upgrade-dialog', handleShowUpgrade);
    return () => window.removeEventListener('show-upgrade-dialog', handleShowUpgrade);
  }, []);

  // Shopping readiness is calculated from catalog data, never from a fixed placeholder.
  // GTIN improves eligibility but remains optional for products that legitimately do not have one.
  const productReadiness = (product: Product) => {
    const checks = [
      { passed: Boolean(product.google_product_category?.trim()), weight: 30 },
      { passed: Boolean(product.google_mpn?.trim()), weight: 20 },
      { passed: Boolean(product.google_condition?.trim()), weight: 15 },
      { passed: Boolean(product.image_url || product.google_white_background), weight: 20 },
      { passed: Boolean(product.google_gtin?.trim()), weight: 15 },
    ];
    const score = checks.reduce((total, check) => total + (check.passed ? check.weight : 0), 0);
    const ready = checks.slice(0, 4).every((check) => check.passed);
    return { score, ready };
  };

  const calculateOptimizationScore = (productsList: Product[]) => {
    if (productsList.length === 0) {
      setOptimizationScore(0);
      return;
    }
    const average = productsList.reduce((total, product) => total + productReadiness(product).score, 0) / productsList.length;
    setOptimizationScore(Math.round(average));
  };

  const fetchProducts = async () => {
    if (!selectedStore) {
      setProducts([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // ✅ PAGINATION CÔTÉ SERVEUR pour récupérer TOUS les produits Google Shopping
      let allProducts: any[] = [];
      let hasMore = true;
      let page = 0;
      const PAGE_SIZE = 1000;

      console.log('🔄 [GOOGLE_SHOPPING] Starting paginated fetch...');

      while (hasMore) {
        const start = page * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;
        
        console.log(`📄 [GOOGLE_SHOPPING] Fetching page ${page + 1} (${start}-${end})...`);
        
        const { data: pageData, error: pageError } = await supabase
          .from('shopify_products')
          .select(`
            id, 
            title, 
            image_url,
            vendor,
            google_product_category,
            google_mpn,
            google_condition,
            google_gtin,
            google_white_background,
            seo_synced_to_shopify
          `)
          .eq('store_id', selectedStore.id)
          .range(start, end)
          .order('title', { ascending: true });
        
        if (pageError) throw pageError;
        
        if (pageData && pageData.length > 0) {
          console.log(`✅ [GOOGLE_SHOPPING] Page ${page + 1} loaded: ${pageData.length} products`);
          allProducts = [...allProducts, ...pageData];
          
          if (pageData.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      console.log('✅ [GOOGLE_SHOPPING] Total products fetched:', allProducts.length);
      setProducts(allProducts);
      calculateOptimizationScore(allProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error(t.common.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedStore?.id]);

  const filteredProducts = products.filter((product) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return product.title.toLowerCase().includes(term);
  });

  // ✅ Pagination côté client (50 produits par page)
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedProducts,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage,
    hasPreviousPage,
  } = usePaginatedSeo({
    items: filteredProducts,
    itemsPerPage: 50,
    cacheKey: 'google-shopping-products',
  });

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
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

  const handleEdit = (product: Product) => {
    setEditingProduct(product.id);
    setEditData({
      google_product_category: product.google_product_category || undefined,
      google_mpn: product.google_mpn || undefined,
      google_condition: product.google_condition || undefined,
      google_gtin: product.google_gtin || undefined,
    });
  };

  const handleSave = async (productId: string) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('shopify_products')
        .update(editData)
        .eq('id', productId);

      if (error) throw error;

      toast.success('Données Google Shopping mises à jour');
      setEditingProduct(null);
      setEditData({});
      await fetchProducts();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error(t.common.error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditData({});
  };

  const handleGenerateGTINs = async () => {
    if (selectedProducts.size === 0) {
      toast.info('Sélectionnez au moins un produit');
      return;
    }

    try {
      setGeneratingGtins(true);
      const { data, error } = await supabase.functions.invoke('generate-gtin', {
        body: { 
          productIds: Array.from(selectedProducts),
          countryCode: 'FR'
        }
      });

      if (error) throw error;
      toast.success(`GTINs générés pour ${data.results.length} produits`);
      await fetchProducts();
      setSelectedProducts(new Set());
    } catch (error) {
      console.error('Error generating GTINs:', error);
      toast.error('Erreur lors de la génération des GTINs');
    } finally {
      setGeneratingGtins(false);
    }
  };

  const handleGenerateCategories = async () => {
    if (selectedProducts.size === 0) {
      toast.info('Sélectionnez au moins un produit');
      return;
    }

    // Vérifier que la taxonomie Google est chargée
    try {
      const { count, error } = await supabase
        .from('google_product_taxonomy')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      
      if (!count || count === 0) {
        toast.error('Taxonomie Google manquante', {
          description: 'Veuillez d\'abord importer la taxonomie Google en haut de la page (bouton "Importer la Taxonomie Google")',
        });
        return;
      }
    } catch (error) {
      console.error('Error checking taxonomy:', error);
      toast.error('Erreur lors de la vérification de la taxonomie');
      return;
    }

    setGeneratingCategories(true);
    let successCount = 0;
    let errorCount = 0;

    const productsToClassify = products.filter(p => selectedProducts.has(p.id));
    toast.info('Classification automatique', {
      description: `Classification de ${productsToClassify.length} produits avec DeepSeek AI...`,
    });

    for (const product of productsToClassify) {
      try {
        const { data, error } = await supabase.functions.invoke('classify-product-category', {
          body: {
            productTitle: product.title,
            productDescription: null,
            productType: null,
            imageUrl: product.image_url,
          }
        });
        
        if (error) throw error;
        
        if (data.success && data.classification) {
          // Update product with classification
          await supabase
            .from('shopify_products')
            .update({
              google_category: data.classification.gpc_path,
              google_category_id: data.classification.gpc_id,
              google_category_confidence: data.classification.confidence,
              google_product_category: data.classification.gpc_path,
            })
            .eq('id', product.id);
          
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`Error classifying ${product.title}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        if (errorMessage.includes('taxonomy')) {
          toast.error('Taxonomie manquante', {
            description: 'Importez d\'abord la taxonomie Google en haut de la page',
          });
          setGeneratingCategories(false);
          return;
        }
        errorCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    toast.success('Classification terminée', {
      description: `${successCount} produits classifiés, ${errorCount} erreurs`,
    });
    await fetchProducts();
    setSelectedProducts(new Set());
    setGeneratingCategories(false);
  };

  const handleWhiteBackground = async () => {
    if (selectedProducts.size === 0) {
      toast.info('Sélectionnez au moins un produit');
      return;
    }

    const productsToProcess = products.filter(p => 
      selectedProducts.has(p.id) && p.image_url
    );

    if (productsToProcess.length === 0) {
      toast.error('Aucun produit sélectionné n\'a d\'image');
      return;
    }

    // Initialize previews
    const initialPreviews: PreviewImage[] = productsToProcess.map(p => ({
      productId: p.id,
      productTitle: p.title,
      originalUrl: p.image_url,
      generatedUrl: null,
      status: 'pending' as const,
    }));

    setPreviews(initialPreviews);
    setShowPreview(true);
    setProcessingImages(true);

    // Generate images one by one
    for (let i = 0; i < productsToProcess.length; i++) {
      const product = productsToProcess[i];
      
      setPreviews(prev => prev.map(p => 
        p.productId === product.id 
          ? { ...p, status: 'generating' as const }
          : p
      ));

      try {
        const { data, error } = await supabase.functions.invoke('generate-white-background', {
          body: {
            imageUrl: product.image_url,
            productTitle: product.title,
            product_id: product.id
          }
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'AI generation failed');

        setPreviews(prev => prev.map(p => 
          p.productId === product.id 
            ? { ...p, status: 'success' as const, generatedUrl: data.imageUrl }
            : p
        ));
      } catch (error) {
        console.error(`Error generating for ${product.title}:`, error);
        setPreviews(prev => prev.map(p => 
          p.productId === product.id 
            ? { 
                ...p, 
                status: 'error' as const, 
                error: error instanceof Error ? error.message : 'Erreur de génération'
              }
            : p
        ));
      }
    }

    setProcessingImages(false);
  };

  const handleApplyPreviews = async (productIds: string[], format: string) => {
    const toastId = toast.loading('Application des images...');
    console.log('Applying previews with format:', format);
    let successCount = 0;
    let errorCount = 0;

    for (const productId of productIds) {
      try {
        const preview = previews.find(p => p.productId === productId);
        if (!preview?.generatedUrl) continue;

        // Upload to Supabase Storage
        const fileName = `product-white-bg-${productId}-${Date.now()}.png`;
        
        const base64Response = await fetch(preview.generatedUrl);
        const blob = await base64Response.blob();
        
        const { error: uploadError } = await supabase.storage
          .from('generated-images')
          .upload(fileName, blob, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('generated-images')
          .getPublicUrl(fileName);

        const { error: updateError } = await supabase
          .from('shopify_products')
          .update({ 
            image_url: publicUrl,
            google_white_background: true
          })
          .eq('id', productId);

        if (updateError) throw updateError;

        successCount++;
      } catch (error) {
        console.error(`Error applying preview for ${productId}:`, error);
        errorCount++;
      }
    }

    if (errorCount === 0) {
      toast.success(`${successCount} images appliquées`, { id: toastId });
    } else {
      toast.warning(`${successCount} succès, ${errorCount} erreurs`, { id: toastId });
    }

    await fetchProducts();
    setSelectedProducts(new Set());
    setShowPreview(false);
    setPreviews([]);
  };

  const handleOptimizeAll = async () => {
    // Include products that are missing any optimization field
    const unoptimized = products.filter(p => 
      !p.google_product_category || !p.google_gtin || !p.google_white_background
    );

    if (unoptimized.length === 0) {
      toast.info('Tous les produits sont déjà optimisés !');
      return;
    }

    // Check usage limits before starting
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token ? {
        Authorization: `Bearer ${session.access_token}`
      } : {};
      
      const { data: limitCheck, error: limitError } = await supabase.functions.invoke('check-usage-limits', {
        headers,
        body: { 
          action: 'optimize',
          count: unoptimized.length
        }
      });

      if (limitError || !limitCheck?.allowed) {
        toast.error(limitCheck?.message || 'Limite d\'optimisations atteinte');
        // Open upgrade dialog
        window.dispatchEvent(new CustomEvent('show-upgrade-dialog', { 
          detail: { limitType: 'optimizations' } 
        }));
        return;
      }
    } catch (err) {
      console.error('Error checking limits:', err);
    }

    // Ask user for confirmation
    const confirmMessage = `${unoptimized.length} produits seront optimisés (catégorie, GTIN et/ou fond blanc manquants). Continuer ?`;
    if (!confirm(confirmMessage)) return;

    setIsOptimizing(true);
    setShowOptimizeDialog(true);
    setOptimizationResults([]);
    setOptimizationProgress(0);

    const results: any[] = [];
    const total = unoptimized.length;

    for (let i = 0; i < unoptimized.length; i++) {
      const product = unoptimized[i];
      setCurrentOptimizingProduct(product.title);
      
      let categoryGenerated = false;
      let gtinGenerated = false;
      let status: 'success' | 'error' | 'skipped' = 'skipped';
      let error: string | undefined;

      try {
        // Generate category if missing
        if (!product.google_product_category) {
          try {
            const { data: categoryData, error: categoryError } = await supabase.functions.invoke('generate-google-category', {
              body: { productId: product.id }
            });
            
            if (categoryError) {
              // Check if it's a quota/limit error
              if (categoryError.message?.includes('trial_product_already_optimized')) {
                error = 'Produit déjà optimisé (limite essai)';
                status = 'error';
                // Show upgrade dialog
                window.dispatchEvent(new CustomEvent('show-upgrade-dialog', { 
                  detail: { limitType: 'optimizations' } 
                }));
                break; // Stop the optimization loop
              }
              throw categoryError;
            }
            
            if (categoryData?.error === 'trial_product_already_optimized') {
              error = 'Limite atteinte';
              status = 'error';
              window.dispatchEvent(new CustomEvent('show-upgrade-dialog', { 
                detail: { limitType: 'optimizations' } 
              }));
              break;
            }
            
            if (categoryData.success) {
              categoryGenerated = true;
              status = 'success';
            }
          } catch (err) {
            console.error('Category error:', err);
            error = 'Erreur génération catégorie';
          }
        }

        // Generate GTIN if missing
        if (!product.google_gtin) {
          try {
            const { data: gtinData, error: gtinError } = await supabase.functions.invoke('generate-gtin', {
              body: { 
                productIds: [product.id],
                countryCode: 'FR'
              }
            });
            if (gtinError) throw gtinError;
            if (gtinData.results && gtinData.results.length > 0) {
              gtinGenerated = true;
              status = 'success';
            }
          } catch (err) {
            console.error('GTIN error:', err);
            error = error ? `${error}, GTIN` : 'Erreur génération GTIN';
          }
        }

        if (!categoryGenerated && !gtinGenerated && !error) {
          status = 'skipped';
        }

        if (error) {
          status = 'error';
        }
      } catch (err) {
        console.error('Optimization error:', err);
        status = 'error';
        error = 'Erreur générale';
      }

      results.push({
        productId: product.id,
        productTitle: product.title,
        imageUrl: product.image_url,
        status,
        categoryGenerated,
        gtinGenerated,
        error,
      });

      setOptimizationResults([...results]);
      setOptimizationProgress(((i + 1) / total) * 100);
    }

    setIsOptimizing(false);
    setCurrentOptimizingProduct('');
    await fetchProducts();

    const successCount = results.filter(r => r.status === 'success').length;
    toast.success(`Optimisation terminée ! ${successCount}/${total} produits optimisés`);
  };

  const handleRegeneratePreview = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setPreviews(prev => prev.map(p => 
      p.productId === productId 
        ? { ...p, status: 'generating' as const }
        : p
    ));

    try {
      const { data, error } = await supabase.functions.invoke('generate-white-background', {
        body: {
          imageUrl: product.image_url,
          productTitle: product.title,
          product_id: product.id
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'AI generation failed');

      setPreviews(prev => prev.map(p => 
        p.productId === productId 
          ? { ...p, status: 'success' as const, generatedUrl: data.imageUrl }
          : p
      ));

      toast.success('Image régénérée');
    } catch (error) {
      console.error('Error regenerating:', error);
      setPreviews(prev => prev.map(p => 
        p.productId === productId 
          ? { 
              ...p, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : 'Erreur de génération'
            }
          : p
      ));
      toast.error('Erreur lors de la régénération');
    }
  };

  const handleSyncSelected = async () => {
    if (selectedProducts.size === 0) {
      toast.info('Sélectionnez au moins un produit');
      return;
    }

    setSyncing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const productId of Array.from(selectedProducts)) {
      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-seo-to-shopify`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            productId, 
            syncGoogleShopping: true
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error('Error syncing:', error);
        errorCount++;
      }
    }

    setSyncing(false);
    setSelectedProducts(new Set());
    
    toast.success(`Synchronisation terminée: ${successCount} succès, ${errorCount} erreurs`);
    await fetchProducts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedStore) {
    return (
      <div className="mx-auto max-w-5xl py-8">
        <div className="overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-slate-950 via-violet-950 to-blue-950 p-8 text-white shadow-2xl shadow-violet-950/15 sm:p-12">
          <div className="max-w-2xl">
            <Badge className="border border-white/10 bg-white/10 text-violet-100 hover:bg-white/10">CHANNELS · GOOGLE SHOPPING</Badge>
            <span className="mt-8 grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/20 text-violet-200">
              <ShoppingBag className="h-7 w-7" />
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Connect your Shopify catalog first</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
              Import products, variants, collections and images before checking Google categories, identifiers, media and feed readiness.
            </p>
            <Button onClick={() => navigate('/app/setup-wizard')} className="mt-8 bg-white text-slate-950 hover:bg-violet-50" size="lg">
              <ShoppingBag className="mr-2 h-5 w-5" /> Connect Shopify
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const productsOptimized = products.filter((product) => productReadiness(product).ready).length;
  const productsToSync = products.filter((product) => productReadiness(product).ready && !product.seo_synced_to_shopify).length;
  const completionRate = products.length > 0 ? Math.round((productsOptimized / products.length) * 100) : 0;

  return (
    <div className="space-y-6 pb-10">
      <WorkspacePageHeader
        section="Channels"
        page="Google Shopping"
        count={products.length}
        title="Google Shopping"
        description="Complete missing product data, review the result, then synchronize approved changes."
        actions={
          <>
            <Button onClick={handleOptimizeAll} disabled={isOptimizing || products.length === 0}>
              {isOptimizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Fix missing data
            </Button>
            <Button variant="outline" onClick={() => navigate("/merchant?tab=feed")}>
              <Download className="mr-2 h-4 w-4" /> Product feed
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Catalog products', value: products.length, detail: 'Imported from Shopify', icon: Package, tone: 'bg-blue-50 text-blue-700' },
          { label: 'Shopping readiness', value: `${optimizationScore}%`, detail: 'Category · MPN · condition · media · GTIN', icon: TrendingUp, tone: 'bg-violet-50 text-violet-700' },
          { label: 'Complete records', value: productsOptimized, detail: `${completionRate}% of the catalog`, icon: CheckCircle, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Ready to sync', value: productsToSync, detail: 'Approved catalog updates', icon: Upload, tone: 'bg-amber-50 text-amber-700' },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <Card key={label} className="border-slate-200 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
            </div>
          </Card>
        ))}
      </section>

      <section className="rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-50/80 via-white to-blue-50/70 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="lg:w-64">
            <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">READINESS WORKFLOW</Badge>
            <h2 className="mt-3 text-lg font-semibold">From imported to eligible</h2>
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['01', 'Classify', 'Google category'],
              ['02', 'Identify', 'GTIN and MPN'],
              ['03', 'Improve media', 'AI white background'],
              ['04', 'Publish', 'Review and sync'],
            ].map(([step, title, detail]) => (
              <div key={step} className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
                <span className="text-xs font-semibold text-violet-600">{step}</span><p className="mt-2 text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={() => setShowGuide(true)} className="border-violet-200 text-violet-700 hover:bg-violet-50">
            <BookOpen className="mr-2 h-4 w-4" /> Open guide
          </Button>
        </div>
      </section>

      <details className="group rounded-2xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium text-slate-700">
          Google taxonomy tools <span className="text-xs text-slate-400 group-open:hidden">Advanced</span>
        </summary>
        <div className="border-t border-slate-100 p-5"><GoogleCategoryImport /></div>
      </details>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Product readiness workspace</h2>
              <p className="mt-1 text-sm text-slate-500">Select products, apply a focused action and review every result before synchronization.</p>
            </div>
            <div className="relative w-full xl:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input type="text" placeholder="Search products…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border-slate-200 bg-slate-50 pl-9" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
          <span className="mr-2 text-xs font-medium text-slate-500">{selectedProducts.size} selected</span>
          <Button size="sm" variant="outline" onClick={handleGenerateCategories} disabled={generatingCategories || selectedProducts.size === 0}>
            {generatingCategories ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-violet-600" />} Generate categories
          </Button>
          <Button size="sm" variant="outline" onClick={handleGenerateGTINs} disabled={generatingGtins || selectedProducts.size === 0}>
            {generatingGtins ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hash className="mr-2 h-4 w-4" />} Generate GTINs
          </Button>
          <Button size="sm" variant="outline" onClick={handleWhiteBackground} disabled={processingImages || selectedProducts.size === 0}>
            {processingImages ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />} White background
          </Button>
          <Button size="sm" onClick={handleSyncSelected} disabled={syncing || selectedProducts.size === 0} className="bg-violet-600 hover:bg-violet-700">
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Sync to Shopify
          </Button>
        </div>
      </section>

      {/* Products Table */}
      <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Google category</TableHead>
                <TableHead>MPN</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>GTIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map((product) => {
                const isEditing = editingProduct === product.id;
                return (
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
                        <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{product.title}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editData.google_product_category || ''}
                          onChange={(e) => setEditData({ ...editData, google_product_category: e.target.value })}
                          placeholder="Ex: Apparel & Accessories"
                          className="min-w-[200px]"
                        />
                      ) : (
                        <span className="text-sm">{product.google_product_category || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editData.google_mpn || ''}
                          onChange={(e) => setEditData({ ...editData, google_mpn: e.target.value })}
                          placeholder="MPN ou Marque"
                          className="min-w-[120px]"
                        />
                      ) : (
                        <span className="text-sm">{product.google_mpn || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={editData.google_condition || ''}
                          onValueChange={(value) => setEditData({ ...editData, google_condition: value })}
                        >
                          <SelectTrigger className="min-w-[120px]">
                            <SelectValue placeholder="État" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Neuf</SelectItem>
                            <SelectItem value="refurbished">Reconditionné</SelectItem>
                            <SelectItem value="used">Occasion</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm">{product.google_condition || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editData.google_gtin || ''}
                          onChange={(e) => setEditData({ ...editData, google_gtin: e.target.value })}
                          placeholder="GTIN (optionnel)"
                          className="min-w-[150px]"
                        />
                      ) : (
                        <span className="text-sm">{product.google_gtin || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.google_product_category && product.google_gtin && product.google_white_background ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Optimisé
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          <Clock className="w-3 h-3 mr-1" />
                          En attente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(product.id)}
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                setSaving(true);
                                toast.info('Génération de la catégorie Google...');
                                const { data, error } = await supabase.functions.invoke('generate-google-category', {
                                  body: { productId: product.id }
                                });
                                
                                if (error) {
                                  // Check for quota errors
                                  if (error.message?.includes('trial_product_already_optimized')) {
                                    toast.error('Limite atteinte - Produit déjà optimisé pendant l\'essai');
                                    setShowUpgradeDialog(true);
                                    return;
                                  }
                                  throw error;
                                }
                                
                                if (data?.error === 'trial_product_already_optimized') {
                                  toast.error('Limite atteinte - Produit déjà optimisé pendant l\'essai');
                                  setShowUpgradeDialog(true);
                                  return;
                                }
                                
                                if (data.success) {
                                  toast.success('Catégorie générée avec succès !');
                                  fetchProducts();
                                } else {
                                  throw new Error(data.error || 'Erreur');
                                }
                              } catch (error: any) {
                                console.error('Error:', error);
                                toast.error(error.message || 'Erreur lors de la génération');
                              } finally {
                                setSaving(false);
                              }
                            }}
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-1" />
                            )}
                            Optimiser avec IA
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(product)}
                          >
                            Modifier
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center py-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={previousPage}
                  className={!hasPreviousPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                if (totalPages <= 7) {
                  return i + 1;
                }
                
                // Show first 3, current page neighbors, and last page with ellipses
                if (i < 2) return i + 1;
                if (i === 2 && currentPage > 4) return '...';
                if (i === 2) return 3;
                if (i === 3 && currentPage <= 4) return 4;
                if (i === 3) return currentPage;
                if (i === 4 && currentPage >= totalPages - 3) return totalPages - 2;
                if (i === 4) return '...';
                if (i === 5) return totalPages - 1;
                return totalPages;
              }).map((page, index) => (
                page === '...' ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <span className="flex h-9 w-9 items-center justify-center">...</span>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => goToPage(page as number)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={nextPage}
                  className={!hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <WhiteBackgroundPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        previews={previews}
        onApply={handleApplyPreviews}
        onRegenerate={handleRegeneratePreview}
      />

      <ShopifyOptimizationGuide 
        open={showGuide} 
        onClose={() => setShowGuide(false)} 
      />

      <OptimizeAllDialog
        open={showOptimizeDialog}
        onClose={() => setShowOptimizeDialog(false)}
        onCancel={() => setIsOptimizing(false)}
        results={optimizationResults}
        progress={optimizationProgress}
        isProcessing={isOptimizing}
        currentProduct={currentOptimizingProduct}
        totalProducts={optimizationResults.length}
        currentIndex={optimizationResults.filter(r => r.status !== 'pending').length}
      />

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType="optimizations"
        usage={limits?.usage.optimizations_count || 0}
        limit={limits?.limits.max_optimizations || 0}
        currentPlan={limits?.currentPlanId || 'Trial'}
      />
    </div>
  );
}
