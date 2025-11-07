import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, FileText, CreditCard, AlertCircle, Check, TrendingUp, Newspaper, FolderOpen, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

type ImportPhase = 'products' | 'pages' | 'complete';

interface ImportedItem {
  type: 'product' | 'page';
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
  
  // Animated counters
  const [displayedProducts, setDisplayedProducts] = useState(0);
  const [displayedPages, setDisplayedPages] = useState(0);
  const [displayedArticles, setDisplayedArticles] = useState(0);
  const [displayedCollections, setDisplayedCollections] = useState(0);
  const [displayedImages, setDisplayedImages] = useState(0);
  const [displayedProgress, setDisplayedProgress] = useState(0);

  // Calculate recommended plan based on total products
  const getRecommendedPlan = () => {
    if (totalShopifyProducts <= 100) return { name: 'Starter', limit: 100, planId: 'starter' };
    if (totalShopifyProducts <= 1000) return { name: 'Pro', limit: 1000, planId: 'pro' };
    return { name: 'Enterprise', limit: 'Unlimited', planId: 'enterprise' };
  };

  const recommendedPlan = getRecommendedPlan();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate("/subscription");
      onOpenChange(false);
    }
  };

  // Calculate smooth overall progress (0-100%)
  const overallProgress = phase === 'products' 
    ? Math.min(progress.percentage * 0.5, 50) // Products: 0-50%
    : phase === 'pages' 
    ? 50 + Math.min((progress.percentage || 50) * 0.5, 50) // Pages: 50-100%
    : 100; // Complete: 100%

  // Animate progress bar
  useEffect(() => {
    const timer = setTimeout(() => {
      if (displayedProgress < overallProgress) {
        setDisplayedProgress(prev => Math.min(prev + 1, overallProgress));
      }
    }, 15);
    return () => clearTimeout(timer);
  }, [displayedProgress, overallProgress]);

  // Animate product counter
  useEffect(() => {
    if (displayedProducts < productsImported) {
      const timer = setTimeout(() => {
        setDisplayedProducts(prev => Math.min(prev + 1, productsImported));
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [displayedProducts, productsImported]);

  // Animate pages counter
  useEffect(() => {
    if (displayedPages < pagesImported) {
      const timer = setTimeout(() => {
        setDisplayedPages(prev => Math.min(prev + 1, pagesImported));
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [displayedPages, pagesImported]);

  // Animate articles counter
  useEffect(() => {
    if (displayedArticles < articlesImported) {
      const timer = setTimeout(() => {
        setDisplayedArticles(prev => Math.min(prev + 1, articlesImported));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [displayedArticles, articlesImported]);

  // Animate collections counter
  useEffect(() => {
    if (displayedCollections < collectionsImported) {
      const timer = setTimeout(() => {
        setDisplayedCollections(prev => Math.min(prev + 1, collectionsImported));
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [displayedCollections, collectionsImported]);

  // Animate images counter
  useEffect(() => {
    if (displayedImages < imagesImported) {
      const timer = setTimeout(() => {
        setDisplayedImages(prev => Math.min(prev + 1, imagesImported));
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [displayedImages, imagesImported]);

  const getPhaseTitle = () => {
    if (limitReached) return "⚠️ Quota Reached";
    if (phase === 'products') return "📦 Importing Products...";
    if (phase === 'pages') return "📄 Importing Pages...";
    if (phase === 'complete') return "✅ Import Complete!";
    return "Importing...";
  };

  const getPhaseDescription = () => {
    if (limitReached) return "You have reached your plan limit";
    if (phase === 'products') return `Page ${progress.currentPage} of ${progress.totalPages} • ${progress.productsProcessed} products processed`;
    if (phase === 'pages') return "Importing Shopify pages...";
    if (phase === 'complete') return "All your products and pages have been successfully imported!";
    return "Import in progress...";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col animate-scale-in">
        <DialogHeader className="flex-shrink-0 pb-2 sm:pb-0">
          <DialogTitle className="text-base sm:text-xl flex items-center gap-2 pr-6">
            {phase !== 'complete' && <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-primary" />}
            <span className="truncate">{getPhaseTitle()}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm truncate pr-6">
            {getPhaseDescription()}
          </DialogDescription>
        </DialogHeader>

        {!limitReached ? (
          <div className="space-y-3 sm:space-y-4 flex-1 min-h-0 flex flex-col">
            {/* Progress bar with animation */}
            <div className="flex-shrink-0 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground font-medium">Overall Progress</span>
                <span className="font-bold text-lg text-primary tabular-nums animate-pulse">
                  {Math.round(displayedProgress)}%
                </span>
              </div>
              <div className="relative h-3 sm:h-4 w-full overflow-hidden rounded-full bg-secondary/50 shadow-inner">
                <div 
                  className="h-full transition-all duration-300 ease-out relative overflow-hidden"
                  style={{ 
                    width: `${displayedProgress}%`,
                    background: 'linear-gradient(90deg, #1e40af 0%, #3b82f6 30%, #60a5fa 50%, #93c5fd 70%, #dbeafe 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 3s infinite'
                  }}
                >
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite'
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
                <span>Page {progress.currentPage} / {progress.totalPages}</span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {progress.productsProcessed} products processed
                </span>
              </div>
            </div>
            
            {/* Animated counters */}
            <div className="flex-shrink-0 grid grid-cols-5 gap-1.5 sm:gap-4">
              <Card className="border hover:border-primary/50 transition-all duration-300 hover:shadow-md">
                <CardContent className="pt-2 sm:pt-4 pb-2 sm:pb-4 px-2 sm:px-6">
                  <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-pulse" />
                    <span className="text-xl sm:text-3xl font-bold text-primary tabular-nums">
                      {displayedProducts}
                    </span>
                    <p className="text-[9px] sm:text-xs text-muted-foreground font-medium">Products</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border hover:border-primary/50 transition-all duration-300 hover:shadow-md">
                <CardContent className="pt-2 sm:pt-4 pb-2 sm:pb-4 px-2 sm:px-6">
                  <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-pulse" />
                    <span className="text-xl sm:text-3xl font-bold text-primary tabular-nums">
                      {displayedPages}
                    </span>
                    <p className="text-[9px] sm:text-xs text-muted-foreground font-medium">Pages</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border hover:border-primary/50 transition-all duration-300 hover:shadow-md">
                <CardContent className="pt-2 sm:pt-4 pb-2 sm:pb-4 px-2 sm:px-6">
                  <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                    <Newspaper className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-pulse" />
                    <span className="text-xl sm:text-3xl font-bold text-primary tabular-nums">
                      {displayedArticles}
                    </span>
                    <p className="text-[9px] sm:text-xs text-muted-foreground font-medium">Articles</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border hover:border-primary/50 transition-all duration-300 hover:shadow-md">
                <CardContent className="pt-2 sm:pt-4 pb-2 sm:pb-4 px-2 sm:px-6">
                  <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                    <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-pulse" />
                    <span className="text-xl sm:text-3xl font-bold text-primary tabular-nums">
                      {displayedCollections}
                    </span>
                    <p className="text-[9px] sm:text-xs text-muted-foreground font-medium">Collections</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border hover:border-primary/50 transition-all duration-300 hover:shadow-md">
                <CardContent className="pt-2 sm:pt-4 pb-2 sm:pb-4 px-2 sm:px-6">
                  <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                    <Image className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-pulse" />
                    <span className="text-xl sm:text-3xl font-bold text-primary tabular-nums">
                      {displayedImages}
                    </span>
                    <p className="text-[9px] sm:text-xs text-muted-foreground font-medium">Images</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* List of imported items with animation */}
            {importedItems.length > 0 && (
              <div className="flex-1 min-h-0 animate-fade-in">
                <h4 className="text-xs sm:text-sm font-semibold mb-2 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Imported Items ({importedItems.length})
                </h4>
                <ScrollArea className="h-[180px] sm:h-[300px] border rounded-lg shadow-inner bg-muted/5">
                  <div className="p-1.5 sm:p-2 space-y-1.5 sm:space-y-2">
                    {importedItems.slice().reverse().map((item, index) => (
                      <div 
                        key={`${item.type}-${item.handle || index}`}
                        className="flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2 bg-background border rounded-lg hover:shadow-md transition-all duration-200 animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {item.type === 'product' && item.image && (
                          <img 
                            src={item.image} 
                            alt={item.title}
                            className="w-7 h-7 sm:w-12 sm:h-12 rounded object-cover flex-shrink-0 ring-1 sm:ring-2 ring-primary/20" 
                          />
                        )}
                        {item.type === 'page' && (
                          <div className="w-7 h-7 sm:w-12 sm:h-12 rounded bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 ring-1 sm:ring-2 ring-primary/20">
                            <FileText className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-primary" />
                          </div>
                        )}
                        <span className="text-[11px] sm:text-sm flex-1 truncate font-medium">{item.title}</span>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-600 font-bold" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Improved loading animation */}
            {phase !== 'complete' && (
              <div className="flex justify-center items-center gap-2 flex-shrink-0 py-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-primary animate-bounce shadow-lg" />
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-primary animate-bounce shadow-lg" style={{ animationDelay: '0.15s' }} />
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-primary animate-bounce shadow-lg" style={{ animationDelay: '0.3s' }} />
              </div>
            )}

            {/* Final success message */}
            {phase === 'complete' && (
              <div className="flex-shrink-0 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-lg animate-scale-in">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500 flex items-center justify-center animate-bounce flex-shrink-0">
                    <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-green-900 dark:text-green-100">
                      Import completed successfully!
                    </p>
                    <p className="text-[10px] sm:text-xs text-green-700 dark:text-green-300 truncate">
                      {displayedProducts} products, {displayedPages} pages, {displayedArticles} articles, {displayedCollections} collections, {displayedImages} images imported
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6 animate-scale-in">
            {/* Quota reached message with total products info */}
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-orange-100 dark:bg-orange-900/20 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500" />
              </div>
              <h3 className="text-lg sm:text-2xl font-bold mb-2">Quota Reached!</h3>
              
              {totalShopifyProducts > 0 ? (
                <>
                  <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg">
                    <p className="text-sm sm:text-base font-semibold text-foreground mb-2">
                      Your Shopify store has{" "}
                      <span className="text-xl sm:text-2xl text-orange-600 dark:text-orange-400 font-bold">
                        {totalShopifyProducts} products
                      </span>
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      But your current plan only allows{" "}
                      <span className="font-semibold text-foreground">{maxProducts} products</span>
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                    Only the first {productsImported} products have been imported.
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-orange-600 dark:text-orange-400">
                    {totalShopifyProducts - productsImported} products remaining to import
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                    You have reached the limit of {maxProducts} products in your plan.
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
                    The first {productsImported} products have been imported successfully.
                  </p>
                </>
              )}
            </div>

            <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">
                {productsImported} / {totalShopifyProducts || maxProducts}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Products imported
              </div>
            </div>

            <Alert className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary">
              <Package className="h-4 w-4" />
              <AlertTitle className="text-sm sm:text-base font-bold">
                Recommended: {recommendedPlan.name} Plan
              </AlertTitle>
              <AlertDescription>
                <p className="mt-2 mb-3 text-xs sm:text-sm">
                  To import all {totalShopifyProducts > 0 ? totalShopifyProducts : 'your'} products, upgrade to:
                </p>
                <div className="p-3 bg-background/50 rounded-lg border-2 border-primary/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-base">{recommendedPlan.name}</span>
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      {typeof recommendedPlan.limit === 'number' 
                        ? `${recommendedPlan.limit.toLocaleString()} products` 
                        : recommendedPlan.limit}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Perfect for your {totalShopifyProducts > 0 ? totalShopifyProducts.toLocaleString() : ''} products
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  <p>All plans include:</p>
                  <ul className="mt-1 space-y-1">
                    <li>✅ SEO optimization tools</li>
                    <li>✅ Automated product sync</li>
                    <li>✅ Priority support</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleUpgrade}
              className="w-full animate-pulse"
              size="lg"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Upgrade to {recommendedPlan.name} Plan
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
