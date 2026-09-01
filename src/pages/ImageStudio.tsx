import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  Film,
  Images,
  LayoutTemplate,
  Library,
  Megaphone,
  Search,
  Share2,
  Smartphone,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/language";
import StudioImages from "./StudioImages";
import AiCreativeStudio from "./AiCreativeStudio";
import MobileAds from "./MobileAds";
import AnimationAds from "./AnimationAds";
import SocialMedia from "./SocialMedia";
import MediaHistory from "./MediaHistory";
import NewAIVideoGenerator from "@/components/video/NewAIVideoGenerator";

type StudioToolId = "images" | "creative" | "ads" | "animate" | "video" | "social" | "library";
type StudioGroup = "create" | "campaign" | "publish";

type StudioTool = {
  id: StudioToolId;
  group: StudioGroup;
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  badge: string;
  icon: typeof Images;
};

const STUDIO_TOOLS: StudioTool[] = [
  {
    id: "images",
    group: "create",
    titleFr: "Images produit",
    titleEn: "Product images",
    descriptionFr: "Product Shot AI, fond blanc, décors IA, variantes visuelles et optimisation des images catalogue.",
    descriptionEn: "Product Shot AI, white background, AI scenes, visual variants and catalog image optimization.",
    badge: "Product",
    icon: Images,
  },
  {
    id: "creative",
    group: "create",
    titleFr: "Créatifs IA",
    titleEn: "AI creatives",
    descriptionFr: "Choisissez un produit, un style et générez un visuel publicitaire avec légende et publication sociale.",
    descriptionEn: "Choose a product and style, then generate ad creative with captions and social publishing.",
    badge: "AI",
    icon: WandSparkles,
  },
  {
    id: "video",
    group: "create",
    titleFr: "Générateur vidéo",
    titleEn: "Video generator",
    descriptionFr: "Transformez vos contenus et produits en vidéos prêtes pour les campagnes et les réseaux sociaux.",
    descriptionEn: "Turn content and products into campaign-ready and social-ready videos.",
    badge: "Video",
    icon: Film,
  },
  {
    id: "ads",
    group: "campaign",
    titleFr: "Ads mobile",
    titleEn: "Mobile ads",
    descriptionFr: "Créez rapidement des publicités verticales pensées pour les placements mobiles et les réseaux sociaux.",
    descriptionEn: "Quickly create vertical ads designed for mobile placements and social networks.",
    badge: "Ads",
    icon: Smartphone,
  },
  {
    id: "animate",
    group: "campaign",
    titleFr: "Ads animées",
    titleEn: "Animated ads",
    descriptionFr: "Animez les visuels, composez des scènes et produisez des créations publicitaires plus dynamiques.",
    descriptionEn: "Animate visuals, compose scenes and produce more dynamic advertising creatives.",
    badge: "Motion",
    icon: LayoutTemplate,
  },
  {
    id: "social",
    group: "publish",
    titleFr: "Réseaux sociaux",
    titleEn: "Social publishing",
    descriptionFr: "Connectez vos comptes, préparez vos publications et centralisez la diffusion de vos créations.",
    descriptionEn: "Connect accounts, prepare posts and centralize distribution of your creations.",
    badge: "Social",
    icon: Share2,
  },
  {
    id: "library",
    group: "publish",
    titleFr: "Médiathèque",
    titleEn: "Media library",
    descriptionFr: "Retrouvez l’historique des médias générés et réutilisez vos assets sans repartir de zéro.",
    descriptionEn: "Find generated media history and reuse assets without starting over.",
    badge: "Library",
    icon: Library,
  },
];

const GROUPS: Array<{ id: StudioGroup; titleFr: string; titleEn: string; descriptionFr: string; descriptionEn: string }> = [
  {
    id: "create",
    titleFr: "Créer",
    titleEn: "Create",
    descriptionFr: "Produisez vos images, créatifs et vidéos à partir du catalogue.",
    descriptionEn: "Produce images, creatives and videos from your catalog.",
  },
  {
    id: "campaign",
    titleFr: "Publicité",
    titleEn: "Advertising",
    descriptionFr: "Passez d’un produit à une publicité mobile ou animée en quelques étapes.",
    descriptionEn: "Go from product to mobile or animated ad in a few steps.",
  },
  {
    id: "publish",
    titleFr: "Publier & gérer",
    titleEn: "Publish & manage",
    descriptionFr: "Diffusez les créations et retrouvez tous vos médias au même endroit.",
    descriptionEn: "Publish creations and find all your media in one place.",
  },
];

function ToolRenderer({ tool }: { tool: StudioToolId }) {
  switch (tool) {
    case "images":
      return <StudioImages />;
    case "creative":
      return <AiCreativeStudio />;
    case "ads":
      return <MobileAds />;
    case "animate":
      return <AnimationAds />;
    case "video":
      return <NewAIVideoGenerator />;
    case "social":
      return <SocialMedia />;
    case "library":
      return <MediaHistory />;
    default:
      return null;
  }
}

