import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Loader2, CheckCircle, AlertCircle, Zap, TrendingUp } from 'lucide-react';
import { useOptimizationActions, OptimizationAction, OptimizationResult } from '@/hooks/useOptimizationActions';
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
  label: string;
  description: string;
  count: number;
  priority: 'high' | 'medium' | 'low';
  enabled: boolean;
}

export function AutoOptimizationDialog({ open, onOpenChange, onComplete, stats }: AutoOptimizationDialogProps) {
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

  const [actions, setActions] = useState<ActionItem[]>([
    {
      id: 'products',
      label: 'Optimiser les produits',
      description: 'Génération de titres et descriptions SEO',
      count: stats?.productsCount || 0,
      priority: 'high',
      enabled: (stats?.productsCount || 0) > 0
    },
    {
      id: 'collections',
      label: 'Optimiser les collections',
      description: 'Enrichissement SEO des collections',
      count: stats?.collectionsCount || 0,
      priority: 'high',
      enabled: (stats?.collectionsCount || 0) > 0
    },
    {
      id: 'alt_texts',
      label: 'Générer les ALT texts',
      description: 'Textes alternatifs pour les images',
      count: stats?.imagesCount || 0,
      priority: 'high',
      enabled: (stats?.imagesCount || 0) > 0
    },
    {
      id: 'articles',
      label: 'Optimiser les articles',
      description: 'SEO pour le blog',
      count: stats?.articlesCount || 0,
      priority: 'medium',
      enabled: (stats?.articlesCount || 0) > 0
    },
    {
      id: 'pages',
      label: 'Optimiser les pages',
      description: 'SEO pour les pages statiques',
      count: stats?.pagesCount || 0,
      priority: 'low',
      enabled: (stats?.pagesCount || 0) > 0
    }
  ]);

  const [currentStep, setCurrentStep] = useState<'select' | 'processing' | 'complete'>('select');
  const [results, setResults] = useState<OptimizationResult[]>([]);

  const toggleAction = (id: OptimizationAction) => {
    setActions(prev =>
      prev.map(action =>
        action.id === id ? { ...action, enabled: !action.enabled } : action
      )
    );
  };

  const handleStartOptimization = async () => {
    const enabledActions = actions.filter(a => a.enabled && a.count > 0);
    if (enabledActions.length === 0) {
      toast.error('Veuillez sélectionner au moins une action');
      return;
    }

    setIsOptimizing(true);
    setCurrentStep('processing');
    const newResults: OptimizationResult[] = [];

    for (const action of enabledActions) {
      let result: OptimizationResult;

      switch (action.id) {
        case 'products':
          result = await optimizeProducts();
          break;
        case 'collections':
          result = await optimizeCollections();
          break;
        case 'alt_texts':
          result = await generateAltTexts();
          break;
        case 'articles':
          result = await optimizeArticles();
          break;
        case 'pages':
          result = await optimizePages();
          break;
        default:
          continue;
      }

      newResults.push(result);
    }

    setResults(newResults);
    setIsOptimizing(false);
    setCurrentStep('complete');
    
    if (onComplete) {
      onComplete();
    }
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
  const successCount = results.filter(r => r.success).length;
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
      case 'high': return 'Priorité Haute';
      case 'medium': return 'Priorité Moyenne';
      case 'low': return 'Priorité Basse';
      default: return priority;
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
              <DialogTitle className="text-2xl">Optimisation Automatique</DialogTitle>
              <DialogDescription>
                {currentStep === 'select' && 'Sélectionnez les optimisations à effectuer'}
                {currentStep === 'processing' && 'Optimisation en cours...'}
                {currentStep === 'complete' && 'Optimisation terminée !'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step 1: Select Actions */}
        {currentStep === 'select' && (
          <div className="space-y-6 py-4">
            <Alert className="border-primary/20 bg-primary/5">
              <Zap className="h-4 w-4 text-primary" />
              <AlertDescription>
                Sélectionnez les actions que vous souhaitez effectuer. Le système optimisera automatiquement tous les éléments concernés.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    action.enabled
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  } ${action.count === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={() => action.count > 0 && toggleAction(action.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={action.enabled}
                      disabled={action.count === 0}
                      onCheckedChange={() => action.count > 0 && toggleAction(action.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{action.label}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {action.count} élément{action.count > 1 ? 's' : ''}
                          </Badge>
                          <Badge className={getPriorityColor(action.priority)}>
                            {getPriorityLabel(action.priority)}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalSelected > 0 && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">
                      {totalSelected} action{totalSelected > 1 ? 's' : ''} sélectionnée{totalSelected > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {totalItems} élément{totalItems > 1 ? 's' : ''} sera traité{totalItems > 1 ? 's' : ''}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Processing */}
        {currentStep === 'processing' && (
          <div className="space-y-6 py-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <Loader2 className="h-16 w-16 text-primary animate-spin" />
                  <Sparkles className="h-8 w-8 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Optimisation en cours</h3>
                {progress.action && (
                  <p className="text-muted-foreground mt-2">
                    {progress.action === 'products' && 'Optimisation des produits...'}
                    {progress.action === 'collections' && 'Optimisation des collections...'}
                    {progress.action === 'alt_texts' && 'Génération des ALT texts...'}
                    {progress.action === 'articles' && 'Optimisation des articles...'}
                    {progress.action === 'pages' && 'Optimisation des pages...'}
                  </p>
                )}
              </div>
            </div>

            {progress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progression</span>
                  <span className="font-medium">
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <Progress value={(progress.current / progress.total) * 100} className="h-2" />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Complete */}
        {currentStep === 'complete' && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-4 py-6">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-emerald-100">
                  <CheckCircle className="h-12 w-12 text-emerald-500" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold">Optimisation terminée !</h3>
                <p className="text-muted-foreground mt-2">
                  {totalProcessed} élément{totalProcessed > 1 ? 's ont' : ' a'} été optimisé{totalProcessed > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {results.map((result) => {
                const action = actions.find(a => a.id === result.action);
                if (!action) return null;

                return (
                  <div
                    key={result.action}
                    className={`p-4 rounded-lg border-2 ${
                      result.success
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-rose-200 bg-rose-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold">{action.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {result.success
                            ? `${result.processedCount} élément${result.processedCount > 1 ? 's' : ''} optimisé${result.processedCount > 1 ? 's' : ''}`
                            : result.errorMessage || 'Erreur lors de l\'optimisation'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Alert className="border-primary/20 bg-primary/5">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertDescription>
                N'oubliez pas de synchroniser vos optimisations avec Shopify pour les rendre visibles sur votre boutique !
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          {currentStep === 'select' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                onClick={handleStartOptimization}
                disabled={totalSelected === 0}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Lancer l'optimisation
              </Button>
            </>
          )}

          {currentStep === 'processing' && (
            <Button disabled className="gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Optimisation en cours...
            </Button>
          )}

          {currentStep === 'complete' && (
            <Button onClick={handleClose} className="w-full">
              Fermer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
