import { useEffect, useMemo, useState } from "react";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  FileText,
  Grid3x3,
  Image as ImageIcon,
  Info,
  Link2,
  List,
  Loader2,
  Package,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";

interface Collection {
  id: string;
  user_id?: string;
  store_id?: string | null;
  title: string;
  handle: string;
  body_html: string | null;
  image_url: string | null;
  image_alt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  shopify_collection_id: number | null;
  is_published?: boolean | null;
  created_at: string;
  updated_at: string;
  product_count?: number;
  image_count?: number;
}

interface CollectionProduct {
  id: string;
  title: string;
  image_url: string | null;
  product_type: string | null;
  body_html: string | null;
  seo_description: string | null;
}

interface DetailForm {
  title: string;
  handle: string;
  body_html: string;
  seo_title: string;
  seo_description: string;
  image_alt: string;
}

const PAGE_SIZE = 50;

const emptyForm: DetailForm = {
  title: "",
  handle: "",
  body_html: "",
  seo_title: "",
  seo_description: "",
  image_alt: "",
};

const cleanText = (value: string | null | undefined) =>
  (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export default function Collections() {
  const { selectedStore } = useStore();
  const { t, tf, language } = useTranslation();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [generatingCollections, setGeneratingCollections] = useState(false);

  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [detailForm, setDetailForm] = useState<DetailForm>(emptyForm);
  const [detailProducts, setDetailProducts] = useState<CollectionProduct[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);

  const [manualImageUrl, setManualImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [sourceProductId, setSourceProductId] = useState("");
  const [decorType, setDecorType] = useState<"living_room" | "dining_room" | "bedroom" | "office">("living_room");

  const fetchCollections = async () => {
    if (!selectedStore?.id) {
      setCollections([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(language === "fr" ? "Utilisateur non authentifié" : "Not authenticated");

      const { count } = await supabase
        .from("shopify_collections")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("store_id", selectedStore.id);

      const { data, error } = await supabase
        .from("shopify_collections")
        .select("*")
        .eq("user_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("title", { ascending: true })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

      if (error) throw error;

      const withCounts = await Promise.all(
        (data || []).map(async (collection: Collection) => {
          const [{ count: productCount }, { count: imageCount }] = await Promise.all([
            supabase
              .from("shopify_products")
              .select("*", { count: "exact", head: true })
              .eq("seller_id", user.id)
              .eq("store_id", selectedStore.id)
              .contains("collection_ids", [collection.id]),
            supabase
              .from("content_images")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("store_id", selectedStore.id)
              .eq("content_type", "collection")
              .eq("content_id", collection.id),
          ]);

          return {
            ...collection,
            product_count: productCount || 0,
            image_count: imageCount || 0,
          };
        }),
      );

      setCollections(withCounts);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error("Error fetching collections:", error);
      toast.error(error?.message || (language === "fr" ? "Impossible de charger les collections" : "Unable to load collections"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStore?.id]);

  useEffect(() => {
    void fetchCollections();
  }, [selectedStore?.id, currentPage]);

  const handleImportCollections = async () => {
    if (!selectedStore?.id) {
      toast.error(language === "fr" ? "Sélectionnez une boutique" : "Select a store");
      return;
    }

    setImporting(true);
    const toastId = toast.loading(language === "fr" ? "Import des collections..." : "Importing collections...");

    try {
      const { error: importError } = await supabase.functions.invoke("import-shopify-collections");
      if (importError) throw importError;

      const { error: syncError } = await supabase.functions.invoke("sync-product-collections", {
        body: { storeId: selectedStore.id },
      });
      if (syncError) console.warn("Collection product sync warning", syncError);

      const { error: imageError } = await supabase.functions.invoke("import-content-images", {
        body: { storeId: selectedStore.id, types: ["collections"] },
      });
      if (imageError) console.warn("Collection image import warning", imageError);

      toast.success(language === "fr" ? "Collections importées" : "Collections imported", { id: toastId });
      await fetchCollections();
    } catch (error: any) {
      console.error("Error importing collections:", error);
      toast.error(error?.message || (language === "fr" ? "Échec de l'import" : "Import failed"), { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  const handleSyncProductCollections = async () => {
    if (!selectedStore?.id) return;
    setSyncing(true);
    const toastId = toast.loading(language === "fr" ? "Synchronisation..." : "Syncing...");

    try {
      const { data, error } = await supabase.functions.invoke("sync-product-collections", {
        body: { storeId: selectedStore.id },
      });
      if (error) throw error;
      toast.success(
        language === "fr"
          ? `${data?.updated_count || 0} produits synchronisés`
          : `${data?.updated_count || 0} products synced`,
        { id: toastId },
      );
      await fetchCollections();
    } catch (error: any) {
      console.error("Collection sync error:", error);
      toast.error(error?.message || (language === "fr" ? "Échec de la synchronisation" : "Sync failed"), { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateAICollections = async () => {
    if (!selectedStore?.id) {
      toast.error(language === "fr" ? "Sélectionnez une boutique" : "Select a store");
      return;
    }

    setGeneratingCollections(true);
    const toastId = toast.loading(language === "fr" ? "Analyse du catalogue..." : "Analyzing catalog...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(language === "fr" ? "Utilisateur non authentifié" : "Not authenticated");

      const { data, error } = await supabase.functions.invoke("generate-ai-collections", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { storeId: selectedStore.id, language: language || "fr" },
      });

      if (error) throw error;

      toast.success(
        language === "fr"
          ? `${data?.collections?.length || 0} collections créées`
          : `${data?.collections?.length || 0} collections created`,
        { id: toastId },
      );
      await fetchCollections();
    } catch (error: any) {
      console.error("AI collection generation error:", error);
      toast.error(error?.message || (language === "fr" ? "La génération IA a échoué" : "AI generation failed"), { id: toastId });
    } finally {
      setGeneratingCollections(false);
    }
  };

  const loadCollectionProducts = async (collection: Collection) => {
    if (!selectedStore?.id) return;
    setDetailLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("shopify_products")
        .select("id, title, image_url, product_type, body_html, seo_description")
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id)
        .contains("collection_ids", [collection.id])
        .order("title", { ascending: true })
        .limit(250);

      if (error) throw error;
      const products = (data || []) as CollectionProduct[];
      setDetailProducts(products);
      setSourceProductId(products.find((product) => product.image_url)?.id || "");
    } catch (error: any) {
      console.error("Error loading collection products:", error);
      toast.error(error?.message || (language === "fr" ? "Impossible de charger les produits" : "Unable to load products"));
    } finally {
      setDetailLoading(false);
    }
  };

  const openCollection = (collection: Collection) => {
    setSelectedCollection(collection);
    setDetailForm({
      title: collection.title || "",
      handle: collection.handle || "",
      body_html: collection.body_html || "",
      seo_title: collection.seo_title || "",
      seo_description: collection.seo_description || "",
      image_alt: collection.image_alt || collection.title || "",
    });
    setManualImageUrl(collection.image_url || "");
    setGeneratedImageUrl(null);
    setDetailProducts([]);
    setSourceProductId("");
    void loadCollectionProducts(collection);
  };

  const saveCollectionDetails = async () => {
    if (!selectedCollection || !selectedStore?.id) return;
    setSavingDetail(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        title: detailForm.title.trim(),
        handle: detailForm.handle.trim(),
        body_html: detailForm.body_html,
        seo_title: detailForm.seo_title.trim() || null,
        seo_description: detailForm.seo_description.trim() || null,
        image_alt: detailForm.image_alt.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("shopify_collections")
        .update(payload)
        .eq("id", selectedCollection.id)
        .eq("user_id", user.id)
        .eq("store_id", selectedStore.id)
        .select()
        .single();

      if (error) throw error;

      const updated = { ...selectedCollection, ...data } as Collection;
      setSelectedCollection(updated);
      setCollections((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      toast.success(language === "fr" ? "Collection enregistrée" : "Collection saved");
    } catch (error: any) {
      console.error("Save collection error:", error);
      toast.error(error?.message || (language === "fr" ? "Échec de l'enregistrement" : "Save failed"));
    } finally {
      setSavingDetail(false);
    }
  };

  const uploadDataUrl = async (dataUrl: string): Promise<string> => {
    if (!selectedCollection) throw new Error("No collection selected");
    if (!dataUrl.startsWith("data:")) return dataUrl;

    const [meta, base64] = dataUrl.split(",");
    const mime = meta.match(/data:(.*?);base64/)?.[1] || "image/png";
    const extension = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);

    const path = `collections/${selectedCollection.id}/ai-${Date.now()}.${extension}`;
    const { error } = await supabase.storage
      .from("generated-images")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (error) throw error;

    return supabase.storage.from("generated-images").getPublicUrl(path).data.publicUrl;
  };

  const persistCollectionImage = async (rawUrl: string, isAiGenerated = false) => {
    if (!selectedCollection || !selectedStore?.id || !rawUrl) return;
    setUploadingImage(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const imageUrl = await uploadDataUrl(rawUrl);
      const altText = detailForm.image_alt.trim() || detailForm.title.trim() || selectedCollection.title;

      const { error: updateError } = await supabase
        .from("shopify_collections")
        .update({
          image_url: imageUrl,
          image_alt: altText,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedCollection.id)
        .eq("user_id", user.id)
        .eq("store_id", selectedStore.id);
      if (updateError) throw updateError;

      const { data: existing } = await supabase
        .from("content_images")
        .select("id")
        .eq("user_id", user.id)
        .eq("store_id", selectedStore.id)
        .eq("content_type", "collection")
        .eq("content_id", selectedCollection.id)
        .eq("src", imageUrl)
        .maybeSingle();

      if (!existing) {
        const { error: imageError } = await supabase.from("content_images").insert({
          user_id: user.id,
          store_id: selectedStore.id,
          content_type: "collection",
          content_id: selectedCollection.id,
          src: imageUrl,
          alt_text: altText,
          position: 0,
          is_ai_generated: isAiGenerated,
        });
        if (imageError) console.warn("content_images insert warning", imageError);
      }

      const updatedCollection = {
        ...selectedCollection,
        image_url: imageUrl,
        image_alt: altText,
        image_count: (selectedCollection.image_count || 0) + (existing ? 0 : 1),
      };
      setSelectedCollection(updatedCollection);
      setCollections((current) => current.map((item) => item.id === selectedCollection.id ? { ...item, ...updatedCollection } : item));
      setManualImageUrl(imageUrl);
      setDetailForm((current) => ({ ...current, image_alt: altText }));
      toast.success(language === "fr" ? "Image affectée à la collection" : "Image assigned to collection");
    } catch (error: any) {
      console.error("Assign collection image error:", error);
      toast.error(error?.message || (language === "fr" ? "Impossible d'affecter l'image" : "Unable to assign image"));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileUpload = async (file?: File) => {
    if (!file || !selectedCollection) return;
    setUploadingImage(true);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `collections/${selectedCollection.id}/upload-${Date.now()}.${extension}`;
      const { error } = await supabase.storage
        .from("generated-images")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
      if (error) throw error;

      const publicUrl = supabase.storage.from("generated-images").getPublicUrl(path).data.publicUrl;
      await persistCollectionImage(publicUrl, false);
    } catch (error: any) {
      console.error("Collection image upload error:", error);
      toast.error(error?.message || (language === "fr" ? "Upload impossible" : "Upload failed"));
    } finally {
      setUploadingImage(false);
    }
  };

  const generateCollectionImage = async () => {
    if (!selectedCollection) return;
    const source = detailProducts.find((product) => product.id === sourceProductId)
      || detailProducts.find((product) => product.image_url);

    if (!source?.image_url) {
      toast.error(language === "fr" ? "Aucune image produit disponible dans cette collection" : "No product image available in this collection");
      return;
    }

    setGeneratingImage(true);
    const toastId = toast.loading(language === "fr" ? "Génération de l'image collection..." : "Generating collection image...");

    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-product-images", {
        body: {
          productId: source.id,
          productTitle: `${selectedCollection.title} — ${source.title}`,
          productType: source.product_type || "collection",
          sourceImageUrl: source.image_url,
          imageTypes: [],
          includeDecor: true,
          decorType,
          language: language || "fr",
          productDescription: detailForm.seo_description || cleanText(detailForm.body_html) || source.seo_description || cleanText(source.body_html),
          galleryImages: detailProducts.map((product) => product.image_url).filter(Boolean).slice(0, 5),
        },
      });

      if (error) throw error;
      const image = data?.images?.find((item: any) => item.type === "decor") || data?.images?.[0];
      if (!image?.url) throw new Error(language === "fr" ? "Aucune image générée" : "No image generated");

      setGeneratedImageUrl(image.url);
      toast.success(language === "fr" ? "Image générée — vérifiez puis affectez-la" : "Image generated — review and assign it", { id: toastId });
    } catch (error: any) {
      console.error("Collection AI image error:", error);
      toast.error(error?.message || (language === "fr" ? "Génération d'image impossible" : "Image generation failed"), { id: toastId });
    } finally {
      setGeneratingImage(false);
    }
  };

  const filteredCollections = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return collections;
    return collections.filter((collection) =>
      [collection.title, collection.handle, cleanText(collection.body_html), collection.seo_title, collection.seo_description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [collections, searchTerm]);

  const seoScore = useMemo(() => {
    if (!selectedCollection) return 0;
    let score = 0;
    const titleLength = detailForm.seo_title.trim().length;
    const descriptionLength = detailForm.seo_description.trim().length;
    if (titleLength >= 30 && titleLength <= 60) score += 30;
    else if (titleLength > 0) score += 15;
    if (descriptionLength >= 90 && descriptionLength <= 160) score += 30;
    else if (descriptionLength > 0) score += 15;
    if (detailForm.handle.trim()) score += 10;
    if (cleanText(detailForm.body_html).length >= 80) score += 10;
    if (selectedCollection.image_url) score += 10;
    if (detailForm.image_alt.trim()) score += 10;
    return Math.min(100, score);
  }, [detailForm, selectedCollection]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <WorkspacePageHeader
        section="Catalog"
        page="Collections"
        count={totalCount}
        title={t.collections.title}
        description={t.collections.subtitle}
        actions={
          <>
            <Button onClick={handleGenerateAICollections} disabled={!selectedStore || generatingCollections || importing || syncing}>
              {generatingCollections ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {language === "fr" ? "Générer collections IA" : "Generate AI collections"}
            </Button>
            <details className="relative">
              <summary className="flex min-h-9 cursor-pointer list-none items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted">
                <RefreshCw className="mr-2 h-4 w-4" /> {language === "fr" ? "Plus" : "More"}
              </summary>
              <div className="absolute right-0 z-30 mt-2 grid w-64 gap-1 rounded-xl border bg-background p-2 shadow-xl">
                <Button onClick={handleSyncProductCollections} disabled={syncing || importing} variant="ghost" className="justify-start">
                  {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  {language === "fr" ? "Synchroniser produits" : "Sync products"}
                </Button>
                <Button onClick={handleImportCollections} disabled={importing || syncing} variant="ghost" className="justify-start">
                  {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {language === "fr" ? "Réimporter Shopify" : "Reimport Shopify"}
                </Button>
              </div>
            </details>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3"><Package className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{totalCount}</p><p className="text-sm text-muted-foreground">Collections</p></div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-muted p-3"><ImageIcon className="h-5 w-5" /></div>
            <div><p className="text-2xl font-bold">{collections.reduce((sum, item) => sum + (item.image_count || 0), 0)}</p><p className="text-sm text-muted-foreground">{language === "fr" ? "Images sur cette page" : "Images on this page"}</p></div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-muted p-3"><FileText className="h-5 w-5" /></div>
            <div><p className="text-2xl font-bold">{collections.filter((item) => item.seo_title && item.seo_description).length}</p><p className="text-sm text-muted-foreground">SEO complet</p></div>
          </div>
        </Card>
      </div>

      {collections.length > 0 && collections.every((collection) => (collection.product_count || 0) === 0) && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {language === "fr" ? "Aucun produit n'est associé aux collections. Lancez la synchronisation des produits." : "No products are associated with collections. Run product sync."}
          </AlertDescription>
        </Alert>
      )}

      {!selectedStore && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{language === "fr" ? "Sélectionnez une boutique pour afficher les collections." : "Select a store to view collections."}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t.collections.searchPlaceholder} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setViewMode((mode) => mode === "grid" ? "list" : "grid")}>
            {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => void fetchCollections()}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {filteredCollections.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">{t.collections.noCollections}</p>
          <p className="mt-1 text-sm text-muted-foreground">{language === "fr" ? "Importez vos collections Shopify ou générez-les avec l'IA." : "Import Shopify collections or generate them with AI."}</p>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCollections.map((collection) => (
            <Card
              key={collection.id}
              role="button"
              tabIndex={0}
              onClick={() => openCollection(collection)}
              onKeyDown={(event) => event.key === "Enter" && openCollection(collection)}
              className="group cursor-pointer overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {collection.image_url ? (
                <div className="aspect-video overflow-hidden bg-muted">
                  <img src={collection.image_url} alt={collection.image_alt || collection.title} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center bg-muted"><ImageIcon className="h-12 w-12 text-muted-foreground" /></div>
              )}
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="line-clamp-2 text-lg font-semibold">{collection.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">/{collection.handle}</p>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge variant="outline"><Package className="mr-1 h-3 w-3" />{collection.product_count || 0}</Badge>
                  <Badge variant="outline"><ImageIcon className="mr-1 h-3 w-3" />{collection.image_count || 0}</Badge>
                  <Badge variant={collection.seo_title && collection.seo_description ? "default" : "secondary"}>
                    {collection.seo_title && collection.seo_description ? "SEO ✓" : "SEO à faire"}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{cleanText(collection.body_html) || (language === "fr" ? "Cliquez pour compléter la collection." : "Click to complete the collection.")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCollections.map((collection) => (
            <Card
              key={collection.id}
              role="button"
              tabIndex={0}
              onClick={() => openCollection(collection)}
              onKeyDown={(event) => event.key === "Enter" && openCollection(collection)}
              className="cursor-pointer p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-center gap-4">
                {collection.image_url ? (
                  <img src={collection.image_url} alt={collection.image_alt || collection.title} className="h-20 w-24 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-20 w-24 items-center justify-center rounded-lg bg-muted"><ImageIcon className="h-7 w-7 text-muted-foreground" /></div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{collection.title}</h3>
                  <p className="truncate text-sm text-muted-foreground">/{collection.handle}</p>
                  <div className="mt-2 flex gap-2"><Badge variant="outline">{collection.product_count || 0} produits</Badge><Badge variant="outline">{collection.image_count || 0} images</Badge></div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>{language === "fr" ? "Précédent" : "Previous"}</Button>
          <span className="text-sm text-muted-foreground">{language === "fr" ? "Page" : "Page"} {currentPage} / {totalPages}</span>
          <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>{language === "fr" ? "Suivant" : "Next"}</Button>
        </div>
      )}

      <Dialog open={Boolean(selectedCollection)} onOpenChange={(open) => !open && setSelectedCollection(null)}>
        <DialogContent className="max-h-[94vh] max-w-6xl overflow-y-auto p-0">
          {selectedCollection && (
            <>
              <div className="border-b px-6 py-5">
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4 pr-8">
                    <div>
                      <DialogTitle className="text-2xl">{detailForm.title || selectedCollection.title}</DialogTitle>
                      <DialogDescription className="mt-1 flex flex-wrap items-center gap-2">
                        <span>/{detailForm.handle}</span>
                        <span>•</span>
                        <span>{detailProducts.length} {language === "fr" ? "produits" : "products"}</span>
                      </DialogDescription>
                    </div>
                    <Badge variant={seoScore >= 80 ? "default" : "secondary"}>SEO {seoScore}/100</Badge>
                  </div>
                </DialogHeader>
              </div>

              <Tabs defaultValue="seo" className="w-full">
                <div className="border-b px-6">
                  <TabsList className="h-12 bg-transparent p-0">
                    <TabsTrigger value="seo" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">SEO & contenu</TabsTrigger>
                    <TabsTrigger value="image" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Image</TabsTrigger>
                    <TabsTrigger value="products" className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Produits ({detailProducts.length})</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="seo" className="m-0 space-y-6 p-6">
                  <div className="grid gap-4 md:grid-cols-[1fr_260px]">
                    <Card>
                      <CardHeader><CardTitle className="text-base">{language === "fr" ? "Informations de collection" : "Collection information"}</CardTitle></CardHeader>
                      <CardContent className="space-y-5">
                        <div className="space-y-2">
                          <Label>Titre</Label>
                          <Input value={detailForm.title} onChange={(event) => setDetailForm((form) => ({ ...form, title: event.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Handle / URL</Label>
                          <Input value={detailForm.handle} onChange={(event) => setDetailForm((form) => ({ ...form, handle: event.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>{language === "fr" ? "Description collection" : "Collection description"}</Label>
                          <Textarea rows={8} value={detailForm.body_html} onChange={(event) => setDetailForm((form) => ({ ...form, body_html: event.target.value }))} placeholder={language === "fr" ? "Description commerciale de la collection..." : "Commercial collection description..."} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><CardTitle className="text-base">Score SEO</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-3xl font-bold">{seoScore}/100</div>
                        <Progress value={seoScore} />
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">{detailForm.seo_title ? <Check className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-muted-foreground" />} SEO title</div>
                          <div className="flex items-center gap-2">{detailForm.seo_description ? <Check className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-muted-foreground" />} Meta description</div>
                          <div className="flex items-center gap-2">{selectedCollection.image_url ? <Check className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-muted-foreground" />} Image</div>
                          <div className="flex items-center gap-2">{detailForm.image_alt ? <Check className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-muted-foreground" />} ALT image</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader><CardTitle className="text-base">SEO Google</CardTitle></CardHeader>
                    <CardContent className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between"><Label>SEO title</Label><span className="text-xs text-muted-foreground">{detailForm.seo_title.length}/60</span></div>
                        <Input value={detailForm.seo_title} onChange={(event) => setDetailForm((form) => ({ ...form, seo_title: event.target.value }))} placeholder={detailForm.title} />
                      </div>
                      <div className="space-y-2 md:row-span-2">
                        <div className="rounded-lg border bg-white p-4">
                          <p className="truncate text-sm text-green-700">catalogoptimize.com › collections › {detailForm.handle}</p>
                          <p className="mt-1 text-xl text-blue-700">{detailForm.seo_title || detailForm.title}</p>
                          <p className="mt-1 text-sm text-gray-600">{detailForm.seo_description || cleanText(detailForm.body_html).slice(0, 160) || "Meta description de la collection"}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between"><Label>Meta description</Label><span className="text-xs text-muted-foreground">{detailForm.seo_description.length}/160</span></div>
                        <Textarea rows={4} value={detailForm.seo_description} onChange={(event) => setDetailForm((form) => ({ ...form, seo_description: event.target.value }))} />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button onClick={saveCollectionDetails} disabled={savingDetail}>
                      {savingDetail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      {language === "fr" ? "Enregistrer" : "Save"}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="image" className="m-0 space-y-6 p-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                      <CardHeader><CardTitle className="text-base">{language === "fr" ? "Image actuelle" : "Current image"}</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        {selectedCollection.image_url ? (
                          <img src={selectedCollection.image_url} alt={selectedCollection.image_alt || selectedCollection.title} className="aspect-video w-full rounded-xl border object-cover" />
                        ) : (
                          <div className="flex aspect-video items-center justify-center rounded-xl border bg-muted"><ImageIcon className="h-14 w-14 text-muted-foreground" /></div>
                        )}
                        <div className="space-y-2">
                          <Label>ALT image</Label>
                          <Input value={detailForm.image_alt} onChange={(event) => setDetailForm((form) => ({ ...form, image_alt: event.target.value }))} placeholder={selectedCollection.title} />
                          <Button variant="outline" size="sm" onClick={saveCollectionDetails} disabled={savingDetail}><Save className="mr-2 h-4 w-4" />{language === "fr" ? "Enregistrer ALT" : "Save ALT"}</Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" />{language === "fr" ? "Générer une image IA" : "Generate AI image"}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {detailProducts.some((product) => product.image_url) ? (
                          <>
                            <div className="space-y-2">
                              <Label>{language === "fr" ? "Produit source" : "Source product"}</Label>
                              <Select value={sourceProductId} onValueChange={setSourceProductId}>
                                <SelectTrigger><SelectValue placeholder={language === "fr" ? "Choisir une image produit" : "Choose a product image"} /></SelectTrigger>
                                <SelectContent>
                                  {detailProducts.filter((product) => product.image_url).map((product) => <SelectItem key={product.id} value={product.id}>{product.title}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>{language === "fr" ? "Décor" : "Setting"}</Label>
                              <Select value={decorType} onValueChange={(value) => setDecorType(value as typeof decorType)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="living_room">Salon</SelectItem>
                                  <SelectItem value="dining_room">Salle à manger</SelectItem>
                                  <SelectItem value="bedroom">Chambre</SelectItem>
                                  <SelectItem value="office">Bureau</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button className="w-full" onClick={generateCollectionImage} disabled={generatingImage}>
                              {generatingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                              {language === "fr" ? "Générer" : "Generate"}
                            </Button>
                          </>
                        ) : (
                          <Alert><Info className="h-4 w-4" /><AlertDescription>{language === "fr" ? "Ajoutez d'abord une image à un produit de cette collection pour servir de référence." : "Add an image to a product in this collection first."}</AlertDescription></Alert>
                        )}

                        {generatedImageUrl && (
                          <div className="space-y-3 rounded-xl border p-3">
                            <img src={generatedImageUrl} alt="Generated collection" className="aspect-video w-full rounded-lg object-cover" />
                            <Button className="w-full" onClick={() => void persistCollectionImage(generatedImageUrl, true)} disabled={uploadingImage}>
                              {uploadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                              {language === "fr" ? "Affecter cette image" : "Assign this image"}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader><CardTitle className="text-base">{language === "fr" ? "Affecter une autre image" : "Assign another image"}</CardTitle></CardHeader>
                    <CardContent className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label>{language === "fr" ? "Depuis une URL" : "From URL"}</Label>
                        <div className="flex gap-2">
                          <Input value={manualImageUrl} onChange={(event) => setManualImageUrl(event.target.value)} placeholder="https://..." />
                          <Button variant="outline" onClick={() => void persistCollectionImage(manualImageUrl, false)} disabled={!manualImageUrl || uploadingImage}><Link2 className="mr-2 h-4 w-4" />Affecter</Button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label>{language === "fr" ? "Importer un fichier" : "Upload a file"}</Label>
                        <Input type="file" accept="image/*" disabled={uploadingImage} onChange={(event) => void handleFileUpload(event.target.files?.[0])} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-base">{language === "fr" ? "Images des produits de la collection" : "Collection product images"}</CardTitle></CardHeader>
                    <CardContent>
                      {detailLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                          {detailProducts.filter((product) => product.image_url).map((product) => (
                            <button key={product.id} type="button" onClick={() => void persistCollectionImage(product.image_url!, false)} className="group overflow-hidden rounded-xl border text-left transition hover:border-primary hover:shadow-sm">
                              <img src={product.image_url!} alt={product.title} className="aspect-square w-full object-cover" />
                              <div className="p-2"><p className="line-clamp-2 text-xs font-medium">{product.title}</p><p className="mt-1 text-xs text-primary opacity-0 transition group-hover:opacity-100">{language === "fr" ? "Affecter →" : "Assign →"}</p></div>
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="products" className="m-0 p-6">
                  {detailLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div>
                  ) : detailProducts.length === 0 ? (
                    <Alert><Info className="h-4 w-4" /><AlertDescription>{language === "fr" ? "Aucun produit associé à cette collection." : "No products assigned to this collection."}</AlertDescription></Alert>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {detailProducts.map((product) => (
                        <Card key={product.id} className="overflow-hidden">
                          <div className="flex gap-4 p-4">
                            {product.image_url ? <img src={product.image_url} alt={product.title} className="h-20 w-20 rounded-lg object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted"><Package className="h-6 w-6 text-muted-foreground" /></div>}
                            <div className="min-w-0 flex-1"><p className="line-clamp-2 font-medium">{product.title}</p><p className="mt-1 text-sm text-muted-foreground">{product.product_type || "—"}</p>{product.image_url && <Button variant="ghost" size="sm" className="mt-2 h-7 px-2" onClick={() => void persistCollectionImage(product.image_url!, false)}><ImageIcon className="mr-1 h-3 w-3" />{language === "fr" ? "Utiliser comme image" : "Use as image"}</Button>}</div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
