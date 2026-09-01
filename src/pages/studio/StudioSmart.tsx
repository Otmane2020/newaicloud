import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  Film,
  Image as ImageIcon,
  Images,
  LayoutTemplate,
  Library,
  Megaphone,
  Search,
  Share2,
  Smartphone,
  Sparkles,
  WandSparkles,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";
import StudioImages from "../StudioImages";
import StudioCreativeWorkspace from "./StudioCreativeWorkspace";
import MobileAds from "../MobileAds";
import AnimationAds from "../AnimationAds";
import SocialMedia from "../SocialMedia";
import MediaHistory from "../MediaHistory";
import NewAIVideoGenerator from "@/components/video/NewAIVideoGenerator";

type StudioToolId = "images" | "creative" | "ads" | "animate" | "video" | "social" | "library";

type StudioProduct = {
  id: string;
  title: string;
  image_url: string | null;
  vendor?: string | null;
  product_type?: string | null;
  product_images?: Array<{ id: string; src: string }> | null;
};

type RecentCreative = {
  id: string;
  product_title: string | null;
  image_url: string;
  created_at: string;
};

type StudioTool = {
  id: StudioToolId;
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  badge: string;
  icon: typeof Images;
};

const STUDIO_TOOLS: StudioTool[] = [
  { id: "images", titleFr: "Photos produit", titleEn: "Product photos", descriptionFr: "Product Shot AI, fond blanc, décors IA et variantes catalogue.", descriptionEn: "Product Shot AI, white backgrounds, AI scenes and catalog variants.", badge: "Image", icon: Images },
  { id: "creative", titleFr: "Créatifs IA", titleEn: "AI creatives", descriptionFr: "Un workflow produit → style → visuel → légende → publication.", descriptionEn: "One product → style → visual → caption → publishing workflow.", badge: "AI", icon: WandSparkles },
  { id: "video", titleFr: "Vidéo", titleEn: "Video", descriptionFr: "Transformez un produit ou un visuel en contenu vidéo prêt à diffuser.", descriptionEn: "Turn a product or visual into ready-to-publish video content.", badge: "Video", icon: Film },
  { id: "ads", titleFr: "Ads mobile", titleEn: "Mobile ads", descriptionFr: "Formats verticaux et campagnes conçus pour les placements mobiles.", descriptionEn: "Vertical formats and campaigns designed for mobile placements.", badge: "Ads", icon: Smartphone },
  { id: "animate", titleFr: "Animation", titleEn: "Animation", descriptionFr: "Animez vos assets et produisez des créations publicitaires dynamiques.", descriptionEn: "Animate assets and produce dynamic advertising creatives.", badge: "Motion", icon: LayoutTemplate },
  { id: "social", titleFr: "Publication sociale", titleEn: "Social publishing", descriptionFr: "Préparez et diffusez les créations vers les réseaux connectés.", descriptionEn: "Prepare and distribute creatives to connected social networks.", badge: "Social", icon: Share2 },
  { id: "library", titleFr: "Médiathèque", titleEn: "Media library", descriptionFr: "Retrouvez toutes les créations générées et réutilisez-les.", descriptionEn: "Find every generated asset and reuse it.", badge: "Library", icon: Library },
];

function ToolRenderer({ tool }: { tool: StudioToolId }) {
  switch (tool) {
    case "images": return <StudioImages />;
    case "creative": return <StudioCreativeWorkspace />;
    case "ads": return <MobileAds />;
    case "animate": return <AnimationAds />;
    case "video": return <NewAIVideoGenerator />;
    case "social": return <SocialMedia />;
    case "library": return <MediaHistory />;
    default: return null;
  }
}

