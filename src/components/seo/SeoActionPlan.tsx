import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  CheckCircle,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Tag,
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';

interface SeoAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface SeoActionPlanProps {
  productId: string;
  onScoreUpdate?: (newScore: number) => void;
}

export function SeoActionPlan({ productId, onScoreUpdate }: SeoActionPlanProps) {
  const [actions, setActions] = useState<SeoAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [seoScore, setSeoScore] = useState(0);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shopify_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;

      // Définir les actions basées sur ce qui manque au produit
      const productActions: SeoAction[] = [
        {
          id: 'seo_title',
          title: 'Titre SEO optimisé',
          description: 'Un titre SEO de 50-60 caractères avec mots-clés',
          icon: FileText,
          completed: Boolean(data.seo_title && data.seo_title.length >= 30),
          priority: 'high'
        },
        {
          id: 'seo_description',
          title: 'Meta Description',
          description: 'Description SEO de 150-160 caractères',
          icon: FileText,
          completed: Boolean(data.seo_description && data.seo_description.length >= 100),
          priority: 'high'
        },
        {
          id: 'alt_images',
          title: 'Textes ALT des images',
          description: 'Tous les images ont des textes ALT descriptifs',
          icon: ImageIcon,
          completed: Boolean(data.image_url), // Simplifié, à améliorer
          priority: 'high'
        },
        {
          id: 'tags',
          title: 'Tags et mots-clés',
          description: 'Au moins 5 tags pertinents pour le référencement',
          icon: Tag,
          completed: Boolean(data.tags && data.tags.split(',').length >= 5),
          priority: 'medium'
        },
        {
          id: 'enrichment',
          title: 'Enrichissement produit',
          description: 'Description enrichie avec analyse IA',
          icon: Sparkles,
          completed: data.enrichment_status === 'enriched',
          priority: 'medium'
        }
      ];

      setActions(productActions);
      calculateSeoScore(productActions);
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Erreur lors du chargement du produit');
    } finally {
      setLoading(false);
    }
  };

  const calculateSeoScore = (currentActions: SeoAction[]) => {
    const totalActions = currentActions.length;
    const completedActions = currentActions.filter(a => a.completed).length;
    
    // Poids différent selon priorité
    let weightedScore = 0;
    let totalWeight = 0;
    
    currentActions.forEach(action => {
      const weight = action.priority === 'high' ? 30 : action.priority === 'medium' ? 20 : 10;
      totalWeight += weight;
      if (action.completed) {
        weightedScore += weight;
      }
    });
    
    const score = Math.round((weightedScore / totalWeight) * 100);
    setSeoScore(score);
    onScoreUpdate?.(score);
  };

  const handleToggleAction = async (actionId: string) => {
    const action = actions.find(a => a.id === actionId);
    if (!action) return;

    // Si l'action n'est pas complétée, on lance l'optimisation
    if (!action.completed) {
      setUpdating(true);
      try {
        // Appeler la fonction d'optimisation appropriée
        if (actionId === 'seo_title' || actionId === 'seo_description') {
          const { error } = await supabase.functions.invoke('generate-seo-with-deepseek', {
            body: { productId }
          });
          if (error) throw error;
          toast.success('SEO optimisé avec succès');
        } else if (actionId === 'enrichment') {
          const { error } = await supabase.functions.invoke('enrich-product', {
            body: { productId }
          });
          if (error) throw error;
          toast.success('Produit enrichi avec succès');
        } else if (actionId === 'tags') {
          const { error } = await supabase.functions.invoke('generate-tags', {
            body: { productId }
          });
          if (error) throw error;
          toast.success('Tags générés avec succès');
        }

        // Recharger le produit
        await loadProduct();
      } catch (error: any) {
        console.error('Error:', error);
        toast.error(error.message || 'Erreur lors de l\'optimisation');
      } finally {
        setUpdating(false);
      }
    } else {
      // Marquer comme non complété (pour permettre un re-traitement)
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

  return (
    <Card className="p-6 space-y-6">
      {/* Header avec score */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Plan d'Action SEO</h3>
          <p className="text-sm text-muted-foreground">
            {completedCount} sur {actions.length} actions complétées
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
          <div className="text-xs text-muted-foreground">Score SEO</div>
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

      {/* Guide d'utilisation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-blue-900 mb-1">Comment mettre à jour le SEO sur Shopify</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Cochez les actions ci-dessous pour les optimiser automatiquement</li>
              <li>Une fois terminé, les données seront prêtes pour la synchronisation</li>
              <li>Utilisez le bouton "Synchroniser avec Shopify" pour appliquer les changements</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Liste des actions */}
      <div className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <div
              key={action.id}
              className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                action.completed
                  ? 'bg-green-50 border-green-300'
                  : 'bg-white border-gray-200 hover:border-gray-300'
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
                    action.completed ? 'text-green-600' : 'text-gray-600'
                  }`} />
                  <h4 className={`font-semibold ${
                    action.completed ? 'text-green-900' : 'text-gray-900'
                  }`}>
                    {action.title}
                  </h4>
                  <Badge 
                    variant={action.priority === 'high' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {action.priority === 'high' ? 'Prioritaire' : 'Important'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </div>
              {action.completed && (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Bouton de synchronisation */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          onClick={loadProduct}
          variant="outline"
          disabled={updating}
          className="flex-1"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Rafraîchir
        </Button>
        <Button
          onClick={() => {
            toast.info('Utilisez la page SEO > Optimisation pour synchroniser avec Shopify');
          }}
          disabled={completedCount === 0}
          className="flex-1 bg-gradient-primary"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Voir dans SEO
        </Button>
      </div>
    </Card>
  );
}
