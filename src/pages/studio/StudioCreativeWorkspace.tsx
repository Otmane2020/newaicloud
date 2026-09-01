import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  Download,
  Facebook,
  Image as ImageIcon,
  Instagram,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { CreativeStyleGrid } from "@/components/social/creative/CreativeStyleGrid";
import { type CreativeStyle } from "@/components/social/templates/creativeStyles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";
import { cn } from "@/lib/utils";

type GenerationMode = "showcase" | "strengths";
type PostType = "image" | "withLink";

type StudioProduct = {
  id: string;
  title: string;
  image: string | null;
  price: string | null;
  compare_at_price: string | null;
  vendor?: string | null;
  product_type?: string | null;
  handle?: string | null;
  vision_attributes?: {
    color?: string;
    material?: string;
    style?: string;
    shape?: string;
    features?: string[];
  } | null;
};

type RecentCreative = {
  id: string;
  product_title: string | null;
  image_url: string;
  created_at: string;
};

const detectLanguage = (text: string): "fr" | "en" => {
  const frenchWords = ["canapé", "table", "chaise", "fauteuil", "bureau", "lit", "meuble", "armoire", "étagère", "commode", "lampe", "tapis", "miroir", "avec", "pour", "dans", "sans", "noir", "blanc", "bois", "moderne", "design"];
  const lower = text.toLowerCase();
  return frenchWords.some((word) => lower.includes(word)) ? "fr" : "en";
};

