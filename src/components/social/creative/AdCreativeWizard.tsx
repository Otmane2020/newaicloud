import { useEffect, useMemo, useRef } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Facebook,
  Image as ImageIcon,
  Instagram,
  Link,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CreativeTemplatePreview, type CreativeOutputFormat } from "./CreativeTemplatePreview";
import type { CreativeStyle } from "../templates/creativeStyles";

export type AdCreativeWizardStep = 1 | 2 | 3 | 4;
export type AdGenerationMode = "showcase" | "strengths";
export type AdPostType = "image" | "withLink";

export interface AdWizardProduct {
  id: string;
  title: string;
  image: string | null;
  price: string | null;
  compare_at_price: string | null;
  vendor?: string | null;
  product_type?: string | null;
  handle?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: AdCreativeWizardStep;
  setStep: (step: AdCreativeWizardStep) => void;
  selectedStyle: CreativeStyle | null;
  selectedProduct: AdWizardProduct | null;
  products: AdWizardProduct[];
  loadingProducts: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onSelectProduct: (product: AdWizardProduct) => void;
  generationMode: AdGenerationMode;
  onGenerationModeChange: (mode: AdGenerationMode) => void;
  showPrice: boolean;
  onShowPriceChange: (checked: boolean) => void;
  tagline: string;
  onTaglineChange: (value: string) => void;
  selectedPlatforms: string[];
  togglePlatform: (platform: string) => void;
  postType: AdPostType;
  setPostType: (value: AdPostType) => void;
  socialCaption: string;
  setSocialCaption: (value: string) => void;
  generateSocialCaption: () => void;
  generatingCaption: boolean;
  generatedImage: string | null;
  generating: boolean;
  generateCreative: () => Promise<string | null>;
  publishToSocial: () => Promise<void>;
  publishing: boolean;
  canPublish: boolean;
  downloadImage: () => void;
}

const steps: Array<{ id: AdCreativeWizardStep; label: string }> = [
  { id: 1, label: "Product" },
  { id: 2, label: "Creative setup" },
  { id: 3, label: "Preview" },
  { id: 4, label: "Validation" },
];

const formatMap: Record<string, CreativeOutputFormat> = {
  square: "square",
  portrait: "portrait",
  story: "story",
  landscape: "landscape",
};

