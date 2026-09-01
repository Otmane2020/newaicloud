import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Camera, FileText, Images, Layers3, Newspaper, PanelsTopLeft, Sparkles, Star, Tags } from "lucide-react";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";

function QualityStar({ tone }: { tone: "good" | "medium" | "bad" }) {
  const className = tone === "good"
    ? "fill-emerald-500 text-emerald-500"
    : tone === "medium"
      ? "fill-orange-500 text-orange-500"
      : "fill-red-500 text-red-500";
  return <Star className={`h-4 w-4 ${className}`} />;
}

export default function ContentWorkspace() {
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const fr = language === "fr";

  const { data: products = [] } = useQuery({
    queryKey: ["content-workspace-status", selectedStore?.id],
    enabled: !!selectedStore?.id,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedStore?.id) return [];
      const { data, error } = await supabase
        .from("shopify_products")
        .select("id, seo_title, seo_description, landing_page, body_html, image_url")
        .eq("seller_id", user.id)
        .eq("store_id", selectedStore.id);
      if (error) throw error;
      return data || [];
    },
  });

  const quality = products.reduce(
    (acc, product: any) => {
      const hasTitle = Boolean(product.seo_title);
      const hasDescription = Boolean(product.seo_description);
      const hasRichContent = Boolean(product.landing_page) || (product.body_html?.length || 0) > 300;
      const score = Number(hasTitle) + Number(hasDescription) + Number(hasRichContent);
      if (score >= 3) acc.good += 1;
      else if (score >= 1) acc.medium += 1;
      else acc.bad += 1;
      return acc;
    },
    { good: 0, medium: 0, bad: 0 },
  );

  const tools = [
    {
      title: fr ? "Contenu produit" : "Product content",
      note: fr ? "Titres, descriptions, SEO" : "Titles, descriptions, SEO",
      href: "/products/title-description?view=content",
      icon: FileText,
      card: "border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-white hover:border-violet-300 hover:shadow-violet-100/70",
      iconStyle: "border-violet-200 bg-violet-100/80 text-violet-700",
      arrow: "group-hover:text-violet-600",
    },
    {
      title: fr ? "Collections & pages" : "Collections & pages",
      note: fr ? "SEO des collections et pages" : "Collection and page SEO",
      href: "/seo?tab=collections",
      icon: Layers3,
      card: "border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-white to-white hover:border-sky-300 hover:shadow-sky-100/70",
      iconStyle: "border-sky-200 bg-sky-100/80 text-sky-700",
      arrow: "group-hover:text-sky-600",
    },
    {
      title: "Blog",
      note: fr ? "Articles & campagnes" : "Articles & campaigns",
      href: "/blog/management",
      icon: Newspaper,
      card: "border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-white hover:border-emerald-300 hover:shadow-emerald-100/70",
      iconStyle: "border-emerald-200 bg-emerald-100/80 text-emerald-700",
      arrow: "group-hover:text-emerald-600",
    },
    {
      title: "Studio",
      note: "Product Shot AI",
      href: "/studio",
      icon: Camera,
      card: "border-fuchsia-200/80 bg-gradient-to-br from-fuchsia-50/80 via-white to-white hover:border-fuchsia-300 hover:shadow-fuchsia-100/70",
      iconStyle: "border-fuchsia-200 bg-fuchsia-100/80 text-fuchsia-700",
      arrow: "group-hover:text-fuchsia-600",
    },
    {
      title: fr ? "ALT images" : "Image ALT",
      note: fr ? "Textes ALT pour toutes les images" : "ALT text for catalog images",
      href: "/seo?tab=alt",
      icon: Images,
      card: "border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-white hover:border-amber-300 hover:shadow-amber-100/70",
      iconStyle: "border-amber-200 bg-amber-100/80 text-amber-700",
      arrow: "group-hover:text-amber-600",
    },
    {
      title: "Tags",
      note: fr ? "Tags Shopify cohérents" : "Consistent Shopify tags",
      href: "/seo?tab=tags",
      icon: Tags,
      card: "border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 via-white to-white hover:border-indigo-300 hover:shadow-indigo-100/70",
      iconStyle: "border-indigo-200 bg-indigo-100/80 text-indigo-700",
      arrow: "group-hover:text-indigo-600",
    },
  ];

  const quickTools = [
    { label: fr ? "Landing pages" : "Landing pages", href: "/products/title-description?view=landing", icon: PanelsTopLeft },
    { label: fr ? "Actions groupées" : "Bulk actions", href: "/products/title-description?view=bulk", icon: Sparkles },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <div className="rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-50/60 via-white to-sky-50/50 p-1">
        <WorkspacePageHeader
          section={fr ? "Contenu" : "Content"}
          page={fr ? "Vue d’ensemble" : "Overview"}
          count={products.length}
          title={fr ? "Contenu" : "Content"}
          description={fr ? "Tous les outils de contenu et métadonnées au même endroit." : "All content and metadata tools in one place."}
        />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map(({ title, note, href, icon: Icon, card, iconStyle, arrow }) => (
          <Link key={href} to={href} className="group block">
            <Card className={`h-full rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${card}`}>
              <div className="flex items-center justify-between gap-4">
                <span className={`grid h-11 w-11 place-items-center rounded-xl border shadow-sm ${iconStyle}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="grid h-8 w-8 place-items-center rounded-full border border-slate-200/80 bg-white/90 shadow-sm transition group-hover:border-current">
                  <ArrowRight className={`h-4 w-4 text-slate-300 transition ${arrow}`} />
                </span>
              </div>
              <h2 className="mt-5 text-[15px] font-semibold tracking-tight text-slate-950">{title}</h2>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">{note}</p>
            </Card>
          </Link>
        ))}
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50/80 via-white to-violet-50/40 p-3 shadow-sm">
        {quickTools.map(({ label, href, icon: Icon }) => (
          <Button key={href} asChild variant="outline" size="sm" className="h-9 rounded-xl border-slate-200 bg-white px-3 text-xs shadow-sm hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700">
            <Link to={href}><Icon className="mr-1.5 h-3.5 w-3.5" />{label}</Link>
          </Button>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1.5"><QualityStar tone="good" /><span className="font-semibold text-emerald-800">{quality.good}</span></div>
          <div className="flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1.5"><QualityStar tone="medium" /><span className="font-semibold text-orange-800">{quality.medium}</span></div>
          <div className="flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-2.5 py-1.5"><QualityStar tone="bad" /><span className="font-semibold text-red-700">{quality.bad}</span></div>
        </div>
      </section>
    </div>
  );
}