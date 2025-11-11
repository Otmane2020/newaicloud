import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Download, RotateCcw, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { responsiveDialogClasses } from "@/lib/dialogUtils";

interface LandingPageVersion {
  id: string;
  version_number: number;
  landing_page_html: string;
  created_at: string;
  is_current: boolean;
}

interface LandingPagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productTitle: string;
  productHandle: string;
  currentLandingPage?: string;
}

export function LandingPagePreviewDialog({
  open,
  onOpenChange,
  productId,
  productTitle,
  productHandle,
  currentLandingPage,
}: LandingPagePreviewDialogProps) {
  const [selectedVersion, setSelectedVersion] = useState<LandingPageVersion | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch version history
  const { data: versions, isLoading, error: historyError } = useQuery<LandingPageVersion[]>({
    queryKey: ["landing-page-history", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_page_history")
        .select("*")
        .eq("product_id", productId)
        .order("version_number", { ascending: false });

      if (error) {
        console.error("Error loading history:", error);
        throw error;
      }
      return data as LandingPageVersion[];
    },
    enabled: open && !!productId,
    retry: 1,
  });

  // Show error toast if history fails to load and no current landing page
  useEffect(() => {
    if (historyError && !currentLandingPage) {
      console.error("Failed to load landing page history:", historyError);
      toast.error("Impossible de charger l'historique des versions");
    }
  }, [historyError, currentLandingPage]);

  // Auto-select the current version or the most recent one when dialog opens
  useEffect(() => {
    if (open && versions && versions.length > 0) {
      const currentVersion = versions.find(v => v.is_current) || versions[0];
      setSelectedVersion(currentVersion);
    } else if (open && (!versions || versions.length === 0)) {
      // Si pas de versions, on s'assure que selectedVersion est null pour utiliser currentLandingPage
      setSelectedVersion(null);
    }
    // Reset selection when dialog closes
    if (!open) {
      setSelectedVersion(null);
    }
  }, [open, versions]);

  // Sync to Shopify mutation
  const syncMutation = useMutation({
    mutationFn: async (htmlContent: string) => {
      setIsSyncing(true);
      const { data, error } = await supabase.functions.invoke("sync-landing-to-shopify", {
        body: {
          productId,
          productTitle,
          productHandle,
          htmlContent,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Landing page synchronisée avec Shopify", {
        description: data.productUrl ? `Lien: ${data.productUrl}` : undefined,
      });
      setIsSyncing(false);
    },
    onError: (error) => {
      console.error("Sync error:", error);
      toast.error("Erreur lors de la synchronisation");
      setIsSyncing(false);
    },
  });

  // Restore version mutation
  const restoreMutation = useMutation({
    mutationFn: async (version: LandingPageVersion) => {
      const { error: updateError } = await supabase
        .from("shopify_products")
        .update({ landing_page: version.landing_page_html })
        .eq("id", productId);

      if (updateError) throw updateError;

      // Mark this version as current
      await supabase
        .from("landing_page_history")
        .update({ is_current: false })
        .eq("product_id", productId);

      await supabase
        .from("landing_page_history")
        .update({ is_current: true })
        .eq("id", version.id);
    },
    onSuccess: () => {
      toast.success("Version restaurée avec succès");
      queryClient.invalidateQueries({ queryKey: ["landing-page-history", productId] });
      queryClient.invalidateQueries({ queryKey: ["shopify-products"] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error restoring version:", error);
      toast.error("Erreur lors de la restauration");
    },
  });

  const handleDownload = (html: string, versionNumber: number) => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `landing-page-v${versionNumber}-${productTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const previewHtml = selectedVersion?.landing_page_html || currentLandingPage || "";
  const latestVersion = versions?.[0];
  
  // Log pour debug
  console.log('Preview Dialog Debug:', {
    open,
    hasVersions: versions?.length || 0,
    selectedVersion: selectedVersion?.version_number,
    hasCurrentLandingPage: !!currentLandingPage,
    previewHtmlLength: previewHtml?.length || 0,
    productId
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${responsiveDialogClasses.xxlarge} max-h-[90vh]`}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Landing Page - {productTitle}
            </div>
            {(latestVersion || currentLandingPage) && (
              <Button
                onClick={() => syncMutation.mutate(latestVersion?.landing_page_html || currentLandingPage)}
                disabled={isSyncing || !previewHtml}
                className="ml-4"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Synchronisation...
                  </>
                ) : (
                  "Synchroniser avec Shopify"
                )}
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            {latestVersion 
              ? `Version actuelle: ${latestVersion.version_number} - ${format(new Date(latestVersion.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}`
              : currentLandingPage
              ? "Aperçu de la landing page actuelle"
              : "Prévisualisez et gérez les versions de votre landing page"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 h-[calc(90vh-200px)]">
          {/* Preview Panel */}
          <div className="border rounded-lg overflow-hidden flex-1 min-h-[400px]">
            <div className="bg-muted/50 p-2 border-b flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedVersion ? `Version ${selectedVersion.version_number}` : "Aperçu actuel"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (previewHtml) {
                    const blob = new Blob([previewHtml], { type: "text/html" });
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank");
                  }
                }}
              >
                Ouvrir dans un nouvel onglet
              </Button>
            </div>
            <ScrollArea className="h-[400px]">
              {previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  className="w-full min-h-[400px] border-0"
                  sandbox="allow-same-origin allow-scripts"
                  title="Landing Page Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Aucune landing page disponible</p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Version History List */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Historique des versions
            </h3>
            <ScrollArea className="h-[200px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : historyError ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Impossible de charger l'historique</p>
                  <p className="text-xs mt-2">
                    {currentLandingPage ? "Vous voyez la version actuelle" : "Aucune landing page disponible"}
                  </p>
                </div>
              ) : versions && versions.length > 0 ? (
                <div className="space-y-2">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedVersion?.id === version.id ? "bg-muted border-primary" : ""
                      }`}
                      onClick={() => setSelectedVersion(version)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={version.is_current ? "default" : "outline"}>
                          Version {version.version_number}
                        </Badge>
                        {version.is_current && (
                          <Badge variant="secondary" className="text-xs">
                            Actuelle
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(version.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                      <div className="flex gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(version.landing_page_html, version.version_number);
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Télécharger
                        </Button>
                        {!version.is_current && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              restoreMutation.mutate(version);
                            }}
                            disabled={restoreMutation.isPending}
                          >
                            {restoreMutation.isPending ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3 mr-1" />
                            )}
                            Appliquer cette version
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Aucune version sauvegardée</p>
                  <p className="text-xs mt-2">
                    Les versions sont créées automatiquement lors de la génération
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
