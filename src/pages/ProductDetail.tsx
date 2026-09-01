import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Code2,
  ExternalLink,
  FileText,
  Loader2,
  Package,
  Save,
  Store,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Product = {
  id: string;
  title: string;
  handle: string | null;
  description: string | null;
  body_html: string | null;
  price: number | null;
  compare_at_price: number | null;
  image_url: string | null;
  currency: string | null;
  vendor: string | null;
  product_type: string | null;
  sku: string | null;
  inventory_quantity: number | null;
  inventory_managed: boolean;
  status: string;
  landing_page: string | null;
  landing_page_html: string | null;
  tags: string | null;
};

type LandingMode = "preview" | "html";

export default function ProductDetail() {
  const { id, handle } = useParams<{ id?: string; handle?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCommerce, setSavingCommerce] = useState(false);
  const [savingHtml, setSavingHtml] = useState(false);
  const [landingMode, setLandingMode] = useState<LandingMode>("preview");

  const [statusActive, setStatusActive] = useState(true);
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [inventoryManaged, setInventoryManaged] = useState(true);
  const [inventoryQuantity, setInventoryQuantity] = useState("0");
  const [landingHtml, setLandingHtml] = useState("");

  const productRef = id || handle;

  const hydrateDraft = (row: Product) => {
    setStatusActive(row.status === "active");
    setPrice(row.price === null || row.price === undefined ? "" : String(row.price));
    setCompareAtPrice(row.compare_at_price === null || row.compare_at_price === undefined ? "" : String(row.compare_at_price));
    setInventoryManaged(row.inventory_managed !== false);
    setInventoryQuantity(String(row.inventory_quantity ?? 0));
    setLandingHtml(row.landing_page_html || row.landing_page || "");
  };

  const fetchProduct = async () => {
    if (!productRef || !user?.id) return;
    try {
      setLoading(true);
      let query = supabase
        .from("shopify_products")
        .select("*")
        .eq("seller_id", user.id);

      if (selectedStore?.id) query = query.eq("store_id", selectedStore.id);
      query = id ? query.eq("id", id) : query.eq("handle", handle || "");

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (!data) throw new Error(fr ? "Produit introuvable" : "Product not found");

      const row = data as unknown as Product;
      setProduct(row);
      hydrateDraft(row);
    } catch (error: any) {
      console.error("Error fetching product:", error);
      toast.error(error?.message || (fr ? "Produit introuvable" : "Product not found"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productRef, user?.id, selectedStore?.id]);

  const currency = product?.currency || "EUR";
  const contentHtml = product?.body_html || product?.description || "";
  const currentPrice = Number(price || 0);
  const currentCompare = Number(compareAtPrice || 0);
  const hasComparePrice = currentCompare > currentPrice && currentCompare > 0;

  const formattedPrice = useMemo(() => {
    try {
      return new Intl.NumberFormat(fr ? "fr-FR" : "en-US", {
        style: "currency",
        currency,
      }).format(currentPrice || 0);
    } catch {
      return `${currentPrice.toFixed(2)} ${currency}`;
    }
  }, [currentPrice, currency, fr]);

  const saveCommerce = async () => {
    if (!product) return;
    const parsedPrice = Number(price);
    const parsedCompare = compareAtPrice.trim() ? Number(compareAtPrice) : null;
    const parsedInventory = Number.parseInt(inventoryQuantity || "0", 10);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      toast.error(fr ? "Prix invalide" : "Invalid price");
      return;
    }
    if (!Number.isFinite(parsedInventory)) {
      toast.error(fr ? "Quantité invalide" : "Invalid inventory quantity");
      return;
    }

    try {
      setSavingCommerce(true);
      const patch = {
        status: statusActive ? "active" : "draft",
        price: parsedPrice,
        compare_at_price: parsedCompare,
        inventory_managed: inventoryManaged,
        inventory_quantity: parsedInventory,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("shopify_products")
        .update(patch as any)
        .eq("id", product.id);
      if (error) throw error;

      setProduct((current) => current ? { ...current, ...patch } as Product : current);
      toast.success(fr ? "Produit enregistré" : "Product saved");
    } catch (error: any) {
      toast.error(error?.message || (fr ? "Enregistrement impossible" : "Could not save product"));
    } finally {
      setSavingCommerce(false);
    }
  };

  const saveLandingHtml = async () => {
    if (!product) return;
    try {
      setSavingHtml(true);
      const { error } = await supabase
        .from("shopify_products")
        .update({ landing_page_html: landingHtml, updated_at: new Date().toISOString() } as any)
        .eq("id", product.id);
      if (error) throw error;
      setProduct((current) => current ? { ...current, landing_page_html: landingHtml } : current);
      toast.success(fr ? "HTML de la landing page enregistré" : "Landing page HTML saved");
    } catch (error: any) {
      toast.error(error?.message || (fr ? "Enregistrement HTML impossible" : "Could not save HTML"));
    } finally {
      setSavingHtml(false);
    }
  };

  if (loading) {
    return <div className="grid min-h-[420px] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-slate-400" /></div>;
  }

  if (!product) {
    return (
      <Card className="mx-auto max-w-2xl rounded-2xl border-slate-200 shadow-none">
        <CardContent className="grid min-h-72 place-items-center p-8 text-center">
          <div><Package className="mx-auto mb-3 h-9 w-9 text-slate-300" /><p className="font-medium">{fr ? "Produit introuvable" : "Product not found"}</p><Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigate("/products")}>{fr ? "Retour aux produits" : "Back to products"}</Button></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="rounded-xl text-slate-600" onClick={() => navigate("/products")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />{fr ? "Produits" : "Products"}
        </Button>
        <Badge variant="outline" className={statusActive ? "rounded-full border-emerald-200 bg-emerald-50 text-emerald-700" : "rounded-full border-slate-200 bg-slate-50 text-slate-600"}>
          {statusActive ? (fr ? "Actif" : "Active") : (fr ? "Inactif" : "Inactive")}
        </Badge>
      </div>

      <Card className="overflow-hidden rounded-2xl border-violet-100 bg-gradient-to-r from-violet-50/60 via-white to-slate-50/70 shadow-none">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white bg-white shadow-sm">
            {product.image_url ? <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" /> : <Package className="h-7 w-7 text-slate-300" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>{product.vendor || product.product_type || "Catalog"}</span>{product.sku && <><span>•</span><span>SKU {product.sku}</span></>}</div>
            <h1 className="mt-1 max-w-4xl text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{product.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3"><span className="text-xl font-semibold text-slate-950">{formattedPrice}</span><span className={inventoryManaged && Number(inventoryQuantity) <= 0 ? "text-sm font-medium text-red-600" : "text-sm text-slate-500"}>{inventoryManaged ? `${inventoryQuantity || 0} ${fr ? "en stock" : "in stock"}` : (fr ? "Stock non géré" : "Inventory not tracked")}</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="rounded-2xl border-slate-200 shadow-none">
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">Commerce</h2><p className="mt-0.5 text-xs text-slate-500">{fr ? "Prix, disponibilité et inventaire du catalogue." : "Catalog price, availability, and inventory."}</p></div><Store className="h-5 w-5 text-violet-500" /></div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-3"><div><Label>{fr ? "Statut" : "Status"}</Label><p className="mt-1 text-xs text-slate-500">{statusActive ? (fr ? "Visible / actif" : "Visible / active") : (fr ? "Brouillon / inactif" : "Draft / inactive")}</p></div><Switch checked={statusActive} onCheckedChange={setStatusActive} /></div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-3"><div><Label>{fr ? "Stock géré" : "Track inventory"}</Label><p className="mt-1 text-xs text-slate-500">{inventoryManaged ? (fr ? "Quantité suivie" : "Quantity tracked") : (fr ? "Stock non géré" : "Inventory not tracked")}</p></div><Switch checked={inventoryManaged} onCheckedChange={setInventoryManaged} /></div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="product-price">{fr ? "Prix" : "Price"}</Label><div className="flex items-center gap-2"><Input id="product-price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="rounded-xl" /><span className="text-sm font-medium text-slate-500">{currency}</span></div></div>
              <div className="space-y-2"><Label htmlFor="product-compare-price">{fr ? "Prix comparé" : "Compare-at price"}</Label><div className="flex items-center gap-2"><Input id="product-compare-price" type="number" min="0" step="0.01" value={compareAtPrice} onChange={(event) => setCompareAtPrice(event.target.value)} className="rounded-xl" /><span className="text-sm font-medium text-slate-500">{currency}</span></div>{hasComparePrice && <p className="text-xs text-emerald-600"><Check className="mr-1 inline h-3 w-3" />{fr ? "Promotion détectée" : "Promotion detected"}</p>}</div>
              <div className="space-y-2"><Label htmlFor="inventory-quantity">{fr ? "Quantité d’inventaire" : "Inventory quantity"}</Label><Input id="inventory-quantity" type="number" step="1" value={inventoryQuantity} disabled={!inventoryManaged} onChange={(event) => setInventoryQuantity(event.target.value)} className="rounded-xl disabled:bg-slate-50" /></div>
              <div className="space-y-2"><Label>SKU</Label><div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">{product.sku || "—"}</div></div>
            </div>

            <div className="flex justify-end"><Button className="rounded-xl" onClick={saveCommerce} disabled={savingCommerce}>{savingCommerce ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}{fr ? "Enregistrer" : "Save changes"}</Button></div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-none">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-sky-600" /><div><h2 className="font-semibold text-slate-950">{fr ? "Contenu produit" : "Product content"}</h2><p className="text-xs text-slate-500">{fr ? "Description actuellement enregistrée dans le catalogue." : "Current catalog description."}</p></div></div>
            {contentHtml ? <div className="prose prose-sm max-h-[370px] max-w-none overflow-auto rounded-xl border border-slate-200 bg-slate-50/50 p-4" dangerouslySetInnerHTML={{ __html: contentHtml }} /> : <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">{fr ? "Aucune description" : "No description"}</div>}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-none">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-semibold text-slate-950">Landing Page</h2><p className="mt-0.5 text-xs text-slate-500">{fr ? "Prévisualisez ou modifiez le HTML généré pour ce produit." : "Preview or edit the generated HTML for this product."}</p></div>
            <div className="flex flex-wrap gap-2"><div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1"><Button size="sm" variant={landingMode === "preview" ? "secondary" : "ghost"} className="h-8 rounded-lg" onClick={() => setLandingMode("preview")}><FileText className="mr-1.5 h-3.5 w-3.5" />Preview</Button><Button size="sm" variant={landingMode === "html" ? "secondary" : "ghost"} className="h-8 rounded-lg" onClick={() => setLandingMode("html")}><Code2 className="mr-1.5 h-3.5 w-3.5" />HTML</Button></div><Button asChild size="sm" variant="outline" className="rounded-xl"><a href={`/product-landing/${product.id}`}><ExternalLink className="mr-1.5 h-3.5 w-3.5" />{fr ? "Éditeur landing" : "Landing editor"}</a></Button></div>
          </div>

          {landingMode === "html" ? (
            <div className="space-y-3"><Textarea value={landingHtml} onChange={(event) => setLandingHtml(event.target.value)} rows={18} spellCheck={false} placeholder={fr ? "Le HTML de la landing page apparaîtra ici…" : "Landing page HTML will appear here…"} className="min-h-[360px] rounded-xl bg-slate-950 font-mono text-xs leading-5 text-slate-100" /><div className="flex justify-end"><Button size="sm" className="rounded-xl" onClick={saveLandingHtml} disabled={savingHtml}>{savingHtml ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}{fr ? "Enregistrer HTML" : "Save HTML"}</Button></div></div>
          ) : landingHtml.trim() ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><iframe title="Landing page preview" srcDoc={landingHtml} sandbox="" className="h-[620px] w-full bg-white" /></div>
          ) : (
            <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-8 text-center"><div><Code2 className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p className="font-medium text-slate-700">{fr ? "Aucune landing page HTML" : "No landing page HTML"}</p><p className="mt-1 text-sm text-slate-500">{fr ? "Générez une landing page ou passez en mode HTML pour coller votre code." : "Generate a landing page or switch to HTML mode to paste your code."}</p><Button className="mt-4 rounded-xl" variant="outline" onClick={() => navigate(`/product-landing/${product.id}`)}>{fr ? "Créer / ouvrir la landing" : "Create / open landing"}</Button></div></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
