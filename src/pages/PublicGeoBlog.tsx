import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  CalendarDays,
  Clock3,
  FileText,
  Layers3,
  Quote,
  ScanSearch,
  Search,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { geoBlogArticles, getGeoBlogArticle, type GeoBlogArticle } from "@/content/geoBlogArticles";

const SITE_URL = "https://catalogoptimize.com";
const SITE_NAME = "CatalogueOptimize AI";

const setMeta = (selector: string, attribute: "name" | "property", key: string, content: string) => {
  let node = document.head.querySelector<HTMLMetaElement>(selector);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attribute, key);
    document.head.appendChild(node);
  }
  node.content = content;
};

const setCanonical = (url: string) => {
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url;
};

const installJsonLd = (payload: Record<string, unknown>) => {
  const id = "catalogoptimize-blog-jsonld";
  document.getElementById(id)?.remove();
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = id;
  script.text = JSON.stringify(payload);
  document.head.appendChild(script);
  return () => script.remove();
};

const slugify = (value: string) =>
  value
    .replace(/<[^>]+>/g, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

type ProductLink = {
  label: string;
  description: string;
  href: string;
  icon: typeof Sparkles;
};

const getArticleProductLinks = (article: GeoBlogArticle): ProductLink[] => {
  const context = `${article.category} ${article.title} ${article.primaryKeyword}`.toLowerCase();
  const links: ProductLink[] = [
    {
      label: "Explore the platform",
      description: "See how catalog, content, SEO, GEO and commerce workflows connect.",
      href: "/#product",
      icon: Layers3,
    },
    {
      label: "Free catalog scan",
      description: "Start from a prioritized view of catalog quality and readiness.",
      href: "/auth?redirect=%2Fdashboard-light%3Fscan%3D1",
      icon: ScanSearch,
    },
  ];

  if (/merchant|shopping|feed|gtin|commerce data/.test(context)) {
    links.push({
      label: "Open Google Shopping workflow",
      description: "Connect catalog corrections to Shopping and Merchant Center tasks after sign-in.",
      href: "/auth?redirect=%2Fshopping",
      icon: ShoppingCart,
    });
  } else if (/assistant|agent|ai commerce|conversion/.test(context)) {
    links.push({
      label: "Activate Sales Assistant",
      description: "Use the same product knowledge for guided, grounded recommendations.",
      href: "/auth?redirect=%2Fstorefront-assistant",
      icon: Bot,
    });
  } else if (/seo|geo|search|technical|international/.test(context)) {
    links.push({
      label: "Open SEO Workspace",
      description: "Turn the editorial recommendations into collection, page and product SEO work.",
      href: "/auth?redirect=%2Fseo",
      icon: Search,
    });
  } else {
    links.push({
      label: "Enrich product data",
      description: "Move from thin source records to structured, reviewable product knowledge.",
      href: "/auth?redirect=%2Fproduct-enrichment",
      icon: FileText,
    });
  }

  return links;
};

const enrichArticleHtml = (article: GeoBlogArticle) => {
  const productLinks = getArticleProductLinks(article);
  let seen: Record<string, number> = {};
  let html = article.content.replace(/<h2>([\s\S]*?)<\/h2>/g, (_match, heading: string) => {
    const base = slugify(heading) || "section";
    const index = seen[base] || 0;
    seen[base] = index + 1;
    const id = index === 0 ? base : `${base}-${index + 1}`;
    return `<h2 id="${id}">${heading}</h2>`;
  });

  const scanLink = productLinks.find((link) => link.href.includes("dashboard-light")) || productLinks[1];
  const contextualLink = productLinks[2];

  const firstCrossLink = `
    <aside class="editorial-crosslink">
      <span class="editorial-kicker">Apply the idea</span>
      <strong>Audit the catalog before you optimize at scale.</strong>
      <p>Use the free catalog scan to turn the issues discussed in this guide into a prioritized starting point.</p>
      <a href="${scanLink.href}">${scanLink.label} →</a>
    </aside>`;

  const secondCrossLink = `
    <aside class="editorial-crosslink editorial-crosslink-dark">
      <span class="editorial-kicker">Inside CatalogueOptimize AI</span>
      <strong>${contextualLink.label}</strong>
      <p>${contextualLink.description}</p>
      <div class="editorial-inline-links">
        <a href="${contextualLink.href}">Open this workflow →</a>
        <a href="/#solutions">See all solutions →</a>
        <a href="/documentation">Read documentation →</a>
      </div>
    </aside>`;

  html = html.replace(/(<p class="lead">[\s\S]*?<\/p>)/, `$1${firstCrossLink}`);
  const implementationHeading = '<h2 id="how-to-implement-the-workflow-inside-catalogueoptimize-ai">';
  html = html.replace(implementationHeading, `${secondCrossLink}${implementationHeading}`);

  return html;
};

const getHeadings = (html: string) => {
  const headings: { id: string; label: string }[] = [];
  html.replace(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g, (_match, id: string, label: string) => {
    headings.push({ id, label: label.replace(/<[^>]+>/g, "") });
    return _match;
  });
  return headings;
};

const BlogHeader = () => (
  <header className="sticky top-0 z-50 border-b border-slate-200 bg-[#fffdf8]/95 backdrop-blur-xl">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex h-16 items-center justify-between">
        <a href="/blog" className="flex items-center gap-3 text-slate-950">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>
            <span className="block font-serif text-lg font-bold leading-none tracking-tight">The Catalog Review</span>
            <span className="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500 sm:block">by CatalogueOptimize AI</span>
          </span>
        </a>
        <nav className="flex items-center gap-1 sm:gap-2">
          <a href="/#product" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-950 md:inline-block">Product</a>
          <a href="/#solutions" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-950 md:inline-block">Solutions</a>
          <a href="/documentation" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-950 lg:inline-block">Resources</a>
          <a href="/auth?mode=login" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white sm:inline-block">Log in</a>
          <a href="/auth?redirect=%2Fdashboard-light%3Fscan%3D1" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Scan catalog free</a>
        </nav>
      </div>
    </div>
  </header>
);

const BlogFooter = () => (
  <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_.8fr]">
        <div>
          <p className="font-serif text-2xl font-bold text-white">The Catalog Review</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Editorial analysis on product data, SEO, GEO, Google Shopping and AI-assisted commerce — published by CatalogueOptimize AI.</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <a href="/" className="rounded-full border border-slate-700 px-3 py-1.5 hover:border-slate-500 hover:text-white">Platform</a>
            <a href="/#solutions" className="rounded-full border border-slate-700 px-3 py-1.5 hover:border-slate-500 hover:text-white">Solutions</a>
            <a href="/#pricing" className="rounded-full border border-slate-700 px-3 py-1.5 hover:border-slate-500 hover:text-white">Pricing</a>
            <a href="/#demo" className="rounded-full border border-slate-700 px-3 py-1.5 hover:border-slate-500 hover:text-white">Demo</a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm sm:grid-cols-3 lg:justify-self-end">
          <div>
            <p className="font-semibold text-white">Read</p>
            <div className="mt-3 space-y-2 text-slate-400"><a href="/blog" className="block hover:text-white">Magazine</a><a href="/documentation" className="block hover:text-white">Documentation</a><a href="/demo" className="block hover:text-white">Demo</a></div>
          </div>
          <div>
            <p className="font-semibold text-white">Account</p>
            <div className="mt-3 space-y-2 text-slate-400"><a href="/auth?mode=login" className="block hover:text-white">Log in</a><a href="/auth?mode=signup" className="block hover:text-white">Create account</a><a href="/auth?redirect=%2Fdashboard-light%3Fscan%3D1" className="block hover:text-white">Free scan</a></div>
          </div>
          <div>
            <p className="font-semibold text-white">Legal</p>
            <div className="mt-3 space-y-2 text-slate-400"><a href="/privacy" className="block hover:text-white">Privacy</a><a href="/terms" className="block hover:text-white">Terms</a></div>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

const StoryMeta = ({ article }: { article: GeoBlogArticle }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
    <span>{new Date(`${article.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
    <span className="h-1 w-1 rounded-full bg-slate-300" />
    <span>{article.readTime} min read</span>
    <span className="h-1 w-1 rounded-full bg-slate-300" />
    <span>{article.wordCount.toLocaleString("en-US")} words</span>
  </div>
);

const ArticleCard = ({ article, number }: { article: GeoBlogArticle; number?: number }) => (
  <article className="group border-t border-slate-300 py-6 first:border-t-0 md:first:border-t">
    <div className="flex gap-5">
      {number !== undefined && <span className="pt-1 font-serif text-3xl italic text-slate-300">{String(number).padStart(2, "0")}</span>}
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-700">{article.category}</span></div>
        <h3 className="font-serif text-2xl font-bold leading-tight tracking-tight text-slate-950 transition group-hover:text-indigo-700">
          <a href={`/blog/${article.slug}`}>{article.title}</a>
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{article.excerpt}</p>
        <div className="mt-4"><StoryMeta article={article} /></div>
      </div>
    </div>
  </article>
);

const FeatureStory = ({ article }: { article: GeoBlogArticle }) => (
  <article className="grid overflow-hidden border-y border-slate-300 bg-[#f3efe6] lg:grid-cols-[1.1fr_.9fr]">
    <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-indigo-700"><span>Cover story</span><span className="h-px w-10 bg-indigo-300" /></div>
      <h2 className="mt-6 max-w-3xl font-serif text-4xl font-bold leading-[1.02] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl"><a href={`/blog/${article.slug}`} className="hover:text-indigo-800">{article.title}</a></h2>
      <p className="mt-6 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">{article.excerpt}</p>
      <div className="mt-7"><StoryMeta article={article} /></div>
      <a href={`/blog/${article.slug}`} className="mt-7 inline-flex w-fit items-center gap-2 border-b-2 border-slate-950 pb-1 text-sm font-bold text-slate-950">Read the cover story <ArrowRight className="h-4 w-4" /></a>
    </div>
    <div className="relative min-h-[320px] overflow-hidden bg-slate-950 p-8 text-white lg:min-h-full lg:p-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(129,140,248,.36),transparent_32%),radial-gradient(circle_at_80%_70%,rgba(14,165,233,.24),transparent_30%)]" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between"><Bot className="h-9 w-9 text-indigo-300" /><span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Issue 01 · 2026</span></div>
        <div className="mt-20">
          <p className="font-serif text-5xl font-bold leading-none sm:text-6xl">GEO</p>
          <p className="mt-2 font-serif text-5xl font-bold leading-none text-indigo-300 sm:text-6xl">AI Search</p>
          <p className="mt-6 max-w-sm text-sm leading-6 text-slate-300">The operating system behind discoverable, understandable and recommendation-ready commerce catalogs.</p>
        </div>
      </div>
    </div>
  </article>
);

const ProductPathways = () => (
  <section className="border-y border-slate-300 bg-slate-950 py-12 text-white">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid gap-7 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">From reading to execution</p>
          <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">Turn editorial insight into catalog work.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">The magazine explains the strategy. CatalogueOptimize AI provides the connected workspace behind the catalog, SEO, GEO and commerce actions.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Free catalog scan", "Prioritize product and data issues", "/auth?redirect=%2Fdashboard-light%3Fscan%3D1"],
            ["Product & solutions", "See the full operating model", "/#solutions"],
            ["Documentation", "Go deeper into implementation", "/documentation"],
            ["Create an account", "Move directly into the workspace", "/auth?mode=signup"],
          ].map(([label, description, href]) => (
            <a key={label} href={href} className="group flex items-center justify-between gap-4 border border-slate-700 bg-slate-900 p-4 transition hover:border-indigo-400 hover:bg-slate-800">
              <span><span className="block text-sm font-bold text-white">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-400">{description}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-indigo-300" />
            </a>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const BlogIndex = () => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = useMemo(() => ["All", ...Array.from(new Set(geoBlogArticles.map((article) => article.category)))], []);
  const coverStory = geoBlogArticles[0];
  const editorPicks = geoBlogArticles.slice(1, 3);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return geoBlogArticles.filter((article) => {
      const matchesCategory = category === "All" || article.category === category;
      if (!matchesCategory) return false;
      if (!needle) return true;
      const haystack = `${article.title} ${article.excerpt} ${article.primaryKeyword} ${article.secondaryKeywords.join(" ")}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [category, query]);

  const libraryArticles = query.trim() || category !== "All" ? filtered : filtered.slice(3);

  useEffect(() => {
    const title = "The Catalog Review — GEO, AI Search & E-commerce Intelligence | CatalogueOptimize AI";
    const description = "Magazine-style analysis of GEO, Google AI Search, Shopify catalog optimization, Merchant Center, AI shopping assistants, SEO and product data.";
    document.title = title;
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[name="robots"]', "name", "robots", "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:type"]', "property", "og:type", "website");
    setMeta('meta[property="og:url"]', "property", "og:url", `${SITE_URL}/blog`);
    setCanonical(`${SITE_URL}/blog`);
    return installJsonLd({
      "@context": "https://schema.org",
      "@type": "Blog",
      name: `${SITE_NAME} — The Catalog Review`,
      url: `${SITE_URL}/blog`,
      description,
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      blogPost: geoBlogArticles.map((article) => ({
        "@type": "BlogPosting",
        headline: article.title,
        url: `${SITE_URL}/blog/${article.slug}`,
        datePublished: article.date,
        dateModified: article.updatedAt,
        description: article.metaDescription,
      })),
    });
  }, []);

  return (
    <>
      <BlogHeader />
      <main className="bg-[#fffdf8] text-slate-950">
        <section className="border-b border-slate-300 bg-[#fffdf8]">
          <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 lg:px-8 lg:pt-14">
            <div className="flex flex-col gap-8 border-b border-slate-950 pb-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500"><span>CatalogueOptimize AI editorial</span><span className="h-1 w-1 rounded-full bg-slate-400" /><span>September 2026</span></div>
                <h1 className="mt-4 font-serif text-6xl font-black leading-[.9] tracking-[-.04em] sm:text-7xl lg:text-8xl">The Catalog<br />Review</h1>
              </div>
              <div className="max-w-md lg:text-right">
                <p className="font-serif text-xl italic leading-7 text-slate-700">Ideas, evidence and operating playbooks for the age of Google AI Search, shopping assistants and agentic commerce.</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">20 long-form reports · 2,000+ words each</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><FeatureStory article={coverStory} /></div>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-7 flex items-center justify-between border-b border-slate-950 pb-3"><h2 className="font-serif text-3xl font-bold">Editor’s picks</h2><a href="/#demo" className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-700 hover:text-indigo-900">See product demo →</a></div>
          <div className="grid gap-8 lg:grid-cols-2">
            {editorPicks.map((article, index) => <ArticleCard key={article.id} article={article} number={index + 1} />)}
          </div>
        </section>

        <ProductPathways />

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
            <aside>
              <div className="lg:sticky lg:top-24">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Browse the issue</p>
                <h2 className="mt-2 font-serif text-3xl font-bold">Research library</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">Filter by topic or search across the full 20-guide editorial library.</p>
                <div className="relative mt-6">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports..." className="h-11 w-full border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="mt-5 flex flex-wrap gap-2 lg:flex-col lg:items-start">
                  {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`text-left text-xs font-bold uppercase tracking-[0.12em] transition ${category === item ? "text-indigo-700 underline decoration-2 underline-offset-4" : "text-slate-500 hover:text-slate-950"}`}>{item}</button>)}
                </div>
              </div>
            </aside>
            <div>
              <div className="flex items-end justify-between border-b border-slate-950 pb-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">All analysis</p><h2 className="mt-1 font-serif text-4xl font-bold">{libraryArticles.length} reports</h2></div></div>
              <div className="grid gap-x-10 md:grid-cols-2">{libraryArticles.map((article, index) => <ArticleCard key={article.id} article={article} number={index + 4} />)}</div>
              {libraryArticles.length === 0 && <div className="border-b border-slate-300 py-14 text-center text-sm text-slate-500">No report matches this search yet.</div>}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-300 bg-[#f3efe6] py-14">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">The practical next step</p><h2 className="mt-3 max-w-3xl font-serif text-4xl font-bold leading-tight">Don’t optimize from a blank page. Start from the catalog you actually have.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Run the free scan, see where product data and search readiness break down, then use the magazine’s playbooks to decide what to fix first.</p></div>
            <div className="flex flex-wrap gap-3"><a href="/auth?redirect=%2Fdashboard-light%3Fscan%3D1" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">Scan catalog free</a><a href="/#pricing" className="rounded-full border border-slate-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-white">View pricing</a></div>
          </div>
        </section>
      </main>
      <BlogFooter />
    </>
  );
};

