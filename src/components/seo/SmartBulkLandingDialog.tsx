import { useEffect, useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Check, X, Zap, Sparkles, Eye } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/lib/language';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LandingConfig } from './LandingConfigDialog';

interface ProductItem {
  id: string;
  title: string;
  image_url: string | null;
  vendor?: string | null;
  body_html?: string;
  seo_title?: string;
  has_landing_page?: boolean | null;
}

interface ProcessedItem {
  productId: string;
  productTitle: string;
  status: 'pending' | 'generating' | 'success' | 'error';
  error?: string;
  optimizedTitle?: string;
}

interface SmartBulkLandingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductItem[];
  config: LandingConfig;
  storeId: string;
  onComplete: () => void;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper with exponential backoff for network errors
const withRetry = async <T,>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 2000
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isNetworkError = 
        err.message?.includes('Network') || 
        err.message?.includes('network') ||
        err.message?.includes('timeout') ||
        err.message?.includes('500') ||
        err.message?.includes('connection');
      
      if (isNetworkError && attempt < maxAttempts) {
        const waitTime = baseDelay * Math.pow(2, attempt - 1);
        console.log(`[SmartBulk] Retry ${attempt}/${maxAttempts} after ${waitTime}ms...`);
        await delay(waitTime);
        continue;
      }
      throw err;
    }
  }
  
  throw lastError;
};

