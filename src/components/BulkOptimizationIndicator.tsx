import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Maximize2, X, Package, Tag, Image, FileText, Layers, ShoppingBag } from 'lucide-react';
import { useOptimization } from '@/contexts/OptimizationContext';
import { useTranslation } from '@/lib/language';

export function BulkOptimizationIndicator() {
  const { state, toggleDialog, cancelOptimization } = useOptimization();
  const { t } = useTranslation();

  if (!state.isRunning && !state.type) {
    return null;
  }

  const percentage = state.total > 0 ? Math.round((state.current / state.total) * 100) : 0;
  const isComplete = state.current === state.total && state.total > 0;

  const getIcon = () => {
    switch (state.type) {
      case 'products':
        return <Package className="w-4 h-4" />;
      case 'collections':
        return <Layers className="w-4 h-4" />;
      case 'tags':
        return <Tag className="w-4 h-4" />;
      case 'alt':
        return <Image className="w-4 h-4" />;
      case 'pages':
        return <FileText className="w-4 h-4" />;
      case 'articles':
        return <ShoppingBag className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4 animate-sparkle" />;
    }
  };

  const getTitle = () => {
    const operationText = state.operation === 'syncing' ? 'Synchronisation' : 'Optimisation';
    const typeText = {
      products: 'produits',
      collections: 'collections',
      tags: 'tags',
      alt: 'images',
      pages: 'pages',
      articles: 'articles',
    }[state.type || 'products'];

    if (isComplete) {
      return `✓ ${operationText} ${typeText} terminée`;
    }

    return `${operationText} ${typeText} en cours...`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 animate-in slide-in-from-bottom-4">
      <Card className="p-4 shadow-lg border-2 border-primary/20 bg-background/95 backdrop-blur">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {state.isRunning && !isComplete ? (
                <Sparkles className="w-5 h-5 animate-sparkle text-primary" />
              ) : (
                getIcon()
              )}
              <span className="font-medium text-sm">{getTitle()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleDialog}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              {state.isRunning && !state.cancelRequested && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={cancelOptimization}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <Progress value={percentage} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {state.current} / {state.total}
              </span>
              <span className="font-bold text-primary">{percentage}%</span>
            </div>
          </div>

          {/* Cancel status */}
          {state.cancelRequested && (
            <p className="text-xs text-orange-600 dark:text-orange-400 animate-pulse">
              Annulation en cours...
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
