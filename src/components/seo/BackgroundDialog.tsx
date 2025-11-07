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
import { Loader2, Check, X, RefreshCw, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  onApply: (productIds: string[], format: string, similarity?: string) => Promise<void>;
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
    label: 'Nature luxueuse',
    value: 'Place this product in a luxurious natural environment with elegant plants and soft natural lighting'
  },
  {
    label: 'Minimaliste moderne',
    value: 'Place this product in a modern minimalist setting with clean lines and geometric shapes'
  },
  {
    label: 'Lifestyle chaleureux',
    value: 'Place this product in a warm lifestyle scene with cozy home elements and soft ambient lighting'
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
  const [localPrompt, setLocalPrompt] = useState(customPrompt);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [format, setFormat] = useState<string>('square');
  const [similarity, setSimilarity] = useState<string>('medium');

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
      await onApply(Array.from(selectedIds), format, similarity);
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Prévisualisation des arrière-plans IA
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Personnalisez l'arrière-plan de vos produits avec l'intelligence artificielle
          </DialogDescription>
        </DialogHeader>

        {/* Format and Prompt Section */}
        <div className="space-y-3 border-b pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bg-format" className="text-xs sm:text-sm">Format d'image</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger id="bg-format" className="text-xs sm:text-sm">
                  <SelectValue placeholder="Sélectionner un format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Carré (1:1)</SelectItem>
                  <SelectItem value="portrait">Portrait (3:4)</SelectItem>
                  <SelectItem value="landscape">Paysage (4:3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bg-similarity" className="text-xs sm:text-sm">Ressemblance à l'original</Label>
              <Select value={similarity} onValueChange={setSimilarity}>
                <SelectTrigger id="bg-similarity" className="text-xs sm:text-sm">
                  <SelectValue placeholder="Niveau de ressemblance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="very-close">🎯 Très proche (90%)</SelectItem>
                  <SelectItem value="close">✓ Proche (70%)</SelectItem>
                  <SelectItem value="medium">⚖️ Équilibré (50%)</SelectItem>
                  <SelectItem value="creative">🎨 Créatif (30%)</SelectItem>
                  <SelectItem value="very-creative">✨ Très créatif (10%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Prompt personnalisé</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-full sm:w-[280px] text-xs sm:text-sm">
                  <SelectValue placeholder="Choisir un style prédéfini..." />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_PROMPTS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value} className="text-xs sm:text-sm">
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedPreset('');
                  handlePromptChange('');
                }}
                className="text-xs sm:text-sm"
              >
                Effacer
              </Button>
            </div>
          </div>
          <Textarea
            value={localPrompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder="Ou décrivez votre propre style d'arrière-plan en anglais..."
            className="min-h-[60px] sm:min-h-[80px] text-xs sm:text-sm"
          />
        </div>

        <ScrollArea className="h-[40vh] sm:h-[50vh] pr-2 sm:pr-4">
          <div className="space-y-4 sm:space-y-6">
            {previews.map((preview) => (
              <div
                key={preview.productId}
                className="border rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3"
              >
                <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    {!isSingleImage && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(preview.productId)}
                        onChange={() => handleToggleSelect(preview.productId)}
                        disabled={preview.status !== 'success'}
                        className="w-4 h-4 flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm sm:text-base truncate">{preview.productTitle}</h4>
                      {preview.status === 'generating' && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="hidden sm:inline">Génération en cours...</span>
                          <span className="sm:hidden">En cours...</span>
                        </Badge>
                      )}
                      {preview.status === 'success' && (
                        <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 text-xs">
                          <Check className="w-3 h-3" />
                          Généré
                        </Badge>
                      )}
                      {preview.status === 'error' && (
                        <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 text-xs">
                          <X className="w-3 h-3" />
                          Erreur
                        </Badge>
                      )}
                    </div>
                  </div>

                  {preview.status === 'error' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRegenerate(preview.productId, localPrompt)}
                      className="gap-2 text-xs"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span className="hidden sm:inline">Régénérer</span>
                      <span className="sm:hidden">Régén.</span>
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Image originale</p>
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden border">
                      <img
                        src={preview.originalUrl}
                        alt="Original"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                      Arrière-plan IA
                    </p>
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden border">
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
                            <p className="text-xs sm:text-sm text-muted-foreground">{preview.error}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {!isSingleImage && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              {successfulPreviews.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isGenerating}
                  className="text-xs sm:text-sm w-full sm:w-auto"
                >
                  {selectedIds.size === successfulPreviews.length
                    ? 'Tout désélectionner'
                    : 'Tout sélectionner'}
                </Button>
              )}
              <span className="text-xs sm:text-sm text-muted-foreground">
                {selectedIds.size} sélectionné(s) sur {successfulPreviews.length}
              </span>
            </div>
          )}
          {isSingleImage && <div className="hidden sm:block" />}

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={applying || isGenerating}
              className="flex-1 sm:flex-none text-xs sm:text-sm"
            >
              Annuler
            </Button>
            <Button
              onClick={handleApply}
              disabled={applying || selectedIds.size === 0 || isGenerating}
              className="flex-1 sm:flex-none text-xs sm:text-sm"
            >
              {applying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Application...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                `Appliquer ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
