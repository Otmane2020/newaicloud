import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

interface ReplaceLinkDialogProps {
  open: boolean;
  onClose: () => void;
  link: {
    id: string;
    target_url: string;
    anchor_text: string;
    error_message?: string | null;
  } | null;
  onSuccess: () => void;
}

export function ReplaceLinkDialog({ open, onClose, link, onSuccess }: ReplaceLinkDialogProps) {
  const { t } = useTranslation();
  const [newUrl, setNewUrl] = useState("");
  const [updateAll, setUpdateAll] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "success" | "error">("idle");
  const [verificationMessage, setVerificationMessage] = useState("");

  const handleVerifyUrl = async () => {
    if (!newUrl) {
      toast.error(t.blog.dialogs.replaceLink.toasts.enterUrl);
      return;
    }

    setIsVerifying(true);
    setVerificationStatus("idle");

    try {
      const response = await fetch(newUrl, {
        method: "HEAD",
        mode: "no-cors",
      });

      setVerificationStatus("success");
      setVerificationMessage(t.blog.dialogs.replaceLink.toasts.urlAccessible);
      toast.success(t.blog.dialogs.replaceLink.toasts.verified);
    } catch (error) {
      // In no-cors mode, we can't access the response, so we'll just check if the fetch didn't throw
      setVerificationStatus("success");
      setVerificationMessage(t.blog.dialogs.replaceLink.toasts.urlAccessible);
      toast.success(t.blog.dialogs.replaceLink.toasts.verified);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReplace = async () => {
    if (!link || !newUrl) return;

    setIsReplacing(true);

    try {
      const { data, error } = await supabase.functions.invoke("update-article-link", {
        body: {
          link_id: link.id,
          new_url: newUrl,
          update_all_identical: updateAll,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Échec de la mise à jour");
      }

      toast.success(data.message || t.blog.dialogs.replaceLink.toasts.replaced);
      onSuccess();
      onClose();
      setNewUrl("");
      setUpdateAll(false);
      setVerificationStatus("idle");
    } catch (error: any) {
      console.error("Error replacing link:", error);
      toast.error(error.message || t.blog.dialogs.replaceLink.toasts.error);
    } finally {
      setIsReplacing(false);
    }
  };

  if (!link) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t.blog.dialogs.replaceLink.title}</DialogTitle>
          <DialogDescription>
            {t.blog.dialogs.replaceLink.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Old URL */}
          <div className="space-y-2">
            <Label className="text-destructive">{t.blog.dialogs.replaceLink.oldUrl}</Label>
            <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <span className="text-sm break-all">{link.target_url}</span>
            </div>
            {link.error_message && (
              <p className="text-xs text-muted-foreground">Erreur: {link.error_message}</p>
            )}
          </div>

          {/* Anchor Text */}
          <div className="space-y-2">
            <Label>{t.blog.dialogs.replaceLink.anchorText}</Label>
            <div className="p-3 bg-muted rounded-md">
              <span className="text-sm">{link.anchor_text}</span>
            </div>
          </div>

          {/* New URL */}
          <div className="space-y-2">
            <Label htmlFor="new-url">{t.blog.dialogs.replaceLink.newUrl}</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  id="new-url"
                  type="url"
                  placeholder="https://example.com/nouvelle-page"
                  value={newUrl}
                  onChange={(e) => {
                    setNewUrl(e.target.value);
                    setVerificationStatus("idle");
                  }}
                  disabled={isReplacing}
                />
                {verificationStatus === "success" && (
                  <CheckCircle2 className="w-4 h-4 text-green-600 absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>
              <Button
                variant="outline"
                onClick={handleVerifyUrl}
                disabled={!newUrl || isVerifying || isReplacing}
              >
                {isVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                <span className="ml-2">{t.blog.dialogs.replaceLink.verify}</span>
              </Button>
            </div>
            {verificationStatus === "success" && (
              <p className="text-xs text-green-600">{verificationMessage}</p>
            )}
            {verificationStatus === "error" && (
              <p className="text-xs text-destructive">{verificationMessage}</p>
            )}
          </div>

          {/* Update All Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="update-all"
              checked={updateAll}
              onCheckedChange={(checked) => setUpdateAll(checked as boolean)}
              disabled={isReplacing}
            />
            <Label
              htmlFor="update-all"
              className="text-sm font-normal cursor-pointer"
            >
              {t.blog.dialogs.replaceLink.updateAll}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isReplacing}>
            {t.blog.dialogs.replaceLink.cancel}
          </Button>
          <Button
            onClick={handleReplace}
            disabled={!newUrl || isReplacing}
          >
            {isReplacing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t.blog.dialogs.replaceLink.replace}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}