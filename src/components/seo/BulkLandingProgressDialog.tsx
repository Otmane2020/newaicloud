import { useState, useEffect, useRef } from 'react';
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
import { Loader2, Check, X, Eye, Upload, FileText, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/lib/language';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface LandingPreviewItem {
  productId: string;
  productTitle: string;
  imageUrl: string | null;
  status: 'pending' | 'generating' | 'success' | 'error';
  error?: string;
  landingHtml?: string;
}

interface LandingConfig {
  layout: string;
  colorScheme: any;
  contentLength: string;
  vendorSource: 'shopify' | 'extract' | 'generate';
  customHighlights?: string;
  designStyle: 'minimalist' | 'modern' | 'premium';
  theme: 'light' | 'dark';
  regenerateTitle?: boolean;
}

interface BulkLandingProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Array<{ id: string; title: string; image_url: string | null; vendor?: string | null }>;
  config: LandingConfig;
  storeId: string;
  onComplete: () => void;
}

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to call API with retry on rate limit
async function callWithRetry<T>(
  fn: () => Promise<{ data: T | null; error: any }>,
  maxRetries = 3,
  baseDelay = 8000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data, error } = await fn();
      
      // Check for error from Supabase invoke
      if (error) {
        const errorMsg = typeof error === 'string' ? error : 
                         error?.message || 
                         JSON.stringify(error);
        const errorStr = errorMsg.toLowerCase();
        const isRateLimit = errorStr.includes('429') || 
                            errorStr.includes('rate') ||
                            errorStr.includes('limite de taux') ||
                            errorStr.includes('rate_limited');
        
        if (isRateLimit && attempt < maxRetries - 1) {
          const waitTime = baseDelay * Math.pow(2, attempt);
          console.log(`Rate limited, waiting ${waitTime / 1000}s before retry ${attempt + 1}/${maxRetries}`);
          await delay(waitTime);
          continue;
        }
        
        throw new Error(errorMsg);
      }
      
      // Check for error IN the data response (edge function returned error JSON)
      if (data && typeof data === 'object' && 'error' in data && !('html' in data)) {
        const errorData = data as { error: string };
        const errorStr = (errorData.error || '').toLowerCase();
        const isRateLimit = errorStr.includes('429') || 
                            errorStr.includes('rate') ||
                            errorStr.includes('limite de taux');
        
        if (isRateLimit && attempt < maxRetries - 1) {
          const waitTime = baseDelay * Math.pow(2, attempt);
          console.log(`Rate limited (in data), waiting ${waitTime / 1000}s before retry ${attempt + 1}/${maxRetries}`);
          await delay(waitTime);
          continue;
        }
        
        throw new Error(errorData.error || 'Erreur de génération');
      }
      
      if (!data) {
        throw new Error('Aucune réponse du serveur');
      }
      
      // Verify we have html in response
      if (typeof data === 'object' && !('html' in data)) {
        console.error('Invalid response data:', data);
        throw new Error('Réponse invalide: pas de HTML généré');
      }
      
      return data;
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Also check thrown errors for rate limit
      const errorStr = String(error?.message || '').toLowerCase();
      const isRateLimit = errorStr.includes('429') || 
                          errorStr.includes('rate') ||
                          errorStr.includes('limite de taux');
      
      if (isRateLimit && attempt < maxRetries - 1) {
        const waitTime = baseDelay * Math.pow(2, attempt);
        console.log(`Rate limited (thrown), waiting ${waitTime / 1000}s before retry ${attempt + 1}/${maxRetries}`);
        await delay(waitTime);
        continue;
      }
      
      // Don't retry for non-rate-limit errors
      break;
    }
  }
  
  throw lastError || new Error('Échec après plusieurs tentatives');
}

