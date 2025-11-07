import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Package,
  FileText,
  CreditCard,
  AlertCircle,
  Check,
  TrendingUp,
  Newspaper,
  FolderOpen,
  Image,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

type ImportPhase = "products" | "pages" | "complete";

interface ImportedItem {
  type: "product" | "page";
  title: string;
  image?: string;
  handle?: string;
}

interface ImportProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: ImportPhase;
  progress: {
    percentage: number;
    currentPage: number;
    totalPages: number;
    productsProcessed: number;
  };
  productsImported: number;
  pagesImported: number;
  articlesImported: number;
  collectionsImported: number;
  imagesImported: number;
  importedItems: ImportedItem[];
  limitReached: boolean;
  maxProducts: number;
  totalShopifyProducts?: number;
  onUpgrade?: () => void;
}

export function ImportProgressDialog({
  open,
  onOpenChange,
  phase,
  progress,
  productsImported,
  pagesImported,
  articlesImported,
  collectionsImported,
  imagesImported,
  importedItems,
  limitReached,
  maxProducts,
  totalShopifyProducts = 0,
  onUpgrade,
}: ImportProgressDialogProps) {
  const navigate = useNavigate();

  /** ----------------------------
   * 🎯  Animated counters
   -----------------------------*/
  const [displayed, setDisplayed] = useState({
    products: 0,
    pages: 0,
    articles: 0,
    collections: 0,
    images: 0,
    progress: 0,
  });

  const animateCounter = (key: keyof typeof displayed, target: number, step = 1, delay = 25) => {
    if (displayed[key] < target) {
      const timer = setTimeout(() => {
        setDisplayed((prev) => ({
          ...prev,
          [key]: Math.min(prev[key] + step, target),
        }));
      }, delay);
      return () => clearTimeout(timer);
    }
  };

  useEffect(() => {
    animateCounter("products", productsImported);
  }, [productsImported]);

  useEffect(() => {
    animateCounter("pages", pagesImported);
  }, [pagesImported]);

  useEffect(() => {
    animateCounter("articles", articlesImported);
  }, [articlesImported]);

  useEffect(() => {
    animateCounter("collections", collectionsImported);
  }, [collectionsImported]);

  useEffect(() => {
    animateCounter("images", imagesImported);
  }, [imagesImported]);

  /** ----------------------------
   * 📈 Overall progress
   -----------------------------*/
  const overallProgress = useMemo(() => {
    if (phase === "complete") return 100;
    if (phase === "products") {
      return Math.min((progress.currentPage / Math.max(progress.totalPages, 1)) * 50, 50);
    }
    return 50 + Math.min(((progress.currentPage || 0) / Math.max(progress.totalPages || 1, 1)) * 50, 50);
  }, [phase, progress]);

  // Smooth animated progress bar
  useEffect(() => {
    const timer = setTimeout(() => {
      if (displayed.progress < overallProgress) {
        setDisplayed((prev) => ({
          ...prev,
          progress: Math.min(prev.progress + 1, overallProgress),
        }));
      }
    }, 12);
    return () => clearTimeout(timer);
  }, [displayed.progress, overallProgress]);

  /** ----------------------------
   * 💰 Plan Recommendation
   -----------------------------*/
  const recommendedPlan = useMemo(() => {
    if (totalShopifyProducts <= 100) return { name: "Starter", limit: 100, planId: "starter" };
    if (totalShopifyProducts <= 1000) return { name: "Pro", limit: 1000, planId: "pro" };
    return { name: "Enterprise", limit: "Unlimited", planId: "enterprise" };
  }, [totalShopifyProducts]);

  const handleUpgrade = () => {
    if (onUpgrade) onUpgrade();
    else {
      navigate("/subscription");
      onOpenChange(false);
    }
  };

  /** ----------------------------
   * 🧠 Helper Texts
   -----------------------------*/
  const phaseTitle = limitReached
    ? "⚠️ Quota Reached"
    : phase === "products"
      ? "📦 Importing Products..."
      : phase === "pages"
        ? "📄 Importing Pages..."
        : "✅ Import Complete!";

  const phaseDescription = limitReached
    ? "You have reached your plan limit"
    : phase === "products"
      ? `Page ${progress.currentPage} of ${progress.totalPages} • ${progress.productsProcessed} products processed`
      : phase === "pages"
        ? "Importing Shopify pages..."
        : "All your products and pages have been successfully imported!";

  /** ----------------------------
   * 🎨 Render
   -----------------------------*/
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] sm:max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6 rounded-2xl border shadow-md">
        {/* HEADER */}
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
            {phase !== "complete" && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            {phaseTitle}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">{phaseDescription}</DialogDescription>
        </DialogHeader>

        {!limitReached ? (
          <>
            {/* PROGRESS BAR */}
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-xs sm:text-sm font-medium">
                <span>Overall Progress</span>
                <span className="text-primary font-semibold">{Math.round(displayed.progress)}%</span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary/40 shadow-inner">
                <div
                  className="absolute left-0 top-0 h-full transition-all duration-300"
                  style={{
                    width: `${displayed.progress}%`,
                    background: "linear-gradient(90deg,#1e40af 0%,#3b82f6 40%,#60a5fa 80%,#93c5fd 100%)",
                  }}
                />
              </div>
            </div>

            {/* COUNTERS */}
            <div className="grid grid-cols-5 gap-2 sm:gap-4 mt-4">
              {[
                { icon: Package, label: "Products", value: displayed.products },
                { icon: FileText, label: "Pages", value: displayed.pages },
                { icon: Newspaper, label: "Articles", value: displayed.articles },
                {
                  icon: FolderOpen,
                  label: "Collections",
                  value: displayed.collections,
                },
                { icon: Image, label: "Images", value: displayed.images },
              ].map(({ icon: Icon, label, value }) => (
                <Card key={label} className="border hover:border-primary/60 hover:shadow-md transition-all">
                  <CardContent className="flex flex-col items-center p-2 sm:p-4">
                    <Icon className="w-5 h-5 text-primary mb-1 animate-pulse" />
                    <span className="text-lg sm:text-2xl font-bold text-primary">{value}</span>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* IMPORTED ITEMS LIST */}
            {importedItems.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Check className="w-4 h-4 text-green-500" />
                  Imported Items ({importedItems.length})
                </h4>
                <ScrollArea className="h-[160px] sm:h-[280px] border rounded-lg bg-muted/5">
                  <div className="p-2 space-y-1">
                    {importedItems
                      .slice()
                      .reverse()
                      .map((item, index) => (
                        <div
                          key={`${item.type}-${item.handle || index}`}
                          className="flex items-center gap-2 p-2 bg-background border rounded-lg hover:shadow-sm transition-all duration-150"
                          style={{ animationDelay: `${index * 40}ms` }}
                        >
                          {item.type === "product" && item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded object-cover ring-1 ring-primary/20"
                            />
                          ) : (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <span className="text-xs sm:text-sm flex-1 truncate">{item.title}</span>
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* SUCCESS MESSAGE */}
            {phase === "complete" && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3 animate-fade-in">
                <div className="bg-green-500 w-8 h-8 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Import completed successfully!</p>
                  <p className="text-xs text-green-700">
                    {displayed.products} products, {displayed.pages} pages,
                    {displayed.articles} articles, {displayed.collections} collections, {displayed.images} images
                    imported
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          /** ----------------------------
           * 🚫 LIMIT REACHED STATE
           -----------------------------*/
          <div className="space-y-4 mt-4 text-center animate-fade-in">
            <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>

            <h3 className="text-xl font-bold">Quota Reached!</h3>
            <p className="text-sm text-muted-foreground">You’ve reached your plan limit of {maxProducts} products.</p>

            {totalShopifyProducts > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-orange-700">
                  Your Shopify store has {totalShopifyProducts.toLocaleString()} products.
                </p>
                <p className="text-xs text-muted-foreground">
                  Only {productsImported} imported • {totalShopifyProducts - productsImported} remaining
                </p>
              </div>
            )}

            <Alert className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/40 text-left">
              <AlertTitle className="font-bold text-base">Recommended: {recommendedPlan.name} Plan</AlertTitle>
              <AlertDescription className="text-sm">
                Upgrade to import all products and unlock full automation.
              </AlertDescription>
              <div className="mt-2 p-2 bg-background/50 rounded-lg border">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm">{recommendedPlan.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {typeof recommendedPlan.limit === "number"
                      ? `${recommendedPlan.limit.toLocaleString()}`
                      : recommendedPlan.limit}
                  </Badge>
                </div>
              </div>
            </Alert>

            <Button onClick={handleUpgrade} className="w-full text-sm sm:text-base">
              <CreditCard className="w-4 h-4 mr-2" />
              Upgrade to {recommendedPlan.name} Plan
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
