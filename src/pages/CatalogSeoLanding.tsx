import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CatalogOptimizeLogo } from "@/components/CatalogOptimizeLogo";

type SeoPage = {
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  benefits: string[];
  sectionTitle: string;
  sectionCopy: string;
};

const SEO_PAGES = {
  "shopify-catalog-optimization": {
    title: "Shopify Catalog Optimization with AI | CatalogOptimize AI",
    description: "Audit and optimize Shopify products, variants, descriptions, images, pricing and Shopping data from one AI catalog workspace.",
    eyebrow: "SHOPIFY CATALOG OPTIMIZATION",
    h1: "Optimize your entire Shopify catalog with AI",
    intro: "Find catalog issues, prioritize the products that need work and review AI-powered fixes before syncing them back to Shopify.",
    benefits: ["Catalog-wide quality audit", "Bulk product and variant cleanup", "Reviewable fixes before Shopify sync"],
    sectionTitle: "A catalog workflow built around Shopify operations",
    sectionCopy: "CatalogOptimize AI connects catalog quality, merchandising, media, pricing and channel readiness so teams can improve product data without jumping between disconnected tools.",
  },
  "ai-product-catalog-optimization": {
    title: "AI Product Catalog Optimization | CatalogOptimize AI",
    description: "Use AI to enrich product data, improve catalog quality and prepare ecommerce listings for search, shopping channels and conversion.",
    eyebrow: "AI PRODUCT CATALOG OPTIMIZATION",
    h1: "Turn incomplete product data into channel-ready listings",
    intro: "Use AI to identify missing information, normalize product records and create stronger commercial content at catalog scale.",
    benefits: ["AI-assisted product enrichment", "Consistent titles and attributes", "Scalable catalog quality controls"],
    sectionTitle: "AI that works on the product record, not just the copy",
    sectionCopy: "Improve the connected data behind each listing — content, attributes, variants, media and channel fields — while keeping the merchant in control of every change.",
  },
  "shopify-product-optimization": {
    title: "Shopify Product Optimization | CatalogOptimize AI",
    description: "Optimize Shopify product pages with stronger titles, descriptions, variants, images, attributes and merchandising data using AI.",
    eyebrow: "SHOPIFY PRODUCT OPTIMIZATION",
    h1: "Improve every Shopify product page from one workspace",
    intro: "Strengthen the product information customers and shopping channels rely on, from commercial titles to variant structure and product media.",
    benefits: ["Commercial product titles", "Structured descriptions and landing content", "Cleaner variants and product attributes"],
    sectionTitle: "Move from isolated edits to repeatable product operations",
    sectionCopy: "CatalogOptimize AI helps merchants apply a consistent optimization standard across hundreds or thousands of Shopify products while preserving review and approval.",
  },
  "google-shopping-feed-optimization": {
    title: "Google Shopping Feed Optimization for Shopify | CatalogOptimize AI",
    description: "Find missing or inconsistent Google Shopping attributes and improve Shopify product data for Merchant Center and product feeds.",
    eyebrow: "GOOGLE SHOPPING FEED OPTIMIZATION",
    h1: "Make your Shopify catalog more Shopping-ready",
    intro: "Detect product data problems that can weaken feed quality and improve the fields Google Shopping and Merchant Center depend on.",
    benefits: ["Shopping readiness checks", "Missing attribute detection", "Product feed quality improvements"],
    sectionTitle: "Fix the source catalog before fighting the feed",
    sectionCopy: "Instead of treating feed errors as a separate problem, CatalogOptimize AI helps improve the underlying Shopify product data that feeds Merchant Center and other shopping channels.",
  },
  "product-data-enrichment": {
    title: "AI Product Data Enrichment for Ecommerce | CatalogOptimize AI",
    description: "Enrich ecommerce product data with AI: descriptions, attributes, categories, tags, metafields, identifiers and merchandising information.",
    eyebrow: "PRODUCT DATA ENRICHMENT",
    h1: "Enrich thin supplier data into complete product records",
    intro: "Transform raw supplier listings into structured, useful product information for your storefront, internal operations and shopping channels.",
    benefits: ["Attribute and category enrichment", "Tags and metafield support", "More complete product records"],
    sectionTitle: "Create a stronger source of truth for every product",
    sectionCopy: "CatalogOptimize AI helps turn fragmented supplier information into organized product data that can support storefront content, filters, feeds and merchandising workflows.",
  },
  "bulk-product-description-generator": {
    title: "Bulk AI Product Description Generator for Shopify | CatalogOptimize AI",
    description: "Generate and review product descriptions in bulk for Shopify while keeping tone, product facts and catalog structure consistent.",
    eyebrow: "BULK PRODUCT DESCRIPTION GENERATOR",
    h1: "Generate better Shopify product descriptions at catalog scale",
    intro: "Create useful, structured commercial descriptions for large catalogs without turning your product pages into repetitive AI copy.",
    benefits: ["Bulk description generation", "Consistent brand and product structure", "Review before publishing"],
    sectionTitle: "Scale content without losing product accuracy",
    sectionCopy: "Use the data already attached to each product to produce stronger descriptions, then review changes before syncing them to the live store.",
  },
  "shopify-image-optimization": {
    title: "Shopify Product Image Optimization with AI | CatalogOptimize AI",
    description: "Organize Shopify product galleries, improve ALT text and create cleaner product imagery with AI-assisted catalog media workflows.",
    eyebrow: "SHOPIFY IMAGE OPTIMIZATION",
    h1: "Turn inconsistent product media into stronger Shopify galleries",
    intro: "Review image coverage, improve ALT text and build more complete product galleries from the same catalog operations workspace.",
    benefits: ["Gallery completeness checks", "AI-assisted ALT text", "White and lifestyle image workflows"],
    sectionTitle: "Treat product media as part of catalog quality",
    sectionCopy: "CatalogOptimize AI connects images to the product record so media improvements can be reviewed alongside titles, descriptions, variants and channel data.",
  },
  "shopify-variant-management": {
    title: "Shopify Variant Management & Optimization | CatalogOptimize AI",
    description: "Audit and organize Shopify variants, options and product data to reduce inconsistent naming and improve catalog clarity.",
    eyebrow: "SHOPIFY VARIANT MANAGEMENT",
    h1: "Clean up Shopify variants before they confuse customers and feeds",
    intro: "Identify inconsistent options, naming and product structures, then review the changes needed to make variants easier to manage and shop.",
    benefits: ["Variant consistency checks", "Option naming cleanup", "Catalog-level variant review"],
    sectionTitle: "Keep complex catalogs understandable",
    sectionCopy: "Variant quality affects storefront usability, product feeds and day-to-day operations. CatalogOptimize AI surfaces inconsistencies so teams can fix them systematically.",
  },
} satisfies Record<string, SeoPage>;

