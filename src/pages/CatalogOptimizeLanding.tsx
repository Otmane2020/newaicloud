import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Package,
  FileText,
  Images,
  BadgeDollarSign,
  Store,
  ScanSearch,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Bot,
  ShoppingCart,
  Layers3,
  SearchCheck,
  BarChart3,
  Globe2,
  FileSpreadsheet,
  CircleCheck,
  Tags,
  Languages,
  Database,
  TrendingUp,
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
    name: "Free scan",
    price: "$0",
    description: "See what is holding your catalog back before choosing a plan.",
    features: ["Catalog health scan", "Issue prioritization", "Shopping readiness preview", "Read-only preview — no sync or AI generation", "No credit card required"],
    cta: "Scan my catalog",
    href: "/auth",
  },
  {
    name: "Starter",
    price: "$9.99",
    description: "For smaller stores building a clean catalog.",
    features: ["100 products", "100 AI optimizations / month", "10 AI articles / month", "100 AI chat responses / month", "1 Shopify store", "No automated campaigns"],
    cta: "Start optimizing",
    href: "/auth",
  },
  {
    name: "Pro",
    price: "$49",
    description: "Automate product operations as your store grows.",
    popular: true,
    features: ["1,000 products", "500 AI optimizations / month", "10 AI articles / month", "500 AI chat responses / month", "3 automated campaigns / month", "1 Shopify store"],
    cta: "Automate my catalog",
    href: "/auth",
  },
  {
    name: "Enterprise",
    price: "$199",
    description: "For large catalogs and multi-store operators.",
    features: ["Unlimited products", "2,000 AI optimizations / month", "100 AI articles / month", "2,000 AI chat responses / month", "10 automated campaigns / month", "5 Shopify stores"],
    cta: "Scale operations",
    href: "/auth",
  },
];

const seoWorkflows = [
  { href: "/shopify-catalog-optimization", title: "Shopify Catalog Optimization", text: "Audit and improve catalog quality across products, variants, media and channels." },
  { href: "/ai-product-catalog-optimization", title: "AI Catalog Optimization", text: "Use AI to enrich and standardize product records at catalog scale." },
  { href: "/shopify-product-optimization", title: "Shopify Product Optimization", text: "Improve titles, descriptions, attributes and merchandising data." },
  { href: "/google-shopping-feed-optimization", title: "Google Shopping Optimization", text: "Find source-data issues that weaken Merchant Center and shopping feeds." },
  { href: "/product-data-enrichment", title: "Product Data Enrichment", text: "Turn thin supplier records into structured, channel-ready product data." },
  { href: "/bulk-product-description-generator", title: "Bulk Product Descriptions", text: "Generate reviewable Shopify descriptions without repetitive catalog copy." },
  { href: "/shopify-image-optimization", title: "Shopify Image Optimization", text: "Improve galleries, ALT text and AI-assisted product imagery." },
  { href: "/shopify-variant-management", title: "Shopify Variant Management", text: "Detect and clean up inconsistent options, names and variant structures." },
];

const beforeAfter = [
  ["Supplier title", "Clear commercial title"],
  ["Thin description", "Structured product landing page"],
  ["Single studio photo", "Complete product gallery"],
  ["Confusing variants", "Organized variant data"],
  ["Missing identifiers", "Shopping-ready attributes"],
  ["Unknown margin", "Cost and margin visibility"],
];

