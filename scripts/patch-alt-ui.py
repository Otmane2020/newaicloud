from pathlib import Path

p = Path('src/components/seo/MinimalMetadataWorkspaces.tsx')
s = p.read_text()

# Explicit bulk CTA label in all multi-record SEO tabs.
s = s.replace('>{fr ? "Tout optimiser" : "Optimize All"}</Button>', '>Optimize All</Button>')

alt_type = 'type AltItem = { id: string; src: string; alt_text: string | null; optimization_count: number | null; last_synced_at: string | null; imageType: "product" | "collection" | "page" | "article" | "homepage" | "content"; title: string; subtitle: string };'
helper = '''type AltItem = { id: string; src: string; alt_text: string | null; optimization_count: number | null; last_synced_at: string | null; imageType: "product" | "collection" | "page" | "article" | "homepage" | "content"; title: string; subtitle: string };

function buildClientFallbackAlt(item: AltItem, fr: boolean) {
  const clean = (value = "") => value.replace(/<[^>]*>/g, " ").replace(/\\s+/g, " ").trim();
  const title = clean(item.title);
  const subtitle = clean(item.subtitle);
  const rawFile = decodeURIComponent((item.src || "").split("/").pop()?.split("?")[0] || "")
    .replace(/\\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\\b(chatgpt|image|img|photo)\\b/gi, "")
    .replace(/\\s+/g, " ")
    .trim();
  const genericTitle = /^(content|homepage|page d'accueil|home page)$/i.test(title);
  const subject = (!genericTitle && title) || rawFile || subtitle || (fr ? "Contenu de la boutique" : "Store content");
  const suffix = item.imageType === "homepage"
    ? (fr ? "visuel de la page d’accueil" : "homepage visual")
    : (subtitle && subtitle.toLowerCase() !== subject.toLowerCase() ? subtitle : "");
  return `${subject}${suffix ? ` - ${suffix}` : ""}`.replace(/\\s+/g, " ").trim().slice(0, 125);
}'''
if alt_type in s and 'function buildClientFallbackAlt' not in s:
    s = s.replace(alt_type, helper, 1)

old = '''  const generate = async (targets: AltItem[]) => { if (!targets.length) return; try { setBusy(true); const failures: string[] = []; const result = await runInBatches(targets, async (item) => { const { data, error } = await supabase.functions.invoke("smart-alt-text", { body: { image_id: item.id, imageType: item.imageType, force: true } }); if (error || data?.success === false) { failures.push(data?.error || error?.message || item.title); return false; } return true; }, 3); if (result.success) toast.success(fr ? `${result.success} ALT généré(s)` : `${result.success} ALT text(s) generated`); if (result.failed) toast.error(fr ? `${result.failed} ALT en échec${failures[0] ? ` : ${failures[0]}` : ""}` : `${result.failed} ALT failed${failures[0] ? `: ${failures[0]}` : ""}`); setSelected(new Set()); await load(); } finally { setBusy(false); } };'''
new = '''  const generate = async (targets: AltItem[]) => {
    if (!targets.length) return;
    try {
      setBusy(true);
      const failures: string[] = [];
      let fallbackCount = 0;
      const result = await runInBatches(targets, async (item) => {
        const { data, error } = await supabase.functions.invoke("smart-alt-text", {
          body: { image_id: item.id, imageType: item.imageType, force: true },
        });
        if (!error && data?.success !== false) return true;

        const fallbackAlt = buildClientFallbackAlt(item, fr);
        const updatePayload = {
          alt_text: fallbackAlt,
          optimization_count: (item.optimization_count || 0) + 1,
          last_optimization_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_ai_generated: false,
        };
        const fallbackResult = item.imageType === "product"
          ? await supabase.from("product_images").update(updatePayload).eq("id", item.id)
          : await supabase.from("content_images").update(updatePayload).eq("id", item.id);

        if (fallbackResult.error) {
          failures.push(data?.error || error?.message || fallbackResult.error.message || item.title);
          return false;
        }

        fallbackCount += 1;
        await supabase.functions.invoke("sync-seo-to-shopify", {
          body: { imageId: item.id, imageType: item.imageType, syncAltText: true, force: true },
        }).catch(() => undefined);
        return true;
      }, 3);

      if (result.success) toast.success(fr ? `${result.success} ALT généré(s)` : `${result.success} ALT text(s) generated`);
      if (fallbackCount) toast.info(fr ? `${fallbackCount} ALT sauvegardé(s) via le mode de secours` : `${fallbackCount} ALT saved with fallback mode`);
      if (result.failed) toast.error(fr ? `${result.failed} ALT en échec${failures[0] ? ` : ${failures[0]}` : ""}` : `${result.failed} ALT failed${failures[0] ? `: ${failures[0]}` : ""}`);
      setSelected(new Set());
      await load();
    } finally { setBusy(false); }
  };'''
if old not in s:
    raise SystemExit('ALT generate handler pattern not found')
s = s.replace(old, new, 1)
p.write_text(s)

hp = Path('src/components/seo/HomePageSeo.tsx')
h = hp.read_text()
h = h.replace('{t.seo.homepage.actions.generateAI}', 'Optimize Homepage')
h = h.replace('{generating ? t.seo.homepage.actions.generating : t.seo.homepage.actions.generateAI}', '{generating ? t.seo.homepage.actions.generating : "Optimize Homepage"}')
hp.write_text(h)
