import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Camera, FileText, Layers3, Newspaper, PanelsTopLeft, Sparkles, Star, Tags, Images } from "lucide-react";
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

  const primaryTools = [
    {
      title: fr ? "Contenu produit" : "Product content",
      note: fr ? "Titres, descriptions, SEO" : "Titles, descriptions, SEO",
      href: "/products/title-description?view=content",
      icon: FileText,
    },
    {
      title: fr ? "Collections & pages" : "Collections & pages",
      note: "SEO",
      href: "/seo?tab=collections",
      icon: Layers3,
    },
    {
      title: "Blog",
      note: fr ? "Articles & campagnes" : "Articles & campaigns",
      href: "/blog/management",
      icon: Newspaper,
    },
    {
      title: "Studio",
      note: "Product Shot AI",
      href: "/studio",
      icon: Camera,
    },
  ];

  const quickTools = [
    { label: fr ? "Landing pages" : "Landing pages", href: "/products/title-description?view=landing", icon: PanelsTopLeft },
    { label: "Tags", href: "/seo?tab=tags", icon: Tags },
    { label: "ALT", href: "/seo?tab=alt", icon: Images },
    { label: fr ? "Actions groupées" : "Bulk actions", href: "/products/title-description?view=bulk", icon: Sparkles },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <WorkspacePageHeader
        section={fr ? "Contenu" : "Content"}
        page={fr ? "Vue d’ensemble" : "Overview"}
        count={products.length}
        title={fr ? "Contenu" : "Content"}
        description=""
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {primaryTools.map(({ title, note, href, icon: Icon }) => (
          <Link key={href} to={href} className="group block">
            <Card className="h-full rounded-xl border-slate-200 p-4 shadow-none transition hover:border-slate-300">
              <div className="flex items-center justify-between gap-4">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                  <Icon className="h-4 w-4" />
                </span>
                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-600" />
              </div>
              <h2 className="mt-4 text-sm font-semibold text-slate-950">{title}</h2>
              <p className="mt-1 text-xs text-slate-400">{note}</p>
            </Card>
          </Link>
        ))}
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
        {quickTools.map(({ label, href, icon: Icon }) => (
          <Button key={href} asChild variant="ghost" size="sm" className="h-8 text-xs">
            <Link to={href}><Icon className="mr-1.5 h-3.5 w-3.5" />{label}</Link>
          </Button>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-4 px-1 text-xs">
          <div className="flex items-center gap-1.5"><QualityStar tone="good" /><span className="font-medium text-slate-700">{quality.good}</span></div>
          <div className="flex items-center gap-1.5"><QualityStar tone="medium" /><span className="font-medium text-slate-700">{quality.medium}</span></div>
          <div className="flex items-center gap-1.5"><QualityStar tone="bad" /><span className="font-medium text-slate-700">{quality.bad}</span></div>
        </div>
      </section>
    </div>
  );
}
