import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Loader2, Upload, X, Package, Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SyncProduct {
  id: string;
  title: string;
  image_url: string | null;
  shopify_id: number | null;
  seo_title: string | null;
  seo_description: string | null;
  body_html?: string | null;
  landing_page?: string | null;
  landing_page_html?: string | null;
  vendor?: string | null;
  tags?: string | null;
}

interface SyncStatus {
  productId: string;
  status: "pending" | "syncing" | "success" | "error";
  error?: string;
}

interface SyncOptions {
  syncSeoTitle: boolean;
  syncSeoDescription: boolean;
  syncBodyHtml: boolean;
  syncVendor: boolean;
  syncTags: boolean;
  syncGoogleShopping: boolean;
}

interface SyncProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: SyncProduct[];
  onSync: (product: SyncProduct, options: SyncOptions) => Promise<void>;
  onComplete: () => void;
}

export function SyncProgressDialog({
  open,
  onOpenChange,
  products,
  onSync,
  onComplete,
}: SyncProgressDialogProps) {
  const [syncStatuses, setSyncStatuses] = useState<Map<string, SyncStatus>>(new Map());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [syncOptions, setSyncOptions] = useState<SyncOptions>({
    syncSeoTitle: true,
    syncSeoDescription: true,
    syncBodyHtml: true,
    syncVendor: true,
    syncTags: true,
    syncGoogleShopping: true,
  });
  const abortRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize statuses when products change
  useEffect(() => {
    if (open && products.length > 0) {
      const initialStatuses = new Map<string, SyncStatus>();
      products.forEach((product) => {
        initialStatuses.set(product.id, {
          productId: product.id,
          status: "pending",
        });
      });
      setSyncStatuses(initialStatuses);
      setIsSyncing(false);
      setIsComplete(false);
      setCurrentIndex(0);
      setHasStarted(false);
      abortRef.current = false;
    }
  }, [open, products]);

  // Auto-scroll to current syncing product
  useEffect(() => {
    if (scrollRef.current && currentIndex > 0) {
      const element = scrollRef.current.querySelector(`[data-index="${currentIndex}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentIndex]);

  const startSync = async () => {
    setIsSyncing(true);
    setHasStarted(true);
    abortRef.current = false;

    for (let i = 0; i < products.length; i++) {
      if (abortRef.current) break;

      const product = products[i];
      setCurrentIndex(i);

      // Update status to syncing
      setSyncStatuses((prev) => {
        const newMap = new Map(prev);
        newMap.set(product.id, { productId: product.id, status: "syncing" });
        return newMap;
      });

      try {
        await onSync(product, syncOptions);

        // Update status to success
        setSyncStatuses((prev) => {
          const newMap = new Map(prev);
          newMap.set(product.id, { productId: product.id, status: "success" });
          return newMap;
        });
      } catch (error) {
        // Update status to error
        setSyncStatuses((prev) => {
          const newMap = new Map(prev);
          newMap.set(product.id, {
            productId: product.id,
            status: "error",
            error: error instanceof Error ? error.message : "Erreur inconnue",
          });
          return newMap;
        });
      }

      // Small delay between syncs
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    setIsSyncing(false);
    setIsComplete(true);
  };

  const handleCancel = () => {
    abortRef.current = true;
    setIsSyncing(false);
  };

  const handleClose = () => {
    if (isComplete) {
      onComplete();
    }
    onOpenChange(false);
  };

  const successCount = Array.from(syncStatuses.values()).filter((s) => s.status === "success").length;
  const errorCount = Array.from(syncStatuses.values()).filter((s) => s.status === "error").length;
  const progress = products.length > 0 ? ((successCount + errorCount) / products.length) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Synchronisation vers Shopify / Sync to Shopify
          </DialogTitle>
          <DialogDescription>
            {isComplete
              ? `Terminé : ${successCount} succès, ${errorCount} erreur(s) / Complete: ${successCount} success, ${errorCount} error(s)`
              : hasStarted
                ? `En cours... ${successCount + errorCount}/${products.length} produits / Syncing... ${successCount + errorCount}/${products.length} products`
                : `${products.length} produits à synchroniser / ${products.length} products to sync`}
          </DialogDescription>
        </DialogHeader>

        {/* Options section - only before starting */}
        {!hasStarted && (
          <Collapsible open={showOptions} onOpenChange={setShowOptions}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Options d'export / Export options
                </span>
                {showOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="syncSeoTitle"
                    checked={syncOptions.syncSeoTitle}
                    onCheckedChange={(checked) =>
                      setSyncOptions((prev) => ({ ...prev, syncSeoTitle: checked === true }))
                    }
                  />
                  <Label htmlFor="syncSeoTitle" className="text-sm">Titre SEO / SEO Title</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="syncSeoDescription"
                    checked={syncOptions.syncSeoDescription}
                    onCheckedChange={(checked) =>
                      setSyncOptions((prev) => ({ ...prev, syncSeoDescription: checked === true }))
                    }
                  />
                  <Label htmlFor="syncSeoDescription" className="text-sm">Description SEO</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="syncBodyHtml"
                    checked={syncOptions.syncBodyHtml}
                    onCheckedChange={(checked) =>
                      setSyncOptions((prev) => ({ ...prev, syncBodyHtml: checked === true }))
                    }
                  />
                  <Label htmlFor="syncBodyHtml" className="text-sm">Landing Page / Contenu</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="syncVendor"
                    checked={syncOptions.syncVendor}
                    onCheckedChange={(checked) =>
                      setSyncOptions((prev) => ({ ...prev, syncVendor: checked === true }))
                    }
                  />
                  <Label htmlFor="syncVendor" className="text-sm">Vendor / Marque</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="syncTags"
                    checked={syncOptions.syncTags}
                    onCheckedChange={(checked) =>
                      setSyncOptions((prev) => ({ ...prev, syncTags: checked === true }))
                    }
                  />
                  <Label htmlFor="syncTags" className="text-sm">Tags</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="syncGoogleShopping"
                    checked={syncOptions.syncGoogleShopping}
                    onCheckedChange={(checked) =>
                      setSyncOptions((prev) => ({ ...prev, syncGoogleShopping: checked === true }))
                    }
                  />
                  <Label htmlFor="syncGoogleShopping" className="text-sm">Google Shopping</Label>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Progress bar */}
        {hasStarted && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {successCount + errorCount} / {products.length} produits
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        )}

        {/* Stats badges */}
        {hasStarted && (
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle className="h-3 w-3 mr-1" />
              {successCount} succès
            </Badge>
            {errorCount > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                <XCircle className="h-3 w-3 mr-1" />
                {errorCount} erreur(s)
              </Badge>
            )}
          </div>
        )}

        {/* Products list with scroll */}
        <ScrollArea className="flex-1 max-h-[350px] border rounded-lg">
          <div ref={scrollRef} className="p-2 space-y-2">
            {products.map((product, index) => {
              const status = syncStatuses.get(product.id);
              const isCurrent = index === currentIndex && isSyncing;

              return (
                <div
                  key={product.id}
                  data-index={index}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    isCurrent && "bg-primary/10 border-primary/30 ring-2 ring-primary/20",
                    status?.status === "success" && "bg-green-500/5 border-green-500/20",
                    status?.status === "error" && "bg-red-500/5 border-red-500/20",
                    status?.status === "pending" && !hasStarted && "opacity-70",
                    status?.status === "pending" && hasStarted && "opacity-50"
                  )}
                >
                  {/* Product image */}
                  <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {product.seo_title || product.vendor || "Pas de titre SEO"}
                    </p>
                    {product.landing_page_html && (
                      <Badge variant="secondary" className="text-xs mt-1">Landing Page</Badge>
                    )}
                  </div>

                  {/* Status indicator */}
                  <div className="flex-shrink-0">
                    {status?.status === "pending" && (
                      <div className="h-5 w-5 rounded-full border-2 border-muted" />
                    )}
                    {status?.status === "syncing" && (
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    )}
                    {status?.status === "success" && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {status?.status === "error" && (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {!hasStarted && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Annuler / Cancel
              </Button>
              <Button onClick={startSync} className="gap-2">
                <Upload className="h-4 w-4" />
                Démarrer la sync / Start Sync
              </Button>
            </>
          )}
          {isSyncing && (
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Annuler / Cancel
            </Button>
          )}
          {isComplete && (
            <Button onClick={handleClose}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Fermer / Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
