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
  const [isCancelled, setIsCancelled] = useState(false);
  const [syncingToShopify, setSyncingToShopify] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewProductTitle, setPreviewProductTitle] = useState<string>('');
  const generationStartedRef = useRef(false);

  // Initialize previews when dialog opens
  useEffect(() => {
    if (open && products.length > 0 && !generationStartedRef.current) {
      generationStartedRef.current = true;
      setPreviews(products.map(p => ({
        productId: p.id,
        productTitle: p.title,
        imageUrl: p.image_url,
        status: 'pending',
      })));
      setIsCancelled(false);
      startGeneration();
    }
    
    // Reset ref when dialog closes
    if (!open) {
      generationStartedRef.current = false;
    }
  }, [open, products]);

  const startGeneration = async () => {
    setIsProcessing(true);

    for (let i = 0; i < products.length; i++) {
      if (isCancelled) break;

      // Add shorter delay between requests for bulk function (2 seconds)
      if (i > 0) {
        await delay(2000);
      }

      const product = products[i];
      
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

        // Generate landing page with BULK function (faster, lighter)
        const productTitle = productData.seo_title || productData.title;
        const result = await callWithRetry<{ html: string }>(
          () => supabase.functions.invoke('generate-landing-bulk', {
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: {
              product_id: product.id,
              productTitle: productTitle,
              productDescription: productData.seo_description || productData.body_html,
              productImages: images.slice(0, 4), // Max 4 for bulk
              vendor: productData.vendor,
              designStyle: config.designStyle,
              colorScheme: config.colorScheme,
              theme: config.theme,
              language: 'fr',
            },
          }),
          3, // 3 retries
          5000 // 5s base delay (faster for bulk)
        );

        // Save to database
        const { error: updateError } = await supabase
          .from('shopify_products')
          .update({
            landing_page_html: result.html,
            has_landing_page: true,
            last_landing_generation_at: new Date().toISOString(),
          })
          .eq('id', product.id);

        if (updateError) throw updateError;

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
        setPreviews(prev => prev.map(p => 
          p.productId === product.id 
            ? { ...p, status: 'error', error: errorMessage } 
            : p
        ));
      }
    }

    setIsProcessing(false);
    
    const successCount = previews.filter(p => p.status === 'success').length;
    if (successCount > 0) {
      toast.success(`${successCount} landing page(s) générée(s) avec succès`);
    }
  };

  const handleCancel = () => {
    setIsCancelled(true);
    toast.info('Génération annulée');
  };

  const handleSyncToShopify = async () => {
    const successfulIds = previews.filter(p => p.status === 'success').map(p => p.productId);
    if (successfulIds.length === 0) {
      toast.error('Aucune landing page à synchroniser');
      return;
    }

    setSyncingToShopify(true);
    const toastId = toast.loading(`Synchronisation de ${successfulIds.length} produit(s) vers Shopify...`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session non trouvée');

      const { data, error } = await supabase.functions.invoke('sync-seo-to-shopify', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          storeId: storeId,
          productIds: successfulIds,
          syncType: 'landing',
        },
      });

      if (error) throw error;

      toast.success(`${data.successCount || successfulIds.length} produit(s) synchronisé(s) avec Shopify`, { id: toastId });
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erreur lors de la synchronisation', { id: toastId });
    } finally {
      setSyncingToShopify(false);
    }
  };

  const handlePreview = (html: string, title: string) => {
    setPreviewHtml(html);
    setPreviewProductTitle(title);
  };

  const completedCount = previews.filter(p => p.status === 'success' || p.status === 'error').length;
  const successCount = previews.filter(p => p.status === 'success').length;
  const progressPercent = products.length > 0 ? (completedCount / products.length) * 100 : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !isProcessing && onOpenChange(val)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle>Génération Bulk de Landing Pages</DialogTitle>
                <DialogDescription>
                  {isProcessing 
                    ? `Génération en cours... ${completedCount}/${products.length}`
                    : `${successCount} landing page(s) générée(s) sur ${products.length}`
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{completedCount} / {products.length} traités</span>
              <span className="font-medium text-primary">{Math.round(progressPercent)}%</span>
            </div>
          </div>

          {/* Products List */}
          <ScrollArea className="flex-1 max-h-[400px]">
            <div className="space-y-2 pr-4">
              {previews.map((preview) => (
                <div
                  key={preview.productId}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    preview.status === 'generating' ? 'bg-primary/5 border-primary/30' :
                    preview.status === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' :
                    preview.status === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' :
                    'bg-muted/30 border-border'
                  }`}
                >
                  {/* Image */}
                  {preview.imageUrl ? (
                    <img
                      src={preview.imageUrl}
                      alt={preview.productTitle}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{preview.productTitle}</p>
                    {preview.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 truncate">{preview.error}</p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {preview.status === 'pending' && (
                      <Badge variant="outline" className="text-xs">En attente</Badge>
                    )}
                    {preview.status === 'generating' && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Génération...
                      </Badge>
                    )}
                    {preview.status === 'success' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(preview.landingHtml!, preview.productTitle)}
                          className="h-7 px-2"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs gap-1">
                          <Check className="w-3 h-3" />
                          Généré
                        </Badge>
                      </>
                    )}
                    {preview.status === 'error' && (
                      <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs gap-1">
                        <X className="w-3 h-3" />
                        Erreur
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-row justify-between gap-2 sm:gap-0">
            <div className="flex gap-2">
              {isProcessing ? (
                <Button variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              ) : (
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fermer
                </Button>
              )}
            </div>

            {!isProcessing && successCount > 0 && (
              <Button
                onClick={handleSyncToShopify}
                disabled={syncingToShopify}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {syncingToShopify ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Sync Shopify ({successCount})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Aperçu: {previewProductTitle}</DialogTitle>
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
