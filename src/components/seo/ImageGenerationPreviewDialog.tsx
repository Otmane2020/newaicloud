import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, RefreshCw, Loader2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/language';
import { getImageUiTranslations } from '@/lib/imageUiTranslations';

interface ImageGenerationPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImage: string | null;
  generatedImage: string;
  title: string;
  isApplying?: boolean;
  isRegenerating?: boolean;
  onApply: () => Promise<void>;
  onRegenerate: (newPrompt: string) => Promise<void>;
  imageMetadata?: {
    width?: number;
    height?: number;
    model?: string;
  };
}

export function ImageGenerationPreviewDialog({
  open,
  onOpenChange,
  currentImage,
  generatedImage,
  title,
  isApplying = false,
  isRegenerating = false,
  onApply,
  onRegenerate,
  imageMetadata,
}: ImageGenerationPreviewDialogProps) {
  const { language } = useTranslation();
  const ui = getImageUiTranslations(language);
  const [regeneratePrompt, setRegeneratePrompt] = useState('');
  const [showRegenerateInput, setShowRegenerateInput] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleRegenerate = async () => {
    if (!regeneratePrompt.trim()) {
      setShowRegenerateInput(true);
      return;
    }

    await onRegenerate(regeneratePrompt);
    setRegeneratePrompt('');
    setShowRegenerateInput(false);
  };

  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
  }, [generatedImage]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ui.generationPreview.title(title)}</DialogTitle>
          <DialogDescription>
            {currentImage
              ? ui.generationPreview.compareDescription
              : ui.generationPreview.previewDescription}
          </DialogDescription>
        </DialogHeader>

        {imageMetadata && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-3 h-3" />
            {imageMetadata.width && imageMetadata.height && (
              <Badge variant="outline" className="text-xs">
                {imageMetadata.width} × {imageMetadata.height}px
              </Badge>
            )}
            {imageMetadata.model && (
              <Badge variant="outline" className="text-xs">
                {ui.common.model}: {imageMetadata.model}
              </Badge>
            )}
          </div>
        )}

        <div className={currentImage ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-4'}>
          {currentImage && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">{ui.generationPreview.currentImage}</p>
              </div>
              <img
                src={currentImage}
                alt={ui.generationPreview.currentAlt}
                className="w-full h-auto border rounded-lg object-cover aspect-square bg-muted"
              />
            </div>
          )}

          <div className={!currentImage ? 'max-w-2xl mx-auto' : ''}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">
                {currentImage
                  ? ui.generationPreview.generatedImage
                  : ui.generationPreview.generatedImageOnly}
              </p>
              <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs">
                {currentImage ? ui.generationPreview.new : ui.generationPreview.newImage}
              </Badge>
            </div>
            <div className="relative w-full aspect-square border rounded-lg overflow-hidden bg-white">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              )}
              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
                  <p className="text-sm">{ui.generationPreview.loadError}</p>
                </div>
              )}
              {generatedImage && (
                <img
                  src={generatedImage}
                  alt={ui.generationPreview.generatedAlt}
                  className="w-full h-full object-cover"
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {showRegenerateInput && (
          <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
            <Label htmlFor="regenerate-prompt">{ui.generationPreview.modifyPrompt}</Label>
            <Input
              id="regenerate-prompt"
              placeholder={ui.generationPreview.promptPlaceholder}
              value={regeneratePrompt}
              onChange={(event) => setRegeneratePrompt(event.target.value)}
              disabled={isRegenerating}
            />
            <p className="text-xs text-muted-foreground">{ui.generationPreview.promptHelp}</p>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isApplying || isRegenerating}
          >
            {ui.common.cancel}
          </Button>

          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={isApplying || isRegenerating || (showRegenerateInput && !regeneratePrompt.trim())}
          >
            {isRegenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {ui.common.regenerating}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {ui.common.regenerate}
              </>
            )}
          </Button>

          <Button
            onClick={onApply}
            disabled={isApplying || isRegenerating}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {ui.common.applying}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {ui.generationPreview.applyImage}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
