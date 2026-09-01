import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Camera, Check, History, Images, Megaphone, Search, Sparkles, Wand2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AIImagesDialog } from "@/components/seo/AIImagesDialog";
import { SmartBackgroundDialog } from "@/components/seo/SmartBackgroundDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";
import AiCreativeStudio from "../AiCreativeStudio";

type StudioMode = "shots" | "backgrounds" | "creative";

type StudioProduct = {
  id: string;
  title: string;
  image_url: string | null;
  vendor?: string | null;
  handle?: string | null;
  product_type?: string | null;
  body_html?: string | null;
  seo_description?: string | null;
  product_images?: Array<{ id: string; src: string }> | null;
};

type ModeDefinition = {
  id: StudioMode;
  icon: typeof Camera;
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  detailFr: string;
  detailEn: string;
};

const MODES: ModeDefinition[] = [
  {
    id: "shots",
    icon: Camera,
    titleFr: "Product Shot AI",
    titleEn: "Product Shot AI",
    descriptionFr: "Créez des vues produit cohérentes à partir d’une ou plusieurs images de référence.",
    descriptionEn: "Create consistent product views from one or more reference images.",
    detailFr: "Face · 45° · profil · arrière · dessus · zoom matière · zoom détail · décor",
    detailEn: "Front · 45° · profile · back · top · material zoom · detail zoom · scene",
  },
  {
    id: "backgrounds",
    icon: Wand2,
    titleFr: "Smart Background",
    titleEn: "Smart Background",
    descriptionFr: "Changez l’environnement visuel tout en conservant le produit comme référence.",
    descriptionEn: "Change the visual environment while keeping the product as the reference.",
    detailFr: "Fond blanc · lifestyle · studio · nature · showroom · 3D · prompt libre",
    detailEn: "White · lifestyle · studio · nature · showroom · 3D · custom prompt",
  },
  {
    id: "creative",
    icon: Megaphone,
    titleFr: "Créatifs publicitaires",
    titleEn: "Ad creatives",
    descriptionFr: "Passez du produit au visuel publicitaire puis à la publication.",
    descriptionEn: "Go from product to ad creative and publishing.",
    detailFr: "Styles · texte · prix optionnel · légende IA · Facebook · Instagram",
    detailEn: "Styles · copy · optional price · AI caption · Facebook · Instagram",
  },
];

const LEGACY_MODE_MAP: Record<string, StudioMode> = {
  images: "shots",
  creative: "creative",
  shots: "shots",
  backgrounds: "backgrounds",
};