export function SmartBulkLandingDialog({
  open,
  onOpenChange,
  products,
  config,
  storeId,
  onComplete,
}: SmartBulkLandingDialogProps) {
  const { t, language } = useTranslation();
  const [items, setItems] = useState<ProcessedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const startedRef = useRef(false);
  const vendorCache = useRef<Map<string, string>>(new Map());

  // Resolve vendor based on config
  const resolveVendor = async (product: ProductItem): Promise<string> => {
    switch (config.vendorSource) {
      case "shopify":
        return product.vendor || "Marque";

      case "extract":
        const words = product.title.split(" ");
        const capitalizedWord = words.find(
          (word) => word.length > 2 && word[0] === word[0].toUpperCase() && word.slice(1) === word.slice(1).toLowerCase()
        );
        return capitalizedWord || words.find((w) => w.length > 3) || "Marque";

      case "generate":
        const cacheKey = product.title.toLowerCase().trim();
        if (vendorCache.current.has(cacheKey)) {
          return vendorCache.current.get(cacheKey)!;
        }
        try {
          const { data } = await supabase.functions.invoke("generate-vendor-name", {
            body: { productTitle: product.title, productDescription: product.body_html },
          });
          if (data?.vendor) {
            vendorCache.current.set(cacheKey, data.vendor);
            return data.vendor;
          }
        } catch (err) {
          console.warn("[SmartBulk] Vendor generation failed:", err);
        }
        return "Marque";

      default:
        return "Marque";
    }
  };

  // Get optimized title via smart-title
  const getOptimizedTitle = async (productId: string): Promise<string | null> => {
    if (config.regenerateTitle === false) return null;

    try {
      const { data, error } = await supabase.functions.invoke("smart-title", {
        body: { productId },
      });

      if (!error && data?.optimizedTitle) {
        return data.optimizedTitle;
      }
    } catch (err) {
      console.warn("[SmartBulk] Smart title failed:", err);
    }

    return null;
  };

  // Process single product
  const processProduct = async (product: ProductItem, index: number): Promise<boolean> => {
    if (cancelledRef.current) return false;

    // Si le toggle régénérer est désactivé ET le produit a déjà une landing page → skip
    if (config.regenerateTitle === false && product.has_landing_page) {
      console.log(`[SmartBulk] Skipping ${product.title} - already has landing page and regenerate disabled`);
      setItems(prev => prev.map((item, i) => 
        i === index ? { ...item, status: 'success' } : item
      ));
      return true; // Considéré comme succès (déjà fait)
    }

    // Update status to generating
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, status: 'generating' } : item
    ));

    try {
      // Step 1: Resolve vendor
      const vendor = await resolveVendor(product);

      // Persist vendor if generated/extracted
      if (config.vendorSource !== "shopify" && vendor && vendor !== "Marque" && vendor !== product.vendor) {
        const { error: vendorSaveError } = await supabase
          .from("shopify_products")
          .update({ vendor })
          .eq("id", product.id);

        if (vendorSaveError) {
          console.warn("[SmartBulk] Failed to save vendor:", vendorSaveError);
        }
      }

      // Step 2: Get optimized title (if enabled)
      const optimizedTitle = await getOptimizedTitle(product.id);

      // Persist title if regenerated
      if (optimizedTitle) {
        const { error: titleSaveError } = await supabase
          .from("shopify_products")
          .update({ seo_title: optimizedTitle })
          .eq("id", product.id);

        if (titleSaveError) {
          console.warn("[SmartBulk] Failed to save seo_title:", titleSaveError);
        }
      }

      // Step 3: Generate landing page with retry for network errors
      const { data, error } = await withRetry(async () => {
        const result = await supabase.functions.invoke("generate-smart-landing", {
          body: {
            productTitle: product.title,
            optimizedTitle: optimizedTitle,
            vendor: vendor, // Le nouveau vendor (généré ou extrait)
            originalVendor: product.vendor, // L'ancien vendor Shopify à retirer du titre
            imageUrl: product.image_url,
            description: product.body_html,
            highlights: config.customHighlights,
            // Do NOT couple generation language to UI language.
            // If not provided, the backend defaults to FR.
            theme: config.theme,
            designStyle: config.designStyle,
          },
        });
        if (result.error) throw new Error(result.error.message || "Erreur de génération");
        return result;
      }, 3, 2000);

      if (!data?.html) throw new Error("Pas de HTML généré");

      // Step 4: Save to database
      const { error: saveError } = await supabase
        .from("shopify_products")
        .update({
          landing_page_html: data.html,
          has_landing_page: true,
          last_landing_generation_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      if (saveError) throw saveError;

      // Update status to success
      setItems(prev => prev.map((item, i) => 
        i === index ? { 
          ...item, 
          status: 'success', 
          productTitle: optimizedTitle || item.productTitle,
          optimizedTitle: optimizedTitle || undefined,
        } : item
      ));

      return true;

    } catch (err: any) {
      console.error(`[SmartBulk] Error for ${product.title}:`, err);
      setItems(prev => prev.map((item, i) => 
        i === index ? { ...item, status: 'error', error: err.message } : item
      ));
      return false;
    }
  };

  // Start processing
  const startProcessing = async () => {
    if (startedRef.current || isProcessing) return;
    startedRef.current = true;
    cancelledRef.current = false;
    setIsProcessing(true);
    setProcessedCount(0);

    // Initialize items
    const initialItems: ProcessedItem[] = products.map(p => ({
      productId: p.id,
      productTitle: p.title,
      status: 'pending',
    }));
    setItems(initialItems);

    let successCount = 0;

    for (let i = 0; i < products.length; i++) {
      if (cancelledRef.current) break;

      const success = await processProduct(products[i], i);
      if (success) successCount++;
      
      setProcessedCount(i + 1);

      // Small delay between products to avoid rate limits
      if (i < products.length - 1 && !cancelledRef.current) {
        await delay(300);
      }
    }

    setIsProcessing(false);
    startedRef.current = false;

    if (!cancelledRef.current) {
      toast.success(`${successCount}/${products.length} landing pages générées`);
      onComplete();
    }
  };

  // Cancel processing
  const handleCancel = () => {
    cancelledRef.current = true;
    setIsProcessing(false);
    toast.info("Génération annulée");
  };

  // Close dialog
  const handleClose = () => {
    if (isProcessing) {
      cancelledRef.current = true;
    }
    onOpenChange(false);
  };

  // Reset refs when dialog closes
  useEffect(() => {
    if (!open) {
      startedRef.current = false;
      cancelledRef.current = false;
      vendorCache.current.clear();
    }
  }, [open]);

  // Start on open
  useEffect(() => {
    if (open && products.length > 0 && !startedRef.current && !isProcessing) {
      // Small delay to ensure state is ready
      const timer = setTimeout(() => {
        if (!startedRef.current) {
          startProcessing();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, products.length]);

  const progress = products.length > 0 ? Math.round((processedCount / products.length) * 100) : 0;
  const successCount = items.filter(i => i.status === 'success').length;
  const errorCount = items.filter(i => i.status === 'error').length;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] p-4 sm:p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Smart Bulk Landing
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Génération rapide avec Smart Title, Brand & Highlights
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4">
            {/* Progress */}
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span>{processedCount} / {products.length} produits</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5 sm:h-2" />
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
              <Badge variant="outline" className="gap-1 px-2 py-0.5 sm:px-3 sm:py-1">
                <Check className="w-3 h-3 text-green-500" />
                {successCount} succès
              </Badge>
              {errorCount > 0 && (
                <Badge variant="outline" className="gap-1 px-2 py-0.5 sm:px-3 sm:py-1">
                  <X className="w-3 h-3 text-red-500" />
                  {errorCount} erreurs
                </Badge>
              )}
              {isProcessing && (
                <Badge variant="secondary" className="gap-1 px-2 py-0.5 sm:px-3 sm:py-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  En cours...
                </Badge>
              )}
            </div>

            {/* Product list */}
            <ScrollArea className="h-[40vh] sm:h-[300px] border rounded-lg p-1.5 sm:p-2">
              <div className="space-y-1.5 sm:space-y-2">
                {items.map((item, index) => (
                  <div
                    key={item.productId}
                    ref={item.status === 'generating' ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : undefined}
                    className={`p-2 sm:p-3 rounded-lg border ${
                      item.status === 'generating' ? 'bg-primary/5 border-primary/30' :
                      item.status === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-950/20' :
                      item.status === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-950/20' :
                      'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">{item.productTitle}</p>
                        {item.optimizedTitle && (
                          <p className="text-[10px] sm:text-xs text-primary truncate flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                            <span className="truncate">{item.optimizedTitle}</span>
                          </p>
                        )}
                        {item.error && (
                          <p className="text-[10px] sm:text-xs text-red-500 truncate">{item.error}</p>
                        )}
                      </div>
                      <div className="ml-1.5 sm:ml-2 flex-shrink-0">
                        {item.status === 'pending' && (
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-muted" />
                        )}
                        {item.status === 'generating' && (
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-spin" />
                        )}
                        {item.status === 'success' && (
                          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                        )}
                        {item.status === 'error' && (
                          <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                        )}
                      </div>
                    </div>
                    {/* Preview button below title */}
                    {item.status === 'success' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1.5 h-6 text-xs gap-1 text-primary hover:text-primary/80"
                        onClick={async () => {
                          const { data } = await supabase
                            .from('shopify_products')
                            .select('landing_page_html')
                            .eq('id', item.productId)
                            .single();
                          if (data?.landing_page_html) {
                            setPreviewHtml(data.landing_page_html);
                          }
                        }}
                      >
                        <Eye className="w-3 h-3" />
                        Aperçu
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="mt-3 sm:mt-4">
            {isProcessing ? (
              <Button variant="destructive" onClick={handleCancel} size="sm" className="w-full sm:w-auto">
                Annuler
              </Button>
            ) : (
              <Button onClick={handleClose} size="sm" className="w-full sm:w-auto">
                Fermer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {previewHtml && (
        <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Aperçu
              </DialogTitle>
            </DialogHeader>
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[70vh] border rounded-lg"
              title="Preview"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
