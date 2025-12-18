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
import { CheckCircle, XCircle, Loader2, Upload, X, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncProduct {
  id: string;
  title: string;
  image_url: string | null;
  shopify_id: number | null;
  seo_title: string | null;
  seo_description: string | null;
}

interface SyncStatus {
  productId: string;
  status: "pending" | "syncing" | "success" | "error";
  error?: string;
}

interface SyncProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: SyncProduct[];
  onSync: (product: SyncProduct) => Promise<void>;
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
      abortRef.current = false;
    }
  }, [open, products]);

  // Start sync automatically when dialog opens
  useEffect(() => {
    if (open && products.length > 0 && !isSyncing && !isComplete) {
      startSync();
    }
  }, [open, products.length]);

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
        await onSync(product);

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
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Synchronisation vers Shopify
          </DialogTitle>
          <DialogDescription>
            {isComplete
              ? `Synchronisation terminée : ${successCount} succès, ${errorCount} erreur(s)`
              : `Synchronisation en cours... ${successCount + errorCount}/${products.length} produits`}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {successCount + errorCount} / {products.length} produits
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Stats badges */}
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

        {/* Products list with scroll */}
        <ScrollArea className="flex-1 max-h-[400px] border rounded-lg">
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
                    status?.status === "pending" && "opacity-50"
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
                      {product.seo_title || "Pas de titre SEO"}
                    </p>
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
          {isSyncing && (
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          )}
          {isComplete && (
            <Button onClick={handleClose}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Fermer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
