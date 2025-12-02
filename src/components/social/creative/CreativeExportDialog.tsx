import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2, Share2, Facebook, Instagram } from "lucide-react";

type TemplateStyle = 'gold' | 'red-promo' | 'minimal' | 'tech' | 'black-friday' | 'story';
type ExportFormat = 'png' | 'jpg' | 'webp';

interface CreativeExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    title: string;
    image: string | null;
    price: string | null;
    compare_at_price: string | null;
  } | null;
  template: TemplateStyle;
  caption: string;
}

export function CreativeExportDialog({ 
  open, 
  onOpenChange, 
  product, 
  template, 
  caption 
}: CreativeExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [exporting, setExporting] = useState(false);
  const [publishing, setPublishing] = useState<'facebook' | 'instagram' | null>(null);

  const handleExport = async () => {
    if (!product) return;

    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-creative-image', {
        body: {
          product,
          template,
          caption,
          format
        }
      });

      if (error) throw error;

      // Download the image
      if (data.imageUrl) {
        const link = document.createElement('a');
        link.href = data.imageUrl;
        link.download = `${product.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-creative.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Image exportée avec succès!");
      } else if (data.base64) {
        const link = document.createElement('a');
        link.href = `data:image/${format};base64,${data.base64}`;
        link.download = `${product.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-creative.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Image exportée avec succès!");
      }
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || "Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  const handlePublish = async (platform: 'facebook' | 'instagram') => {
    if (!product) return;

    setPublishing(platform);
    try {
      const functionName = platform === 'facebook' ? 'share-article-facebook' : 'share-article-instagram';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          type: 'product',
          productId: product.id,
          caption,
          template
        }
      });

      if (error) throw error;

      toast.success(`Publié sur ${platform === 'facebook' ? 'Facebook' : 'Instagram'}!`);
      onOpenChange(false);
    } catch (error: any) {
      console.error(`${platform} publish error:`, error);
      toast.error(error.message || `Erreur lors de la publication sur ${platform}`);
    } finally {
      setPublishing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exporter le Créatif
          </DialogTitle>
          <DialogDescription>
            Téléchargez l'image ou publiez directement sur vos réseaux sociaux.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Format d'export</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="png" id="png" />
                  <Label htmlFor="png" className="cursor-pointer">PNG</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="jpg" id="jpg" />
                  <Label htmlFor="jpg" className="cursor-pointer">JPG</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="webp" id="webp" />
                  <Label htmlFor="webp" className="cursor-pointer">WebP</Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Download Button */}
          <Button 
            onClick={handleExport} 
            disabled={exporting || !product}
            className="w-full"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Télécharger l'image
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                ou publier directement
              </span>
            </div>
          </div>

          {/* Social Publish Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline"
              onClick={() => handlePublish('facebook')}
              disabled={publishing !== null || !product}
              className="gap-2"
            >
              {publishing === 'facebook' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Facebook className="h-4 w-4 text-blue-600" />
              )}
              Facebook
            </Button>
            <Button 
              variant="outline"
              onClick={() => handlePublish('instagram')}
              disabled={publishing !== null || !product}
              className="gap-2"
            >
              {publishing === 'instagram' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Instagram className="h-4 w-4 text-pink-600" />
              )}
              Instagram
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
