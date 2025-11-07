import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Package, FileText, Newspaper, FolderOpen, Image } from "lucide-react";

interface ImportConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  storeName: string;
}

export function ImportConfirmDialog({ 
  open, 
  onOpenChange, 
  onConfirm,
  storeName 
}: ImportConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Import Your Data
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-2">
            <p className="text-base">
              Would you like to import your data from <span className="font-semibold text-foreground">{storeName}</span>?
            </p>
            
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">Products</p>
                  <p className="text-xs text-muted-foreground">All your store products</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">Pages</p>
                  <p className="text-xs text-muted-foreground">Your Shopify pages</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Newspaper className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">Articles</p>
                  <p className="text-xs text-muted-foreground">Your blog articles</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">Collections</p>
                  <p className="text-xs text-muted-foreground">Your product collections</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Image className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">Images</p>
                  <p className="text-xs text-muted-foreground">Product images & content</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              This process may take a few minutes depending on the amount of data.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Later</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-primary hover:bg-primary/90">
            Start Import
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
