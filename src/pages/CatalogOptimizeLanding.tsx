import { Link } from "react-router-dom";
import {
  ArrowRight, Check, Package, FileText, Images, BadgeDollarSign, Store,
  ScanSearch, ShieldCheck, RefreshCw, Sparkles, AlertTriangle, Layers3, Bot, ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogOptimizeLogo } from "@/components/CatalogOptimizeLogo";

const pillars = [
  { icon: Package, title: "Catalog", text: "Products, collections, variants, bulk editing and imports." },
  { icon: FileText, title: "Content", text: "Titles, descriptions, landing pages, categories, tags and metafields." },
  { icon: Images, title: "Media", text: "Product galleries, Vision AI, white and lifestyle backgrounds, ALT text." },
  { icon: BadgeDollarSign, title: "Pricing", text: "Costs, margins, competitor prices and recommendations." },
  { icon: Store, title: "Channels", text: "Shopify, Google Shopping, Merchant Center and product feeds." },
];

const plans = [
  {
    name: "Free scan", price: "$0", description: "See what is holding your catalog back before choosing a plan.",
    features: ["Catalog health scan", "Issue prioritization", "Shopping readiness preview", "No credit card required"],
    cta: "Scan my catalog", href: "/auth",
  },
  {
    name: "Starter", price: "$9.99", description: "For smaller stores building a clean catalog.",
    features: ["Up to 100 analyzed products", "100 AI optimizations / month", "1 AI article / month", "20 AI product searches / month"],
    cta: "Start optimizing", href: "/auth",
  },
  {
    name: "Growth", price: "$49", description: "Automate product operations as your store grows.", popular: true,
    features: ["Up to 1,000 analyzed products", "500 AI optimizations / month", "5 AI articles / month", "3 automated campaigns / month"],
    cta: "Automate my catalog", href: "/auth",
  },
  {
    name: "Enterprise", price: "$199", description: "For large catalogs and multi-store operators.",
    features: ["Unlimited analyzed products", "2,000 AI optimizations / month", "20 AI articles / month", "10 automated campaigns / month"],
    cta: "Scale operations", href: "/auth",
  },
];

