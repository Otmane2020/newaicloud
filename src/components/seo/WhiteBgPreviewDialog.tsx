import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/lib/language';

interface PreviewImage {
  productId: string;
  productTitle: string;
  originalUrl: string;
  generatedUrl: string | null;
  status: 'pending' | 'generating' | 'success' | 'error';
  error?: string;
}

interface WhiteBgPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previews: PreviewImage[];
  onApply: (selectedIds: string[], format: string) => void;
  onRegenerate: (productId: string) => void;
}

export function WhiteBgPreviewDialog({
  open,
  onOpenChange,
  previews,
  onApply,
  onRegenerate,
}: WhiteBgPreviewDialogProps) {
  const { t, tf } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<string>('square');

  useEffect(() => {
    // Auto-select all successful generations
    const successIds = previews
      .filter(p => p.status === 'success' && p.generatedUrl)
      .map(p => p.productId);
    
    if (successIds.length > 0) {
      setSelectedIds(new Set(successIds));
    }
  }, [previews]);

  const handleToggle = (productId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedIds(newSelection);
  };

  const handleSelectAll = () => {
    const successIds = previews
      .filter(p => p.status === 'success' && p.generatedUrl)
      .map(p => p.productId);
    setSelectedIds(new Set(successIds));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleApply = () => {
    onApply(Array.from(selectedIds), format);
  };

  const successCount = previews.filter(p => p.status === 'success').length;
  const errorCount = previews.filter(p => p.status === 'error').length;
  const generatingCount = previews.filter(p => p.status === 'generating' || p.status === 'pending').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.dialogs.whiteBgPreview.title}</DialogTitle>
          <DialogDescription>
            {t.dialogs.whiteBgPreview.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format Selector */}
          <div className="space-y-2">
            <Label htmlFor="format">{t.dialogs.whiteBgPreview.imageFormat}</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger id="format">
                <SelectValue placeholder={t.dialogs.whiteBgPreview.selectFormat} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="square">{t.dialogs.whiteBgPreview.square}</SelectItem>
                <SelectItem value="portrait">{t.dialogs.whiteBgPreview.portrait}</SelectItem>
                <SelectItem value="landscape">{t.dialogs.whiteBgPreview.landscape}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                {successCount} {t.dialogs.whiteBgPreview.success}
              </span>
              {generatingCount > 0 && (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  {generatingCount} {t.dialogs.whiteBgPreview.inProgress}
                </span>
              )}
              {errorCount > 0 && (
                <span className="flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-red-600" />
                  {errorCount} {t.dialogs.whiteBgPreview.failed}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={handleSelectAll}>
                {t.dialogs.whiteBgPreview.selectAll}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDeselectAll}>
                {t.dialogs.whiteBgPreview.deselectAll}
              </Button>
            </div>
          </div>

          {/* Preview Grid */}
          <div className="grid grid-cols-1 gap-4">
            {previews.map((preview) => (
              <div
                key={preview.productId}
                className="border rounded-lg p-4 flex items-start gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {preview.status === 'success' && preview.generatedUrl && (
                      <Checkbox
                        checked={selectedIds.has(preview.productId)}
                        onCheckedChange={() => handleToggle(preview.productId)}
                      />
                    )}
                    <h4 className="font-medium text-sm">{preview.productTitle}</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Original */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">{t.dialogs.whiteBgPreview.original}</p>
                      <img
                        src={preview.originalUrl}
                        alt="Original"
                        className="w-full h-40 object-contain border rounded"
                      />
                    </div>

                    {/* Generated */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">{t.dialogs.whiteBgPreview.whiteBg}</p>
                      {preview.status === 'pending' && (
                        <div className="w-full h-40 border rounded flex items-center justify-center bg-muted">
                          <span className="text-sm text-muted-foreground">{t.dialogs.whiteBgPreview.waiting}</span>
                        </div>
                      )}
                      {preview.status === 'generating' && (
                        <div className="w-full h-40 border rounded flex items-center justify-center bg-muted">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                      )}
                      {preview.status === 'success' && preview.generatedUrl && (
                        <img
                          src={preview.generatedUrl}
                          alt={t.dialogs.whiteBgPreview.whiteBg}
                          className="w-full h-40 object-contain border rounded bg-white"
                        />
                      )}
                      {preview.status === 'error' && (
                        <div className="w-full h-40 border border-red-300 rounded flex flex-col items-center justify-center bg-red-50 gap-2">
                          <XCircle className="w-8 h-8 text-red-600" />
                          <p className="text-xs text-red-600 px-2 text-center">
                            {preview.error || t.dialogs.whiteBgPreview.generationError}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRegenerate(preview.productId)}
                            className="gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            {t.dialogs.whiteBgPreview.regenerate}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.dialogs.whiteBgPreview.cancel}
          </Button>
          <Button
            onClick={handleApply}
            disabled={selectedIds.size === 0 || generatingCount > 0}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {tf('dialogs.whiteBgPreview.apply', { count: selectedIds.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
