import { ArrowLeft, FileText, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/language";
import StudioContentWorkflow from "./StudioContentWorkflow";
import StudioSmart from "./StudioSmart";

export default function StudioBridge() {
  const { language } = useTranslation();
  const fr = language === "fr";
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get("mode") || searchParams.get("tool");

  const openContent = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("tool");
    next.set("mode", "content");
    setSearchParams(next);
  };

  const backToStudio = () => setSearchParams({});

  if (mode === "content") {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="ghost" size="sm" onClick={backToStudio}>
                <ArrowLeft className="mr-1.5 h-4 w-4" />Studio
              </Button>
              <span className="hidden h-7 w-px bg-slate-200 sm:block" />
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-700"><FileText className="h-4 w-4" /></span>
              <div>
                <p className="text-sm font-semibold text-slate-950">{fr ? "Titres & descriptions" : "Titles & descriptions"}</p>
                <p className="text-xs text-slate-500">{fr ? "Optimisation SEO produit avec le moteur existant" : "Product SEO optimization with the existing engine"}</p>
              </div>
            </div>
            <Badge variant="secondary" className="w-fit rounded-full"><Sparkles className="mr-1.5 h-3.5 w-3.5" />AI Content</Badge>
          </div>
        </section>
        <StudioContentWorkflow />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-sky-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><FileText className="h-5 w-5" /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-950">{fr ? "Titres & descriptions IA" : "AI titles & descriptions"}</p>
              <Badge variant="secondary" className="rounded-full">SEO</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {fr
                ? "Nouveau workflow Studio : optimisez un produit ou une sélection groupée avec le même moteur que /products/title-description."
                : "New Studio workflow: optimize one product or a bulk selection with the same engine as /products/title-description."}
            </p>
          </div>
        </div>
        <Button className="shrink-0 rounded-xl bg-violet-600 hover:bg-violet-700" onClick={openContent}>
          <Sparkles className="mr-2 h-4 w-4" />{fr ? "Ouvrir le workflow" : "Open workflow"}
        </Button>
      </section>
      <StudioSmart />
    </div>
  );
}