export default function ImageStudio() {
  const { language } = useTranslation();
  const fr = language === "fr";
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const requestedTool = searchParams.get("tool") as StudioToolId | null;
  const activeTool = STUDIO_TOOLS.some((tool) => tool.id === requestedTool) ? requestedTool : null;

  const filteredTools = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return STUDIO_TOOLS;
    return STUDIO_TOOLS.filter((tool) => {
      const title = fr ? tool.titleFr : tool.titleEn;
      const description = fr ? tool.descriptionFr : tool.descriptionEn;
      return `${title} ${description} ${tool.badge}`.toLowerCase().includes(q);
    });
  }, [fr, search]);

  const openTool = (tool: StudioToolId) => setSearchParams({ tool });
  const goHome = () => setSearchParams({});

  if (activeTool) {
    const current = STUDIO_TOOLS.find((tool) => tool.id === activeTool)!;
    const CurrentIcon = current.icon;

    return (
      <div className="space-y-4">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="ghost" size="sm" onClick={goHome} className="shrink-0">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Studio
              </Button>
              <div className="hidden h-7 w-px bg-slate-200 sm:block" />
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700">
                  <CurrentIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="truncate text-base font-semibold text-slate-950">{fr ? current.titleFr : current.titleEn}</h1>
                    <Badge variant="secondary" className="hidden sm:inline-flex">{current.badge}</Badge>
                  </div>
                  <p className="hidden truncate text-xs text-slate-500 md:block">{fr ? current.descriptionFr : current.descriptionEn}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 md:max-w-[58%] md:justify-end md:pb-0">
              {STUDIO_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const selected = tool.id === activeTool;
                return (
                  <Button
                    key={tool.id}
                    type="button"
                    size="sm"
                    variant={selected ? "secondary" : "ghost"}
                    className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
                    onClick={() => openTool(tool.id)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">{fr ? tool.titleFr : tool.titleEn}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </section>

        <ToolRenderer tool={activeTool} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-100/70 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-fuchsia-100/50 blur-3xl" />
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.3fr_0.7fr] lg:p-9">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="gap-1.5 bg-slate-950 text-white hover:bg-slate-950">
                <Sparkles className="h-3.5 w-3.5" /> Studio AI
              </Badge>
              <Badge variant="secondary">7 workflows</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {fr ? "Créez tout votre contenu depuis un seul Studio" : "Create all your content from one Studio"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              {fr
                ? "Images produit, créatifs publicitaires, vidéos, ads mobiles, animations et publication sociale sont maintenant regroupés par objectif. Choisissez ce que vous voulez produire, le Studio ouvre directement le bon workflow."
                : "Product images, ad creatives, videos, mobile ads, animations and social publishing are now grouped by goal. Choose what you want to produce and Studio opens the right workflow."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => openTool("images")} className="gap-2">
                <Images className="h-4 w-4" />
                {fr ? "Créer une image" : "Create an image"}
              </Button>
              <Button variant="outline" onClick={() => openTool("creative")} className="gap-2">
                <Megaphone className="h-4 w-4" />
                {fr ? "Créer une publicité" : "Create an ad"}
              </Button>
              <Button variant="outline" onClick={() => openTool("video")} className="gap-2">
                <Film className="h-4 w-4" />
                {fr ? "Créer une vidéo" : "Create a video"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white shadow-lg shadow-slate-200/70">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <WandSparkles className="h-4 w-4 text-violet-300" />
              {fr ? "Raccourcis" : "Quick start"}
            </div>
            <div className="mt-3 grid gap-2">
              {(["images", "creative", "social", "library"] as StudioToolId[]).map((id) => {
                const tool = STUDIO_TOOLS.find((item) => item.id === id)!;
                const Icon = tool.icon;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => openTool(id)}
                    className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition hover:bg-white/10"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10"><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{fr ? tool.titleFr : tool.titleEn}</span>
                      <span className="block truncate text-[11px] text-slate-400">/studio?tool={tool.id}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={fr ? "Rechercher un outil : vidéo, image, social…" : "Search tools: video, image, social…"}
            className="h-10 bg-slate-50 pl-9"
          />
        </div>
      </section>

      {GROUPS.map((group) => {
        const tools = filteredTools.filter((tool) => tool.group === group.id);
        if (!tools.length) return null;
        return (
          <section key={group.id} className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{fr ? group.titleFr : group.titleEn}</h2>
                <p className="text-sm text-slate-500">{fr ? group.descriptionFr : group.descriptionEn}</p>
              </div>
              <span className="text-xs font-medium text-slate-400">{tools.length} {fr ? "outil(s)" : "tool(s)"}</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => openTool(tool.id)}
                    className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-violet-50 group-hover:text-violet-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <Badge variant="secondary" className="font-medium">{tool.badge}</Badge>
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-slate-950">{fr ? tool.titleFr : tool.titleEn}</h3>
                    <p className="mt-1.5 min-h-[42px] text-sm leading-5 text-slate-500">{fr ? tool.descriptionFr : tool.descriptionEn}</p>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <code className="rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-500">?tool={tool.id}</code>
                      <span className="flex items-center gap-1 text-xs font-semibold text-violet-700">
                        {fr ? "Ouvrir" : "Open"}<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {filteredTools.length === 0 && (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Search className="mx-auto h-7 w-7 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">{fr ? "Aucun outil ne correspond à cette recherche." : "No tool matches this search."}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSearch("")}>{fr ? "Effacer la recherche" : "Clear search"}</Button>
        </section>
      )}
    </div>
  );
}