export default function StudioCreativeWorkspace() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<StudioProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<StudioProduct | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<CreativeStyle | null>(null);
  const [mode, setMode] = useState<GenerationMode>("showcase");
  const [showPrice, setShowPrice] = useState(false);
  const [caption, setCaption] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [postType, setPostType] = useState<PostType>("image");
  const [socialCaption, setSocialCaption] = useState("");
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [recent, setRecent] = useState<RecentCreative[]>([]);

  const requestedProductId = searchParams.get("product");

  useEffect(() => {
    const load = async () => {
      if (!selectedStore?.id) {
        setProducts([]);
        setLoadingProducts(false);
        return;
      }

      setLoadingProducts(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: productRows, error } = await (supabase.from("shopify_products") as any)
          .select("id, title, vendor, product_type, vision_attributes, handle")
          .eq("seller_id", user.id)
          .eq("store_id", selectedStore.id)
          .order("updated_at", { ascending: false });
        if (error) throw error;

        const ids = (productRows || []).map((row: any) => row.id);
        const imageMap = new Map<string, string>();
        const priceMap = new Map<string, { price: number | null; compare_at_price: number | null }>();

        for (let index = 0; index < ids.length; index += 50) {
          const batch = ids.slice(index, index + 50);
          const [{ data: images }, { data: variants }] = await Promise.all([
            (supabase.from("product_images") as any).select("product_id, src, position").in("product_id", batch).order("position", { ascending: true }),
            (supabase.from("product_variants") as any).select("product_id, price, compare_at_price, position").in("product_id", batch).order("position", { ascending: true }),
          ]);

          (images || []).forEach((image: any) => {
            if (!imageMap.has(image.product_id)) imageMap.set(image.product_id, image.src);
          });
          (variants || []).forEach((variant: any) => {
            if (!priceMap.has(variant.product_id)) {
              priceMap.set(variant.product_id, { price: variant.price, compare_at_price: variant.compare_at_price });
            }
          });
        }

        const normalized: StudioProduct[] = (productRows || []).map((row: any) => {
          const pricing = priceMap.get(row.id);
          return {
            id: row.id,
            title: row.title,
            image: imageMap.get(row.id) || null,
            price: pricing?.price?.toString() || null,
            compare_at_price: pricing?.compare_at_price?.toString() || null,
            vendor: row.vendor,
            product_type: row.product_type,
            handle: row.handle,
            vision_attributes: row.vision_attributes,
          };
        });

        setProducts(normalized);
        const requested = requestedProductId ? normalized.find((product) => product.id === requestedProductId) : null;
        if (requested) setSelectedProduct(requested);

        const { data: historyRows } = await supabase
          .from("creative_history")
          .select("id, product_title, image_url, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8);
        setRecent((historyRows || []) as RecentCreative[]);
      } catch (error) {
        console.error("Studio creative load error", error);
        toast.error(fr ? "Impossible de charger le Studio." : "Unable to load Studio.");
      } finally {
        setLoadingProducts(false);
      }
    };

    load();
  }, [fr, requestedProductId, selectedStore?.id]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => `${product.title} ${product.vendor || ""}`.toLowerCase().includes(query));
  }, [productSearch, products]);

  const chooseProduct = (product: StudioProduct) => {
    setSelectedProduct(product);
    setGeneratedImage(null);
    setSocialCaption("");
    const next = new URLSearchParams(searchParams);
    next.set("product", product.id);
    setSearchParams(next, { replace: true });
  };

  const generateCreative = async () => {
    if (!selectedProduct || !selectedStyle) {
      toast.error(fr ? "Choisissez un produit et un style." : "Choose a product and a style.");
      return;
    }

    setGenerating(true);
    try {
      const productLanguage = detectLanguage(selectedProduct.title);
      const { data, error } = await supabase.functions.invoke("export-creative-image", {
        body: {
          product: {
            ...selectedProduct,
            price: showPrice ? selectedProduct.price : null,
            compare_at_price: showPrice ? selectedProduct.compare_at_price : null,
            language: productLanguage,
          },
          template: {
            id: selectedStyle.id,
            name: selectedStyle.name,
            size: selectedStyle.size,
            category: selectedStyle.category,
            aiPromptStyle: selectedStyle.aiPromptStyle,
            accentColor: selectedStyle.accentColor,
          },
          caption,
          format: "png",
          mode,
          showPrice,
          language: productLanguage,
        },
      });
      if (error) throw error;
      if (!data?.base64) throw new Error("No generated image returned");

      const imageUrl = `data:image/png;base64,${data.base64}`;
      setGeneratedImage(imageUrl);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: saved } = await supabase.from("creative_history").insert({
          user_id: user.id,
          store_id: selectedStore?.id,
          product_id: selectedProduct.id,
          product_title: selectedProduct.title,
          template_id: selectedStyle.id,
          template_name: selectedStyle.name,
          image_url: imageUrl,
          generation_mode: mode,
          caption,
        }).select("id, product_title, image_url, created_at").single();
        if (saved) setRecent((current) => [saved as RecentCreative, ...current].slice(0, 8));
      }

      toast.success(fr ? "Créatif généré." : "Creative generated.");
    } catch (error: any) {
      console.error("Studio creative generation error", error);
      toast.error(error?.message || (fr ? "La génération a échoué." : "Generation failed."));
    } finally {
      setGenerating(false);
    }
  };

  const generateSocialCaption = async () => {
    if (!selectedProduct) return;
    setGeneratingCaption(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-social-caption", {
        body: {
          productTitle: selectedProduct.title,
          productDescription: selectedProduct.product_type,
          productPrice: showPrice && selectedProduct.price ? `${selectedProduct.price}€` : null,
          comparePrice: showPrice && selectedProduct.compare_at_price ? `${selectedProduct.compare_at_price}€` : null,
          productType: selectedProduct.product_type,
          storeName: selectedStore?.store_name,
          language: detectLanguage(selectedProduct.title),
          tone: "engaging",
          platform: selectedPlatforms.includes("instagram") ? "instagram" : "facebook",
        },
      });
      if (error) throw error;
      if (data?.caption) setSocialCaption(data.caption);
    } catch (error) {
      console.error("Social caption generation error", error);
      toast.error(fr ? "Impossible de générer la légende." : "Unable to generate caption.");
    } finally {
      setGeneratingCaption(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((current) => current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]);
  };

  const publish = async () => {
    if (!generatedImage || !selectedProduct || selectedPlatforms.length === 0 || !socialCaption.trim()) {
      toast.error(fr ? "Ajoutez une légende et choisissez au moins un réseau." : "Add a caption and choose at least one network.");
      return;
    }

    setPublishing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const productLink = postType === "withLink" && selectedProduct.handle
        ? `https://${selectedStore?.public_domain || selectedStore?.store_url?.replace("https://", "") || ""}/products/${selectedProduct.handle}`
        : null;

      const { data: post, error } = await supabase.from("social_posts").insert({
        user_id: user.id,
        store_id: selectedStore?.id,
        status: "pending",
        channels: selectedPlatforms,
        caption: socialCaption,
        image_url: generatedImage,
        product_id: selectedProduct.id,
        link_url: productLink,
        template_style: selectedStyle?.id || null,
      }).select().single();
      if (error) throw error;

      const { error: publishError } = await supabase.functions.invoke("publish-social-post", {
        body: { postId: post.id, userId: user.id },
      });
      if (publishError) throw publishError;
      toast.success(fr ? "Publication envoyée." : "Post sent.");
    } catch (error: any) {
      console.error("Studio publish error", error);
      toast.error(error?.message || (fr ? "La publication a échoué." : "Publishing failed."));
    } finally {
      setPublishing(false);
    }
  };

  const download = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `${selectedProduct?.title?.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "creative"}.png`;
    link.click();
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
      <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">01 · {fr ? "Produit" : "Product"}</p>
              <h2 className="mt-1 font-semibold text-slate-950">{fr ? "Choisir le produit" : "Choose product"}</h2>
            </div>
            {selectedProduct && <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-4 w-4" /></span>}
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} className="h-9 bg-slate-50 pl-9" placeholder={fr ? "Rechercher…" : "Search…"} />
          </div>
        </div>

        <ScrollArea className="h-[640px]">
          <div className="space-y-1.5 p-2">
            {loadingProducts ? (
              <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-violet-600" /></div>
            ) : filteredProducts.map((product) => {
              const selected = product.id === selectedProduct?.id;
              return (
                <button key={product.id} type="button" onClick={() => chooseProduct(product)} className={cn("flex w-full items-center gap-3 rounded-xl border p-2 text-left transition", selected ? "border-violet-300 bg-violet-50 ring-1 ring-violet-100" : "border-transparent hover:border-slate-200 hover:bg-slate-50")}>
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {product.image ? <img src={product.image} alt={product.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><ImageIcon className="h-4 w-4 text-slate-300" /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{product.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">{product.vendor || product.product_type || (fr ? "Produit" : "Product")}</p>
                  </div>
                  {selected && <Check className="h-4 w-4 shrink-0 text-violet-600" />}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </aside>

      <main className="min-w-0 space-y-4">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">02 · {fr ? "Création" : "Create"}</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">{selectedProduct ? selectedProduct.title : (fr ? "Votre création" : "Your creative")}</h2>
              <p className="mt-1 text-xs text-slate-500">{fr ? "Un flux unique : produit → style → génération → publication." : "One flow: product → style → generation → publish."}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{mode === "showcase" ? (fr ? "Mise en scène" : "Showcase") : (fr ? "Points forts" : "Strengths")}</Badge>
              {selectedStyle && <Badge className="bg-slate-950 text-white hover:bg-slate-950">{selectedStyle.name}</Badge>}
            </div>
          </div>

          <div className="grid min-h-[420px] place-items-center bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.08),transparent_38%),linear-gradient(to_bottom,#f8fafc,#fff)] p-5">
            {generating ? (
              <div className="text-center">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-lg"><Loader2 className="h-7 w-7 animate-spin text-violet-600" /></span>
                <p className="mt-4 text-sm font-medium text-slate-900">{fr ? "Création en cours…" : "Creating…"}</p>
                <p className="mt-1 text-xs text-slate-500">{fr ? "Le Studio compose le produit et le style sélectionné." : "Studio is composing the selected product and style."}</p>
              </div>
            ) : generatedImage ? (
              <div className="w-full max-w-2xl">
                <img src={generatedImage} alt="Generated creative" className="mx-auto max-h-[560px] max-w-full rounded-2xl object-contain shadow-2xl" />
                <div className="mt-4 flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={download}><Download className="mr-1.5 h-4 w-4" />{fr ? "Télécharger" : "Download"}</Button>
                  <Button size="sm" onClick={generateCreative} disabled={generating}><RefreshCw className="mr-1.5 h-4 w-4" />{fr ? "Régénérer" : "Regenerate"}</Button>
                </div>
              </div>
            ) : selectedProduct?.image ? (
              <div className="text-center">
                <img src={selectedProduct.image} alt={selectedProduct.title} className="mx-auto max-h-[330px] max-w-[78%] rounded-2xl object-contain shadow-xl" />
                <p className="mt-4 text-sm font-medium text-slate-900">{fr ? "Produit prêt" : "Product ready"}</p>
                <p className="mt-1 text-xs text-slate-500">{fr ? "Choisissez un style puis lancez la génération." : "Choose a style, then generate."}</p>
              </div>
            ) : (
              <div className="max-w-sm text-center">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-violet-50 text-violet-600"><Wand2 className="h-7 w-7" /></span>
                <h3 className="mt-4 font-semibold text-slate-950">{fr ? "Commencez par un produit" : "Start with a product"}</h3>
                <p className="mt-1 text-sm text-slate-500">{fr ? "Le Studio adaptera ensuite les styles et les options de campagne." : "Studio will then adapt styles and campaign options."}</p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">{fr ? "Style" : "Style"}</p>
              <h3 className="mt-1 font-semibold text-slate-950">{fr ? "Direction créative" : "Creative direction"}</h3>
            </div>
            <span className="text-xs text-slate-400">{fr ? "Sélection obligatoire" : "Required"}</span>
          </div>
          <CreativeStyleGrid selectedStyle={selectedStyle} onSelectStyle={setSelectedStyle} />
        </section>

        {recent.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">{fr ? "Récent" : "Recent"}</p>
                <h3 className="mt-1 font-semibold text-slate-950">{fr ? "Dernières créations" : "Latest creatives"}</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/studio/library")}>{fr ? "Tout voir" : "View all"}</Button>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {recent.map((item) => <img key={item.id} src={item.image_url} alt={item.product_title || "Creative"} className="aspect-square w-full rounded-xl object-cover" />)}
            </div>
          </section>
        )}
      </main>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">03 · {fr ? "Réglages" : "Settings"}</p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700">{fr ? "Angle créatif" : "Creative angle"}</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setMode("showcase")} className={cn("rounded-xl border px-3 py-2 text-xs font-medium", mode === "showcase" ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600")}>{fr ? "Mise en scène" : "Showcase"}</button>
                <button type="button" onClick={() => setMode("strengths")} className={cn("rounded-xl border px-3 py-2 text-xs font-medium", mode === "strengths" ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600")}>{fr ? "Points forts" : "Strengths"}</button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-slate-900">{fr ? "Afficher le prix" : "Show price"}</p>
                <p className="text-[11px] text-slate-400">{fr ? "Désactivé par défaut" : "Off by default"}</p>
              </div>
              <Switch checked={showPrice} onCheckedChange={setShowPrice} />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700">{fr ? "Texte dans le créatif" : "Creative copy"}</label>
              <Textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={3} className="mt-2 resize-none" placeholder={fr ? "Optionnel : accroche courte…" : "Optional: short hook…"} />
            </div>

            <Button className="w-full" size="lg" disabled={!selectedProduct || !selectedStyle || generating} onClick={generateCreative}>
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {fr ? "Générer le créatif" : "Generate creative"}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">04 · {fr ? "Publier" : "Publish"}</p>
              <h3 className="mt-1 font-semibold text-slate-950">{fr ? "Réseaux sociaux" : "Social media"}</h3>
            </div>
            {generatedImage && <Badge variant="secondary">{fr ? "Prêt" : "Ready"}</Badge>}
          </div>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => togglePlatform("facebook")} className={cn("flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium", selectedPlatforms.includes("facebook") ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600")}><Facebook className="h-4 w-4" />Facebook</button>
              <button type="button" onClick={() => togglePlatform("instagram")} className={cn("flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium", selectedPlatforms.includes("instagram") ? "border-pink-300 bg-pink-50 text-pink-700" : "border-slate-200 text-slate-600")}><Instagram className="h-4 w-4" />Instagram</button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPostType("image")} className={cn("rounded-xl border px-3 py-2 text-xs font-medium", postType === "image" ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600")}>{fr ? "Image seule" : "Image only"}</button>
              <button type="button" onClick={() => setPostType("withLink")} className={cn("rounded-xl border px-3 py-2 text-xs font-medium", postType === "withLink" ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600")}>{fr ? "Avec lien" : "With link"}</button>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-slate-700">{fr ? "Légende" : "Caption"}</label>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={generateSocialCaption} disabled={!selectedProduct || generatingCaption}>
                  {generatingCaption ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />} IA
                </Button>
              </div>
              <Textarea value={socialCaption} onChange={(event) => setSocialCaption(event.target.value)} rows={5} className="mt-1.5 resize-none" placeholder={fr ? "Générez ou rédigez la légende…" : "Generate or write the caption…"} />
            </div>

            <Button variant="outline" className="w-full" disabled={!generatedImage || selectedPlatforms.length === 0 || !socialCaption.trim() || publishing} onClick={publish}>
              {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {fr ? "Publier maintenant" : "Publish now"}
            </Button>
          </div>
        </section>
      </aside>
    </div>
  );
}
