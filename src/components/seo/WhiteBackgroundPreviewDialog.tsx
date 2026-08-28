import { useEffect, useState } from 'react';
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
import { Loader2, Check, X, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/lib/language';
import { getImageUiTranslations, translateImageGenerationError } from '@/lib/imageUiTranslations';

interface PreviewImage {
  productId: string;
  productTitle: string;
  originalUrl: string;
  generatedUrl: string | null;
  status: 'pending' | 'generating' | 'success' | 'error';
  error?: string;
  variantId?: string;
  variantTitle?: string;
}

interface WhiteBackgroundPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previews: PreviewImage[];
  onApply: (productIds: string[], format: string, imageType: 'primary' | 'secondary') => Promise<void>;
  onRegenerate: (productId: string) => Promise<void>;
}

export function WhiteBackgroundPreviewDialog({
  open,
  onOpenChange,
  previews,
  onApply,
  onRegenerate,
}: WhiteBackgroundPreviewDialogProps) {
  const { language } = useTranslation();
  const ui = getImageUiTranslations(language);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [format, setFormat] = useState<string>('square');
  const [imageType, setImageType] = useState<'primary' | 'secondary'>('primary');

  const getUniqueKey = (preview: PreviewImage) =>
    preview.variantId ? `${preview.productId}-${preview.variantId}` : preview.productId;

  const successfulPreviews = previews.filter((preview) => preview.status === 'success');
  const isGenerating = previews.some((preview) => preview.status === 'generating');
  const isSingleImage = previews.length === 1;

  useEffect(() => {
    if (open && previews.length > 0) {
      console.log(
        `🖼️ [WhiteBgPreviewDialog] Dialog opened with ${previews.length} preview(s):`,
        previews.map((preview) => ({
          productId: preview.productId,
          productTitle: preview.productTitle,
          variantId: preview.variantId,
          status: preview.status,
          hasGeneratedUrl: !!preview.generatedUrl,
          generatedUrl: preview.generatedUrl,
          error: preview.error,
        })),
      );
    }
  }, [open, previews]);

  useEffect(() => {
    if (isSingleImage && previews[0]?.status === 'success') {
      const key = getUniqueKey(previews[0]);
      setSelectedIds((previous) => {
        if (previous.has(key) && previous.size === 1) return previous;
        return new Set([key]);
      });
    }
  }, [isSingleImage, previews]);

  const handleToggleSelect = (uniqueKey: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(uniqueKey)) next.delete(uniqueKey);
      else next.add(uniqueKey);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === successfulPreviews.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(successfulPreviews.map(getUniqueKey)));
  };

  const handleApply = async () => {
    if (selectedIds.size === 0) return;
    setApplying(true);
    try {
      await onApply(Array.from(selectedIds), format, imageType);
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] w-full flex flex-col overflow-hidden">
        <DialogHeader className="space-y-2 shrink-0">
          <DialogTitle className="text-base sm:text-lg">{ui.whiteBackground.title}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isSingleImage
              ? ui.whiteBackground.singleDescription
              : ui.whiteBackground.multipleDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 px-6 pb-4 border-b shrink-0">
          <div className="space-y-2">
            <Label htmlFor="white-bg-format" className="text-xs sm:text-sm">
              {ui.whiteBackground.imageFormat}
            </Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger id="white-bg-format" className="h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder={ui.whiteBackground.selectFormat} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="square" className="text-xs sm:text-sm">
                  {ui.whiteBackground.square}
                </SelectItem>
                <SelectItem value="portrait" className="text-xs sm:text-sm">
                  {ui.whiteBackground.portrait}
                </SelectItem>
                <SelectItem value="landscape" className="text-xs sm:text-sm">
                  {ui.whiteBackground.landscape}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image-type" className="text-xs sm:text-sm">
              {ui.whiteBackground.imageType}
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setImageType('primary')}
                className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-left ${
                  imageType === 'primary'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                      imageType === 'primary' ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}
                  >
                    {imageType === 'primary' && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-xs sm:text-sm">{ui.whiteBackground.mainImage}</h4>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      {ui.whiteBackground.mainImageDescription}
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setImageType('secondary')}
                className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-left ${
                  imageType === 'secondary'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                      imageType === 'secondary' ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}
                  >
                    {imageType === 'secondary' && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-xs sm:text-sm">{ui.whiteBackground.secondaryImage}</h4>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      {ui.whiteBackground.secondaryImageDescription}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto px-6">
          <div className="space-y-4 pr-4 pb-4">
            {previews.map((preview) => {
              const uniqueKey = getUniqueKey(preview);
              return (
                <div key={uniqueKey} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      {!isSingleImage && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(uniqueKey)}
                          onChange={() => handleToggleSelect(uniqueKey)}
                          disabled={preview.status !== 'success'}
                          className="w-4 h-4 flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-xs sm:text-sm md:text-base truncate">
                          {preview.productTitle}
                          {preview.variantTitle ? ` - ${preview.variantTitle}` : ''}
                        </h4>
                        {preview.status === 'generating' && (
                          <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs mt-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span className="hidden sm:inline">{ui.common.generating}</span>
                            <span className="sm:hidden">{ui.common.inProgress}</span>
                          </Badge>
                        )}
                        {preview.status === 'success' && (
                          <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 text-[10px] sm:text-xs mt-1">
                            <Check className="w-3 h-3" />
                            {ui.common.generated}
                          </Badge>
                        )}
                        {preview.status === 'error' && (
                          <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 text-[10px] sm:text-xs mt-1">
                            <X className="w-3 h-3" />
                            {ui.common.error}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {preview.status === 'error' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRegenerate(preview.productId)}
                        className="gap-2 text-xs h-8 w-full sm:w-auto"
                      >
                        <RefreshCw className="w-3 h-3" />
                        {ui.common.regenerate}
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                        {ui.whiteBackground.originalImage}
                      </p>
                      <div className="relative w-full bg-muted rounded-lg overflow-hidden border-2 border-border flex items-center justify-center shadow-sm">
                        <img
                          src={preview.originalUrl}
                          alt={ui.whiteBackground.originalAlt}
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                        {ui.whiteBackground.aiWhiteBackground}
                      </p>
                      <div className="relative w-full bg-muted rounded-lg overflow-hidden border-2 border-primary/20 flex items-center justify-center min-h-[160px] shadow-sm">
                        {preview.status === 'generating' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-muted-foreground" />
                          </div>
                        )}
                        {preview.status === 'success' && preview.generatedUrl && (
                          <>
                            <img
                              src={preview.generatedUrl}
                              alt={ui.whiteBackground.generatedAlt}
                              className="w-full h-auto object-contain"
                            />
                            <div className="absolute bottom-2 right-2 bg-primary/10 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-muted-foreground">
                              {ui.whiteBackground.aiGenerated}
                            </div>
                          </>
                        )}
                        {preview.status === 'error' && (
                          <div className="absolute inset-0 flex items-center justify-center text-center p-2 sm:p-4">
                            <div>
                              <X className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 mx-auto mb-2" />
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {translateImageGenerationError(preview.error, language)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-4 border-t bg-background shrink-0">
          {!isSingleImage && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              {successfulPreviews.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isGenerating}
                  className="text-xs sm:text-sm h-9 w-full sm:w-auto"
                >
                  {selectedIds.size === successfulPreviews.length
                    ? ui.whiteBackground.deselectAll
                    : ui.whiteBackground.selectAll}
                </Button>
              )}
              <span className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-0">
                {ui.whiteBackground.selectedCount(selectedIds.size, successfulPreviews.length)}
              </span>
            </div>
          )}
          {isSingleImage && <div className="hidden sm:block" />}

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={applying || isGenerating}
              className="flex-1 sm:flex-none text-sm h-11 sm:h-10"
            >
              {ui.common.cancel}
            </Button>
            <Button
              onClick={handleApply}
              disabled={applying || selectedIds.size === 0 || isGenerating}
              className="flex-1 sm:flex-none text-sm h-11 sm:h-10 bg-primary hover:bg-primary/90 font-medium"
            >
              {applying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {ui.common.applying}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {ui.common.apply} {selectedIds.size > 0 && `(${selectedIds.size})`}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
