import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Maximize2, X, Package, Tag, Image, FileText, Layers, ShoppingBag } from 'lucide-react';
import { useOptimization, OptimizationType, OperationState } from '@/contexts/OptimizationContext';
import { useTranslation } from '@/lib/language';

interface OperationCardProps {
  type: OptimizationType;
  operation: OperationState;
  onMaximize: () => void;
  onCancel: () => void;
}

function OperationCard({ type, operation, onMaximize, onCancel }: OperationCardProps) {
  const percentage = operation.total > 0 ? Math.round((operation.current / operation.total) * 100) : 0;
  const isComplete = operation.current === operation.total && operation.total > 0;

  const getIcon = () => {
    switch (type) {
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
    const operationText = operation.operation === 'syncing' ? 'Sync' : 'Optim';
    const typeText = {
      products: 'Produits',
      collections: 'Collections',
      tags: 'Tags',
      alt: 'Images',
      pages: 'Pages',
      articles: 'Articles',
    }[type];

    if (isComplete) {
      return `✓ ${typeText}`;
    }

    return `${operationText} ${typeText}`;
  };

  const getBorderColor = () => {
    switch (type) {
      case 'products':
        return 'border-blue-500/30';
      case 'collections':
        return 'border-purple-500/30';
      case 'tags':
        return 'border-green-500/30';
      case 'alt':
        return 'border-orange-500/30';
      case 'pages':
        return 'border-cyan-500/30';
      case 'articles':
        return 'border-pink-500/30';
      default:
        return 'border-primary/20';
    }
  };

  return (
    <Card className={`p-3 shadow-lg border-2 ${getBorderColor()} bg-background/95 backdrop-blur`}>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {operation.isRunning && !isComplete ? (
              <Sparkles className="w-4 h-4 animate-sparkle text-primary" />
            ) : (
              getIcon()
            )}
            <span className="font-medium text-xs">{getTitle()}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onMaximize}
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
            {operation.isRunning && !operation.cancelRequested && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={onCancel}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <Progress value={percentage} className="h-1.5" />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              {operation.current}/{operation.total}
            </span>
            <span className="font-bold text-primary">{percentage}%</span>
          </div>
        </div>

        {/* Cancel status */}
        {operation.cancelRequested && (
          <p className="text-[10px] text-orange-600 dark:text-orange-400 animate-pulse">
            Annulation...
          </p>
        )}
      </div>
    </Card>
  );
}

export function BulkOptimizationIndicator() {
  const { state, toggleDialog, cancelOptimization, getActiveOperations } = useOptimization();
  const { t } = useTranslation();

  const activeOperations = getActiveOperations();

  if (activeOperations.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 animate-in slide-in-from-bottom-4">
      {activeOperations.map(([type, operation]) => (
        <OperationCard
          key={type}
          type={type}
          operation={operation}
          onMaximize={toggleDialog}
          onCancel={() => cancelOptimization(type)}
        />
      ))}
    </div>
  );
}
