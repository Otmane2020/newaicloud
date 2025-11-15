import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface SingleImagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalImage: string;
  optimizedImage: string;
  onApply: () => Promise<void>;
  isApplying?: boolean;
}

export function SingleImagePreviewDialog({
  open,
  onOpenChange,
  originalImage,
  optimizedImage,
  onApply,
  isApplying = false
}: SingleImagePreviewDialogProps) {
  const { t } = useTranslation();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t.seo.imagePreview.whiteBackground.title}</DialogTitle>
          <DialogDescription>
            {t.seo.imagePreview.whiteBackground.description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium mb-2">{t.seo.imagePreview.whiteBackground.original}</p>
            <img src={originalImage} alt={t.seo.imagePreview.whiteBackground.original} className="w-full h-auto border rounded" />
          </div>
          <div>
            <p className="text-sm font-medium mb-2">{t.seo.imagePreview.whiteBackground.optimized}</p>
            <img src={optimizedImage} alt={t.seo.imagePreview.whiteBackground.optimized} className="w-full h-auto border rounded bg-white" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button onClick={onApply} disabled={isApplying}>
            {isApplying ? t.common.applying : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {t.common.apply}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
