import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle, Upload, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SeoConfidenceBadge } from './SeoConfidenceBadge';

// ============= TYPES =============
export interface WorkflowItem {
  id: string;
  title: string;
  image_url?: string;
  seo_title?: string;
  seo_description?: string;
  alt_text?: string;
  tags?: string;
}

export type WorkflowType = 'seo' | 'tags' | 'alt';

// ============= PROGRESS DIALOG =============
interface ProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: WorkflowType;
  operation: 'optimizing' | 'syncing';
  current: number;
  total: number;
}

export function ProgressDialog({ 
  open, 
  onOpenChange, 
  type, 
  operation,
  current, 
  total 
}: ProgressDialogProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  const getTitle = () => {
    if (operation === 'syncing') return '🔄 Synchronisation en cours...';
    switch (type) {
      case 'seo': return '✨ Optimisation SEO en cours...';
      case 'tags': return '🏷️ Génération des tags...';
      case 'alt': return '🖼️ Génération des textes ALT...';
    }
  };

  const getDescription = () => {
    if (operation === 'syncing') {
      return `Synchronisation avec Shopify : ${current} / ${total}`;
    }
    return `Traitement : ${current} / ${total}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">{getTitle()}</DialogTitle>
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <div className="relative">
            {percentage === 100 ? (
              <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400" />
            ) : (
              <>
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-background rounded-full" />
                </div>
              </>
            )}
          </div>
          <div className="text-center space-y-2 w-full">
            <h3 className="text-xl font-semibold">{getTitle()}</h3>
            <p className="text-sm text-muted-foreground">{getDescription()}</p>
            <Progress value={percentage} className="h-3 mt-4" />
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round(percentage)}%
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============= RESULTS DIALOG =============
interface ResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: WorkflowType;
  items: WorkflowItem[];
  onSyncClick: () => void;
  onClose: () => void;
}

export function ResultsDialog({
  open,
  onOpenChange,
  type,
  items,
  onSyncClick,
  onClose,
}: ResultsDialogProps) {
  const getTitle = () => {
    switch (type) {
      case 'seo': return '✅ Optimisation SEO terminée';
      case 'tags': return '✅ Tags générés avec succès';
      case 'alt': return '✅ Textes ALT générés';
    }
  };

  const getDescription = () => {
    const count = items.length;
    switch (type) {
      case 'seo': return `${count} produit${count > 1 ? 's optimisés' : ' optimisé'} avec nouveaux titres et descriptions SEO`;
      case 'tags': return `${count} produit${count > 1 ? 's' : ''} avec tags pertinents générés`;
      case 'alt': return `${count} image${count > 1 ? 's optimisées' : ' optimisée'} avec textes ALT descriptifs`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <div className="flex items-start gap-4 pb-4 border-b flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <DialogTitle className="text-2xl font-bold mb-1">{getTitle()}</DialogTitle>
            <DialogDescription className="text-base">{getDescription()}</DialogDescription>
          </div>
        </div>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-3 py-2">{items.map((item) => (
              <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex gap-4">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-semibold text-base line-clamp-1">{item.title}</h4>
                      {type === 'seo' && (
                        <SeoConfidenceBadge 
                          seoTitle={item.seo_title} 
                          seoDescription={item.seo_description}
                          showLabel={false}
                        />
                      )}
                    </div>
                    
                    {type === 'seo' && (
                      <div className="space-y-2">
                        {item.seo_title && (
                          <div className="space-y-1">
                            <Badge variant="outline" className="text-xs">Titre SEO</Badge>
                            <p className="text-sm text-muted-foreground font-medium">{item.seo_title}</p>
                          </div>
                        )}
                        {item.seo_description && (
                          <div className="space-y-1">
                            <Badge variant="outline" className="text-xs">Description</Badge>
                            <p className="text-sm text-muted-foreground line-clamp-2">{item.seo_description}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {type === 'tags' && item.tags && (
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">Tags générés</Badge>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {item.tags.split(',').map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs font-normal">
                              {tag.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {type === 'alt' && item.alt_text && (
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">Texte ALT</Badge>
                        <p className="text-sm text-muted-foreground">{item.alt_text}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-2 pt-4 border-t flex-shrink-0">
          <Button
            onClick={onSyncClick}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            size="lg"
          >
            <Upload className="w-5 h-5 mr-2" />
            Synchroniser avec Shopify
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full h-11"
            size="lg"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============= SYNC CONFIRMATION DIALOG =============
interface SyncConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: WorkflowType;
  itemCount: number;
  onConfirm: () => void;
  loading: boolean;
}

export function SyncConfirmationDialog({
  open,
  onOpenChange,
  type,
  itemCount,
  onConfirm,
  loading,
}: SyncConfirmationDialogProps) {
  const getTitle = () => {
    switch (type) {
      case 'seo': return 'Synchroniser les optimisations SEO';
      case 'tags': return 'Synchroniser les tags';
      case 'alt': return 'Synchroniser les textes ALT';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'seo': return `${itemCount} produit${itemCount > 1 ? 's seront mis à jour' : ' sera mis à jour'} sur Shopify avec les nouveaux titres et descriptions SEO.`;
      case 'tags': return `${itemCount} produit${itemCount > 1 ? 's seront mis à jour' : ' sera mis à jour'} sur Shopify avec les nouveaux tags.`;
      case 'alt': return `${itemCount} image${itemCount > 1 ? 's seront mises à jour' : ' sera mise à jour'} sur Shopify avec les nouveaux textes ALT.`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
            <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <DialogTitle className="text-xl font-semibold mb-2">{getTitle()}</DialogTitle>
            <DialogDescription className="text-sm">{getDescription()}</DialogDescription>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 my-4">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium">Prêt pour la synchronisation</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Les modifications seront immédiatement visibles sur votre boutique Shopify.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="w-full h-11 font-semibold"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Synchronisation...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Confirmer la synchronisation
              </>
            )}
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            disabled={loading}
            className="w-full"
          >
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============= SUCCESS DIALOG =============
interface SuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: WorkflowType;
  count: number;
  onClose: () => void;
}

export function SuccessDialog({
  open,
  onOpenChange,
  type,
  count,
  onClose,
}: SuccessDialogProps) {
  const getTitle = () => {
    switch (type) {
      case 'seo': return 'Synchronisation réussie !';
      case 'tags': return 'Tags synchronisés !';
      case 'alt': return 'Images synchronisées !';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'seo': return `${count} produit${count > 1 ? 's ont été mis à jour' : ' a été mis à jour'} avec succès sur Shopify.`;
      case 'tags': return `${count} produit${count > 1 ? 's ont été mis à jour' : ' a été mis à jour'} avec les nouveaux tags.`;
      case 'alt': return `${count} image${count > 1 ? 's ont été mises à jour' : ' a été mise à jour'} avec les nouveaux textes ALT.`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <div className="relative w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center animate-scale-in">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          
          <div className="text-center space-y-3">
            <DialogTitle className="text-2xl font-bold text-green-600 dark:text-green-400">
              {getTitle()}
            </DialogTitle>
            <DialogDescription className="text-base">
              {getDescription()}
            </DialogDescription>
          </div>

          <div className="w-full bg-green-50 dark:bg-green-900/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">Modifications en ligne</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Les changements sont maintenant visibles sur votre boutique Shopify.
            </p>
          </div>

          <Button
            onClick={onClose}
            className="w-full h-11 font-semibold"
            size="lg"
          >
            Parfait !
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
