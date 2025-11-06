import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Loader2,
  Search,
  Paintbrush,
  Palette,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WhiteBackgroundPreviewDialog } from "@/components/seo/WhiteBackgroundPreviewDialog";
import { BackgroundDialog } from "@/components/seo/BackgroundDialog";
import { ProductLandingPreviewDialog } from "@/components/seo/ProductLandingPreviewDialog";
// Removed useBackgroundRemoval - now using generate-white-background edge function
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Product {
  id: string;
  title: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  image_url: string | null;
  shopify_id: number | null;
}

interface PreviewImage {
  productId: string;
  productTitle: string;
  originalUrl: string;
  generatedUrl: string | null;
  status: 'pending' | 'generating' | 'success' | 'error';
  error?: string;
}

export default function ProductTitleDescription() {
  const { t } = useTranslation();
  // Removed local background removal hook - using edge function instead
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingWhiteBg, setGeneratingWhiteBg] = useState(false);
  const [generatingAiBg, setGeneratingAiBg] = useState(false);
  const [showWhiteBgDialog, setShowWhiteBgDialog] = useState(false);
  const [showAiBgDialog, setShowAiBgDialog] = useState(false);
  const [whiteBgPreviews, setWhiteBgPreviews] = useState<PreviewImage[]>([]);
  const [aiBgPreviews, setAiBgPreviews] = useState<PreviewImage[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showLandingPreviewDialog, setShowLandingPreviewDialog] = useState(false);
  const [optimizedProducts, setOptimizedProducts] = useState<Product[]>([]);
  const [syncingToShopify, setSyncingToShopify] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("shopify_products")
        .select("id, title, description, seo_title, seo_description, image_url, shopify_id")
        .eq("seller_id", user.id)
        .order("imported_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Erreur lors du chargement des produits");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleOptimizeSelected = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Aucun produit sélectionné");
      return;
    }

    setGenerating(true);
    const toastId = toast.loading(`Optimisation de ${selectedProducts.size} produit(s)...`);

    try {
      for (const productId of selectedProducts) {
        const product = products.find((p) => p.id === productId);
        if (!product) continue;

        const { data, error } = await supabase.functions.invoke("generate-title-description", {
          body: {
            currentTitle: product.title,
            imageUrl: product.image_url || null,
          },
        });

        if (error) {
          // Check for specific error types
          const errorMessage = error.message || String(error);
          
          if (errorMessage.includes('CREDITS_DEPLETED') || errorMessage.includes('402')) {
            throw new Error('CREDITS_DEPLETED: Les crédits Lovable AI sont épuisés. Veuillez ajouter des crédits dans Settings → Workspace → Usage.');
          }
          
          if (errorMessage.includes('RATE_LIMIT') || errorMessage.includes('429')) {
            throw new Error('RATE_LIMIT: Limite de taux atteinte. Veuillez patienter quelques instants.');
          }
          
          throw error;
        }

        // Update local state
        const { data: updatedProduct } = await supabase
          .from("shopify_products")
          .select("seo_title, seo_description")
          .eq("id", productId)
          .single();

        if (updatedProduct) {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === productId
                ? { ...p, seo_title: updatedProduct.seo_title, seo_description: updatedProduct.seo_description }
                : p
            )
          );
        }
      }

      toast.success("Optimisation terminée", { id: toastId });
      
      const optimized = products.filter(p => selectedProducts.has(p.id));
      setOptimizedProducts(optimized);
      setShowLandingPreviewDialog(true);
      setSelectedProducts(new Set());
    } catch (error: any) {
      console.error("Error optimizing:", error);
      
      const errorMessage = error?.message || String(error);
      
      if (errorMessage.includes('CREDITS_DEPLETED')) {
        toast.error("Crédits IA épuisés", {
          id: toastId,
          description: "Ajoutez des crédits dans Settings → Workspace → Usage pour continuer à utiliser l'IA."
        });
      } else if (errorMessage.includes('RATE_LIMIT')) {
        toast.error("Trop de requêtes", {
          id: toastId,
          description: "Veuillez patienter quelques instants avant de réessayer."
        });
      } else {
        toast.error("Erreur lors de l'optimisation", { id: toastId });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleOptimizeAll = async () => {
    if (filteredProducts.length === 0) {
      toast.error("Aucun produit à optimiser");
      return;
    }

    setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
    setTimeout(() => handleOptimizeSelected(), 100);
  };

  const handleWhiteBackground = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Veuillez sélectionner au moins un produit");
      return;
    }

    const selectedProductsList = products.filter((p) => 
      selectedProducts.has(p.id) && p.image_url
    );

    if (selectedProductsList.length === 0) {
      toast.error("Aucun produit sélectionné n'a d'image");
      return;
    }

    setGeneratingWhiteBg(true);
    const previews: PreviewImage[] = selectedProductsList.map((p) => ({
      productId: p.id,
      productTitle: p.title,
      originalUrl: p.image_url!,
      generatedUrl: null,
      status: 'pending' as const,
    }));

    setWhiteBgPreviews(previews);
    setShowWhiteBgDialog(true);

    for (let i = 0; i < selectedProductsList.length; i++) {
      const product = selectedProductsList[i];
      
      setWhiteBgPreviews((prev) =>
        prev.map((p) =>
          p.productId === product.id ? { ...p, status: 'generating' } : p
        )
      );

      try {
        const { data, error } = await supabase.functions.invoke('generate-white-background', {
          body: { 
            imageUrl: product.image_url,
            productTitle: product.title
          }
        });

        if (error) throw error;

        if (data.success && data.imageUrl) {
          setWhiteBgPreviews((prev) =>
            prev.map((p) =>
              p.productId === product.id
                ? { ...p, status: 'success', generatedUrl: data.imageUrl }
                : p
            )
          );
        } else {
          throw new Error(data.error || 'Échec de la génération');
        }
      } catch (error: any) {
        console.error('Error generating white background:', error);
        setWhiteBgPreviews((prev) =>
          prev.map((p) =>
            p.productId === product.id
              ? { ...p, status: 'error', error: error.message || 'Erreur de génération' }
              : p
          )
        );
      }
    }

    setGeneratingWhiteBg(false);
  };

  const handleStartAiBackground = async (prompt: string) => {
    const selectedProductsList = products.filter((p) => 
      selectedProducts.has(p.id) && p.image_url
    );

    if (selectedProductsList.length === 0) {
      toast.error("Aucun produit sélectionné n'a d'image");
      return;
    }

    setShowPromptDialog(false);
    setGeneratingAiBg(true);
    
    const previews: PreviewImage[] = selectedProductsList.map((p) => ({
      productId: p.id,
      productTitle: p.title,
      originalUrl: p.image_url!,
      generatedUrl: null,
      status: 'pending' as const,
    }));

    setAiBgPreviews(previews);
    setShowAiBgDialog(true);

    for (let i = 0; i < selectedProductsList.length; i++) {
      const product = selectedProductsList[i];
      
      setAiBgPreviews((prev) =>
        prev.map((p) =>
          p.productId === product.id ? { ...p, status: 'generating' } : p
        )
      );

      try {
        const { data, error } = await supabase.functions.invoke('generate-image-background', {
          body: {
            imageUrl: product.image_url,
            prompt: prompt,
          }
        });

        if (error) throw error;

        if (data.success && data.imageUrl) {
          setAiBgPreviews((prev) =>
            prev.map((p) =>
              p.productId === product.id
                ? { ...p, status: 'success', generatedUrl: data.imageUrl }
                : p
            )
          );
        } else {
          throw new Error('No image generated');
        }
      } catch (error: any) {
        console.error('Error generating AI background:', error);
        setAiBgPreviews((prev) =>
          prev.map((p) =>
            p.productId === product.id
              ? { ...p, status: 'error', error: error.message || 'Erreur de génération' }
              : p
          )
        );
      }
    }

    setGeneratingAiBg(false);
  };

  const handleApplyWhiteBackground = async (productIds: string[]) => {
    const toastId = toast.loading("Application des images...");

    try {
      for (const productId of productIds) {
        const preview = whiteBgPreviews.find((p) => p.productId === productId);
        if (!preview?.generatedUrl) continue;

        await supabase
          .from("shopify_products")
          .update({ image_url: preview.generatedUrl })
          .eq("id", productId);
      }

      toast.success("Images appliquées avec succès", { id: toastId });
      await fetchProducts();
      setWhiteBgPreviews([]);
    } catch (error) {
      console.error("Error applying images:", error);
      toast.error("Erreur lors de l'application", { id: toastId });
    }
  };

  const handleApplyAiBackground = async (productIds: string[]) => {
    const toastId = toast.loading("Application des images...");

    try {
      for (const productId of productIds) {
        const preview = aiBgPreviews.find((p) => p.productId === productId);
        if (!preview?.generatedUrl) continue;

        await supabase
          .from("shopify_products")
          .update({ image_url: preview.generatedUrl })
          .eq("id", productId);
      }

      toast.success("Images appliquées avec succès", { id: toastId });
      await fetchProducts();
      setAiBgPreviews([]);
    } catch (error) {
      console.error("Error applying images:", error);
      toast.error("Erreur lors de l'application", { id: toastId });
    }
  };

  const handleRegenerateWhiteBg = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product?.image_url) return;

    setWhiteBgPreviews((prev) =>
      prev.map((p) =>
        p.productId === productId ? { ...p, status: 'generating', error: undefined } : p
      )
    );

    try {
      const { data, error } = await supabase.functions.invoke('generate-white-background', {
        body: { 
          imageUrl: product.image_url,
          productTitle: product.title
        }
      });

      if (error) throw error;

      if (data.success && data.imageUrl) {
        setWhiteBgPreviews((prev) =>
          prev.map((p) =>
            p.productId === productId
              ? { ...p, status: 'success', generatedUrl: data.imageUrl }
              : p
          )
        );
      } else {
        throw new Error(data.error || 'Échec de la régénération');
      }
    } catch (error: any) {
      console.error('Error regenerating:', error);
      setWhiteBgPreviews((prev) =>
        prev.map((p) =>
          p.productId === productId
            ? { ...p, status: 'error', error: error.message || 'Erreur de génération' }
            : p
        )
      );
    }
  };

  const handleRegenerateAiBg = async (productId: string, prompt?: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product?.image_url) return;

    const promptToUse = prompt || customPrompt;

    setAiBgPreviews((prev) =>
      prev.map((p) =>
        p.productId === productId ? { ...p, status: 'generating', error: undefined } : p
      )
    );

    try {
      const { data, error } = await supabase.functions.invoke('generate-image-background', {
        body: {
          imageUrl: product.image_url,
          prompt: promptToUse,
        }
      });

      if (error) throw error;

      if (data.success && data.imageUrl) {
        setAiBgPreviews((prev) =>
          prev.map((p) =>
            p.productId === productId
              ? { ...p, status: 'success', generatedUrl: data.imageUrl }
              : p
          )
        );
      } else {
        throw new Error('No image generated');
      }
    } catch (error: any) {
      console.error('Error regenerating:', error);
      setAiBgPreviews((prev) =>
        prev.map((p) =>
          p.productId === productId
            ? { ...p, status: 'error', error: error.message || 'Erreur de génération' }
            : p
        )
      );
    }
  };

  const handleSyncToShopify = async () => {
    setSyncingToShopify(true);
    const toastId = toast.loading("Synchronisation avec Shopify...");

    try {
      for (const product of optimizedProducts) {
        if (!product.shopify_id) continue;

        const { error } = await supabase.functions.invoke('sync-seo-to-shopify', {
          body: {
            productId: product.id,
            shopifyId: product.shopify_id,
            seoTitle: product.seo_title,
            seoDescription: product.seo_description,
          }
        });

        if (error) {
          console.error(`Error syncing product ${product.id}:`, error);
        }
      }

      toast.success(`${optimizedProducts.length} produit(s) synchronisé(s) avec Shopify`, { id: toastId });
      setShowLandingPreviewDialog(false);
      setOptimizedProducts([]);
    } catch (error) {
      console.error("Error syncing to Shopify:", error);
      toast.error("Erreur lors de la synchronisation", { id: toastId });
    } finally {
      setSyncingToShopify(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Banner */}
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 sm:h-8 sm:h-8 text-primary" />
                Optimisation Titres & Descriptions
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Utilisez l'IA pour optimiser vos titres et descriptions, et améliorer vos images produit
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleOptimizeAll}
                disabled={generating || filteredProducts.length === 0}
                size="lg"
                className="gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Optimisation...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Optimiser tout
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats & Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ImageIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total produits</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Optimisés</p>
                <p className="text-2xl font-bold">
                  {products.filter((p) => p.seo_title || p.seo_description).length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Wand2 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sélectionnés</p>
                <p className="text-2xl font-bold">{selectedProducts.size}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions Bar */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 justify-between">
            <div className="flex-1 w-full lg:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleOptimizeSelected}
                disabled={generating || selectedProducts.size === 0}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Optimiser ({selectedProducts.size})
              </Button>

              <Button
                variant="outline"
                onClick={handleWhiteBackground}
                disabled={generatingWhiteBg || selectedProducts.size === 0}
                className="gap-2"
              >
                {generatingWhiteBg ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paintbrush className="h-4 w-4" />
                )}
                Fond blanc ({selectedProducts.size})
              </Button>

              <Button
                variant="default"
                onClick={() => setShowPromptDialog(true)}
                disabled={generatingAiBg || selectedProducts.size === 0}
                className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
              >
                {generatingAiBg ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Palette className="h-4 w-4" />
                )}
                Arrière-plan IA ({selectedProducts.size})
              </Button>
            </div>
          </div>
        </Card>

        {/* Info Alert */}
        <Alert>
          <ImageIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Fond blanc :</strong> Supprime automatiquement l'arrière-plan et ajoute un fond blanc professionnel.
            {" "}<strong>Arrière-plan IA :</strong> Génère un nouvel arrière-plan personnalisé avec l'intelligence artificielle.
          </AlertDescription>
        </Alert>

        {/* Products Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-20">Image</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead className="hidden lg:table-cell">Description</TableHead>
                <TableHead className="w-32">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedProducts.has(product.id)}
                      onCheckedChange={() => handleSelectProduct(product.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{product.title}</p>
                      {product.seo_title && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          SEO: {product.seo_title}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {product.seo_description ? (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {product.seo_description}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Aucune description</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.description ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        ✨ HTML UX Optimisé
                      </Badge>
                    ) : product.seo_title || product.seo_description ? (
                      <Badge variant="secondary">
                        SEO Basique ✓
                      </Badge>
                    ) : (
                      <Badge variant="outline">À optimiser</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredProducts.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              Aucun produit trouvé
            </div>
          )}
        </Card>
      </div>

      {/* Dialogs */}
      <WhiteBackgroundPreviewDialog
        open={showWhiteBgDialog}
        onOpenChange={setShowWhiteBgDialog}
        previews={whiteBgPreviews}
        onApply={handleApplyWhiteBackground}
        onRegenerate={handleRegenerateWhiteBg}
      />

      {/* Prompt Configuration Dialog */}
      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Configuration de l'arrière-plan IA
            </DialogTitle>
            <DialogDescription>
              Choisissez un style prédéfini ou créez votre propre prompt pour générer des arrière-plans personnalisés
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-select">Style prédéfini</Label>
              <Select
                value={customPrompt}
                onValueChange={setCustomPrompt}
              >
                <SelectTrigger id="preset-select">
                  <SelectValue placeholder="Choisir un style..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Place this product in a professional studio setting with soft lighting and neutral gray backdrop">
                    🎬 Studio professionnel
                  </SelectItem>
                  <SelectItem value="Place this product in a luxurious natural environment with elegant plants and soft natural lighting">
                    🌿 Nature luxueuse
                  </SelectItem>
                  <SelectItem value="Place this product in a modern minimalist setting with clean lines and geometric shapes">
                    ⚪ Minimaliste moderne
                  </SelectItem>
                  <SelectItem value="Place this product in a warm lifestyle scene with cozy home elements and soft ambient lighting">
                    🏠 Lifestyle chaleureux
                  </SelectItem>
                  <SelectItem value="Place this product in a contemporary urban setting with industrial elements and modern aesthetics">
                    🏙️ Urbain contemporain
                  </SelectItem>
                  <SelectItem value="Place this product in an elegant classical setting with refined decorative elements and soft warm lighting">
                    ✨ Élégance classique
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-prompt">Ou créez votre propre prompt (en anglais)</Label>
              <Textarea
                id="custom-prompt"
                placeholder="Ex: Place this product on a wooden table with natural sunlight..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                💡 Conseil : Décrivez l'environnement souhaité, l'éclairage et l'ambiance
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPromptDialog(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (!customPrompt.trim()) {
                  toast.error("Veuillez saisir ou sélectionner un prompt");
                  return;
                }
                handleStartAiBackground(customPrompt);
              }}
              className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Sparkles className="h-4 w-4" />
              Générer les arrière-plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BackgroundDialog
        open={showAiBgDialog}
        onOpenChange={setShowAiBgDialog}
        previews={aiBgPreviews}
        onApply={handleApplyAiBackground}
        onRegenerate={handleRegenerateAiBg}
        customPrompt={customPrompt}
        onCustomPromptChange={setCustomPrompt}
      />

      <ProductLandingPreviewDialog
        open={showLandingPreviewDialog}
        onOpenChange={setShowLandingPreviewDialog}
        products={optimizedProducts}
        onConfirm={handleSyncToShopify}
        loading={syncingToShopify}
      />
    </div>
  );
}
