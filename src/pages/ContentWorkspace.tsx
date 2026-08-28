import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, Images, Layers3, PanelsTopLeft, Star, Tags } from "lucide-react";
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
      note: fr ? "Titres & descriptions" : "Titles & descriptions",
      href: "/products/title-description?view=content",
      icon: FileText,
    },
    {
      title: fr ? "Landing pages" : "Landing pages",
      note: fr ? "Pages produit enrichies" : "Rich product pages",
      href: "/products/title-description?view=landing",
      icon: PanelsTopLeft,
    },
    {
      title: "Studio",
      note: fr ? "Images & Product Shot" : "Images & Product Shot",
      href: "/studio",
      icon: Images,
    },
    {
      title: fr ? "Actions groupées" : "Bulk actions",
      note: fr ? "Optimiser en lot" : "Optimize in bulk",
      href: "/products/title-description?view=bulk",
      icon: Layers3,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <WorkspacePageHeader
        section={fr ? "Contenu" : "Content"}
        page={fr ? "Vue d’ensemble" : "Overview"}
        count={products.length}
        title={fr ? "Contenu" : "Content"}
        description={fr ? "Choisissez une tâche." : "Choose a task."}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tools.map(({ title, note, href, icon: Icon }) => (
          <Link key={href} to={href} className="group block">
            <Card className="h-full rounded-xl border-slate-200 p-4 shadow-none transition hover:border-violet-300 hover:shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-50 text-violet-700">
                  <Icon className="h-4 w-4" />
                </span>
                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-violet-600" />
              </div>
              <h2 className="mt-5 text-sm font-semibold text-slate-950">{title}</h2>
              <p className="mt-1 text-xs text-slate-500">{note}</p>
            </Card>
          </Link>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <div className="flex items-center gap-2"><QualityStar tone="good" /><span className="font-medium text-slate-700">{quality.good}</span><span className="text-slate-400">{fr ? "prêts" : "ready"}</span></div>
          <div className="flex items-center gap-2"><QualityStar tone="medium" /><span className="font-medium text-slate-700">{quality.medium}</span><span className="text-slate-400">{fr ? "à améliorer" : "improve"}</span></div>
          <div className="flex items-center gap-2"><QualityStar tone="bad" /><span className="font-medium text-slate-700">{quality.bad}</span><span className="text-slate-400">{fr ? "incomplets" : "missing"}</span></div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/seo?tab=tags"><Tags className="mr-2 h-4 w-4" />Tags</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/seo?tab=alt"><Images className="mr-2 h-4 w-4" />ALT</Link></Button>
          </div>
        </div>
      </section>
    </div>
  );
}
