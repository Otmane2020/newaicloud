import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Loader2, CheckCircle, AlertCircle, Zap, TrendingUp } from 'lucide-react';
import { useOptimizationActions, OptimizationAction, OptimizationResult } from '@/hooks/useOptimizationActions';
import { useTranslation } from '@/lib/language';
import { toast } from 'sonner';

interface AutoOptimizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  stats?: {
    productsCount?: number;
    collectionsCount?: number;
    imagesCount?: number;
    articlesCount?: number;
    pagesCount?: number;
  };
}

interface ActionItem {
  id: OptimizationAction;
  count: number;
  priority: 'high' | 'medium' | 'low';
  enabled: boolean;
}

export function AutoOptimizationDialog({ open, onOpenChange, onComplete, stats }: AutoOptimizationDialogProps) {
  const { t, language } = useTranslation();
  const {
    isOptimizing,
    progress,
    optimizeProducts,
    optimizeCollections,
    generateAltTexts,
    optimizeArticles,
    optimizePages,
    setIsOptimizing
  } = useOptimizationActions();

  // Use translation keys from t.dialogs.autoOptimization
  const ao = t.dialogs.autoOptimization;

  const [actions, setActions] = useState<ActionItem[]>([
    { id: 'products', count: stats?.productsCount || 0, priority: 'high', enabled: (stats?.productsCount || 0) > 0 },
    { id: 'collections', count: stats?.collectionsCount || 0, priority: 'high', enabled: (stats?.collectionsCount || 0) > 0 },
    { id: 'alt_texts', count: stats?.imagesCount || 0, priority: 'high', enabled: (stats?.imagesCount || 0) > 0 },
    { id: 'articles', count: stats?.articlesCount || 0, priority: 'medium', enabled: (stats?.articlesCount || 0) > 0 },
    { id: 'pages', count: stats?.pagesCount || 0, priority: 'low', enabled: (stats?.pagesCount || 0) > 0 }
  ]);

  const [currentStep, setCurrentStep] = useState<'select' | 'processing' | 'complete'>('select');
  const [results, setResults] = useState<OptimizationResult[]>([]);

  const toggleAction = (id: OptimizationAction) => {
    setActions(prev => prev.map(action => action.id === id ? { ...action, enabled: !action.enabled } : action));
  };

  const handleStartOptimization = async () => {
    const enabledActions = actions.filter(a => a.enabled && a.count > 0);
    if (enabledActions.length === 0) {
      toast.error(ao.selectAtLeastOne);
      return;
    }

    setIsOptimizing(true);
    setCurrentStep('processing');
    const newResults: OptimizationResult[] = [];

    for (const action of enabledActions) {
      let result: OptimizationResult;
      switch (action.id) {
        case 'products': result = await optimizeProducts(); break;
        case 'collections': result = await optimizeCollections(); break;
        case 'alt_texts': result = await generateAltTexts(); break;
        case 'articles': result = await optimizeArticles(); break;
        case 'pages': result = await optimizePages(); break;
        default: continue;
      }
      newResults.push(result);
    }

    setResults(newResults);
    setIsOptimizing(false);
    setCurrentStep('complete');
    onComplete?.();
  };

  const handleClose = () => {
    if (!isOptimizing) {
      setCurrentStep('select');
      setResults([]);
      onOpenChange(false);
    }
  };

  const totalSelected = actions.filter(a => a.enabled).length;
  const totalItems = actions.reduce((sum, a) => sum + (a.enabled ? a.count : 0), 0);
  const totalProcessed = results.reduce((sum, r) => sum + r.processedCount, 0);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-[#EF4444] text-white border-0';
      case 'medium': return 'bg-[#FF8C00] text-white border-0';
      case 'low': return 'bg-emerald-500 text-white border-0';
      default: return 'bg-muted';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return ao.priorityHigh;
      case 'medium': return ao.priorityMedium;
      case 'low': return ao.priorityLow;
      default: return priority;
    }
  };

  const getActionLabel = (id: string) => {
    const labelMap: Record<string, string> = {
      products: ao.optimizeProducts,
      collections: ao.optimizeCollections,
      alt_texts: ao.generateAltTexts,
      articles: ao.optimizeArticles,
      pages: ao.optimizePages,
    };
    return labelMap[id] || id;
  };

  const getActionDesc = (id: string) => {
    const descMap: Record<string, string> = {
      products: ao.optimizeProductsDesc,
      collections: ao.optimizeCollectionsDesc,
      alt_texts: ao.generateAltTextsDesc,
      articles: ao.optimizeArticlesDesc,
      pages: ao.optimizePagesDesc,
    };
    return descMap[id] || '';
  };

  const getProgressMessage = () => {
    if (!progress.action) return '';
    switch (progress.action) {
      case 'products': return ao.optimizingProducts;
      case 'collections': return ao.optimizingCollections;
      case 'alt_texts': return ao.generatingAltTexts;
      case 'articles': return ao.optimizingArticles;
      case 'pages': return ao.optimizingPages;
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-2xl">{ao.title}</DialogTitle>
              <DialogDescription>
                {currentStep === 'select' && ao.selectActions}
                {currentStep === 'processing' && ao.processing}
                {currentStep === 'complete' && ao.complete}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {currentStep === 'select' && (
          <div className="space-y-6 py-4">
            <Alert className="border-primary/20 bg-primary/5">
              <Zap className="h-4 w-4 text-primary" />
              <AlertDescription>{ao.alertDesc}</AlertDescription>
            </Alert>

            <div className="space-y-3">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className={`p-4 rounded-lg border-2 transition-all ${action.enabled ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'} ${action.count === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={() => action.count > 0 && toggleAction(action.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox checked={action.enabled} disabled={action.count === 0} className="mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{getActionLabel(action.id)}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">{action.count} {action.count > 1 ? ao.elements : ao.element}</Badge>
                          <Badge className={getPriorityColor(action.priority)}>{getPriorityLabel(action.priority)}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{getActionDesc(action.id)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalSelected > 0 && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">{totalSelected} {totalSelected > 1 ? ao.actionsSelected : ao.actionSelected}</p>
                    <p className="text-sm text-muted-foreground">{totalItems} {totalItems > 1 ? ao.elements : ao.element} {totalItems > 1 ? ao.willBeProcessedPlural : ao.willBeProcessed}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 'processing' && (
          <div className="space-y-6 py-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center"><div className="relative"><Loader2 className="h-16 w-16 text-primary animate-spin" /><Sparkles className="h-8 w-8 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div></div>
              <div><h3 className="text-xl font-semibold">{ao.inProgress}</h3>{progress.action && <p className="text-muted-foreground mt-2">{getProgressMessage()}</p>}</div>
            </div>
            {progress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{ao.progressLabel}</span><span className="font-medium">{progress.current} / {progress.total}</span></div>
                <Progress value={(progress.current / progress.total) * 100} className="h-2" />
              </div>
            )}
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-4 py-6">
              <div className="flex justify-center"><div className="p-4 rounded-full bg-emerald-100"><CheckCircle className="h-12 w-12 text-emerald-500" /></div></div>
              <div><h3 className="text-2xl font-bold">{ao.complete}</h3><p className="text-muted-foreground mt-2">{totalProcessed} {totalProcessed > 1 ? ao.haveBeenOptimized : ao.hasBeenOptimized}</p></div>
            </div>
            <div className="space-y-3">
              {results.map((result) => {
                const action = actions.find(a => a.id === result.action);
                if (!action) return null;
                return (
                  <div key={result.action} className={`p-4 rounded-lg border-2 ${result.success ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                    <div className="flex items-center gap-3">
                      {result.success ? <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />}
                      <div className="flex-1">
                        <p className="font-semibold">{getActionLabel(action.id)}</p>
                        <p className="text-sm text-muted-foreground">{result.success ? `${result.processedCount} ${result.processedCount > 1 ? ao.elements : ao.element} ${result.processedCount > 1 ? ao.optimizedPlural : ao.optimized}` : result.errorMessage || ao.optimizationError}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Alert className="border-primary/20 bg-primary/5"><Sparkles className="h-4 w-4 text-primary" /><AlertDescription>{ao.syncReminder}</AlertDescription></Alert>
          </div>
        )}

        <DialogFooter>
          {currentStep === 'select' && (<><Button variant="outline" onClick={handleClose}>{t.common.cancel}</Button><Button onClick={handleStartOptimization} disabled={totalSelected === 0} className="gap-2"><Sparkles className="h-4 w-4" />{ao.startOptimization}</Button></>)}
          {currentStep === 'processing' && <Button disabled className="gap-2"><Loader2 className="h-4 w-4 animate-spin" />{ao.processing}</Button>}
          {currentStep === 'complete' && <Button onClick={handleClose} className="w-full">{t.common.close}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}