import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Package, SearchCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const demoScreens = [
  {
    title: "AI Creative Studio",
    eyebrow: "AI VISUALS",
    description: "Create campaign-ready product visuals with clear templates, categories and social formats before generating.",
    image: "/demo/catalogoptimizer-studio.svg",
    alt: "CatalogOptimizer AI Creative Studio interface",
    icon: Sparkles,
    accent: "from-violet-500/15 via-fuchsia-500/5 to-transparent",
  },
  {
    title: "Product Optimization",
    eyebrow: "CATALOG",
    description: "Optimize product content, landing pages, product shots and backgrounds from one focused workspace.",
    image: "/demo/catalogoptimizer-product.svg",
    alt: "CatalogOptimizer Product Optimization interface",
    icon: Package,
    accent: "from-emerald-500/12 via-violet-500/5 to-transparent",
  },
  {
    title: "SEO Workspace",
    eyebrow: "SEO",
    description: "See smart SEO scores, missing metadata and the exact pages that need attention without jumping between tools.",
    image: "/demo/catalogoptimizer-seo.svg",
    alt: "CatalogOptimizer SEO Workspace interface",
    icon: SearchCheck,
    accent: "from-blue-500/15 via-violet-500/5 to-transparent",
  },
];

export function CatalogDemoShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = demoScreens[activeIndex];
  const ActiveIcon = active.icon;

  const previous = () => {
    setActiveIndex((current) => (current - 1 + demoScreens.length) % demoScreens.length);
  };

  const next = () => {
    setActiveIndex((current) => (current + 1) % demoScreens.length);
  };

  useEffect(() => {
    const timer = window.setInterval(next, 7000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section id="demo" className="relative isolate overflow-hidden border-b border-violet-100 bg-white py-20 sm:py-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute -right-32 top-40 h-96 w-96 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,.11),transparent_68%)]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />
      </div>

      <div className="mx-auto max-w-[1480px] px-5">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="border-violet-200 bg-white/90 text-violet-700 shadow-sm">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> PRODUCT DEMO
          </Badge>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-.035em] sm:text-5xl">See CatalogOptimizer in action</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            One large, clear product tour. Switch between creative production, catalog optimization and SEO in seconds.
          </p>
        </div>

        <div className="relative mt-12 overflow-hidden rounded-[34px] border border-violet-100 bg-white shadow-[0_35px_110px_-45px_rgba(76,29,149,.35)]">
          <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b", active.accent)} />

          <div className="relative border-b border-slate-200/80 px-5 py-4 sm:px-7">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-violet-100 bg-white text-violet-700 shadow-sm">
                <ActiveIcon className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold tracking-[.16em] text-violet-600">{active.eyebrow}</p>
                <h3 className="text-base font-semibold text-slate-950 sm:text-lg">{active.title}</h3>
              </div>

              <div className="ml-auto flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-2 shadow-sm">
                <i className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                <i className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <i className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              </div>
            </div>
          </div>

          <div className="relative bg-gradient-to-b from-slate-50/80 to-white p-3 sm:p-5 lg:p-7">
            <div className="relative mx-auto overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_65px_-35px_rgba(15,23,42,.38)]">
              <img
                key={active.image}
                src={active.image}
                alt={active.alt}
                className="aspect-[4/3] w-full object-contain object-top"
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={previous}
                aria-label="Previous demo"
                className="absolute left-3 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full border-white/80 bg-white/90 text-slate-700 shadow-lg backdrop-blur hover:bg-white sm:left-5"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={next}
                aria-label="Next demo"
                className="absolute right-3 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full border-white/80 bg-white/90 text-slate-700 shadow-lg backdrop-blur hover:bg-white sm:right-5"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="grid gap-5 border-t border-slate-200/80 bg-white px-5 py-5 md:grid-cols-[1fr_auto] md:items-center sm:px-7">
            <div>
              <p className="font-semibold text-slate-950">{active.title}</p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{active.description}</p>
            </div>

            <div className="flex items-center gap-2">
              {demoScreens.map((screen, index) => (
                <button
                  key={screen.title}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show ${screen.title}`}
                  className={cn(
                    "h-2.5 rounded-full transition-all",
                    activeIndex === index ? "w-9 bg-violet-600" : "w-2.5 bg-slate-300 hover:bg-slate-400",
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {demoScreens.map((screen, index) => {
            const Icon = screen.icon;
            const selected = activeIndex === index;
            return (
              <button
                key={screen.title}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border bg-white p-3 text-left transition",
                  selected
                    ? "border-violet-300 shadow-md shadow-violet-950/5 ring-2 ring-violet-100"
                    : "border-slate-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md",
                )}
              >
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:h-24 sm:w-36">
                  <img src={screen.image} alt="" className="h-full w-full object-cover object-top" />
                </div>
                <div className="min-w-0">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-2 truncate text-sm font-semibold text-slate-950">{screen.title}</p>
                  <p className="mt-0.5 text-[10px] font-semibold tracking-[.12em] text-violet-600">{screen.eyebrow}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
