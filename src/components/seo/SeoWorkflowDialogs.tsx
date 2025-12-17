import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle, Upload, Sparkles, AlertCircle, Eye, BarChart3, TrendingUp, XCircle, X, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SeoConfidenceBadge } from './SeoConfidenceBadge';
import { GoogleSearchPreview } from './GoogleSearchPreview';
import { buildPublicUrl } from '@/lib/shopifyDomainUtils';
import { useState, useEffect, useRef } from 'react';
import { ArticlePreviewDialog } from '../blog/ArticlePreviewDialog';
import { useStore } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { useStoreDomain } from '@/hooks/useStoreDomain';
import { useTranslation } from '@/lib/language';
import { motion, AnimatePresence } from 'framer-motion';

// ============= TYPES =============
export interface WorkflowItem {
  id: string;
  title: string;
  handle?: string; // For collections and products URL generation
  image_url?: string;
  seo_title?: string;
  seo_description?: string;
  meta_description?: string; // For blog articles
  body_html?: string;
  alt_text?: string;
  tags?: string;
  shopify_image_id?: number | null;
  content?: string; // For blog articles
  featured_image?: string; // For blog articles
}

export type WorkflowType = 'seo' | 'tags' | 'alt' | 'pages' | 'articles';

// ============= PROGRESS DIALOG - Style Google Shopping =============
interface ProgressItem {
  id: string;
  title: string;
  image_url?: string;
  status?: 'pending' | 'processing' | 'success' | 'error';
}

interface ProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: WorkflowType;
  operation: 'optimizing' | 'syncing';
  current: number;
  total: number;
  items?: ProgressItem[];
  onCancel?: () => void;
}

