import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Check, X, RefreshCw, Sparkles, Upload } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PreviewImage {
  productId: string;
  productTitle: string;
  originalUrl: string;
  generatedUrl: string | null;
  status: 'pending' | 'generating' | 'success' | 'error';
  error?: string;
}

interface BackgroundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previews: PreviewImage[];
  onApply: (productIds: string[]) => Promise<void>;
  onRegenerate: (productId: string, customPrompt?: string) => Promise<void>;
  customPrompt?: string;
  onCustomPromptChange?: (prompt: string) => void;
}

const PRESET_PROMPTS = [
  {
    label: 'Studio professionnel',
    value: 'Place this product in a professional studio setting with soft lighting and neutral gray backdrop'
  },
  {
    label: 'Cozy Lifestyle – Salon moderne',
    value: 'A cozy lifestyle setting with warm lighting and a comfortable modern living room interior. Soft ambient light, natural textures, wooden elements, neutral tones. The product is displayed as the hero element, well-lit, perfectly integrated into the scene, with a premium aesthetic suitable for e-commerce.'
  },
  {
    label: 'Studio professionnel',
    value: 'Professional studio photography with a clean white background and perfect soft lighting. High-end commercial style, sharp focus on the product, no distractions, premium e-commerce aesthetic.'
  },
  {
    label: 'Nature luxueuse',
    value: 'Luxurious natural setting with green plants, wood textures, soft daylight and refined organic décor. Warm, elegant, high-end natural ambiance that highlights the product in a premium lifestyle environment.'
  },
  {
    label: 'Minimaliste moderne',
    value: 'Modern minimalist interior with clean lines, neutral colors, soft daylight and a refined, uncluttered aesthetic. The product is centered and highlighted in a sleek, contemporary composition ideal for e-commerce.'
  },
  {
    label: 'Urbain contemporain',
    value: 'Contemporary urban background with industrial elements, concrete textures, large windows, and modern architecture. Stylish, modern city-inspired atmosphere that enhances the product in a premium lifestyle shot.'
  },
  {
    label: 'Urbain contemporain',
    value: 'Place this product in a contemporary urban setting with industrial elements and modern aesthetics'
  },
  {
    label: 'Élégance classique',
    value: 'Place this product in an elegant classical setting with refined decorative elements and soft warm lighting'
  },
];