export type CatalogSeoSlug = keyof typeof SEO_PAGES;

export function getCatalogSeoSlug(pathname: string): CatalogSeoSlug | null {
  const slug = pathname.replace(/^\/+|\/+$/g, "");
  return Object.prototype.hasOwnProperty.call(SEO_PAGES, slug) ? (slug as CatalogSeoSlug) : null;
}

export default function CatalogSeoLanding({ slug }: { slug: CatalogSeoSlug }) {
  const page = SEO_PAGES[slug];
  const canonical = `https://catalogoptimize.com/${slug}`;

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <Helmet>
        <title>{page.title}</title>
        <meta name="description" content={page.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="CatalogOptimize AI" />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.description} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={page.title} />
        <meta name="twitter:description" content={page.description} />
      </Helmet>

      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link to="/" aria-label="CatalogOptimize AI home">
            <CatalogOptimizeLogo />
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/auth">Log in</Link></Button>
            <Button asChild className="bg-slate-950 text-white hover:bg-slate-800">
              <Link to="/auth">Scan my catalog free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b bg-gradient-to-b from-violet-50 via-white to-white">
          <div className="mx-auto max-w-5xl px-5 py-20 text-center sm:py-28">
            <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-xs font-semibold tracking-wide text-violet-700">
              <Sparkles className="h-4 w-4" /> {page.eyebrow}
            </div>
            <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-tight tracking-[-.04em] sm:text-6xl">{page.h1}</h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">{page.intro}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild className="bg-violet-600 hover:bg-violet-700">
                <Link to="/auth">Scan my Shopify catalog <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild><Link to="/demo">Watch the demo</Link></Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-4 md:grid-cols-3">
            {page.benefits.map((benefit) => (
              <Card key={benefit} className="border-slate-200">
                <CardContent className="p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Check className="h-5 w-5" /></span>
                  <h2 className="mt-4 text-lg font-semibold">{benefit}</h2>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-16 grid gap-8 rounded-3xl bg-slate-950 p-8 text-white md:grid-cols-[.8fr_1.2fr] md:p-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-300">CatalogOptimize AI</p>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">{page.sectionTitle}</h2>
              <p className="mt-4 text-base leading-7 text-slate-300">{page.sectionCopy}</p>
              <div className="mt-7 flex flex-wrap gap-3 text-sm text-slate-300">
                {["Catalog", "Content", "Media", "Pricing", "Channels"].map((item) => (
                  <span key={item} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">{item}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y bg-slate-50 py-16">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-3xl font-semibold tracking-tight">Explore more catalog optimization workflows</h2>
            <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(SEO_PAGES)
                .filter(([otherSlug]) => otherSlug !== slug)
                .slice(0, 6)
                .map(([otherSlug, other]) => (
                  <Link
                    key={otherSlug}
                    to={`/${otherSlug}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-violet-300 hover:shadow-sm"
                  >
                    <p className="font-semibold">{other.eyebrow.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{other.description}</p>
                    <span className="mt-4 inline-flex items-center text-sm font-medium text-violet-700">Learn more <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                  </Link>
                ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20">
          <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-violet-600 to-blue-600 px-6 py-12 text-center text-white sm:px-12">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">See what is holding your Shopify catalog back</h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/80">Run the free catalog scan, review the issues and see recommended fixes before choosing a paid plan.</p>
            <Button size="lg" variant="secondary" asChild className="mt-7">
              <Link to="/auth">Scan my catalog free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <CatalogOptimizeLogo />
          <div className="flex flex-wrap gap-5">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/documentation">Documentation</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