export function BulkLandingProgressDialog({
  open,
  onOpenChange,
  products,
  config,
  storeId,
  onComplete,
}: BulkLandingProgressDialogProps) {
  const { t } = useTranslation();
  const [previews, setPreviews] = useState<LandingPreviewItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [syncingToShopify, setSyncingToShopify] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewProductTitle, setPreviewProductTitle] = useState<string>('');
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [processedCount, setProcessedCount] = useState(0); // Real-time counter
  const [currentProductIndex, setCurrentProductIndex] = useState(0); // Currently processing index
  const cancelledRef = useRef(false);
  const generationStartedRef = useRef(false);
  const generatedVendorsCache = useRef<Map<string, string>>(new Map());

  // Batching constants
  const BATCH_SIZE = 50;
  const BATCH_DELAY_MS = 10000; // 10 seconds between batches

  // 🏷️ Resolve Vendor based on config (similar to RegenerateLanding)
  const resolveVendorForProduct = async (
    productData: { id: string; title: string; body_html?: string; vendor?: string | null }
  ): Promise<string> => {
    switch (config.vendorSource) {
      case "shopify":
        return productData.vendor || "Marque inconnue";

      case "extract":
        const words = productData.title.split(" ");
        const capitalizedWord = words.find(
          (word) =>
            word.length > 2 && 
            word[0] === word[0].toUpperCase() && 
            word.slice(1) === word.slice(1).toLowerCase()
        );
        return capitalizedWord || words.find((w) => w.length > 3) || "Marque";

      case "generate":
        // Check cache first to avoid redundant AI calls
        const cacheKey = productData.title.toLowerCase().trim();
        if (generatedVendorsCache.current.has(cacheKey)) {
          return generatedVendorsCache.current.get(cacheKey)!;
        }
        
        try {
          const { data: aiData } = await supabase.functions.invoke("generate-vendor-name", {
            body: {
              productTitle: productData.title,
              productDescription: productData.body_html,
            },
          });

          if (aiData?.vendor) {
            // Cache the result
            generatedVendorsCache.current.set(cacheKey, aiData.vendor);
            return aiData.vendor;
          }
        } catch (err) {
          console.error("[Bulk Vendor] AI generation failed:", err);
        }
        return "Marque générée";

      default:
        return productData.vendor || "Marque inconnue";
    }
  };

  // Initialize previews when dialog opens
  useEffect(() => {
    if (open && products.length > 0 && !generationStartedRef.current) {
      generationStartedRef.current = true;
      cancelledRef.current = false; // Reset cancellation on open
      generatedVendorsCache.current.clear(); // Clear vendor cache
      
      // Initialize previews with all products as pending
      const initialPreviews = products.map(p => ({
        productId: p.id,
        productTitle: p.title,
        imageUrl: p.image_url,
        status: 'pending' as const,
      }));
      setPreviews(initialPreviews);
      
      // Start generation after a small delay to ensure state is set
      setTimeout(() => {
        startGeneration();
      }, 100);
    }
    
    // Reset ref when dialog closes
    if (!open) {
      generationStartedRef.current = false;
      setPreviews([]); // Clear previews when closing
    }
  }, [open, products]);

  const startGeneration = async () => {
    setIsProcessing(true);
    setProcessedCount(0);
    setCurrentProductIndex(0);
    let localSuccessCount = 0; // Local counter to avoid stale state
    let totalProcessed = 0; // Track total processed for real-time updates

    // Split products into batches of BATCH_SIZE
    const batches: typeof products[] = [];
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      batches.push(products.slice(i, i + BATCH_SIZE));
    }
    
    setTotalBatches(batches.length);
    console.log(`[Bulk Landing] 📦 Processing ${products.length} products in ${batches.length} batches of ${BATCH_SIZE}`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      if (cancelledRef.current) break;
      
      const batch = batches[batchIndex];
      setCurrentBatch(batchIndex + 1);
      console.log(`[Bulk Landing] 📦 Starting batch ${batchIndex + 1}/${batches.length} (${batch.length} products)`);

      for (let i = 0; i < batch.length; i++) {
        // Check ref for cancellation (not stale state)
        if (cancelledRef.current) break;

        // Calculate global index for display
        const globalIndex = batchIndex * BATCH_SIZE + i;
        setCurrentProductIndex(globalIndex + 1);

        // Add shorter delay between requests within batch (2 seconds)
        if (i > 0) {
          await delay(2000);
        }

        const product = batch[i];
      
      // Update status to generating
      setPreviews(prev => prev.map(p => 
        p.productId === product.id ? { ...p, status: 'generating' } : p
      ));

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Session non trouvée');

        // Fetch product details
        const { data: productData, error: productError } = await supabase
          .from('shopify_products')
          .select('*')
          .eq('id', product.id)
          .single();

        if (productError) throw productError;

        // Fetch product images
        const { data: productImages } = await supabase
          .from('product_images')
          .select('src, alt_text')
          .eq('product_id', product.id)
          .order('position', { ascending: true })
          .limit(5);

        const images = productImages?.map(img => img.src) || [];
        if (productData.image_url && !images.includes(productData.image_url)) {
          images.unshift(productData.image_url);
        }

        // 🏷️ Resolve vendor based on config (with AI generation if needed)
        const resolvedVendor = await resolveVendorForProduct(productData);
        console.log(`[Bulk Landing] Resolved vendor for "${productData.title}": ${resolvedVendor}`);

        // ✅ Update vendor in database if it was generated/extracted and different from current
        if (config.vendorSource !== "shopify" && resolvedVendor && resolvedVendor !== "Marque générée" && resolvedVendor !== "Marque" && resolvedVendor !== productData.vendor) {
          await supabase
            .from("shopify_products")
            .update({ vendor: resolvedVendor })
            .eq("id", product.id);
          console.log(`[Bulk Landing] Vendor "${resolvedVendor}" saved for product ${product.id}`);
        }

        // 🏷️ Handle title regeneration if enabled
        let productTitle = productData.seo_title || productData.title;
        if (config.regenerateTitle) {
          try {
            console.log(`[Bulk Landing] Regenerating title with smart-title for "${productData.title}"`);
            const { data: smartData, error: smartError } = await supabase.functions.invoke("smart-title", {
              body: {
                productId: product.id,
                language: 'fr',
              },
            });
            
            if (smartError) {
              console.error(`[Bulk Landing] smart-title error:`, smartError);
            } else if (smartData?.optimizedTitle) {
              productTitle = smartData.optimizedTitle;
              // Update in database
              await supabase
                .from("shopify_products")
                .update({ seo_title: smartData.optimizedTitle })
                .eq("id", product.id);
              console.log(`[Bulk Landing] New SERP-optimized title "${smartData.optimizedTitle}" saved for product ${product.id}`);
            }
          } catch (err) {
            console.error(`[Bulk Landing] Title regeneration failed for ${product.id}:`, err);
            // Continue with existing title
          }
        }
        const result = await callWithRetry<{ html: string }>(
          () => supabase.functions.invoke('generate-landing-bulk', {
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: {
              product_id: product.id,
              productTitle: productTitle,
              productDescription: productData.seo_description || productData.body_html,
              productImages: images.slice(0, 4), // Max 4 for bulk
              vendor: resolvedVendor, // ✅ Use resolved vendor instead of raw Shopify vendor
              designStyle: config.designStyle,
              colorScheme: config.colorScheme,
              theme: config.theme,
              language: 'fr',
              customHighlights: config.customHighlights, // ✅ Pass custom highlights from dialog
            },
          }),
          3, // 3 retries
          5000 // 5s base delay (faster for bulk)
        );

        // Increment local counter
        localSuccessCount++;
        totalProcessed++;
        setProcessedCount(totalProcessed);

        // Update status to success
        setPreviews(prev => prev.map(p => 
          p.productId === product.id 
            ? { ...p, status: 'success', landingHtml: result.html } 
            : p
        ));

      } catch (error: unknown) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : typeof error === 'string' 
            ? error 
            : 'Erreur lors de la génération';
        console.error(`Error generating landing for ${product.title}:`, errorMessage, error);
        
        totalProcessed++;
        setProcessedCount(totalProcessed);
        
        setPreviews(prev => prev.map(p => 
          p.productId === product.id 
            ? { ...p, status: 'error', error: errorMessage } 
            : p
        ));
      }
    } // end batch loop

      // ⏱ Pause between batches (10s) to avoid rate limits - except for last batch
      if (batchIndex < batches.length - 1 && !cancelledRef.current) {
        console.log(`[Bulk Landing] ✅ Batch ${batchIndex + 1}/${batches.length} complete, waiting ${BATCH_DELAY_MS/1000}s before next batch...`);
        await delay(BATCH_DELAY_MS);
      }
    } // end batches loop

    setIsProcessing(false);
    setCurrentBatch(0);
    setCurrentProductIndex(0);
    
    // Use local counter instead of stale previews state
    if (localSuccessCount > 0) {
      toast.success(t.dialogs.bulkLanding.success.replace('{{count}}', String(localSuccessCount)));
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    toast.info(t.dialogs.bulkLanding.cancelled);
  };

  const handleSyncToShopify = async () => {
    const successfulPreviews = previews.filter(p => p.status === 'success');
    if (successfulPreviews.length === 0) {
      toast.error(t.dialogs.bulkLanding.noneToSync);
      return;
    }

    setSyncingToShopify(true);
    const toastId = toast.loading(t.dialogs.bulkLanding.syncing.replace('{{count}}', String(successfulPreviews.length)));

    let syncedCount = 0;
    let errorCount = 0;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t.dialogs.bulkLanding.sessionNotFound);

      // ✅ Iterate and sync each product individually (sync-seo-to-shopify expects singular productId)
      for (const preview of successfulPreviews) {
        try {
          const { error } = await supabase.functions.invoke('sync-seo-to-shopify', {
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: {
              productId: preview.productId, // ✅ Singular productId, not array
              force: true,
            },
          });
          
          if (!error) {
            syncedCount++;
          } else {
            console.error(`[Bulk Sync] Error syncing ${preview.productTitle}:`, error);
            errorCount++;
          }
        } catch (err) {
          console.error(`[Bulk Sync] Exception syncing ${preview.productTitle}:`, err);
          errorCount++;
        }
        
        // Small delay between syncs to avoid rate limiting
        await delay(500);
      }

      if (syncedCount > 0) {
        toast.success(t.dialogs.bulkLanding.synced.replace('{{count}}', String(syncedCount)), { id: toastId });
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} échecs de synchronisation`);
      }
      
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(t.dialogs.bulkLanding.syncError, { id: toastId });
    } finally {
      setSyncingToShopify(false);
    }
  };

  const handlePreview = (html: string, title: string) => {
    setPreviewHtml(html);
    setPreviewProductTitle(title);
  };

  // Use processedCount for real-time updates during processing, completedCount otherwise
  const completedCount = previews.filter(p => p.status === 'success' || p.status === 'error').length;
  const displayCount = isProcessing ? processedCount : completedCount;
  const successCount = previews.filter(p => p.status === 'success').length;
  const progressPercent = products.length > 0 ? (displayCount / products.length) * 100 : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !isProcessing && onOpenChange(val)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col w-[95vw] sm:w-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle>{t.dialogs.bulkLanding.title}</DialogTitle>
                <DialogDescription>
                  {isProcessing 
                    ? `${totalBatches > 1 ? `Batch ${currentBatch}/${totalBatches} - ` : ''}${t.dialogs.bulkLanding.generating.replace('{{current}}', String(currentProductIndex)).replace('{{total}}', String(products.length))}`
                    : t.dialogs.bulkLanding.generated.replace('{{success}}', String(successCount)).replace('{{total}}', String(products.length))
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{displayCount} / {products.length} {t.dialogs.bulkLanding.processed}</span>
              <span className="font-medium text-primary">{Math.round(progressPercent)}%</span>
            </div>
          </div>

          {/* Products List */}
          <ScrollArea className="flex-1 max-h-[400px]">
            <div className="space-y-2 pr-2 sm:pr-4">
              {previews.map((preview) => (
                <div
                  key={preview.productId}
                  className={`p-2 sm:p-3 rounded-lg border transition-colors ${
                    preview.status === 'generating' ? 'bg-primary/5 border-primary/30' :
                    preview.status === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' :
                    preview.status === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' :
                    'bg-muted/30 border-border'
                  }`}
                >
                  {/* Row 1: Image + Title */}
                  <div className="flex items-center gap-2 mb-2">
                    {preview.imageUrl ? (
                      <img
                        src={preview.imageUrl}
                        alt={preview.productTitle}
                        className="w-10 h-10 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <p className="font-medium text-xs sm:text-sm line-clamp-2 flex-1">{preview.productTitle}</p>
                  </div>

                  {/* Row 2: Status + Actions */}
                  <div className="flex items-center gap-2 pl-12">
                    {preview.status === 'pending' && (
                      <Badge variant="outline" className="text-xs">{t.dialogs.bulkLanding.pending}</Badge>
                    )}
                    {preview.status === 'generating' && (
                      <Badge variant="outline" className="text-xs gap-1 bg-primary/10">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {t.dialogs.bulkLanding.generatingStatus}
                      </Badge>
                    )}
                    {preview.status === 'success' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(preview.landingHtml!, preview.productTitle)}
                          className="h-8 px-3 gap-1.5 bg-primary/10 hover:bg-primary/20 border-primary/30"
                        >
                          <Eye className="w-4 h-4 text-primary" />
                          <span className="text-xs text-primary font-medium">Voir</span>
                        </Button>
                        <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs gap-1">
                          <Check className="w-3 h-3" />
                          {t.dialogs.bulkLanding.generatedStatus}
                        </Badge>
                      </>
                    )}
                    {preview.status === 'error' && (
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs gap-1">
                          <X className="w-3 h-3" />
                          {t.dialogs.bulkLanding.errorStatus}
                        </Badge>
                        {preview.error && (
                          <p className="text-xs text-red-600 dark:text-red-400">{preview.error}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 w-full sm:w-auto">
              {isProcessing ? (
                <Button variant="outline" onClick={handleCancel} className="flex-1 sm:flex-none">
                  <X className="w-4 h-4 mr-2" />
                  {t.dialogs.bulkLanding.cancel}
                </Button>
              ) : (
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
                  {t.dialogs.bulkLanding.close}
                </Button>
              )}
            </div>

            {!isProcessing && successCount > 0 && (
              <Button
                onClick={handleSyncToShopify}
                disabled={syncingToShopify}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 w-full sm:w-auto"
              >
                {syncingToShopify ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {t.dialogs.bulkLanding.syncShopify} ({successCount})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle>{t.dialogs.bulkLanding.previewTitle.replace('{{title}}', previewProductTitle)}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg bg-white">
            <iframe
              srcDoc={previewHtml || ''}
              className="w-full h-[70vh]"
              title="Landing Preview"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewHtml(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