export default function StudioSmart() {
  const { language } = useTranslation();
  const { selectedStore } = useStore();
  const fr = language === "fr";
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialogProducts, setDialogProducts] = useState<StudioProduct[]>([]);
  const [showProductShot, setShowProductShot] = useState(false);
  const [showBackground, setShowBackground] = useState(false);

  const requestedMode = searchParams.get("mode") || searchParams.get("tool");
  const activeMode = requestedMode ? LEGACY_MODE_MAP[requestedMode] || null : null;

  const { data: products = [], refetch, isLoading } = useQuery({
    queryKey: ["studio-real-products", selectedStore?.id],
    enabled: !!selectedStore?.id,
    queryFn: async (): Promise<StudioProduct[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedStore?.id) return [];

      const { data, error } = await supabase
        .from("shopify_products")
        .select("id, title, image_url, vendor, handle, product_type, body_html, seo_description, product_images(id, src)")
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("updated_at", { ascending: false })
        .limit(240);

      if (error) throw error;
      return (data || []) as StudioProduct[];
    },
  });

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      `${product.title} ${product.vendor || ""} ${product.product_type || ""}`.toLowerCase().includes(query),
    );
  }, [products, search]);

  const bulkProducts = useMemo(
    () => products.filter((product) => selectedIds.has(product.id)),
    [products, selectedIds],
  );

  const currentDefinition = activeMode ? MODES.find((mode) => mode.id === activeMode) : null;

  const clearSelection = () => setSelectedIds(new Set());

  const openMode = (mode: StudioMode) => {
    const next = new URLSearchParams();
    next.set("mode", mode);
    setSearchParams(next);
    setSearch("");
    clearSelection();
  };

  const goHome = () => {
    setSearchParams({});
    setSearch("");
    clearSelection();
  };

  const toggleBulkSelection = (productId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const openProduct = (product: StudioProduct) => {
    setDialogProducts([product]);
    if (activeMode === "shots") setShowProductShot(true);
    if (activeMode === "backgrounds") setShowBackground(true);
  };

  const launchBulk = () => {
    if (bulkProducts.length === 0) return;
    setDialogProducts(bulkProducts);
    if (activeMode === "shots") setShowProductShot(true);
    if (activeMode === "backgrounds") setShowBackground(true);
  };

  if (activeMode === "creative") {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-4">
        <StudioModeHeader mode={MODES[2]} fr={fr} onBack={goHome} onSwitch={openMode} activeMode="creative" />
        <AiCreativeStudio />
      </div>
    );
  }

  if (activeMode && currentDefinition) {
    const CurrentIcon = currentDefinition.icon;

    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-4">
        <StudioModeHeader mode={currentDefinition} fr={fr} onBack={goHome} onSwitch={openMode} activeMode={activeMode} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                    {fr ? "Catalogue produits" : "Product catalog"}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">
                    {fr ? "Recherchez puis sélectionnez un produit" : "Search, then select a product"}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {activeMode === "shots"
                      ? (fr
                        ? "Cliquez sur un produit : Product Shot AI s’ouvre ensuite avec toutes ses images pour choisir une ou plusieurs références."
                        : "Click a product: Product Shot AI then opens with all its images so you can choose one or more references.")
                      : (fr
                        ? "Cliquez sur un produit pour configurer son nouvel arrière-plan."
                        : "Click a product to configure its new background.")}
                  </p>
                </div>
                <div className="relative w-full lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={fr ? "Rechercher par produit, marque ou type…" : "Search by product, brand or type…"}
                    className="h-11 pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="max-h-[68vh] overflow-y-auto bg-slate-50/50 p-4">
              {isLoading ? (
                <div className="grid min-h-80 place-items-center text-sm text-slate-500">
                  {fr ? "Chargement du catalogue…" : "Loading catalog…"}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white text-sm text-slate-500">
                  {fr ? "Aucun produit trouvé." : "No products found."}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {filteredProducts.map((product) => {
                    const sourceCount = Array.from(new Set([
                      product.image_url,
                      ...(product.product_images || []).map((image) => image.src),
                    ].filter(Boolean))).length;
                    const selected = selectedIds.has(product.id);
                    const hasUsableImage = sourceCount > 0;

                    return (
                      <div
                        key={product.id}
                        className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition ${selected ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300 hover:shadow-md"}`}
                      >
                        <button
                          type="button"
                          disabled={!hasUsableImage}
                          onClick={() => openProduct(product)}
                          className="block w-full text-left disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.title} className="h-full w-full object-contain p-3 transition duration-200 hover:scale-[1.02]" />
                            ) : (
                              <div className="grid h-full place-items-center text-slate-300"><Images className="h-9 w-9" /></div>
                            )}
                            <span className="absolute bottom-3 left-3 rounded-md bg-slate-950/85 px-2 py-1 text-[10px] font-medium text-white">
                              {sourceCount} {fr ? "image(s)" : "image(s)"}
                            </span>
                          </div>
                          <div className="p-3 pr-11">
                            <p className="truncate text-sm font-semibold text-slate-950">{product.title}</p>
                            <p className="mt-1 truncate text-xs text-slate-500">{product.vendor || product.product_type || (fr ? "Produit catalogue" : "Catalog product")}</p>
                            <p className={`mt-2 text-[11px] font-semibold ${hasUsableImage ? "text-violet-700" : "text-slate-400"}`}>
                              {hasUsableImage
                                ? activeMode === "shots"
                                  ? (fr ? "Configurer les Product Shots →" : "Configure Product Shots →")
                                  : (fr ? "Configurer l’arrière-plan →" : "Configure background →")
                                : (fr ? "Aucune image disponible" : "No image available")}
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          disabled={!hasUsableImage}
                          onClick={() => toggleBulkSelection(product.id)}
                          aria-label={fr ? "Ajouter à la sélection groupée" : "Add to bulk selection"}
                          className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border shadow-sm transition disabled:opacity-40 ${selected ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 bg-white/95 text-transparent hover:border-violet-300"}`}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-3 xl:sticky xl:top-[72px] xl:self-start">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-100 text-violet-700"><CurrentIcon className="h-5 w-5" /></span>
              <h2 className="mt-4 text-lg font-semibold text-slate-950">{fr ? currentDefinition.titleFr : currentDefinition.titleEn}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{fr ? currentDefinition.descriptionFr : currentDefinition.descriptionEn}</p>

              <div className="mt-5 rounded-xl bg-slate-50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{fr ? "Sélection groupée" : "Bulk selection"}</span>
                  <strong className="text-slate-950">{bulkProducts.length}</strong>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {fr
                    ? "Cliquez directement sur un produit pour un shot rapide, ou cochez plusieurs produits pour une génération groupée."
                    : "Click a product for a quick shot, or check several products for bulk generation."}
                </p>
              </div>

              <Button className="mt-5 w-full" size="lg" disabled={bulkProducts.length === 0} onClick={launchBulk}>
                <Sparkles className="mr-2 h-4 w-4" />
                {activeMode === "shots"
                  ? (fr ? `Product Shot · ${bulkProducts.length}` : `Product Shot · ${bulkProducts.length}`)
                  : (fr ? `Arrière-plan · ${bulkProducts.length}` : `Background · ${bulkProducts.length}`)}
              </Button>

              {bulkProducts.length > 0 && (
                <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={clearSelection}>
                  {fr ? "Effacer la sélection" : "Clear selection"}
                </Button>
              )}

              <p className="mt-3 text-xs leading-5 text-slate-500">{fr ? currentDefinition.detailFr : currentDefinition.detailEn}</p>
            </section>

            <Button variant="outline" className="w-full justify-between" asChild>
              <Link to="/products/media-history">
                <span className="flex items-center gap-2"><History className="h-4 w-4" />{fr ? "Historique des images" : "Image history"}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </aside>
        </div>

        <AIImagesDialog
          open={showProductShot}
          onOpenChange={setShowProductShot}
          selectedProducts={dialogProducts}
          onComplete={() => {
            clearSelection();
            refetch();
          }}
        />

        <SmartBackgroundDialog
          open={showBackground}
          onOpenChange={setShowBackground}
          selectedProducts={dialogProducts}
          onComplete={() => {
            clearSelection();
            refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 p-6 md:p-8 xl:grid-cols-[1.05fr_0.95fr] xl:p-10">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-slate-950 text-white hover:bg-slate-950"><Sparkles className="mr-1.5 h-3.5 w-3.5" />Studio</Badge>
              <Badge variant="secondary">{fr ? "3 workflows créatifs" : "3 creative workflows"}</Badge>
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {fr ? "Un Studio centré sur vos produits" : "A Studio built around your products"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              {fr
                ? "Créez des photos produit, adaptez leurs arrière-plans et produisez vos créatifs publicitaires depuis votre catalogue connecté."
                : "Create product shots, adapt their backgrounds and produce ad creatives from your connected catalog."}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => openMode("shots")}><Camera className="mr-2 h-4 w-4" />Product Shot AI</Button>
              <Button variant="outline" onClick={() => openMode("backgrounds")}><Wand2 className="mr-2 h-4 w-4" />Smart Background</Button>
              <Button variant="outline" onClick={() => openMode("creative")}><Megaphone className="mr-2 h-4 w-4" />{fr ? "Créatif publicitaire" : "Ad creative"}</Button>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">{fr ? "Flux Product Shot" : "Product Shot flow"}</p>
            <div className="mt-4 space-y-3">
              <FlowStep number="1" title={fr ? "Recherchez le produit" : "Find the product"} text={fr ? "Le catalogue et la recherche sont visibles immédiatement." : "The catalog and search are visible immediately."} />
              <FlowStep number="2" title={fr ? "Choisissez les images source" : "Choose source images"} text={fr ? "Sélectionnez une ou plusieurs vues du même produit dans le popup." : "Select one or more views of the same product in the popup."} />
              <FlowStep number="3" title={fr ? "Configurez puis générez" : "Configure and generate"} text={fr ? "Angles, zooms, décor et instructions optionnelles sont regroupés au même endroit." : "Angles, zooms, decor and optional instructions live in one place."} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {MODES.map((mode, index) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => openMode(mode.id)}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-700"><Icon className="h-5 w-5" /></span>
                <span className="text-xs font-semibold text-slate-400">0{index + 1}</span>
              </div>
              <h2 className="mt-5 text-lg font-semibold text-slate-950">{fr ? mode.titleFr : mode.titleEn}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{fr ? mode.descriptionFr : mode.descriptionEn}</p>
              <p className="mt-4 text-xs leading-5 text-slate-500">{fr ? mode.detailFr : mode.detailEn}</p>
              <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-violet-700">
                {fr ? "Ouvrir" : "Open"}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </section>

      <div className="flex justify-end">
        <Button variant="ghost" asChild>
          <Link to="/products/media-history"><History className="mr-2 h-4 w-4" />{fr ? "Historique des créations" : "Creation history"}</Link>
        </Button>
      </div>
    </div>
  );
}

function StudioModeHeader({
  mode,
  fr,
  onBack,
  onSwitch,
  activeMode,
}: {
  mode: ModeDefinition;
  fr: boolean;
  onBack: () => void;
  onSwitch: (mode: StudioMode) => void;
  activeMode: StudioMode;
}) {
  const Icon = mode.icon;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-1.5 h-4 w-4" />Studio</Button>
          <span className="hidden h-7 w-px bg-slate-200 sm:block" />
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><Icon className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{fr ? mode.titleFr : mode.titleEn}</p>
            <p className="hidden truncate text-xs text-slate-500 sm:block">{fr ? mode.descriptionFr : mode.descriptionEn}</p>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {MODES.map((item) => {
            const ItemIcon = item.icon;
            return (
              <Button
                key={item.id}
                variant={item.id === activeMode ? "secondary" : "ghost"}
                size="sm"
                className="shrink-0"
                onClick={() => onSwitch(item.id)}
              >
                <ItemIcon className="mr-1.5 h-4 w-4" />{fr ? item.titleFr : item.titleEn}
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FlowStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-semibold">{number}</span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-400">{text}</p>
      </div>
    </div>
  );
}
