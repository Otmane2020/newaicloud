import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download } from 'lucide-react';

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Prévisualisation - Fond Blanc HD</DialogTitle>
          <DialogDescription>
            Comparez l'image originale avec la version optimisée en 2000x2000px
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium mb-2">Original</p>
            <img src={originalImage} alt="Original" className="w-full h-auto border rounded" />
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Fond Blanc HD</p>
            <img src={optimizedImage} alt="Optimisé" className="w-full h-auto border rounded bg-white" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onApply} disabled={isApplying}>
            {isApplying ? 'Application...' : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Appliquer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