export function ProgressDialog({ 
  open, 
  onOpenChange, 
  type, 
  operation,
  current, 
  total,
  items = [],
  onCancel
}: ProgressDialogProps) {
  const { t, tf, language } = useTranslation();
  const currentItemRef = useRef<HTMLDivElement>(null);
  const isComplete = current === total && total > 0;
  const isProcessing = total > 0 && !isComplete;
  
  const progress = total > 0 ? Math.round((current / total) * 100) : 0;
  
  // Count statuses
  const successCount = items.filter(i => i.status === 'success').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const pendingCount = items.filter(i => i.status === 'pending' || !i.status).length;

  // Auto-scroll to current processing item
  useEffect(() => {
    if (currentItemRef.current && isProcessing) {
      currentItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [current, isProcessing]);

  const getTitle = () => {
    if (isComplete) {
      return operation === 'syncing' 
        ? (language === 'fr' ? 'Synchronisation terminée' : 'Sync completed')
        : (language === 'fr' ? 'Optimisation terminée' : 'Optimization completed');
    }
    if (operation === 'syncing') return language === 'fr' ? 'Synchronisation en cours...' : 'Syncing...';
    return language === 'fr' ? 'Optimisation en cours...' : 'Optimizing...';
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'seo': return language === 'fr' ? 'Produit' : 'Product';
      case 'tags': return language === 'fr' ? 'Produit' : 'Product';
      case 'alt': return 'Image';
      case 'pages': return 'Page';
      case 'articles': return 'Article';
    }
  };

  const getStatusBadge = (item: ProgressItem, isCurrentItem: boolean) => {
    if (item.status === 'pending' || (!item.status && !isCurrentItem)) {
      return (
        <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground border-muted-foreground/30">
          {language === 'fr' ? 'En attente' : 'Pending'}
        </Badge>
      );
    }

    if (item.status === 'processing' || isCurrentItem) {
      return (
        <Badge className="text-xs bg-primary/20 text-primary border-primary/30 animate-pulse">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          {language === 'fr' ? 'En cours...' : 'Processing...'}
        </Badge>
      );
    }

    if (item.status === 'success') {
      return (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <Badge className="text-xs bg-success/20 text-success border-success/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            {language === 'fr' ? 'Optimisé' : 'Optimized'}
          </Badge>
        </motion.div>
      );
    }

    if (item.status === 'error') {
      return (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <Badge className="text-xs bg-destructive/20 text-destructive border-destructive/30">
            <XCircle className="w-3 h-3 mr-1" />
            {language === 'fr' ? 'Erreur' : 'Error'}
          </Badge>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Header avec animation - Style Google Shopping */}
        <DialogHeader className="p-4 pb-2 sm:p-6 sm:pb-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-3">
            {isProcessing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="flex-shrink-0"
              >
                <Sparkles className="w-6 h-6 text-primary" />
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                <CheckCircle className="w-6 h-6 text-success" />
              </motion.div>
            )}
            <span className="truncate">{getTitle()}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6 pt-4 space-y-4">
          {/* Progress Section - Style Google Shopping */}
          <div className="space-y-3">
            {/* Compteur et pourcentage */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{getTypeLabel()}</span>
                <span className="font-semibold text-foreground">
                  {current} / {total}
                </span>
              </div>
              <motion.span
                key={progress}
                initial={{ scale: 1.2, color: 'hsl(var(--primary))' }}
                animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                className="text-2xl sm:text-3xl font-bold"
              >
                {progress}%
              </motion.span>
            </div>

            {/* Barre de progression */}
            <Progress value={progress} className="h-3 sm:h-4" />
          </div>

          {/* Stats Summary - 3 colonnes */}
          {items.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <motion.div 
                className="bg-success/10 rounded-xl p-2 sm:p-3 border border-success/20 text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <CheckCircle className="w-4 h-4 text-success mx-auto mb-1" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">{language === 'fr' ? 'Succès' : 'Success'}</p>
                <p className="text-lg sm:text-xl font-bold text-success">{successCount}</p>
              </motion.div>
              <motion.div 
                className="bg-destructive/10 rounded-xl p-2 sm:p-3 border border-destructive/20 text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <XCircle className="w-4 h-4 text-destructive mx-auto mb-1" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">{language === 'fr' ? 'Erreurs' : 'Errors'}</p>
                <p className="text-lg sm:text-xl font-bold text-destructive">{errorCount}</p>
              </motion.div>
              <motion.div 
                className="bg-muted rounded-xl p-2 sm:p-3 border text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <AlertCircle className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">{language === 'fr' ? 'En attente' : 'Pending'}</p>
                <p className="text-lg sm:text-xl font-bold text-muted-foreground">{pendingCount}</p>
              </motion.div>
            </div>
          )}

          {/* Product List with scroll */}
          {items.length > 0 && (
            <ScrollArea className="flex-1 -mx-4 px-4" style={{ maxHeight: '300px' }}>
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
                  {items.map((item, index) => {
                    const isCurrentItem = index === current && isProcessing;
                    return (
                      <motion.div
                        key={item.id}
                        ref={isCurrentItem ? currentItemRef : null}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0,
                          scale: isCurrentItem ? 1.02 : 1,
                        }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all",
                          isCurrentItem && "bg-primary/10 border-primary ring-2 ring-primary/30",
                          item.status === 'success' && "bg-success/5 border-success/30",
                          item.status === 'error' && "bg-destructive/5 border-destructive/30",
                          !isCurrentItem && !item.status && "bg-muted/30"
                        )}
                      >
                        {/* Image */}
                        <div className="relative flex-shrink-0">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.title}
                              className="w-12 h-12 object-cover rounded-lg border"
                            />
                          ) : (
                            <div className={cn(
                              "w-12 h-12 rounded-lg flex items-center justify-center",
                              type === 'pages' && "bg-gradient-to-br from-blue-500/20 to-blue-600/10",
                              type === 'articles' && "bg-gradient-to-br from-purple-500/20 to-purple-600/10",
                              type === 'alt' && "bg-gradient-to-br from-green-500/20 to-green-600/10",
                              (type === 'seo' || type === 'tags') && "bg-gradient-to-br from-primary/20 to-primary/10"
                            )}>
                              {type === 'pages' && <FileText className="w-5 h-5 text-blue-500" />}
                              {type === 'articles' && <FileText className="w-5 h-5 text-purple-500" />}
                              {type === 'alt' && <ImageIcon className="w-5 h-5 text-green-500" />}
                              {(type === 'seo' || type === 'tags') && <Sparkles className="w-5 h-5 text-primary" />}
                            </div>
                          )}
                          {isCurrentItem && (
                            <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
                              <Loader2 className="w-3 h-3 text-primary-foreground animate-spin" />
                            </div>
                          )}
                        </div>

                        {/* Title */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                        </div>

                        {/* Status Badge */}
                        {getStatusBadge(item, isCurrentItem)}
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30 flex justify-end gap-2">
          {isProcessing && onCancel ? (
            <Button variant="outline" onClick={onCancel} className="gap-2">
              <X className="w-4 h-4" />
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)}>
              {language === 'fr' ? 'Fermer' : 'Close'}
            </Button>
          )}
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
  onClose: () => void;
  syncStatus?: {
    synced: number;
    failed: number;
    errors?: string[];
  };
}

export function ResultsDialog({
  open,
  onOpenChange,
  type,
  items,
  onClose,
  syncStatus,
}: ResultsDialogProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<WorkflowItem | null>(null);
  const { domain: storeDomain } = useStoreDomain();
  const { selectedStore } = useStore();
  const { t, tf, language } = useTranslation();

  const getTitle = () => {
    switch (type) {
      case 'seo': return t.dialogs.seoWorkflow.results.seoComplete;
      case 'tags': return t.dialogs.seoWorkflow.results.tagsComplete;
      case 'alt': return t.dialogs.seoWorkflow.results.altComplete;
      case 'pages': return language === 'fr' ? 'Pages optimisées !' : 'Pages optimized!';
      case 'articles': return language === 'fr' ? 'Articles optimisés !' : 'Articles optimized!';
    }
  };

  const getDescription = () => {
    const count = items.length;
    const typeKey = type === 'seo' ? 'products' : type === 'tags' ? 'products' : 'images';
    switch (type) {
      case 'seo': return tf('dialogs.seoWorkflow.results.seoCompleteDesc', { successCount: count, type: t.dialogs.seoWorkflow.results.types[typeKey] });
      case 'tags': return tf('dialogs.seoWorkflow.results.tagsCompleteDesc', { successCount: count, type: t.dialogs.seoWorkflow.results.types[typeKey] });
      case 'alt': return tf('dialogs.seoWorkflow.results.altCompleteDesc', { successCount: count });
      case 'pages': return language === 'fr' ? `${count} page(s) optimisée(s) avec succès` : `${count} page(s) optimized successfully`;
      case 'articles': return language === 'fr' ? `${count} article(s) optimisé(s) avec succès` : `${count} article(s) optimized successfully`;
    }
  };

  const handlePreview = (item: WorkflowItem) => {
    setSelectedArticle(item);
    setShowPreview(true);
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
                          seoDescription={item.seo_description || item.meta_description}
                          showLabel={false}
                          hasImage={!!item.image_url || !!item.featured_image}
                          tags={item.tags}
                          optimizationCount={1}
                          itemId={item.id}
                        />
                      )}
                    </div>
                    
                        {type === 'seo' && (
                          <div className="space-y-3">
                            {item.seo_title && item.seo_description && (
                              <div className="space-y-2">
                                <Badge variant="outline" className="text-xs font-semibold">{t.dialogs.seoWorkflow.results.preview}</Badge>
                                <GoogleSearchPreview
                                  title={item.seo_title}
                                  description={item.meta_description || item.seo_description}
                                  url={buildPublicUrl(
                                    item.handle 
                                      ? `/collections/${item.handle}` 
                                      : `/products/${item.title.toLowerCase().replace(/\s+/g, '-')}`,
                                    storeDomain
                                  )}
                                />
                              </div>
                            )}
                            {item.body_html && (
                              <div className="space-y-1">
                                <Badge variant="outline" className="text-xs font-semibold">{t.dialogs.seoWorkflow.results.newDescription}</Badge>
                                <div className="text-sm line-clamp-3" dangerouslySetInnerHTML={{ __html: item.body_html }} />
                              </div>
                            )}
                            {item.content && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePreview(item)}
                                className="w-full mt-2"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                {t.dialogs.seoWorkflow.results.previewArticles}
                              </Button>
                            )}
                          </div>
                        )}

                    {type === 'tags' && item.tags && (
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">{t.dialogs.seoWorkflow.results.generatedTags}</Badge>
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
                        <Badge variant="outline" className="text-xs">{t.dialogs.seoWorkflow.results.altText}</Badge>
                        <p className="text-sm text-muted-foreground">{item.alt_text}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-3 pt-4 border-t flex-shrink-0">
          {/* Auto-sync status message - show real status */}
          {syncStatus ? (
            syncStatus.failed === 0 && syncStatus.synced > 0 ? (
              <div className="flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  {`${syncStatus.synced} synchronisé(s) avec Shopify`}
                </span>
              </div>
            ) : syncStatus.failed > 0 ? (
              <div className="flex flex-col gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    {`${syncStatus.synced} synchronisé(s), ${syncStatus.failed} échec(s)`}
                  </span>
                </div>
                {syncStatus.errors && syncStatus.errors.length > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 pl-7">
                    {syncStatus.errors[0]}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg border">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Aucune synchronisation Shopify effectuée
                </span>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                {t.dialogs.seoWorkflow.results.syncSuccess}
              </span>
            </div>
          )}
          <Button
            onClick={onClose}
            className="w-full h-11"
            size="lg"
          >
            {t.dialogs.seoWorkflow.results.close}
          </Button>
        </div>
        
        {selectedArticle && (
          <ArticlePreviewDialog
            open={showPreview}
            onOpenChange={setShowPreview}
            article={{
              title: selectedArticle.title,
              content: selectedArticle.content || '',
              featured_image: selectedArticle.featured_image,
              seo_title: selectedArticle.seo_title,
              meta_description: selectedArticle.seo_description,
              handle: selectedArticle.handle
            }}
          />
        )}
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
  const { t, tf } = useTranslation();
  
  const getTitle = () => {
    switch (type) {
      case 'seo': return t.dialogs.seoWorkflow.confirmation.syncSeoTitle;
      case 'tags': return t.dialogs.seoWorkflow.confirmation.syncTagsTitle;
      case 'alt': return t.dialogs.seoWorkflow.confirmation.syncAltTitle;
    }
  };

  const getDescription = () => {
    const typeKey = type === 'alt' ? 'images' : type === 'seo' ? 'collections' : 'products';
    switch (type) {
      case 'seo': return tf('dialogs.seoWorkflow.confirmation.syncSeoDesc', { count: itemCount, type: t.dialogs.seoWorkflow.results.types[typeKey] });
      case 'tags': return tf('dialogs.seoWorkflow.confirmation.syncTagsDesc', { count: itemCount, type: t.dialogs.seoWorkflow.results.types[typeKey] });
      case 'alt': return tf('dialogs.seoWorkflow.confirmation.syncAltDesc', { count: itemCount });
    }
  };

  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
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
            <span className="font-medium">{t.dialogs.seoWorkflow.confirmation.readyForSync}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t.dialogs.seoWorkflow.confirmation.warning}
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
                {t.dialogs.seoWorkflow.confirmation.syncing}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {t.dialogs.seoWorkflow.confirmation.confirm}
              </>
            )}
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            disabled={loading}
            className="w-full"
          >
            {t.dialogs.seoWorkflow.confirmation.cancel}
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
  items?: WorkflowItem[];
  onClose: () => void;
}

