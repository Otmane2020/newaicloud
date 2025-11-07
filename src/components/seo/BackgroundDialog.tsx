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
  onApply: (productIds: string[], format: string) => Promise<void>;
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
      await onApply(Array.from(selectedIds), format);
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Prévisualisation des arrière-plans IA
          </DialogTitle>
          <DialogDescription>
            Personnalisez l'arrière-plan de vos produits avec l'intelligence artificielle
          </DialogDescription>
        </DialogHeader>

        {/* Format and Prompt Section */}
        <div className="space-y-3 border-b pb-4">
          <div className="space-y-2">
            <Label htmlFor="bg-format">Format d'image</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger id="bg-format">
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
            <Label>Prompt personnalisé</Label>
            <div className="flex gap-2">
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Choisir un style prédéfini..." />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_PROMPTS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
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
              >
                Effacer
              </Button>
            </div>
          </div>
          <Textarea
            value={localPrompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder="Ou décrivez votre propre style d'arrière-plan en anglais..."
            className="min-h-[80px]"
          />
        </div>

        <ScrollArea className="h-[50vh] pr-4">
          <div className="space-y-6">
            {previews.map((preview) => (
              <div
                key={preview.productId}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {!isSingleImage && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(preview.productId)}
                        onChange={() => handleToggleSelect(preview.productId)}
                        disabled={preview.status !== 'success'}
                        className="w-4 h-4"
                      />
                    )}
                    <div>
                      <h4 className="font-medium">{preview.productTitle}</h4>
                      {preview.status === 'generating' && (
                        <Badge variant="outline" className="gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Génération en cours...
                        </Badge>
                      )}
                      {preview.status === 'success' && (
                        <Badge variant="outline" className="gap-1 bg-green-50 text-green-700">
                          <Check className="w-3 h-3" />
                          Généré
                        </Badge>
                      )}
                      {preview.status === 'error' && (
                        <Badge variant="outline" className="gap-1 bg-red-50 text-red-700">
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
                      className="gap-2"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Régénérer
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Image originale</p>
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden border">
                      <img
                        src={preview.originalUrl}
                        alt="Original"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Arrière-plan IA
                    </p>
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden border">
                      {preview.status === 'generating' && (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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
                        <div className="w-full h-full flex items-center justify-center text-center p-4">
                          <div>
                            <X className="w-8 h-8 text-red-500 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">{preview.error}</p>
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

        <DialogFooter className="flex items-center justify-between">
          {!isSingleImage && (
            <div className="flex items-center gap-2">
              {successfulPreviews.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isGenerating}
                >
                  {selectedIds.size === successfulPreviews.length
                    ? 'Tout désélectionner'
                    : 'Tout sélectionner'}
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} sélectionné(s) sur {successfulPreviews.length}
              </span>
            </div>
          )}
          {isSingleImage && <div />}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={applying || isGenerating}
            >
              Annuler
            </Button>
            <Button
              onClick={handleApply}
              disabled={applying || selectedIds.size === 0 || isGenerating}
            >
              {applying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Application...
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
