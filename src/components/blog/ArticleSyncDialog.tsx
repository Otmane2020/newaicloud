import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload } from "lucide-react";
import { useTranslation } from "@/lib/language";

interface ArticleSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: {
    title: string;
    seo_title?: string;
    seo_description?: string;
  };
  onConfirm: () => void;
  loading?: boolean;
}

export function ArticleSyncDialog({ open, onOpenChange, article, onConfirm, loading }: ArticleSyncDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle>{t.blog.submenu.articles}</DialogTitle>
        <DialogDescription>{t.blog.description}</DialogDescription>

        <Card className="p-4">
          <h3 className="font-semibold text-lg mb-3">{article.title}</h3>
          {article.seo_title && (
            <div className="mt-3">
              <Badge variant="outline" className="mb-1">
                {t.productDetail.seoTitle}
              </Badge>
              <p className="text-sm text-muted-foreground">{article.seo_title}</p>
            </div>
          )}
          {article.seo_description && (
            <div className="mt-3">
              <Badge variant="outline" className="mb-1">
                {t.productDetail.seoDescription}
              </Badge>
              <p className="text-sm text-muted-foreground">{article.seo_description}</p>
            </div>
          )}
        </Card>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={loading}>
            {t.common.cancel}
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="flex-1 gap-2">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t.common.loading}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {t.articles.publish}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