export function AdCreativeWizard({
  open,
  onOpenChange,
  step,
  setStep,
  selectedStyle,
  selectedProduct,
  products,
  loadingProducts,
  searchQuery,
  setSearchQuery,
  onSelectProduct,
  generationMode,
  onGenerationModeChange,
  showPrice,
  onShowPriceChange,
  tagline,
  onTaglineChange,
  selectedPlatforms,
  togglePlatform,
  postType,
  setPostType,
  socialCaption,
  setSocialCaption,
  generateSocialCaption,
  generatingCaption,
  generatedImage,
  generating,
  generateCreative,
  publishToSocial,
  publishing,
  canPublish,
  downloadImage,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [step, open]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      `${product.title} ${product.vendor || ""} ${product.product_type || ""}`.toLowerCase().includes(query),
    );
  }, [products, searchQuery]);

  const goNext = async () => {
    if (step === 1) {
      if (!selectedProduct) return;
      setStep(2);
      return;
    }

    if (step === 2) {
      if (generating) return;
      if (generatedImage) {
        setStep(3);
        return;
      }
      const image = await generateCreative();
      if (image) setStep(3);
      return;
    }

    if (step === 3 && generatedImage) setStep(4);
  };

  const goBack = () => {
    if (step === 1) {
      onOpenChange(false);
      return;
    }
    setStep(Math.max(1, step - 1) as AdCreativeWizardStep);
  };

  const outputFormat = formatMap[selectedStyle?.size || "square"] || "square";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-0.5rem)] w-[calc(100vw-0.5rem)] max-w-6xl flex-col overflow-hidden rounded-2xl p-0 sm:h-[94dvh] sm:w-[calc(100vw-2rem)] sm:rounded-3xl">
        <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border-0 bg-violet-100 px-3 py-1 text-violet-700 hover:bg-violet-100">
                  {selectedStyle?.name || "Ad creative"}
                </Badge>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Ad creative wizard</span>
              </div>
              <DialogTitle className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                Build and validate your creative
              </DialogTitle>
              <DialogDescription className="sr-only">
                Configure a product ad creative, preview it, then validate or publish it.
              </DialogDescription>
            </div>

            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <div className="flex min-w-max items-center gap-1.5 sm:gap-2">
                {steps.map((item, index) => {
                  const active = item.id === step;
                  const complete = item.id < step;
                  return (
                    <div key={item.id} className="flex items-center gap-1.5 sm:gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-bold transition sm:h-9 sm:w-9 sm:text-sm",
                            active && "border-violet-600 bg-violet-600 text-white",
                            complete && "border-emerald-500 bg-emerald-500 text-white",
                            !active && !complete && "border-slate-200 bg-white text-slate-500",
                          )}
                        >
                          {complete ? <Check className="h-4 w-4" /> : item.id}
                        </span>
                        <span className={cn("text-xs font-semibold sm:text-sm", active ? "text-slate-950" : "text-slate-500")}>{item.label}</span>
                      </div>
                      {index < steps.length - 1 && <span className="h-px w-5 bg-slate-200 sm:w-8" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-3 py-4 sm:px-6 sm:py-6">
          {step === 1 && (
            <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Step 1</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">Select a product</h2>
                <p className="mt-1 text-sm text-slate-500">Choose the Shopify product that will be placed into this template.</p>
              </div>

              <div className="sticky top-0 z-10 -mx-1 rounded-2xl bg-slate-50/95 p-1 backdrop-blur sm:static sm:bg-transparent sm:p-0">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search products by name, brand or type..."
                    className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-sm sm:h-12 sm:text-base"
                  />
                </div>
              </div>

              {selectedProduct && (
                <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-3 sm:p-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-violet-100 bg-white sm:h-16 sm:w-16">
                    {selectedProduct.image ? (
                      <img src={selectedProduct.image} alt="" className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-slate-950 sm:text-base">{selectedProduct.title}</p>
                      <Badge className="hidden shrink-0 border-0 bg-violet-600 text-white hover:bg-violet-600 sm:inline-flex">Selected</Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{selectedProduct.vendor || selectedProduct.product_type || "Shopify product"}</p>
                  </div>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-600 text-white"><Check className="h-4 w-4" /></span>
                </div>
              )}

              {loadingProducts ? (
                <div className="grid min-h-64 place-items-center rounded-2xl border border-slate-200 bg-white">
                  <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  No products found.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                  {filteredProducts.map((product) => {
                    const selected = selectedProduct?.id === product.id;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => onSelectProduct(product)}
                        className={cn(
                          "group overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                          selected ? "border-violet-500 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300 hover:shadow-md",
                        )}
                      >
                        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-50 to-white">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.title}
                              loading="lazy"
                              className="h-full w-full object-contain p-2.5 transition duration-200 group-hover:scale-[1.025] sm:p-3"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-slate-300"><ImageIcon className="h-7 w-7" /></div>
                          )}
                          {selected && (
                            <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-violet-600 text-white shadow-lg">
                              <Check className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                        <div className="p-2.5 sm:p-3">
                          <p className="line-clamp-2 min-h-9 text-xs font-semibold leading-4 text-slate-950 sm:min-h-10 sm:text-sm sm:leading-5">{product.title}</p>
                          <p className="mt-1 truncate text-[10px] text-slate-500 sm:text-xs">{product.vendor || product.product_type || "Shopify product"}</p>
                          {product.price && <p className="mt-1.5 text-xs font-bold text-violet-700 sm:text-sm">{product.price}€</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Step 2</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">Creative setup</h2>
                <p className="mt-1 text-sm text-slate-500">Tune the visual direction and publishing settings before generation.</p>
              </div>

              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-[180px_minmax(0,1fr)] sm:p-4">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {selectedStyle ? <CreativeTemplatePreview style={selectedStyle} format={outputFormat} /> : null}
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:h-20 sm:w-20">
                    {selectedProduct?.image ? (
                      <img src={selectedProduct.image} alt="" className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Selected product</p>
                    <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-950 sm:text-base">{selectedProduct?.title}</p>
                    <p className="mt-1 text-xs text-slate-500">Template: {selectedStyle?.name}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
                <div className="space-y-4">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">1</span>
                      <div>
                        <h3 className="font-bold text-slate-950">Creative direction</h3>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">Choose how strongly the ad should focus on the product versus its selling points.</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => onGenerationModeChange("showcase")}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition",
                          generationMode === "showcase" ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-200",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-sm"><Eye className="h-4 w-4" /></span>
                          {generationMode === "showcase" && <Check className="h-4 w-4 text-violet-600" />}
                        </div>
                        <p className="mt-3 text-sm font-bold text-slate-950">Showcase</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Hero-product composition with clean hierarchy and premium commercial styling.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => onGenerationModeChange("strengths")}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition",
                          generationMode === "strengths" ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-200",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-sm"><Star className="h-4 w-4" /></span>
                          {generationMode === "strengths" && <Check className="h-4 w-4 text-violet-600" />}
                        </div>
                        <p className="mt-3 text-sm font-bold text-slate-950">Strengths</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Emphasize key benefits, features and a stronger promotional message.</p>
                      </button>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">2</span>
                      <div>
                        <h3 className="font-bold text-slate-950">Offer & on-image copy</h3>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">Only these fields influence the generated visual.</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Show product price</p>
                        <p className="mt-0.5 text-xs text-slate-500">Display the Shopify price in the visual when appropriate.</p>
                      </div>
                      <Switch checked={showPrice} onCheckedChange={onShowPriceChange} />
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-sm font-semibold text-slate-900">Tagline</label>
                        <span className="text-[11px] text-slate-400">Optional</span>
                      </div>
                      <Textarea
                        value={tagline}
                        onChange={(event) => onTaglineChange(event.target.value)}
                        placeholder="e.g. A refined centerpiece for modern interiors"
                        rows={3}
                        className="resize-none rounded-xl border-slate-200 bg-white"
                      />
                    </div>
                  </section>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:self-start">
                  <div className="flex items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">3</span>
                    <div>
                      <h3 className="font-bold text-slate-950">Publishing setup</h3>
                      <p className="mt-0.5 text-xs leading-5 text-slate-500">Prepare the social post now, or leave it empty and download the creative only.</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Platform</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => togglePlatform("facebook")}
                        className={cn(
                          "flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition",
                          selectedPlatforms.includes("facebook") ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        <Facebook className="h-4 w-4" /> Facebook
                        {selectedPlatforms.includes("facebook") && <Check className="ml-auto h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePlatform("instagram")}
                        className={cn(
                          "flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition",
                          selectedPlatforms.includes("instagram") ? "border-pink-400 bg-pink-50 text-pink-700" : "border-slate-200 text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        <Instagram className="h-4 w-4" /> Instagram
                        {selectedPlatforms.includes("instagram") && <Check className="ml-auto h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Post type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPostType("image")}
                        className={cn(
                          "flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition sm:text-sm",
                          postType === "image" ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        <ImageIcon className="h-4 w-4" /> Image only
                        {postType === "image" && <Check className="ml-auto h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPostType("withLink")}
                        className={cn(
                          "flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition sm:text-sm",
                          postType === "withLink" ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        <Link className="h-4 w-4" /> With link
                        {postType === "withLink" && <Check className="ml-auto h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Caption</label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={generateSocialCaption}
                        disabled={!selectedProduct || generatingCaption}
                        className="h-8 gap-1.5 rounded-lg px-2 text-xs text-violet-700"
                      >
                        {generatingCaption ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Generate with AI
                      </Button>
                    </div>
                    <Textarea
                      value={socialCaption}
                      onChange={(event) => setSocialCaption(event.target.value)}
                      placeholder="Write the social caption or generate it with AI..."
                      rows={5}
                      className="resize-none rounded-xl border-slate-200"
                    />
                  </div>
                </section>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Step 3</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">Preview</h2>
                <p className="mt-1 text-sm text-slate-500">Review the generated creative before final validation.</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                <section className="grid min-h-[320px] place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:min-h-[460px] sm:p-5">
                  {generating ? (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-violet-700"><Loader2 className="h-7 w-7 animate-spin" /></span>
                      <div><p className="font-bold text-slate-950">Generating your creative</p><p className="mt-1 text-sm text-slate-500">Keeping your product as the visual reference…</p></div>
                    </div>
                  ) : generatedImage ? (
                    <img src={generatedImage} alt="Generated creative" className="max-h-[68vh] w-full rounded-xl object-contain" />
                  ) : (
                    <div className="max-w-sm text-center">
                      <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
                      <p className="mt-3 font-bold text-slate-950">No preview available</p>
                      <p className="mt-1 text-sm text-slate-500">Generation did not complete. Go back to Creative setup and try again.</p>
                    </div>
                  )}
                </section>

                <aside className="space-y-3">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Creative summary</p>
                    <dl className="mt-3 space-y-3 text-sm">
                      <div><dt className="text-xs text-slate-400">Template</dt><dd className="mt-0.5 font-semibold text-slate-900">{selectedStyle?.name}</dd></div>
                      <div><dt className="text-xs text-slate-400">Product</dt><dd className="mt-0.5 line-clamp-2 font-semibold text-slate-900">{selectedProduct?.title}</dd></div>
                      <div><dt className="text-xs text-slate-400">Format</dt><dd className="mt-0.5 font-semibold text-slate-900">{selectedStyle?.size || "square"}</dd></div>
                      <div><dt className="text-xs text-slate-400">Direction</dt><dd className="mt-0.5 font-semibold capitalize text-slate-900">{generationMode}</dd></div>
                    </dl>
                    <Button type="button" variant="outline" className="mt-4 w-full gap-2" onClick={() => void generateCreative()} disabled={generating}>
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Regenerate
                    </Button>
                  </section>
                </aside>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="mx-auto max-w-4xl space-y-5">
              <div className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><Check className="h-7 w-7" /></span>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Step 4</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Validate your creative</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Your creative is ready. Download it now or publish it to the selected social channels.</p>
              </div>

              {generatedImage && (
                <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <img src={generatedImage} alt="Approved creative" className="max-h-[52vh] w-full rounded-xl object-contain" />
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" variant="outline" size="lg" className="h-12 rounded-xl" onClick={downloadImage}>Download</Button>
                <Button type="button" size="lg" className="h-12 rounded-xl bg-violet-600 hover:bg-violet-700" onClick={() => void publishToSocial()} disabled={!canPublish || publishing}>
                  {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Publish now
                </Button>
              </div>
              {!canPublish && <p className="text-center text-xs text-slate-500">Publishing is optional. Select a platform and add a caption in Creative setup to enable it.</p>}
            </div>
          )}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 bg-white px-3 py-3 sm:flex sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <Button type="button" variant="ghost" onClick={goBack} className="h-11 justify-start rounded-xl px-3 sm:w-auto">
            {step > 1 ? <ArrowLeft className="mr-2 h-4 w-4" /> : null}
            {step === 1 ? "Cancel" : "Back"}
          </Button>

          {step < 4 ? (
            <Button
              type="button"
              onClick={() => void goNext()}
              disabled={(step === 1 && !selectedProduct) || generating || (step === 3 && !generatedImage)}
              className="h-11 rounded-xl bg-violet-600 px-4 hover:bg-violet-700 sm:min-w-40"
            >
              {step === 2 && generating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
              ) : step === 2 && !generatedImage ? (
                <>Generate & preview <Sparkles className="ml-2 h-4 w-4" /></>
              ) : (
                <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          ) : (
            <Button type="button" onClick={() => onOpenChange(false)} className="h-11 rounded-xl bg-violet-600 px-4 hover:bg-violet-700 sm:min-w-40">
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