const ArticlePage = ({ article }: { article: GeoBlogArticle }) => {
  const related = geoBlogArticles.filter((candidate) => candidate.slug !== article.slug && candidate.category === article.category).slice(0, 3);
  const fallbackRelated = related.length >= 3 ? related : [...related, ...geoBlogArticles.filter((candidate) => candidate.slug !== article.slug && !related.some((item) => item.slug === candidate.slug))].slice(0, 3);
  const enrichedContent = useMemo(() => enrichArticleHtml(article), [article]);
  const headings = useMemo(() => getHeadings(enrichedContent), [enrichedContent]);
  const productLinks = useMemo(() => getArticleProductLinks(article), [article]);

  useEffect(() => {
    const canonicalUrl = `${SITE_URL}/blog/${article.slug}`;
    document.title = `${article.title} | The Catalog Review`;
    setMeta('meta[name="description"]', "name", "description", article.metaDescription);
    setMeta('meta[name="robots"]', "name", "robots", "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
    setMeta('meta[property="og:title"]', "property", "og:title", article.title);
    setMeta('meta[property="og:description"]', "property", "og:description", article.metaDescription);
    setMeta('meta[property="og:type"]', "property", "og:type", "article");
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setCanonical(canonicalUrl);

    return installJsonLd({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BlogPosting",
          headline: article.title,
          description: article.metaDescription,
          datePublished: article.date,
          dateModified: article.updatedAt,
          mainEntityOfPage: canonicalUrl,
          url: canonicalUrl,
          wordCount: article.wordCount,
          keywords: [article.primaryKeyword, ...article.secondaryKeywords],
          author: { "@type": "Organization", name: `${SITE_NAME} Editorial`, url: SITE_URL },
          publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "The Catalog Review", item: `${SITE_URL}/blog` },
            { "@type": "ListItem", position: 3, name: article.title, item: canonicalUrl },
          ],
        },
        {
          "@type": "FAQPage",
          mainEntity: article.faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
        },
      ],
    });
  }, [article]);

  return (
    <>
      <BlogHeader />
      <main className="bg-[#fffdf8] text-slate-950">
        <section className="border-b border-slate-300">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <a href="/blog" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950"><ArrowLeft className="h-3.5 w-3.5" /> The Catalog Review</a>
            <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_250px] lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">{article.category}</p>
                <h1 className="mt-4 max-w-5xl font-serif text-5xl font-black leading-[.98] tracking-[-.035em] sm:text-6xl lg:text-7xl">{article.title}</h1>
                <p className="mt-6 max-w-3xl font-serif text-xl italic leading-8 text-slate-600 sm:text-2xl">{article.excerpt}</p>
              </div>
              <div className="border-l-2 border-slate-950 pl-5 text-sm">
                <p className="font-bold text-slate-950">CatalogueOptimize AI Editorial Desk</p>
                <p className="mt-1 text-slate-500">Research & commerce intelligence</p>
                <div className="mt-4"><StoryMeta article={article} /></div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-300 bg-[#f3efe6]">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[auto_1fr] md:items-center lg:px-8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700"><Quote className="h-4 w-4" /> Editor’s note</div>
            <p className="text-sm leading-6 text-slate-700">This report is written as a practical 2,000+ word resource. It separates controllable catalog, SEO and GEO inputs from external ranking outcomes and connects strategy directly to the relevant CatalogueOptimize AI workflows.</p>
          </div>
        </section>

        <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[220px_minmax(0,760px)_260px] xl:px-8 xl:py-16">
          <aside className="hidden xl:block">
            <div className="sticky top-24 border-t border-slate-950 pt-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">In this report</p>
              <nav className="mt-4 space-y-3">
                {headings.slice(0, 10).map((heading, index) => <a key={heading.id} href={`#${heading.id}`} className="group flex gap-2 text-xs leading-5 text-slate-500 hover:text-indigo-700"><span className="font-serif italic text-slate-300 group-hover:text-indigo-400">{String(index + 1).padStart(2, "0")}</span><span>{heading.label}</span></a>)}
              </nav>
            </div>
          </aside>

          <article className="min-w-0">
            <div className="mb-10 border-y border-slate-300 py-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">At a glance</p>
              <p className="mt-3 font-serif text-2xl font-bold leading-8 text-slate-900">{article.thesis}</p>
              <div className="mt-5 flex flex-wrap gap-2">{[article.primaryKeyword, ...article.secondaryKeywords].slice(0, 5).map((keyword) => <span key={keyword} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600">{keyword}</span>)}</div>
            </div>
            <div
              className="prose prose-slate max-w-none prose-headings:scroll-mt-24 prose-headings:font-serif prose-headings:font-bold prose-h2:mt-16 prose-h2:border-t prose-h2:border-slate-300 prose-h2:pt-8 prose-h2:text-3xl prose-h3:mt-9 prose-p:text-[17px] prose-p:leading-8 prose-li:my-2 prose-li:text-[16px] prose-a:font-semibold prose-a:text-indigo-700 prose-strong:text-slate-950 [&_.lead]:font-serif [&_.lead]:text-2xl [&_.lead]:font-bold [&_.lead]:leading-9 [&_.lead]:text-slate-950 [&_.editorial-crosslink]:not-prose [&_.editorial-crosslink]:my-10 [&_.editorial-crosslink]:border-l-4 [&_.editorial-crosslink]:border-indigo-600 [&_.editorial-crosslink]:bg-indigo-50 [&_.editorial-crosslink]:p-6 [&_.editorial-crosslink]:text-slate-950 [&_.editorial-crosslink_strong]:mt-2 [&_.editorial-crosslink_strong]:block [&_.editorial-crosslink_strong]:font-serif [&_.editorial-crosslink_strong]:text-xl [&_.editorial-crosslink_p]:mt-2 [&_.editorial-crosslink_p]:text-sm [&_.editorial-crosslink_p]:leading-6 [&_.editorial-crosslink_a]:mt-3 [&_.editorial-crosslink_a]:inline-block [&_.editorial-crosslink_a]:text-sm [&_.editorial-crosslink_a]:font-bold [&_.editorial-kicker]:text-[10px] [&_.editorial-kicker]:font-bold [&_.editorial-kicker]:uppercase [&_.editorial-kicker]:tracking-[0.18em] [&_.editorial-kicker]:text-indigo-700 [&_.editorial-crosslink-dark]:border-slate-950 [&_.editorial-crosslink-dark]:bg-slate-950 [&_.editorial-crosslink-dark]:text-white [&_.editorial-crosslink-dark_p]:text-slate-300 [&_.editorial-crosslink-dark_.editorial-kicker]:text-indigo-300 [&_.editorial-crosslink-dark_a]:text-indigo-300 [&_.editorial-inline-links]:flex [&_.editorial-inline-links]:flex-wrap [&_.editorial-inline-links]:gap-x-4 [&_.editorial-inline-links]:gap-y-1"
              dangerouslySetInnerHTML={{ __html: enrichedContent }}
            />
          </article>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="border-t border-slate-950 pt-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">From insight to action</p>
              <div className="mt-4 space-y-4">
                {productLinks.map(({ label, description, href, icon: Icon }) => (
                  <a key={href} href={href} className="group block border-b border-slate-300 pb-4">
                    <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-indigo-700" /><span className="text-sm font-bold text-slate-950 group-hover:text-indigo-700">{label}</span></div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-700">Open <ArrowRight className="h-3 w-3" /></span>
                  </a>
                ))}
              </div>
            </div>
            <div className="bg-slate-950 p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300">Reader pathway</p>
              <h2 className="mt-3 font-serif text-xl font-bold">See the product behind the playbook.</h2>
              <p className="mt-2 text-xs leading-5 text-slate-300">Review the public product sections, pricing and demo without leaving the editorial journey.</p>
              <div className="mt-4 space-y-2 text-xs font-semibold"><a href="/#product" className="block text-indigo-300 hover:text-white">Product overview →</a><a href="/#pricing" className="block text-indigo-300 hover:text-white">Pricing →</a><a href="/#demo" className="block text-indigo-300 hover:text-white">Demo →</a><a href="/documentation" className="block text-indigo-300 hover:text-white">Documentation →</a></div>
            </div>
          </aside>
        </div>

        <section className="border-y border-slate-300 bg-[#f3efe6] py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Continue the work</p><h2 className="mt-2 font-serif text-3xl font-bold">Run the catalog scan, then apply this report to the highest-impact issues.</h2></div><div className="flex flex-wrap gap-3"><a href="/auth?redirect=%2Fdashboard-light%3Fscan%3D1" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">Scan catalog free</a><a href="/#solutions" className="rounded-full border border-slate-400 px-5 py-3 text-sm font-bold text-slate-950">Explore solutions</a></div></div>
          </div>
        </section>

        <section className="py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-end justify-between border-b border-slate-950 pb-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Next reading</p><h2 className="mt-1 font-serif text-3xl font-bold">Continue the playbook</h2></div><a href="/blog" className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">All reports →</a></div>
            <div className="grid gap-x-8 md:grid-cols-3">{fallbackRelated.map((item, index) => <ArticleCard key={item.id} article={item} number={index + 1} />)}</div>
          </div>
        </section>
      </main>
      <BlogFooter />
    </>
  );
};

const NotFoundArticle = () => (
  <>
    <BlogHeader />
    <main className="flex min-h-[70vh] items-center justify-center bg-[#fffdf8] px-4 text-center">
      <div className="max-w-2xl"><BookOpen className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">The Catalog Review</p><h1 className="mt-3 font-serif text-5xl font-bold text-slate-950">Report not found</h1><p className="mt-4 text-slate-600">This editorial report does not exist or the URL has changed.</p><a href="/blog" className="mt-7 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">Browse the current issue</a></div>
    </main>
    <BlogFooter />
  </>
);

export default function PublicGeoBlog() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const slug = pathname.startsWith("/blog/") ? decodeURIComponent(pathname.slice("/blog/".length)) : "";

  if (!slug) return <BlogIndex />;
  const article = getGeoBlogArticle(slug);
  if (!article) return <NotFoundArticle />;
  return <ArticlePage article={article} />;
}
