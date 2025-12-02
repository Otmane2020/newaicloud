import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2, Facebook, Instagram, Image as ImageIcon } from "lucide-react";

type TemplateStyle = "gold" | "red-promo" | "minimal" | "tech" | "black-friday" | "story";

type ExportFormat = "png" | "jpg" | "webp";

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

export function CreativeExportDialog({ open, onOpenChange, product, template, caption }: CreativeExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [exporting, setExporting] = useState(false);
  const [publishing, setPublishing] = useState<"facebook" | "instagram" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const safeName = product?.title
    ?.replace(/[^a-z0-9]/gi, "-")
    .toLowerCase()
    .slice(0, 40);

  // ========================================
  // 🔥 GENERATE IMAGE PREVIEW
  // ========================================
  const generatePreview = async () => {
    if (!product) return;

    try {
      setPreview("loading");

      const { data, error } = await supabase.functions.invoke("export-creative-image", {
        body: { product, template, caption, format: "jpg", preview: true },
      });

      if (error) throw error;

      setPreview(data.imageUrl || `data:image/jpeg;base64,${data.base64}`);
    } catch (err: any) {
      console.error("Preview error:", err);
      toast.error("Impossible de générer l’aperçu.");
      setPreview(null);
    }
  };

  // ========================================
  // 🔥 EXPORT FINAL
  // ========================================
  const handleExport = async () => {
    if (!product) return;

    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-creative-image", {
        body: { product, template, caption, format },
      });

      if (error) throw error;

      const url = data.imageUrl ? data.imageUrl : `data:image/${format};base64,${data.base64}`;

      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeName}-creative.${format}`;
      link.click();

      toast.success("Image exportée avec succès !");
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error(err.message || "Erreur lors de l'export.");
    } finally {
      setExporting(false);
    }
  };

  // ========================================
  // 🔥 SHARE SOCIAL
  // ========================================
  const handlePublish = async (platform: "facebook" | "instagram") => {
    if (!product) return;

    setPublishing(platform);

    try {
      const fn = platform === "facebook" ? "share-article-facebook" : "share-article-instagram";

      const { error } = await supabase.functions.invoke(fn, {
        body: {
          type: "product",
          productId: product.id,
          caption,
          template,
        },
      });

      if (error) throw error;

      toast.success(`Publié sur ${platform === "facebook" ? "Facebook" : "Instagram"} !`);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Publish error:", err);
      toast.error(err.message || `Erreur lors de la publication (${platform})`);
    } finally {
      setPublishing(null);
    }
  };

  // ========================================
  // 🔥 LOAD PREVIEW ON OPEN
  // ========================================
  const handleOpenChange = (state: boolean) => {
    onOpenChange(state);
    if (state && product) generatePreview();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Exporter le Créatif
          </DialogTitle>
          <DialogDescription>
            Téléchargez le créatif généré ou publiez-le directement sur vos réseaux sociaux.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* ========================= */}
          {/* PREVIEW IMAGE             */}
          {/* ========================= */}
          <div className="w-full aspect-square bg-muted flex items-center justify-center rounded-lg overflow-hidden border relative">
            {preview === "loading" ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <p className="text-sm text-muted-foreground">Aperçu indisponible</p>
            )}
          </div>

          {/* ========================= */}
          {/* FORMAT SELECTION          */}
          {/* ========================= */}
          <div className="space-y-3">
            <Label>Format d’export</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="flex gap-4">
                {["png", "jpg", "webp"].map((f) => (
                  <div key={f} className="flex items-center space-x-2">
                    <RadioGroupItem value={f} id={f} />
                    <Label htmlFor={f} className="cursor-pointer uppercase">
                      {f}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* ========================= */}
          {/* EXPORT BUTTON             */}
          {/* ========================= */}
          <Button onClick={handleExport} disabled={exporting || !product} className="w-full">
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Télécharger l’image
          </Button>

          {/* DIVIDER */}
          <div className="flex items-center gap-4 text-xs uppercase text-muted-foreground">
            <div className="flex-1 border-t" />
            ou
            <div className="flex-1 border-t" />
          </div>

          {/* ========================= */}
          {/* SOCIAL SHARE BUTTONS      */}
          {/* ========================= */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => handlePublish("facebook")}
              disabled={publishing !== null}
              className="gap-2"
            >
              {publishing === "facebook" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Facebook className="h-4 w-4 text-blue-600" />
              )}
              Facebook
            </Button>

            <Button
              variant="outline"
              onClick={() => handlePublish("instagram")}
              disabled={publishing !== null}
              className="gap-2"
            >
              {publishing === "instagram" ? (
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