export function SuccessDialog({
  open,
  onOpenChange,
  type,
  count,
  items = [],
  onClose,
}: SuccessDialogProps) {
  const { t, tf } = useTranslation();
  
  const getTitle = () => {
    switch (type) {
      case 'seo': return t.dialogs.seoWorkflow.success.seoSyncedTitle;
      case 'tags': return t.dialogs.seoWorkflow.success.tagsSyncedTitle;
      case 'alt': return t.dialogs.seoWorkflow.success.altSyncedTitle;
    }
  };

  const getDescription = () => {
    const typeKey = type === 'alt' ? 'images' : type === 'seo' ? 'collections' : 'products';
    switch (type) {
      case 'seo': return tf('dialogs.seoWorkflow.success.seoSyncedDesc', { count, type: t.dialogs.seoWorkflow.results.types[typeKey] });
      case 'tags': return tf('dialogs.seoWorkflow.success.tagsSyncedDesc', { count, type: t.dialogs.seoWorkflow.results.types[typeKey] });
      case 'alt': return tf('dialogs.seoWorkflow.success.altSyncedDesc', { count });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center animate-scale-in flex-shrink-0">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                {getTitle()}
              </DialogTitle>
              <DialogDescription className="text-base">
                {getDescription()}
              </DialogDescription>
            </div>
          </div>

          {/* Preview of synced items */}
          {items.length > 0 && (
            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="space-y-3 py-2">
                {items.map((item) => (
                  <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex gap-4">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0 space-y-2">
                        <h4 className="font-semibold text-base line-clamp-1">{item.title}</h4>
                        
                        {type === 'alt' && item.alt_text && (
                          <div className="space-y-1">
                            <Badge variant="outline" className="text-xs">Texte ALT</Badge>
                            <p className="text-sm text-muted-foreground">{item.alt_text}</p>
                          </div>
                        )}
                        
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
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="w-full bg-green-50 dark:bg-green-900/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">{t.dialogs.seoWorkflow.success.changesLive}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.dialogs.seoWorkflow.success.changesLive}
            </p>
          </div>

          <Button
            onClick={onClose}
            className="w-full h-11 font-semibold"
            size="lg"
          >
            {t.dialogs.seoWorkflow.success.done}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