export default function CatalogOptimizeLanding() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link to="/" aria-label="CatalogueOptimize AI"><CatalogOptimizeLogo /></Link>
          <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            <a href="#product">Product</a><a href="#solutions">Solutions</a><a href="#pricing">Pricing</a>
            <Link to="/documentation">Resources</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/auth">Log in</Link></Button>
            <Button asChild className="bg-slate-950 text-white hover:bg-slate-800">
              <Link to="/auth">Scan my catalog free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-violet-50/70 via-white to-white">
          <div className="absolute inset-x-0 top-0 -z-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,.14),transparent_65%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
            <div className="flex flex-col justify-center">
              <Badge variant="outline" className="mb-5 w-fit border-violet-200 bg-white text-violet-700">
                AI PRODUCT OPERATIONS FOR SHOPIFY
              </Badge>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-.045em] sm:text-6xl">
                Your entire Shopify catalog, optimized from one workspace
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Import, enrich and sync products, variants, images, pricing and Google Shopping data with AI.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild className="bg-violet-600 hover:bg-violet-700">
                  <Link to="/auth">Scan my Shopify catalog <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild><Link to="/demo">Watch the demo</Link></Button>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                {["Free catalog scan", "No credit card required", "Review every change before sync"].map((item) => (
                  <span key={item} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" />{item}</span>
                ))}
              </div>
            </div>

            <Card className="border-slate-200 bg-white shadow-2xl shadow-violet-950/10">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium">Catalog health</p><p className="text-xs text-slate-500">Illustrative workspace</p></div>
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Scan complete</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="grid grid-cols-3 gap-3">
                  {[["Products","854"],["Ready","68%"],["Issues","494"]].map(([k,v]) => (
                    <div key={k} className="rounded-xl border bg-slate-50 p-3"><p className="text-xs text-slate-500">{k}</p><p className="mt-1 text-xl font-semibold">{v}</p></div>
                  ))}
                </div>
                {[
                  ["Incomplete descriptions","126","/products/title-description"],
                  ["Inconsistent variants","84","/products"],
                  ["Missing ALT text","214","/seo?tab=alt"],
                  ["Shopping feed errors","46","/shopping"],
                ].map(([label,count]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border p-3">
                    <span className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-amber-500" />{label}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
                <Button asChild className="w-full bg-slate-950 hover:bg-slate-800"><Link to="/auth">Fix the first products free</Link></Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="product" className="mx-auto max-w-7xl px-5 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">One product operations workspace</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight">From supplier data to channel-ready products</h2>
            <p className="mt-4 text-lg text-slate-600">CatalogueOptimize organizes the work around five connected pillars instead of scattered point solutions.</p>
          </div>
          <div id="solutions" className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {pillars.map((pillar) => (
              <Card key={pillar.title} className="border-slate-200">
                <CardContent className="p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><pillar.icon className="h-5 w-5" /></span>
                  <h3 className="mt-4 font-semibold">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{pillar.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-violet-100 bg-gradient-to-br from-violet-50 via-white to-blue-50 py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
            <div>
              <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">AI SALES ASSISTANT</Badge>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight">Turn your product catalog into a guided shopping experience</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                The assistant understands your Shopify products, asks the right questions and recommends relevant items, variants and alternatives.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {["Product recommendations grounded in your catalog", "Variant, price and availability guidance", "Add-to-cart and Shopify checkout handoff", "Conversation, order and learning history"].map((item) => (
                  <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" />{item}</li>
                ))}
              </ul>
              <Button asChild className="mt-7 bg-violet-600 hover:bg-violet-700">
                <Link to="/auth?redirect=/storefront-assistant">Activate my sales assistant <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <Card className="overflow-hidden border-slate-200 shadow-2xl shadow-violet-950/10">
              <CardHeader className="border-b bg-slate-950 text-white">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600"><Bot className="h-5 w-5" /></span>
                  <div><CardTitle className="text-base">Storefront AI</CardTitle><p className="text-xs text-slate-400">Connected to your live catalog</p></div>
                  <span className="ml-auto h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4 bg-slate-50 p-6">
                <div className="ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-violet-600 p-4 text-sm text-white">I need a compact green velvet sofa under €1,000.</div>
                <div className="max-w-[88%] rounded-2xl rounded-bl-md border bg-white p-4 text-sm text-slate-700">
                  I found three matching products. The emerald 3-seater is the closest fit and is currently available.
                </div>
                <div className="grid grid-cols-[72px_1fr] gap-3 rounded-xl border bg-white p-3">
                  <div className="grid h-[72px] place-items-center rounded-lg bg-violet-50"><ShoppingCart className="h-6 w-6 text-violet-600" /></div>
                  <div><p className="font-semibold">Emerald Velvet Sofa</p><p className="mt-1 text-xs text-slate-500">In stock · 3 variants</p><Button size="sm" className="mt-3 h-8">Add to cart</Button></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-y bg-slate-950 py-20 text-white">
          <div className="mx-auto max-w-7xl px-5">
            <div className="grid gap-10 lg:grid-cols-2">
              <div>
                <Badge className="bg-white/10 text-white hover:bg-white/10">BEFORE / AFTER</Badge>
                <h2 className="mt-5 text-4xl font-semibold tracking-tight">Turn raw listings into complete product records</h2>
                <p className="mt-4 text-slate-300">Improve data quality, merchandising and channel eligibility while keeping every change reviewable.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Supplier title","Clear commercial title"],["Thin description","Structured product landing page"],
                  ["Single studio photo","Complete product gallery"],["Confusing variants","Organized variant data"],
                  ["Missing identifiers","Shopping-ready attributes"],["Unknown margin","Cost and margin visibility"],
                ].map(([before,after]) => (
                  <div key={before} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Before</p><p className="mt-1 text-sm text-slate-300">{before}</p>
                    <ArrowRight className="my-3 h-4 w-4 text-violet-400" />
                    <p className="text-xs uppercase tracking-wide text-violet-300">After</p><p className="mt-1 text-sm font-medium">{after}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20">
          <div className="text-center"><h2 className="text-4xl font-semibold tracking-tight">A clear path from scan to sync</h2></div>
          <div className="mt-10 grid gap-4 md:grid-cols-5">
            {[
              [Store,"Connect Shopify"],[ScanSearch,"Free catalog scan"],[AlertTriangle,"Review issues"],
              [Sparkles,"Apply fixes"],[RefreshCw,"Sync everywhere"],
            ].map(([Icon,label],i) => {
              const StepIcon = Icon as typeof Store;
              return <div key={label as string} className="relative rounded-2xl border p-5 text-center"><span className="text-xs font-semibold text-violet-600">0{i+1}</span><StepIcon className="mx-auto mt-3 h-6 w-6" /><p className="mt-3 font-medium">{label as string}</p></div>;
            })}
          </div>
        </section>

        <section id="pricing" className="border-y bg-slate-50 py-20">
          <div className="mx-auto max-w-7xl px-5">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-4xl font-semibold tracking-tight">Start with the scan. Upgrade when the value is clear.</h2>
              <p className="mt-4 text-slate-600">The existing billing plans stay unchanged; the packaging now explains them around catalog operations.</p>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-4">
              {plans.map((plan) => (
                <Card key={plan.name} className={plan.popular ? "relative border-violet-500 shadow-xl" : "border-slate-200"}>
                  {plan.popular && <Badge className="absolute -top-3 left-5 bg-violet-600">Most Popular</Badge>}
                  <CardHeader><CardTitle>{plan.name}</CardTitle><div><span className="text-4xl font-semibold">{plan.price}</span>{plan.price !== "$0" && <span className="text-slate-500">/month</span>}</div><p className="text-sm text-slate-600">{plan.description}</p></CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm">{plan.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{feature}</li>)}</ul>
                    <Button asChild variant={plan.popular ? "default" : "outline"} className="mt-6 w-full"><Link to={plan.href}>{plan.cta}</Link></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="mt-5 text-center text-xs text-slate-500">Plan availability and checkout are confirmed inside the app before billing.</p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-20 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-violet-600" />
          <h2 className="mt-5 text-4xl font-semibold tracking-tight">Ready to understand your catalog?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">Connect Shopify, see every issue, and review the first recommended fixes before you commit.</p>
          <Button size="lg" asChild className="mt-7 bg-violet-600 hover:bg-violet-700"><Link to="/auth">Scan my catalog free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </section>
      </main>

      <footer className="border-t bg-slate-950 text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-semibold text-white">CatalogueOptimize</p><p className="mt-1 text-sm">AI Product Operations for Shopify</p></div>
          <div className="flex flex-wrap gap-5 text-sm"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/documentation">Documentation</Link><a href="https://ranki.ai" target="_blank" rel="noreferrer">Need organic & AI-search growth? Ranki.ai</a></div>
        </div>
      </footer>
    </div>
  );
}
