import { Package, SearchCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const demoScreens = [
  {
    title: "AI Creative Studio",
    eyebrow: "AI VISUALS",
    description: "Create campaign-ready product visuals with templates you can understand before generating.",
    image: "/demo/catalogoptimizer-studio.svg",
    alt: "CatalogOptimizer AI Creative Studio interface",
    icon: Sparkles,
    accent: "from-violet-500/20 to-fuchsia-500/5",
  },
  {
    title: "SEO Workspace",
    eyebrow: "SEO",
    description: "See scores, missing metadata and the exact pages that need attention from one clean workspace.",
    image: "/demo/catalogoptimizer-seo.svg",
    alt: "CatalogOptimizer SEO Workspace interface",
    icon: SearchCheck,
    accent: "from-blue-500/20 to-violet-500/5",
  },
  {
    title: "Product Optimization",
    eyebrow: "CATALOG",
    description: "Optimize content, landing pages, product shots and backgrounds without jumping between tools.",
    image: "/demo/catalogoptimizer-product.svg",
    alt: "CatalogOptimizer Product Optimization interface",
    icon: Package,
    accent: "from-emerald-500/15 to-violet-500/5",
  },
];

export function CatalogDemoShowcase() {
  return (
    <section id="demo" className="relative isolate overflow-hidden border-b border-violet-100 bg-white py-20 sm:py-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-7rem] top-12 h-72 w-72 rounded-full bg-violet-200/45 blur-3xl" />
        <div className="absolute right-[-5rem] top-28 h-80 w-80 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,.12),transparent_68%)]" />
        <div className="absolute inset-0 opacity-[0.22] [background-image:radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="border-violet-200 bg-white/90 text-violet-700 shadow-sm">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> PRODUCT DEMO
          </Badge>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-.035em] sm:text-5xl">See CatalogOptimizer in action</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Three focused workflows. One simple workspace for catalog quality, SEO and creative production.
          </p>
        </div>

        <div className="relative mt-12 rounded-[32px] border border-violet-100 bg-white/65 p-3 shadow-[0_30px_90px_-45px_rgba(76,29,149,.35)] backdrop-blur-sm sm:p-5">
          <div className="pointer-events-none absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />
          <div className="grid gap-5 lg:grid-cols-3 lg:items-start">
            {demoScreens.map(({ title, eyebrow, description, image, alt, icon: Icon, accent }, index) => (
              <article
                key={title}
                className={`group overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-950/10 ${index === 1 ? "lg:-translate-y-3 lg:hover:-translate-y-4" : ""}`}
              >
                <div className={`border-b border-slate-100 bg-gradient-to-br ${accent} p-4`}>
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/80 bg-white text-violet-700 shadow-sm">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold tracking-[.14em] text-violet-600">{eyebrow}</p>
                      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
                    </div>
                    <span className="ml-auto flex items-center gap-1.5">
                      <i className="h-2 w-2 rounded-full bg-rose-300" />
                      <i className="h-2 w-2 rounded-full bg-amber-300" />
                      <i className="h-2 w-2 rounded-full bg-emerald-300" />
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/90 bg-white shadow-[0_18px_45px_-24px_rgba(15,23,42,.35)]">
                    <img
                      src={image}
                      alt={alt}
                      loading="lazy"
                      className="aspect-[4/3] w-full bg-slate-50 object-cover transition duration-500 group-hover:scale-[1.015]"
                    />
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-sm leading-6 text-slate-600">{description}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Included in CatalogOptimizer
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-9 flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium text-slate-500">
          <span>Catalog content</span>
          <span className="hidden h-1 w-1 rounded-full bg-violet-300 sm:block" />
          <span>Landing pages</span>
          <span className="hidden h-1 w-1 rounded-full bg-violet-300 sm:block" />
          <span>SEO scoring</span>
          <span className="hidden h-1 w-1 rounded-full bg-violet-300 sm:block" />
          <span>AI product visuals</span>
        </div>
      </div>
    </section>
  );
}
