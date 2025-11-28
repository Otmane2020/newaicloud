import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { useTranslation } from '@/lib/language';
import {
  CheckCircle,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Tag,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface SeoAction {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: any;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface SeoActionPlanProps {
  productId: string;
  onScoreUpdate?: (newScore: number) => void;
}

export function SeoActionPlan({ productId, onScoreUpdate }: SeoActionPlanProps) {
  const { t } = useTranslation();
  const [actions, setActions] = useState<SeoAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [seoScore, setSeoScore] = useState(0);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [limitType, setLimitType] = useState<'optimizations' | 'articles' | 'chat' | 'shopifySearch'>('optimizations');
  const [currentUsage, setCurrentUsage] = useState(0);
  const [maxLimit, setMaxLimit] = useState(0);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      
      // Get product data
      const { data, error } = await supabase
        .from('shopify_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;

      // Get product images to check ALT texts
      const { data: images } = await supabase
        .from('product_images')
        .select('id, alt_text')
        .eq('product_id', productId);

      const totalImages = images?.length || 0;
      const imagesWithAlt = images?.filter(img => img.alt_text && img.alt_text.trim().length > 0).length || 0;
      const hasAllAltTexts = totalImages > 0 && imagesWithAlt === totalImages;

      // Define actions based on product data
      const productActions: SeoAction[] = [
        {
          id: 'seo_title',
          titleKey: 'seoTitle',
          descriptionKey: 'seoTitle',
          icon: FileText,
          completed: Boolean(data.seo_title && data.seo_title.length >= 30),
          priority: 'high'
        },
        {
          id: 'seo_description',
          titleKey: 'metaDescription',
          descriptionKey: 'metaDescription',
          icon: FileText,
          completed: Boolean(data.seo_description && data.seo_description.length >= 100),
          priority: 'high'
        },
        {
          id: 'alt_images',
          titleKey: 'altImages',
          descriptionKey: 'altImages',
          icon: ImageIcon,
          completed: hasAllAltTexts,
          priority: 'high'
        },
        {
          id: 'tags',
          titleKey: 'tags',
          descriptionKey: 'tags',
          icon: Tag,
          completed: Boolean(data.tags && data.tags.split(',').length >= 5),
          priority: 'medium'
        },
        {
          id: 'enrichment',
          titleKey: 'enrichment',
          descriptionKey: 'enrichment',
          icon: Sparkles,
          completed: data.enrichment_status === 'enriched',
          priority: 'medium'
        }
      ];

      setActions(productActions);
      calculateSeoScore(productActions);
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error(t.seo.actionPlan.toasts.loadError);
    } finally {
      setLoading(false);
    }
  };

  const calculateSeoScore = (currentActions: SeoAction[]) => {
    // Weighted score based on priority
    let weightedScore = 0;
    let totalWeight = 0;
    
    currentActions.forEach(action => {
      const weight = action.priority === 'high' ? 30 : action.priority === 'medium' ? 20 : 10;
      totalWeight += weight;
      if (action.completed) {
        weightedScore += weight;
      }
    });
    
    const score = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
    setSeoScore(score);
    onScoreUpdate?.(score);
  };

  const handleToggleAction = async (actionId: string) => {
    const action = actions.find(a => a.id === actionId);
    if (!action) return;

    // If action is not completed, run optimization
    if (!action.completed) {
      setUpdating(true);
      try {
        if (actionId === 'seo_title' || actionId === 'seo_description') {
          const { error } = await supabase.functions.invoke('generate-seo-with-deepseek', {
            body: { productId }
          });
          if (error) throw error;
          toast.success(t.seo.actionPlan.toasts.seoOptimized);
        } else if (actionId === 'enrichment') {
          const { error } = await supabase.functions.invoke('enrich-product', {
            body: { productId }
          });
          if (error) throw error;
          toast.success(t.seo.actionPlan.toasts.productEnriched);
        } else if (actionId === 'tags') {
          const { error } = await supabase.functions.invoke('generate-tags', {
            body: { productId }
          });
          if (error) throw error;
          toast.success(t.seo.actionPlan.toasts.tagsGenerated);
        }

        // Reload product
        await loadProduct();
      } catch (error: any) {
        console.error('Error:', error);
        
        // Check if limit reached
        if (error.context?.limitReached === true || error.message?.includes('limitReached')) {
          setLimitType('optimizations');
          setCurrentUsage(error.context?.usage || 0);
          setMaxLimit(error.context?.limit || 0);
          setShowUpgradeDialog(true);
          toast.error(t.seo.actionPlan.toasts.limitReached);
        } else {
          toast.error(error.message || t.seo.actionPlan.toasts.optimizationError);
        }
      } finally {
        setUpdating(false);
      }
    } else {
      // Mark as not completed (to allow reprocessing)
      const updatedActions = actions.map(a =>
        a.id === actionId ? { ...a, completed: false } : a
      );
      setActions(updatedActions);
      calculateSeoScore(updatedActions);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  const completedCount = actions.filter(a => a.completed).length;

  const getActionTitle = (key: string) => {
    const actionTranslations = t.seo.actionPlan.actions as Record<string, { title: string; description: string }>;
    return actionTranslations[key]?.title || key;
  };

  const getActionDescription = (key: string) => {
    const actionTranslations = t.seo.actionPlan.actions as Record<string, { title: string; description: string }>;
    return actionTranslations[key]?.description || key;
  };

  const getPriorityLabel = (priority: 'high' | 'medium' | 'low') => {
    return t.seo.actionPlan.priority[priority];
  };

  return (
    <Card className="p-6 space-y-6">
      {/* Header with score */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground">{t.seo.actionPlan.title}</h3>
          <p className="text-sm text-muted-foreground">
            {t.seo.actionPlan.actionsCompleted
              .replace('{{completed}}', String(completedCount))
              .replace('{{total}}', String(actions.length))}
          </p>
        </div>
        <div className="text-center">
          <div className={`text-4xl font-bold ${
            seoScore >= 80 ? 'text-green-600' : 
            seoScore >= 60 ? 'text-orange-600' : 
            'text-red-600'
          }`}>
            {seoScore}
          </div>
          <div className="text-xs text-muted-foreground">{t.seo.actionPlan.seoScore}</div>
          <Progress 
            value={seoScore} 
            className={`mt-2 h-2 w-20 ${
              seoScore >= 80 ? '[&>div]:bg-green-500' : 
              seoScore >= 60 ? '[&>div]:bg-orange-500' : 
              '[&>div]:bg-red-500'
            }`} 
          />
        </div>
      </div>

      {/* Usage guide */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">{t.seo.actionPlan.guide.title}</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
              <li>{t.seo.actionPlan.guide.step1}</li>
              <li>{t.seo.actionPlan.guide.step2}</li>
              <li>{t.seo.actionPlan.guide.step3}</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Actions list */}
      <div className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <div
              key={action.id}
              className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                action.completed
                  ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700'
                  : 'bg-background border-border hover:border-primary/50'
              }`}
            >
              <Checkbox
                checked={action.completed}
                onCheckedChange={() => handleToggleAction(action.id)}
                disabled={updating}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${
                    action.completed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                  }`} />
                  <h4 className={`font-semibold ${
                    action.completed ? 'text-green-900 dark:text-green-100' : 'text-foreground'
                  }`}>
                    {getActionTitle(action.titleKey)}
                  </h4>
                  <Badge 
                    variant={action.priority === 'high' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {getPriorityLabel(action.priority)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{getActionDescription(action.descriptionKey)}</p>
              </div>
              {action.completed && (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          onClick={loadProduct}
          variant="outline"
          disabled={updating}
          className="flex-1"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {t.seo.actionPlan.buttons.refresh}
        </Button>
        <Button
          onClick={() => {
            toast.info(t.seo.actionPlan.toasts.useSeoPage);
          }}
          disabled={completedCount === 0}
          className="flex-1 bg-gradient-primary"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          {t.seo.actionPlan.buttons.viewInSeo}
        </Button>
      </div>

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType={limitType}
        usage={currentUsage}
        limit={maxLimit}
      />
    </Card>
  );
}