export default function CatalogOptimizeLanding() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <Helmet>
        <title>AI Catalog Optimization for Shopify | CatalogOptimize AI</title>
        <meta
          name="description"
          content="Audit, enrich and sync Shopify product titles, descriptions, variants, images, pricing and Google Shopping data from one AI catalog optimization workspace."
        />
        <link rel="canonical" href="https://catalogoptimize.com/" />
        <meta property="og:site_name" content="CatalogOptimize AI" />
        <meta property="og:title" content="AI Catalog Optimization for Shopify | CatalogOptimize AI" />
        <meta property="og:url" content="https://catalogoptimize.com/" />
        <meta
          property="og:description"
          content="Audit, enrich and sync your entire Shopify catalog with AI from one product operations workspace."
        />
      </Helmet>

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link to="/" aria-label="CatalogOptimize AI home"><CatalogOptimizeLogo /></Link>
          <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            <a href="#product">Product</a>
            <a href="#solutions">Solutions</a>
            <a href="#pricing">Pricing</a>
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
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-violet-50/80 via-white to-white">
          <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,.14),transparent_65%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
            <div className="flex flex-col justify-center">
              <Badge variant="outline" className="mb-5 w-fit border-violet-200 bg-white text-violet-700">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> AI CATALOG OPTIMIZATION FOR SHOPIFY
              </Badge>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-.045em] sm:text-6xl">
                Optimize your entire Shopify catalog with AI
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Audit, enrich and sync product titles, descriptions, variants, images, pricing and Google Shopping data from one workspace.
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
                  <div>
                    <p className="text-sm font-medium">Catalog health</p>
                    <p className="text-xs text-slate-500">Illustrative workspace</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Scan complete</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="grid grid-cols-3 gap-3">
                  {[["Products", "854"], ["Ready", "68%"], ["Issues", "494"]].map(([key, value]) => (
                    <div key={key} className="rounded-xl border bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">{key}</p><p className="mt-1 text-xl font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
                {[["Incomplete descriptions", "126"], ["Inconsistent variants", "84"], ["Missing ALT text", "214"], ["Shopping feed errors", "46"]].map(([label, count]) => (
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
            <p className="mt-4 text-lg text-slate-600">CatalogOptimize AI organizes the work around five connected pillars instead of scattered point solutions.</p>
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
                <div className="max-w-[88%] rounded-2xl rounded-bl-md border bg-white p-4 text-sm text-slate-700">I found three matching products. The emerald 3-seater is the closest fit and is currently available.</div>
                <div className="grid grid-cols-[72px_1fr] gap-3 rounded-xl border bg-white p-3">
                  <div className="grid h-[72px] place-items-center rounded-lg bg-violet-50"><ShoppingCart className="h-6 w-6 text-violet-600" /></div>
                  <div><p className="font-semibold">Emerald Velvet Sofa</p><p className="mt-1 text-xs text-slate-500">In stock · 3 variants</p><Button size="sm" className="mt-3 h-8">Add to cart</Button></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-y bg-slate-950 py-20 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-2">
            <div>
              <Badge className="bg-white/10 text-white hover:bg-white/10">BEFORE / AFTER</Badge>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight">Turn raw listings into complete product records</h2>
              <p className="mt-4 text-slate-300">Improve data quality, merchandising and channel eligibility while keeping every change reviewable.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {beforeAfter.map(([before, after]) => (
                <div key={before} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Before</p><p className="mt-1 text-sm text-slate-300">{before}</p>
                  <ArrowRight className="my-3 h-4 w-4 text-violet-400" />
                  <p className="text-xs uppercase tracking-wide text-violet-300">After</p><p className="mt-1 text-sm font-medium">{after}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-b border-violet-100 bg-gradient-to-br from-slate-950 via-violet-950 to-blue-950 py-20 text-white">
          <div className="mx-auto max-w-7xl px-5">
            <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-center">
              <div>
                <Badge className="border border-white/10 bg-white/10 text-violet-100 hover:bg-white/10">GOOGLE SEARCH CONSOLE</Badge>
                <h2 className="mt-5 text-4xl font-semibold tracking-tight">See whether catalog improvements become real search visibility</h2>
                <p className="mt-4 text-lg leading-8 text-violet-100/80">
                  Connect Search Console to follow impressions, clicks and the products Google is discovering — in the same workspace where you improve the underlying catalog.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {[
                    { value: "Clicks", label: "Measure qualified visits" },
                    { value: "Impressions", label: "Track search exposure" },
                    { value: "Queries", label: "Find demand signals" },
                    { value: "Pages", label: "Spot product gaps" },
                  ].map((metric) => (
                    <div key={metric.value} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="font-semibold text-white">{metric.value}</p>
                      <p className="mt-1 text-xs leading-5 text-violet-100/60">{metric.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-violet-950/50 backdrop-blur sm:p-7">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500"><BarChart3 className="h-5 w-5" /></span>
                  <div>
                    <p className="font-semibold">Organic visibility</p>
                    <p className="text-xs text-violet-100/60">Illustrative Search Console view</p>
                  </div>
                  <div className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                    <TrendingUp className="h-3.5 w-3.5" /> Growing
                  </div>
                </div>
                <div className="mt-7 grid grid-cols-3 gap-3">
                  {[
                    ["12.4K", "Impressions"],
                    ["684", "Clicks"],
                    ["5.5%", "CTR"],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                      <p className="text-xl font-semibold">{value}</p>
                      <p className="mt-1 text-xs text-violet-100/55">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 h-52 rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                  <svg viewBox="0 0 640 190" role="img" aria-label="Illustrative organic search visibility growth chart" className="h-full w-full">
                    <defs>
                      <linearGradient id="visibilityArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity=".55" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[30, 75, 120, 165].map((y) => <line key={y} x1="0" x2="640" y1={y} y2={y} stroke="rgba(255,255,255,.08)" />)}
                    <path d="M0 166 C58 160 83 149 125 151 C175 154 188 125 239 130 C291 136 308 98 360 104 C413 110 440 71 486 78 C535 86 569 43 640 29 L640 190 L0 190 Z" fill="url(#visibilityArea)" />
                    <path d="M0 166 C58 160 83 149 125 151 C175 154 188 125 239 130 C291 136 308 98 360 104 C413 110 440 71 486 78 C535 86 569 43 640 29" fill="none" stroke="#a78bfa" strokeWidth="5" strokeLinecap="round" />
                    {[["125","151"],["239","130"],["360","104"],["486","78"],["640","29"]].map(([cx,cy]) => <circle key={cx} cx={cx} cy={cy} r="5" fill="#fff" stroke="#8b5cf6" strokeWidth="4" />)}
                  </svg>
                </div>
                <div className="mt-4 flex justify-between text-xs text-violet-100/45"><span>Catalog connected</span><span>Products enriched</span><span>Visibility tracked</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-violet-100 bg-gradient-to-b from-white to-violet-50/60 py-20">
          <div className="mx-auto max-w-7xl px-5">
            <div className="mx-auto max-w-3xl text-center">
              <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50">GOOGLE SHOPPING READY</Badge>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight">Prepare every product for the channels that drive discovery</h2>
              <p className="mt-4 text-lg text-slate-600">Fix source data once, then keep Shopify, Merchant Center and product feeds aligned as the catalog changes.</p>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
              <Card className="overflow-hidden border-violet-100 shadow-xl shadow-violet-950/5">
                <CardHeader className="border-b border-violet-100 bg-gradient-to-r from-violet-600 to-blue-600 text-white">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"><ShoppingCart className="h-5 w-5" /></span>
                    <div><CardTitle className="text-lg">Shopping readiness</CardTitle><p className="mt-1 text-xs text-white/70">Product data checked before it reaches the feed</p></div>
                    <Badge className="ml-auto bg-emerald-400 text-emerald-950 hover:bg-emerald-400">Ready</Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
                  {[
                    { icon: FileSpreadsheet, title: "XML product feed", text: "Generated from the catalog and kept synchronized." },
                    { icon: Tags, title: "Google categories", text: "Map product types to channel-ready categories." },
                    { icon: Database, title: "GTIN, EAN & MPN", text: "Detect missing or invalid product identifiers." },
                    { icon: BadgeDollarSign, title: "Price & stock", text: "Keep availability and commercial data consistent." },
                    { icon: Languages, title: "Multi-language data", text: "Structure localized titles and descriptions." },
                    { icon: CircleCheck, title: "Issue validation", text: "Review blockers before publishing updates." },
                  ].map(({ icon: Icon, title, text }) => (
                    <div key={title} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><Icon className="h-4 w-4" /></span>
                      <div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="grid gap-4">
                {[
                  { icon: Store, eyebrow: "SOURCE", title: "Shopify catalog", text: "Products, variants, collections and media remain the source of truth." },
                  { icon: Globe2, eyebrow: "DISTRIBUTION", title: "Google Merchant Center", text: "Channel requirements are translated into clear catalog actions." },
                  { icon: SearchCheck, eyebrow: "MEASUREMENT", title: "Search Console", text: "Visibility data closes the loop between optimization and discovery." },
                ].map(({ icon: Icon, eyebrow, title, text }) => (
                  <div key={title} className="group rounded-2xl border border-violet-100 bg-white p-5 transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-lg">
                    <div className="flex items-start gap-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white"><Icon className="h-5 w-5" /></span>
                      <div><p className="text-xs font-semibold tracking-wider text-violet-600">{eyebrow}</p><h3 className="mt-1 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>
                    </div>
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
              { icon: Store, label: "Connect Shopify" },
              { icon: ScanSearch, label: "Free catalog scan" },
              { icon: AlertTriangle, label: "Review issues" },
              { icon: Sparkles, label: "Apply fixes" },
              { icon: RefreshCw, label: "Sync everywhere" },
            ].map(({ icon: Icon, label }, index) => (
              <div key={label} className="relative rounded-2xl border p-5 text-center">
                <span className="text-xs font-semibold text-violet-600">0{index + 1}</span><Icon className="mx-auto mt-3 h-6 w-6" /><p className="mt-3 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y bg-violet-50/50 py-20">
          <div className="mx-auto max-w-7xl px-5">
            <div className="flex max-w-3xl items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white"><SearchCheck className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-violet-700">Catalog optimization use cases</p>
                <h2 className="mt-2 text-4xl font-semibold tracking-tight">One platform, multiple high-intent workflows</h2>
                <p className="mt-4 text-lg text-slate-600">Explore focused workflows for Shopify catalog quality, product data, media, variants and Google Shopping.</p>
              </div>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {seoWorkflows.map((workflow) => (
                <Link key={workflow.href} to={workflow.href} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-violet-300 hover:shadow-md">
                  <Layers3 className="h-5 w-5 text-violet-600" />
                  <h3 className="mt-4 font-semibold">{workflow.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{workflow.text}</p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-violet-700">Explore <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-b bg-slate-50 py-20">
          <div className="mx-auto max-w-7xl px-5">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-4xl font-semibold tracking-tight">Start with the scan. Upgrade when the value is clear.</h2>
              <p className="mt-4 text-slate-600">See what needs fixing before you commit. Plan availability and checkout are confirmed inside the app before billing.</p>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-4">
              {plans.map((plan) => (
                <Card key={plan.name} className={plan.popular ? "relative border-violet-500 shadow-xl" : "border-slate-200"}>
                  {plan.popular && <Badge className="absolute -top-3 left-5 bg-violet-600">Most Popular</Badge>}
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <div><span className="text-4xl font-semibold">{plan.price}</span>{plan.price !== "$0" && <span className="text-sm text-slate-500">/month</span>}</div>
                    <p className="text-sm leading-6 text-slate-600">{plan.description}</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm text-slate-700">
                      {plan.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{feature}</li>)}
                    </ul>
                    <Button asChild variant={plan.popular ? "default" : "outline"} className={plan.popular ? "mt-7 w-full bg-violet-600 hover:bg-violet-700" : "mt-7 w-full"}>
                      <Link to={plan.href}>{plan.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20">
          <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-violet-600 to-blue-600 px-6 py-14 text-center text-white sm:px-12">
            <h2 className="text-4xl font-semibold tracking-tight">Ready to understand your catalog?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/80">Connect Shopify, see every issue and review the first recommended fixes before you commit.</p>
            <Button size="lg" variant="secondary" asChild className="mt-7"><Link to="/auth">Scan my catalog free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 md:flex-row md:items-end md:justify-between">
          <div><CatalogOptimizeLogo /><p className="mt-3 text-sm text-slate-500">AI Catalog Optimization & Product Operations for Shopify</p></div>
          <div className="flex flex-wrap gap-5 text-sm text-slate-500">
            <Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/documentation">Documentation</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
