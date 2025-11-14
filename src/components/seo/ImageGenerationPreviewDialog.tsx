import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, RefreshCw, Loader2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

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
  imageMetadata
}: ImageGenerationPreviewDialogProps) {
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

  // Reset image states when generatedImage changes
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
  }, [generatedImage]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prévisualisation - {title}</DialogTitle>
          <DialogDescription>
            {currentImage 
              ? "Comparez et validez l'image générée par IA avant de l'appliquer"
              : "Prévisualisez et validez l'image générée par IA avant de l'appliquer"
            }
          </DialogDescription>
        </DialogHeader>

        {/* Image Metadata */}
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
                Modèle: {imageMetadata.model}
              </Badge>
            )}
          </div>
        )}

        <div className={currentImage ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "space-y-4"}>
          {/* Current Image - Only shown if exists */}
          {currentImage && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Image actuelle</p>
              </div>
              <img 
                src={currentImage} 
                alt="Actuelle" 
                className="w-full h-auto border rounded-lg object-cover aspect-square bg-muted" 
              />
            </div>
          )}

          {/* Generated Image - Full width if no current image */}
          <div className={!currentImage ? "max-w-2xl mx-auto" : ""}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">
                {currentImage ? "Image générée par IA" : "Image IA générée"}
              </p>
              <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs">
                {currentImage ? "Nouveau" : "Nouvelle image"}
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
                  <p className="text-sm">Erreur de chargement</p>
                </div>
              )}
              {generatedImage && (
                <img 
                  src={generatedImage} 
                  alt="Générée" 
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

        {/* Regenerate Section */}
        {showRegenerateInput && (
          <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
            <Label htmlFor="regenerate-prompt">
              Modifier le prompt pour régénérer
            </Label>
            <Input
              id="regenerate-prompt"
              placeholder="Ex: Image plus lumineuse avec fond blanc minimaliste..."
              value={regeneratePrompt}
              onChange={(e) => setRegeneratePrompt(e.target.value)}
              disabled={isRegenerating}
            />
            <p className="text-xs text-muted-foreground">
              Décrivez les modifications souhaitées pour améliorer l'image
            </p>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isApplying || isRegenerating}
          >
            Annuler
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleRegenerate}
            disabled={isApplying || isRegenerating || (showRegenerateInput && !regeneratePrompt.trim())}
          >
            {isRegenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Régénération...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Régénérer
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
                Application...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Appliquer cette image
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
