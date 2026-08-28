import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/language";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  History,
  Image as ImageIcon,
  Images,
  ShoppingBag,
  Sparkles,
  Square,
  WandSparkles,
} from "lucide-react";
import ProductShotStudio from "@/components/studio/ProductShotStudio";
import AiCreativeStudio from "@/pages/AiCreativeStudio";
import MediaHistory from "@/pages/MediaHistory";

type StudioTab = "shots" | "images" | "creative" | "history";

type ToolCard = {
  icon: typeof ImageIcon;
  labelFr: string;
  labelEn: string;
  hintFr: string;
  hintEn: string;
  href: string;
};

const IMAGE_TOOLS: ToolCard[] = [
  {
    icon: Square,
    labelFr: "Fond blanc",
    labelEn: "White background",
    hintFr: "Produit propre",
    hintEn: "Clean product",
    href: "/products/title-description?view=images&tool=white",
  },
  {
    icon: Images,
    labelFr: "Arrière-plan IA",
    labelEn: "AI background",
    hintFr: "Décors & scènes",
    hintEn: "Scenes & backgrounds",
    href: "/products/title-description?view=images&tool=background",
  },
  {
    icon: ShoppingBag,
    labelFr: "Google Shopping",
    labelEn: "Google Shopping",
    hintFr: "Image catalogue",
    hintEn: "Catalog image",
    href: "/products/title-description?view=images&tool=shopping",
  },
];

export default function StudioHub() {
  const { language } = useTranslation();
  const fr = language === "fr";
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StudioTab>("shots");

  const tabs = useMemo(() => [
    { id: "shots" as const, label: fr ? "Product Shot AI" : "Product Shot AI", icon: Sparkles },
    { id: "images" as const, label: fr ? "Outils image" : "Image tools", icon: ImageIcon },
    { id: "creative" as const, label: fr ? "Créatifs & social" : "Creative & social", icon: WandSparkles },
    { id: "history" as const, label: fr ? "Historique" : "History", icon: History },
  ], [fr]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950">Studio</h1>
          <p className="text-xs text-slate-500">{fr ? "Images produit & créatifs" : "Product images & creative"}</p>
        </div>

        <nav className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                activeTab === id ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "shots" && <ProductShotStudio />}

      {activeTab === "images" && (
        <div className="grid gap-3 md:grid-cols-3">
          {IMAGE_TOOLS.map(({ icon: Icon, labelFr, labelEn, hintFr, hintEn, href }) => (
            <Card key={href} className="border-slate-200 p-4 shadow-none">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                  <Icon className="h-4 w-4 text-slate-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-slate-900">{fr ? labelFr : labelEn}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{fr ? hintFr : hintEn}</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3 h-8" onClick={() => navigate(href)}>
                    {fr ? "Ouvrir" : "Open"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "creative" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <AiCreativeStudio />
        </div>
      )}

      {activeTab === "history" && <MediaHistory />}
    </div>
  );
}
