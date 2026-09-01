import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Bot, CalendarDays, Clock3, Search, Sparkles } from "lucide-react";
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

const BlogHeader = () => (
  <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <a href="/" className="flex items-center gap-2 font-semibold text-slate-950">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="hidden sm:block">CatalogueOptimize AI</span>
      </a>
      <nav className="flex items-center gap-1 sm:gap-2">
        <a href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950">Product</a>
        <a href="/blog" className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-950">Blog</a>
        <a href="/auth?mode=login" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:inline-block">Log in</a>
        <a href="/auth?mode=signup" className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Start free</a>
      </nav>
    </div>
  </header>
);

const BlogFooter = () => (
  <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:px-8">
      <div>
        <div className="flex items-center gap-2 font-semibold text-white"><Sparkles className="h-5 w-5" /> CatalogueOptimize AI</div>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Catalog intelligence for Shopify: product data, content, media, SEO, GEO & AI Search, Google Shopping and AI-assisted selling from a more reliable product source of truth.</p>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm md:justify-end">
        <a href="/documentation" className="hover:text-white">Documentation</a>
        <a href="/privacy" className="hover:text-white">Privacy</a>
        <a href="/terms" className="hover:text-white">Terms</a>
        <a href="/auth?mode=signup" className="hover:text-white">Create account</a>
      </div>
    </div>
  </footer>
);

const ArticleCard = ({ article }: { article: GeoBlogArticle }) => (
  <article className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
    <div className="mb-5 flex items-center justify-between gap-3">
      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{article.category}</span>
      <span className="text-xs font-medium text-slate-400">{article.wordCount.toLocaleString("en-US")} words</span>
    </div>
    <h2 className="text-xl font-bold leading-snug text-slate-950 group-hover:text-indigo-700">{article.title}</h2>
    <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{article.excerpt}</p>
    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
      <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {article.readTime} min</span>
      <a href={`/blog/${article.slug}`} className="flex items-center gap-1.5 font-semibold text-slate-900 group-hover:text-indigo-700">Read guide <ArrowRight className="h-3.5 w-3.5" /></a>
    </div>
  </article>
);

const BlogIndex = () => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = useMemo(() => ["All", ...Array.from(new Set(geoBlogArticles.map((article) => article.category)))], []);

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

  useEffect(() => {
    const title = "GEO, AI Search & E-commerce Optimization Blog | CatalogueOptimize AI";
    const description = "20 in-depth guides on GEO, Google AI Search, Shopify catalog optimization, Merchant Center, AI shopping assistants, SEO and product data.";
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
      name: `${SITE_NAME} GEO & AI Search Blog`,
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
      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.28),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.20),transparent_30%)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="max-w-4xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100"><Bot className="h-4 w-4" /> GEO · AI Search · Catalog Intelligence</div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Make your catalog understandable to shoppers, Google and AI assistants.</h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">A practical library for merchants building the next generation of product discovery. Every guide is long-form, product-data grounded and designed to connect SEO foundations with generative search, Google Shopping and conversational commerce.</p>
              <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-white/15 px-3 py-1.5">20 expert guides</span>
                <span className="rounded-full border border-white/15 px-3 py-1.5">2,000+ words each</span>
                <span className="rounded-full border border-white/15 px-3 py-1.5">Google + AI assistants</span>
                <span className="rounded-full border border-white/15 px-3 py-1.5">Shopify focused</span>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search GEO, Merchant Center, AI assistants..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:max-w-3xl">
              {categories.map((item) => (
                <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition ${category === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{item}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">Knowledge library</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-950">{filtered.length} in-depth guides</h2>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((article) => <ArticleCard key={article.id} article={article} />)}
            </div>
            {filtered.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No guide matches this search yet.</div>}
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"><Sparkles className="h-4 w-4" /> From knowledge to execution</span>
            <h2 className="mt-5 text-3xl font-bold text-slate-950 sm:text-4xl">Optimize the catalog behind the answers.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">CatalogueOptimize AI connects Shopify catalog quality, content, media, SEO, GEO & AI Search, Google Shopping and a grounded sales assistant around the same product knowledge.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a href="/auth?mode=signup" className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Start free</a>
              <a href="/demo" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">View demo</a>
            </div>
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

  useEffect(() => {
    const canonicalUrl = `${SITE_URL}/blog/${article.slug}`;
    document.title = `${article.title} | ${SITE_NAME}`;
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
          author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
          publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
            { "@type": "ListItem", position: 3, name: article.title, item: canonicalUrl },
          ],
        },
        {
          "@type": "FAQPage",
          mainEntity: article.faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        },
      ],
    });
  }, [article]);

  return (
    <>
      <BlogHeader />
      <main className="bg-white">
        <section className="border-b border-slate-200 bg-slate-950 text-white">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <a href="/blog" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to all guides</a>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-indigo-200">
              <span className="rounded-full border border-indigo-300/20 bg-indigo-300/10 px-3 py-1.5">{article.category}</span>
              <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {new Date(`${article.date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4" /> {article.readTime} min read</span>
              <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> {article.wordCount.toLocaleString("en-US")} words</span>
            </div>
            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">{article.title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">{article.excerpt}</p>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-8 lg:py-16">
          <article className="min-w-0">
            <div className="mb-10 rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-sm leading-6 text-indigo-950">
              <strong>Editorial standard:</strong> this guide is designed as a 2,000+ word practical resource. It separates controllable SEO/GEO inputs from external ranking outcomes and links to official Google and OpenAI documentation for platform-specific claims.
            </div>
            <div
              className="prose prose-slate max-w-none prose-headings:scroll-mt-24 prose-headings:font-bold prose-h2:mt-14 prose-h2:border-t prose-h2:border-slate-200 prose-h2:pt-10 prose-h3:mt-8 prose-p:leading-8 prose-li:my-2 prose-a:font-medium prose-a:text-indigo-700 prose-strong:text-slate-950"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </article>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Primary topic</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{article.primaryKeyword}</p>
              <div className="mt-4 flex flex-wrap gap-2">{article.secondaryKeywords.map((keyword) => <span key={keyword} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">{keyword}</span>)}</div>
            </div>
            <div className="rounded-2xl bg-slate-950 p-5 text-white">
              <Bot className="h-6 w-6 text-indigo-300" />
              <h2 className="mt-4 text-lg font-bold">Turn the guide into catalog actions.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Audit product data, improve SEO surfaces and build a stronger source of truth for Google Shopping and AI-assisted discovery.</p>
              <a href="/auth?mode=signup" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950">Start free <ArrowRight className="h-4 w-4" /></a>
            </div>
          </aside>
        </div>

        <section className="border-t border-slate-200 bg-slate-50 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-7 flex items-center justify-between gap-4"><h2 className="text-2xl font-bold text-slate-950">Continue the GEO playbook</h2><a href="/blog" className="text-sm font-semibold text-indigo-700">All guides →</a></div>
            <div className="grid gap-5 md:grid-cols-3">{fallbackRelated.map((item) => <ArticleCard key={item.id} article={item} />)}</div>
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
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-slate-100 p-4"><BookOpen className="h-7 w-7 text-slate-500" /></div>
      <h1 className="mt-6 text-3xl font-bold text-slate-950">Guide not found</h1>
      <p className="mt-3 text-slate-600">This GEO guide does not exist or the URL has changed.</p>
      <a href="/blog" className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Browse all guides</a>
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