export function BackgroundDialog({
  open,
  onOpenChange,
  previews,
  onApply,
  onRegenerate,
  customPrompt = '',
  onCustomPromptChange,
}: BackgroundDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(customPrompt);
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const successfulPreviews = previews.filter(p => p.status === 'success');
  const isGenerating = previews.some(p => p.status === 'generating');
  const isSingleImage = previews.length === 1;

  useEffect(() => {
    setLocalPrompt(customPrompt);
  }, [customPrompt]);

  useEffect(() => {
    if (isSingleImage && successfulPreviews.length === 1) {
      setSelectedIds(new Set([successfulPreviews[0].productId]));
    }
  }, [isSingleImage, successfulPreviews]);

  const handlePromptChange = (value: string) => {
    setLocalPrompt(value);
    if (onCustomPromptChange) {
      onCustomPromptChange(value);
    }
  };

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    const preset = PRESET_PROMPTS.find(p => p.value === value);
    if (preset) {
      handlePromptChange(preset.value);
    }
  };

  const handleToggleSelect = (productId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === successfulPreviews.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(successfulPreviews.map(p => p.productId)));
    }
  };

  const handleApply = async () => {
    if (selectedIds.size === 0) return;
    
    setApplying(true);
    try {
      await onApply(Array.from(selectedIds));
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  };

  const handleSyncToShopify = async () => {
    if (selectedIds.size === 0) return;
    
    setSyncing(true);
    const toastId = toast.loading('Synchronisation avec Shopify en cours...');
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const productId of Array.from(selectedIds)) {
        try {
          const { error } = await supabase.functions.invoke('sync-product-images-to-shopify', {
            body: { productId }
          });
          
          if (error) throw error;
          successCount++;
        } catch (error: any) {
          console.error(`Erreur sync produit ${productId}:`, error);
          errorCount++;
        }
      }
      
      if (errorCount === 0) {
        toast.success(`✅ ${successCount} image(s) synchronisée(s) avec Shopify`, { id: toastId });
      } else {
        toast.warning(`${successCount} synchronisée(s), ${errorCount} erreur(s)`, { id: toastId });
      }
    } catch (error: any) {
      console.error('Erreur synchronisation:', error);
      toast.error('Erreur lors de la synchronisation', { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[95vw] sm:max-w-6xl h-[90vh] max-h-[90vh] flex flex-col p-3 sm:p-6 gap-0">
        <DialogHeader className="space-y-2 flex-shrink-0 pb-3 sm:pb-4">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
            <span className="line-clamp-1">Prévisualisation des arrière-plans IA</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Sélectionnez les images à appliquer à vos produits
          </DialogDescription>
        </DialogHeader>

        {/* Prompt Section (optional regenerate) */}
        {onCustomPromptChange && (
          <div className="space-y-2 border-b pb-3 sm:pb-4 flex-shrink-0">
            <Label className="text-xs sm:text-sm font-medium">Prompt personnalisé</Label>
            <div className="flex flex-col gap-2">
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-full text-xs sm:text-sm h-9">
                  <SelectValue placeholder="Style prédéfini..." />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_PROMPTS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value} className="text-xs sm:text-sm">
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Textarea
                  value={localPrompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  placeholder="Décrivez l'environnement souhaité..."
                  className="min-h-[50px] sm:min-h-[60px] text-xs sm:text-sm resize-none flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedPreset('');
                    handlePromptChange('');
                  }}
                  className="text-xs whitespace-nowrap h-9 px-3"
                >
                  Effacer
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-3 sm:space-y-4 min-h-0">
          {previews.map((preview) => (
            <div
              key={preview.productId}
              className="border rounded-lg p-2 sm:p-3 space-y-2 sm:space-y-3"
            >
              <div className="flex items-start justify-between flex-col sm:flex-row gap-2">
                <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
                  {!isSingleImage && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(preview.productId)}
                      onChange={() => handleToggleSelect(preview.productId)}
                      disabled={preview.status !== 'success'}
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-xs sm:text-sm line-clamp-2 break-words">{preview.productTitle}</h4>
                    {preview.status === 'generating' && (
                      <Badge variant="outline" className="gap-1 text-xs mt-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="hidden sm:inline">Génération en cours...</span>
                        <span className="sm:hidden">En cours...</span>
                      </Badge>
                    )}
                    {preview.status === 'success' && (
                      <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 text-xs mt-1">
                        <Check className="w-3 h-3" />
                        Généré
                      </Badge>
                    )}
                    {preview.status === 'error' && (
                      <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 text-xs mt-1">
                        <X className="w-3 h-3" />
                        Erreur
                      </Badge>
                    )}
                  </div>
                </div>

                {(preview.status === 'error' || preview.status === 'success') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRegenerate(preview.productId, localPrompt)}
                    className="gap-1 text-[10px] sm:text-xs whitespace-nowrap w-full sm:w-auto h-7 sm:h-8 px-2 sm:px-3"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Régénérer
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Original</p>
                  <div className="aspect-square bg-muted rounded-md overflow-hidden border">
                    <img
                      src={preview.originalUrl}
                      alt="Original"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                    IA
                  </p>
                  <div className="aspect-square bg-muted rounded-md overflow-hidden border">
                    {preview.status === 'generating' && (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {preview.status === 'success' && preview.generatedUrl && (
                      <img
                        src={preview.generatedUrl}
                        alt="Arrière-plan IA"
                        className="w-full h-full object-contain"
                      />
                    )}
                    {preview.status === 'error' && (
                      <div className="w-full h-full flex items-center justify-center text-center p-2 sm:p-4">
                        <div>
                          <X className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 mx-auto mb-2" />
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">{preview.error}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 sm:pt-4 border-t flex-shrink-0">
          {!isSingleImage && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              {successfulPreviews.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isGenerating}
                  className="text-[10px] sm:text-xs w-full sm:w-auto whitespace-nowrap h-8"
                >
                  {selectedIds.size === successfulPreviews.length ? 'Désélectionner' : 'Sélectionner tout'}
                </Button>
              )}
              <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                {selectedIds.size}/{successfulPreviews.length}
              </span>
            </div>
          )}
          {isSingleImage && <div className="hidden sm:block" />}

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={applying || isGenerating || syncing}
              className="w-full sm:w-auto text-xs h-8 sm:h-9"
            >
              Annuler
            </Button>
            {successfulPreviews.length > 0 && (
              <Button
                variant="outline"
                onClick={handleSyncToShopify}
                disabled={syncing || selectedIds.size === 0 || isGenerating || applying}
                className="w-full sm:w-auto text-[10px] sm:text-xs gap-1 sm:gap-2 h-8 sm:h-9"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Sync...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3 h-3" />
                    <span>Sync{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}</span>
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={handleApply}
              disabled={applying || selectedIds.size === 0 || isGenerating || syncing}
              className="w-full sm:w-auto text-xs h-8 sm:h-9"
            >
              {applying ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 sm:mr-2 animate-spin" />
                  <span>{selectedIds.size > 0 ? `${selectedIds.size}` : '...'}</span>
                </>
              ) : (
                `Appliquer${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
