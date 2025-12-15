import { useState, useRef } from 'react';
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
        body: { productId, language },
      });
      if (!error && data?.success && data?.optimizedTitle) {
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

    // Update status to generating
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, status: 'generating' } : item
    ));

    try {
      // Step 1: Resolve vendor
      const vendor = await resolveVendor(product);

      // Step 2: Get optimized title (if enabled)
      const optimizedTitle = await getOptimizedTitle(product.id);

      // Step 3: Generate landing page
      const { data, error } = await supabase.functions.invoke("generate-smart-landing", {
        body: {
          productTitle: product.title,
          optimizedTitle: optimizedTitle,
          vendor: vendor,
          imageUrl: product.image_url,
          description: product.body_html,
          highlights: config.customHighlights,
          language: language,
          theme: config.theme,
          designStyle: config.designStyle,
        },
      });

      if (error) throw new Error(error.message || "Erreur de génération");
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
        i === index ? { ...item, status: 'success', optimizedTitle: optimizedTitle || undefined } : item
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

  // Start on open
  useState(() => {
    if (open && products.length > 0 && !startedRef.current) {
      startProcessing();
    }
  });

  const progress = products.length > 0 ? Math.round((processedCount / products.length) * 100) : 0;
  const successCount = items.filter(i => i.status === 'success').length;
  const errorCount = items.filter(i => i.status === 'error').length;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Smart Bulk Landing
            </DialogTitle>
            <DialogDescription>
              Génération rapide avec Smart Title, Brand & Highlights
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{processedCount} / {products.length} produits</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <Badge variant="outline" className="gap-1">
                <Check className="w-3 h-3 text-green-500" />
                {successCount} succès
              </Badge>
              {errorCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <X className="w-3 h-3 text-red-500" />
                  {errorCount} erreurs
                </Badge>
              )}
              {isProcessing && (
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  En cours...
                </Badge>
              )}
            </div>

            {/* Product list */}
            <ScrollArea className="h-[300px] border rounded-lg p-2">
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={item.productId}
                    className={`flex items-center justify-between p-2 rounded-lg border ${
                      item.status === 'generating' ? 'bg-primary/5 border-primary/30' :
                      item.status === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-950/20' :
                      item.status === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-950/20' :
                      'bg-muted/30'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.productTitle}</p>
                      {item.optimizedTitle && (
                        <p className="text-xs text-primary truncate flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {item.optimizedTitle}
                        </p>
                      )}
                      {item.error && (
                        <p className="text-xs text-red-500 truncate">{item.error}</p>
                      )}
                    </div>
                    <div className="ml-2">
                      {item.status === 'pending' && (
                        <div className="w-5 h-5 rounded-full bg-muted" />
                      )}
                      {item.status === 'generating' && (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      )}
                      {item.status === 'success' && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                      {item.status === 'error' && (
                        <X className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            {isProcessing ? (
              <Button variant="destructive" onClick={handleCancel}>
                Annuler
              </Button>
            ) : (
              <Button onClick={handleClose}>
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