export default function StudioSmart() {
  const { language } = useTranslation();
  const { selectedStore } = useStore();
  const fr = language === "fr";
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(searchParams.get("product"));

  const requestedTool = searchParams.get("tool") as StudioToolId | null;
  const activeTool = STUDIO_TOOLS.some((tool) => tool.id === requestedTool) ? requestedTool : null;

  const { data: products = [] } = useQuery({
    queryKey: ["studio-smart-products", selectedStore?.id],
    enabled: !!selectedStore?.id && !activeTool,
    queryFn: async (): Promise<StudioProduct[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedStore?.id) return [];
      const { data, error } = await supabase
        .from("shopify_products")
        .select("id, title, image_url, vendor, product_type, product_images(id, src)")
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id)
        .order("updated_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data || []) as StudioProduct[];
    },
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["studio-smart-recent", selectedStore?.id],
    enabled: !!selectedStore?.id && !activeTool,
    queryFn: async (): Promise<RecentCreative[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("creative_history")
        .select("id, product_title, image_url, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return (data || []) as RecentCreative[];
    },
  });

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) => `${product.title} ${product.vendor || ""} ${product.product_type || ""}`.toLowerCase().includes(q));
  }, [products, search]);

  const selectedProduct = products.find((product) => product.id === selectedProductId) || null;
  const selectedImageCount = selectedProduct?.product_images?.length || (selectedProduct?.image_url ? 1 : 0);

  const openTool = (tool: StudioToolId, productId?: string | null) => {
    const next = new URLSearchParams();
    next.set("tool", tool);
    if (productId) next.set("product", productId);
    setSearchParams(next);
  };

  const goHome = () => {
    const next = new URLSearchParams();
    if (selectedProductId) next.set("product", selectedProductId);
    setSearchParams(next);
  };

  const recommendation = selectedProduct
    ? selectedImageCount === 0
      ? { tool: "images" as StudioToolId, title: fr ? "Créer la première photo produit" : "Create the first product photo", text: fr ? "Ce produit n’a aucune image exploitable. Commencez par Product Shot AI." : "This product has no usable image. Start with Product Shot AI." }
      : selectedImageCount < 3
        ? { tool: "images" as StudioToolId, title: fr ? "Compléter les visuels" : "Complete product visuals", text: fr ? "Ajoutez fond blanc, décor et variantes avant de lancer une campagne." : "Add white background, scenes and variants before launching a campaign." }
        : { tool: "creative" as StudioToolId, title: fr ? "Créer la campagne" : "Create the campaign", text: fr ? "Le produit a assez de visuels. Passez directement au créatif publicitaire." : "The product has enough visuals. Go straight to ad creative." }
    : null;

  if (activeTool) {
    const current = STUDIO_TOOLS.find((tool) => tool.id === activeTool)!;
    const CurrentIcon = current.icon;
    return (
      <div className="space-y-4">
        <section className="sticky top-[56px] z-30 rounded-2xl border border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
          <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Button variant="ghost" size="sm" onClick={goHome}><ChevronLeft className="mr-1 h-4 w-4" />Studio</Button>
              <span className="hidden h-6 w-px bg-slate-200 sm:block" />
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700"><CurrentIcon className="h-4 w-4" /></span>
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">{fr ? current.titleFr : current.titleEn}</p><p className="hidden truncate text-[11px] text-slate-400 md:block">{fr ? current.descriptionFr : current.descriptionEn}</p></div>
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {STUDIO_TOOLS.map((tool) => {
                const Icon = tool.icon;
                return <Button key={tool.id} size="sm" variant={tool.id === activeTool ? "secondary" : "ghost"} className="h-8 shrink-0 gap-1.5 px-2.5 text-xs" onClick={() => openTool(tool.id, searchParams.get("product"))}><Icon className="h-3.5 w-3.5" /><span className="hidden 2xl:inline">{fr ? tool.titleFr : tool.titleEn}</span></Button>;
              })}
            </div>
          </div>
        </section>
        <ToolRenderer tool={activeTool} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 text-white shadow-xl shadow-slate-200/60">
        <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="relative grid gap-6 p-6 md:p-8 xl:grid-cols-[1.15fr_0.85fr] xl:p-10">
          <div>
            <div className="flex flex-wrap items-center gap-2"><Badge className="border-white/10 bg-white/10 text-white hover:bg-white/10"><Sparkles className="mr-1.5 h-3.5 w-3.5" />Studio AI</Badge><Badge variant="outline" className="border-white/15 text-slate-300">{fr ? "7 workflows · 1 espace" : "7 workflows · 1 workspace"}</Badge></div>
            <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl xl:text-5xl">{fr ? "Partez du produit. Le Studio choisit le bon workflow." : "Start from the product. Studio picks the right workflow."}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{fr ? "Photos, créatifs, vidéos, publicités et publication sont réunis dans une seule chaîne de production. Sélectionnez un produit : Studio détecte ce qu’il lui manque et vous propose l’action suivante." : "Photos, creatives, video, ads and publishing are combined into one production chain. Select a product and Studio detects what is missing and proposes the next action."}</p>
            <div className="mt-6 flex flex-wrap gap-2"><Button className="bg-white text-slate-950 hover:bg-slate-100" onClick={() => openTool("images", selectedProductId)}><Images className="mr-2 h-4 w-4" />{fr ? "Créer des visuels" : "Create visuals"}</Button><Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => openTool("creative", selectedProductId)}><Megaphone className="mr-2 h-4 w-4" />{fr ? "Créer une campagne" : "Create campaign"}</Button><Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => openTool("video", selectedProductId)}><Film className="mr-2 h-4 w-4" />Vidéo</Button></div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Smart start</p><h2 className="mt-1 text-lg font-semibold">{fr ? "Que voulez-vous produire ?" : "What do you want to produce?"}</h2></div><Zap className="h-5 w-5 text-violet-300" /></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {STUDIO_TOOLS.slice(0, 6).map((tool) => { const Icon = tool.icon; return <button key={tool.id} type="button" onClick={() => openTool(tool.id, selectedProductId)} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{fr ? tool.titleFr : tool.titleEn}</span><span className="mt-0.5 block truncate text-[11px] text-slate-400">{tool.badge}</span></span><ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" /></button>; })}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">{fr ? "1 · Choisir" : "1 · Choose"}</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{fr ? "Commencez par un produit" : "Start with a product"}</h2></div><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 bg-slate-50 pl-9" placeholder={fr ? "Rechercher dans le catalogue…" : "Search catalog…"} /></div></div>
            <ScrollArea className="w-full"><div className="flex min-w-max gap-3 p-4">{filteredProducts.slice(0, 24).map((product) => { const selected = selectedProductId === product.id; const imageCount = product.product_images?.length || (product.image_url ? 1 : 0); return <button key={product.id} type="button" onClick={() => setSelectedProductId(product.id)} className={`w-40 overflow-hidden rounded-2xl border bg-white text-left transition ${selected ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200 hover:-translate-y-0.5 hover:shadow-md"}`}><div className="aspect-square bg-slate-50">{product.image_url ? <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><ImageIcon className="h-7 w-7 text-slate-300" /></div>}</div><div className="p-3"><p className="truncate text-sm font-medium text-slate-900">{product.title}</p><p className="mt-1 text-[11px] text-slate-400">{imageCount} image{imageCount > 1 ? "s" : ""}</p></div></button>; })}</div></ScrollArea>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {STUDIO_TOOLS.map((tool) => { const Icon = tool.icon; return <button key={tool.id} type="button" onClick={() => openTool(tool.id, selectedProductId)} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white"><Icon className="h-4 w-4" /></span><Badge variant="secondary">{tool.badge}</Badge></div><h3 className="mt-4 font-semibold text-slate-950">{fr ? tool.titleFr : tool.titleEn}</h3><p className="mt-1.5 min-h-10 text-sm leading-5 text-slate-500">{fr ? tool.descriptionFr : tool.descriptionEn}</p><div className="mt-4 flex items-center gap-1 text-xs font-semibold text-violet-700">{fr ? "Ouvrir" : "Open"}<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></div></button>; })}
          </section>

          {recent.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">{fr ? "Récent" : "Recent"}</p><h2 className="mt-1 font-semibold text-slate-950">{fr ? "Dernières créations" : "Latest creations"}</h2></div><Button variant="ghost" size="sm" onClick={() => openTool("library")}>{fr ? "Médiathèque" : "Library"}</Button></div><div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-10">{recent.map((item) => <img key={item.id} src={item.image_url} alt={item.product_title || "Creative"} className="aspect-square w-full rounded-xl object-cover" />)}</div></section>}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">{fr ? "Assistant Studio" : "Studio assistant"}</p>
            {selectedProduct ? <><div className="mt-4 flex items-center gap-3"><div className="h-16 w-16 overflow-hidden rounded-xl bg-slate-100">{selectedProduct.image_url ? <img src={selectedProduct.image_url} alt={selectedProduct.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><ImageIcon className="h-5 w-5 text-slate-300" /></div>}</div><div className="min-w-0"><p className="truncate font-semibold text-slate-950">{selectedProduct.title}</p><p className="mt-1 text-xs text-slate-400">{selectedImageCount} {fr ? "image(s) détectée(s)" : "image(s) detected"}</p></div></div>{recommendation && <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4"><div className="flex items-center gap-2 text-violet-700"><Sparkles className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[0.12em]">{fr ? "Action recommandée" : "Recommended action"}</span></div><h3 className="mt-2 font-semibold text-slate-950">{recommendation.title}</h3><p className="mt-1 text-sm leading-5 text-slate-600">{recommendation.text}</p><Button className="mt-4 w-full" onClick={() => openTool(recommendation.tool, selectedProduct.id)}>{fr ? "Continuer" : "Continue"}<ArrowRight className="ml-2 h-4 w-4" /></Button></div>}</> : <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center"><Sparkles className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-700">{fr ? "Sélectionnez un produit" : "Select a product"}</p><p className="mt-1 text-xs leading-5 text-slate-400">{fr ? "Studio analysera ses visuels et proposera le prochain workflow." : "Studio will analyze its visuals and suggest the next workflow."}</p></div>}
          </section>
        </aside>
      </div>
    </div>
  );
}
