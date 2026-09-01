from pathlib import Path
import re


def replace(path: str, old: str, new: str, expected: int = 1):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f"{path}: expected {expected} occurrences, found {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new, expected))


def regex_replace(path: str, pattern: str, replacement: str, expected: int = 1, flags=re.S):
    p = Path(path)
    text = p.read_text()
    updated, count = re.subn(pattern, replacement, text, flags=flags)
    if count != expected:
        raise RuntimeError(f"{path}: expected {expected} regex replacements, found {count}: {pattern[:120]!r}")
    p.write_text(updated)


# -----------------------------------------------------------------------------
# Product Optimization: canonical Shopify product HTML + editable brand/tags
# -----------------------------------------------------------------------------
ptd = "src/pages/ProductTitleDescription.tsx"
replace(
    ptd,
    '''// Check if product has rich HTML description or landing page
const hasRichHtmlDescription = (product: Product): boolean => {
  // Fast path: the persisted flag avoids loading duplicate heavy HTML fields just to render status.
  if (product.has_landing_page) return true;

  // Check landing_page first (AI-generated content)
  if (product.landing_page) {
    const hasHtmlTags =
      product.landing_page.includes("<div") ||
      product.landing_page.includes("<section") ||
      product.landing_page.includes("<h1") ||
      product.landing_page.includes("<article") ||
      product.landing_page.length > 500; // Long content is likely HTML
    if (hasHtmlTags) return true;
  }

  // Fallback to description
  if (product.description) {
    return (
      product.description.includes("<div") ||
      product.description.includes("<section") ||
      product.description.includes("<h1") ||
      product.description.includes("<article")
    );
  }

  return false;
};''',
    '''// Shopify product description HTML is the single canonical product-page content.
// Legacy landing fields are read only as a backwards-compatible fallback.
const getCanonicalProductHtml = (product: Product): string =>
  product.body_html || product.description || product.landing_page_html || product.landing_page || "";

const hasRichHtmlDescription = (product: Product): boolean => {
  const html = getCanonicalProductHtml(product);
  if (!html) return false;
  return (
    html.includes("<div") ||
    html.includes("<section") ||
    html.includes("<h1") ||
    html.includes("<article") ||
    html.length > 500
  );
};'''
)

replace(
    ptd,
    '"id, title, description, landing_page, has_landing_page, last_landing_generation_at, seo_title, seo_description, optimized_title, regenerated_title, optimized_description, image_url, shopify_id, vendor, handle, status, tags, product_type, category, sub_category, price, compare_at_price, cost_price, currency, inventory_quantity, store_id, collection_ids",',
    '"id, title, description, body_html, landing_page, landing_page_html, has_landing_page, last_landing_generation_at, seo_title, seo_description, optimized_title, regenerated_title, optimized_description, image_url, shopify_id, vendor, handle, status, tags, product_type, category, sub_category, price, compare_at_price, cost_price, currency, inventory_quantity, store_id, collection_ids",'
)

replace(
    ptd,
    '''        product.title,
        product.vendor,
        product.description,
        product.seo_title,''',
    '''        product.title,
        product.vendor,
        product.tags,
        getCanonicalProductHtml(product),
        product.seo_title,'''
)

replace(
    ptd,
    '''      const { productId, field } = editingField;
      
      // Préparer les données à sauvegarder selon le champ''',
    '''      const { productId, field } = editingField;
      const persistedValue = field === "tags"
        ? valueToSave.split(",").map((tag) => tag.trim()).filter(Boolean).join(", ")
        : valueToSave;
      
      // Préparer les données à sauvegarder selon le champ'''
)
replace(ptd, 'updateData.title = valueToSave;', 'updateData.title = persistedValue;')
replace(ptd, 'updateData.seo_title = valueToSave;', 'updateData.seo_title = persistedValue;')
replace(
    ptd,
    '''      } else if (field === "vendor") {
        updateData.vendor = valueToSave;
      } else if (field === "sku" && product.variants?.[0]) {''',
    '''      } else if (field === "vendor") {
        updateData.vendor = persistedValue;
      } else if (field === "tags") {
        updateData.tags = persistedValue;
      } else if (field === "sku" && product.variants?.[0]) {'''
)
replace(ptd, 'if (field === "title") syncData.title = valueToSave;', 'if (field === "title") syncData.title = persistedValue;')
replace(ptd, 'if (field === "vendor") syncData.vendor = valueToSave;', 'if (field === "vendor") syncData.vendor = persistedValue;')
replace(
    ptd,
    '''        if (field === "vendor") syncData.vendor = persistedValue;
        if (field === "sku" && variant?.shopify_variant_id) {''',
    '''        if (field === "vendor") syncData.vendor = persistedValue;
        if (field === "tags") syncData.syncTags = true;
        if (field === "sku" && variant?.shopify_variant_id) {'''
)
replace(
    ptd,
    '''          await supabase.functions.invoke("sync-seo-to-shopify", {
            body: {
              productId: productId,
              force: true, // Bypass throttle for inline edits
              ...syncData
            }
          });''',
    '''          const { data: syncResult, error: syncError } = await supabase.functions.invoke("sync-seo-to-shopify", {
            body: {
              productId: productId,
              force: true, // Bypass throttle for inline edits
              ...syncData
            }
          });
          if (syncError || syncResult?.error) {
            throw new Error(syncError?.message || syncResult?.error || "Shopify sync failed");
          }'''
)
replace(ptd, 'updated.title = valueToSave;', 'updated.title = persistedValue;')
replace(ptd, 'updated.seo_title = valueToSave;', 'updated.seo_title = persistedValue;')
replace(
    ptd,
    '''        if (field === "vendor") updated.vendor = valueToSave;
        if ((field === "sku" || field === "price" || field === "cost") && updated.variants?.[0]) {''',
    '''        if (field === "vendor") updated.vendor = persistedValue;
        if (field === "tags") updated.tags = persistedValue;
        if ((field === "sku" || field === "price" || field === "cost") && updated.variants?.[0]) {'''
)

# Table: explicit Brand/Tags labels and per-product AI title optimization.
replace(
    ptd,
    '''                            <p className="font-medium" data-no-translate>{product.seo_title || product.title}</p>
                            {product.vendor && (
                              <Badge variant="outline" className="font-normal text-xs" data-no-translate>
                                {product.vendor}
                              </Badge>
                            )}''',
    '''                            <div className="flex items-start gap-2">
                              <p className="min-w-0 flex-1 font-medium" data-no-translate>{product.seo_title || product.title}</p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 shrink-0 gap-1 px-2 text-violet-700"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (!canDoAction("optimizations")) {
                                    toast.error(t.contentOptimization.toasts.limitReached);
                                    setShowUpgradeDialog(true);
                                    return;
                                  }
                                  setSelectedProducts(new Set([product.id]));
                                  setShowConfigDialog(true);
                                }}
                                title={language === "fr" ? "Optimiser avec l’IA" : "Optimize with AI"}
                              >
                                <Wand2 className="h-3.5 w-3.5" />
                                <span className="hidden 2xl:inline">{language === "fr" ? "Optimiser avec l’IA" : "Optimize with AI"}</span>
                              </Button>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span className="font-medium">{language === "fr" ? "Marque" : "Brand"}</span>
                              <Badge variant="outline" className="font-normal text-[10px]" data-no-translate>
                                {product.vendor || (language === "fr" ? "Non renseignée" : "Not set")}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span className="font-medium">Tags</span>
                              {(product.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-[10px]" data-no-translate>{tag}</Badge>
                              ))}
                              {!product.tags && <span>—</span>}
                            </div>'''
)

# Grid: AI button next to title.
replace(ptd, '                         <div className="min-h-[3rem]">\n', '                         <div className="min-h-[3rem] flex items-start gap-2">\n                           <div className="min-w-0 flex-1">\n')
replace(
    ptd,
    '''                         </div>

                         {/* Vendor badge - editable */}''',
    '''                           </div>
                           <Button
                             type="button"
                             variant="ghost"
                             size="icon"
                             className="h-7 w-7 shrink-0 text-violet-700 hover:bg-violet-50"
                             title={language === "fr" ? "Optimiser avec l’IA" : "Optimize with AI"}
                             onClick={(event) => {
                               event.stopPropagation();
                               if (!canDoAction("optimizations")) {
                                 toast.error(t.contentOptimization.toasts.limitReached);
                                 setShowUpgradeDialog(true);
                                 return;
                               }
                               setSelectedProducts(new Set([product.id]));
                               setShowConfigDialog(true);
                             }}
                           >
                             <Wand2 className="h-4 w-4" />
                           </Button>
                         </div>

                         {/* Brand + Tags - editable and Shopify-syncable */}'''
)

regex_replace(
    ptd,
    r'''                         \{editingField\?\.productId === product\.id && editingField\?\.field === "vendor" \? \(.*?                         \)\}\n\n                         /\*\* SKU - editable \*/''',
    '''                         <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2">
                           <div className="flex items-center gap-2">
                             <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                               {language === "fr" ? "Marque" : "Brand"}
                             </span>
                             {editingField?.productId === product.id && editingField?.field === "vendor" ? (
                               <Input
                                 value={editingValue}
                                 onChange={(e) => setEditingValue(e.target.value)}
                                 className="h-7 flex-1 text-xs"
                                 autoFocus
                                 placeholder={language === "fr" ? "Marque" : "Brand"}
                                 onKeyDown={(e) => {
                                   if (e.key === "Enter") { e.preventDefault(); saveField(product); }
                                   if (e.key === "Escape") cancelEditing();
                                 }}
                                 onBlur={() => editingValue !== (product.vendor || "") ? saveField(product) : cancelEditing()}
                                 disabled={savingField}
                               />
                             ) : (
                               <button
                                 type="button"
                                 className="group flex min-w-0 flex-1 items-center gap-1.5 text-left"
                                 onClick={() => startEditing(product.id, "vendor", product.vendor || "")}
                               >
                                 <Badge variant="outline" className="max-w-full truncate text-[10px] font-normal" data-no-translate>
                                   {product.vendor || (language === "fr" ? "+ Ajouter" : "+ Add")}
                                 </Badge>
                                 <Edit2 className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" />
                               </button>
                             )}
                             {product.shopify_id && <span className="text-[9px] font-medium text-emerald-600">Shopify</span>}
                           </div>

                           <div className="flex items-start gap-2">
                             <span className="w-14 shrink-0 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tags</span>
                             {editingField?.productId === product.id && editingField?.field === "tags" ? (
                               <Input
                                 value={editingValue}
                                 onChange={(e) => setEditingValue(e.target.value)}
                                 className="h-7 flex-1 text-xs"
                                 autoFocus
                                 placeholder="tag 1, tag 2, tag 3"
                                 onKeyDown={(e) => {
                                   if (e.key === "Enter") { e.preventDefault(); saveField(product); }
                                   if (e.key === "Escape") cancelEditing();
                                 }}
                                 onBlur={() => editingValue !== (product.tags || "") ? saveField(product) : cancelEditing()}
                                 disabled={savingField}
                               />
                             ) : (
                               <button
                                 type="button"
                                 className="group flex min-w-0 flex-1 flex-wrap items-center gap-1 text-left"
                                 onClick={() => startEditing(product.id, "tags", product.tags || "")}
                               >
                                 {(product.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 4).map((tag) => (
                                   <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-[10px]" data-no-translate>{tag}</Badge>
                                 ))}
                                 {!product.tags && <span className="text-[10px] text-muted-foreground">{language === "fr" ? "+ Ajouter des tags" : "+ Add tags"}</span>}
                                 <Edit2 className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" />
                               </button>
                             )}
                           </div>
                         </div>

                         {/* SKU - editable */'''
)

# Bulk and smart-bulk must consider canonical content, not the legacy flag.
replace(ptd, ".filter(p => bulkLandingConfig.redoExisting || !p.has_landing_page)", ".filter(p => bulkLandingConfig.redoExisting || !hasRichHtmlDescription(p))", expected=2)
replace(ptd, "body_html: p.description || undefined", "body_html: getCanonicalProductHtml(p) || undefined")

# Single landing generation: options first, then explicit Generate; replace official HTML and sync it.
replace(ptd, "              autoGenerate={true}\n", "")
replace(
    ptd,
    '''              onGenerated={async (html) => {
                console.log("🎉 [Landing] Generated HTML:", html.substring(0, 100));

                // Mettre à jour le state products immédiatement pour afficher le badge
                setProducts(prev => prev.map(p => 
                  p.id === selectedLandingProduct.id 
                    ? { ...p, landing_page: html, has_landing_page: true }
                    : p
                ));

                // Mettre à jour directement le produit avec le HTML généré
                const updatedProduct = {
                  ...selectedLandingProduct,
                  landing_page: html,
                  has_landing_page: true,
                };

                // Fermer le dialog de génération et ouvrir le preview immédiatement
                setShowLandingDialog(false);
                setPreviewProduct(updatedProduct);
                setShowPreviewDialog(true);

                // Rafraîchir le tableau en arrière-plan
                console.log("🔄 [Landing] Refreshing products table...");
                fetchProducts();
              }}''',
    '''              onGenerated={async (html) => {
                console.log("🎉 [Product Page] Generated HTML:", html.substring(0, 100));
                const generatedAt = new Date().toISOString();
                const canonicalPatch = {
                  body_html: html,
                  description: html,
                  landing_page: html,
                  landing_page_html: html,
                  has_landing_page: true,
                  last_landing_generation_at: generatedAt,
                };

                const { error: saveError } = await supabase
                  .from("shopify_products")
                  .update(canonicalPatch as any)
                  .eq("id", selectedLandingProduct.id);
                if (saveError) {
                  toast.error(language === "fr" ? "La page générée n’a pas pu être enregistrée" : "Generated page could not be saved");
                  return;
                }

                let syncFailed = false;
                if (selectedLandingProduct.shopify_id) {
                  const { data: syncResult, error: syncError } = await supabase.functions.invoke("sync-seo-to-shopify", {
                    body: {
                      productId: selectedLandingProduct.id,
                      force: true,
                      syncBodyHtml: true,
                      bodyHtml: html,
                    },
                  });
                  syncFailed = Boolean(syncError || syncResult?.error);
                  if (syncFailed) {
                    toast.error(language === "fr" ? "Page enregistrée, mais la synchronisation Shopify a échoué" : "Page saved, but Shopify sync failed");
                  }
                }

                const updatedProduct: Product = { ...selectedLandingProduct, ...canonicalPatch };
                setProducts((prev) => prev.map((p) => p.id === selectedLandingProduct.id ? { ...p, ...canonicalPatch } : p));
                setShowLandingDialog(false);
                setPreviewProduct(updatedProduct);
                setShowPreviewDialog(true);
                if (!syncFailed) {
                  toast.success(language === "fr" ? "Page produit remplacée et synchronisée" : "Product page replaced and synced");
                }
              }}'''
)

replace(
    ptd,
    '''        productCount={filteredProducts.length}
        productImages={
          filteredProducts[0]?.id
            ? (galleryImages.get(filteredProducts[0].id) || []).map((img) => ({
                id: img.id,
                image_url: img.src,
                alt_text: img.alt_text || undefined,
              }))
            : []
        }
        mainImageUrl={filteredProducts[0]?.image_url}''',
    '''        productCount={selectedProducts.size || filteredProducts.length}
        productImages={(() => {
          const targetProduct = products.find((product) => selectedProducts.has(product.id)) || filteredProducts[0];
          return targetProduct?.id
            ? (galleryImages.get(targetProduct.id) || []).map((img) => ({
                id: img.id,
                image_url: img.src,
                alt_text: img.alt_text || undefined,
              }))
            : [];
        })()}
        mainImageUrl={(products.find((product) => selectedProducts.has(product.id)) || filteredProducts[0])?.image_url || undefined}'''
)
replace(ptd, 'currentLandingPage={previewProduct?.landing_page}', 'currentLandingPage={previewProduct ? getCanonicalProductHtml(previewProduct) || undefined : undefined}')
replace(ptd, '          body_html: p.description,', '          body_html: getCanonicalProductHtml(p),')
replace(ptd, '          tags: null, // Tags are fetched from database', '          tags: p.tags,')
replace(
    ptd,
    '''          if (options.syncBodyHtml && (product.landing_page_html || product.landing_page)) {
            body.syncBodyHtml = true;
            body.bodyHtml = product.landing_page_html || product.landing_page;
          }''',
    '''          if (options.syncBodyHtml && product.body_html) {
            body.syncBodyHtml = true;
            body.bodyHtml = product.body_html;
          }'''
)


# -----------------------------------------------------------------------------
# Product detail: one official Product page / Shopify description block
# -----------------------------------------------------------------------------
pd = "src/pages/ProductDetail.tsx"
replace(pd, 'import type { LandingConfig } from "@/components/seo/LandingConfigDialog";', 'import { LandingConfigDialog, type LandingConfig } from "@/components/seo/LandingConfigDialog";')
replace(
    pd,
    '''  const [showLandingGenerator, setShowLandingGenerator] = useState(false);
  const [showLandingPreview, setShowLandingPreview] = useState(false);''',
    '''  const [showLandingGenerator, setShowLandingGenerator] = useState(false);
  const [showLandingPreview, setShowLandingPreview] = useState(false);
  const [showLandingConfig, setShowLandingConfig] = useState(false);
  const [landingConfig, setLandingConfig] = useState<LandingConfig>(DEFAULT_LANDING_CONFIG);'''
)
replace(pd, 'setLandingHtml(row.landing_page_html || row.landing_page || "");', 'setLandingHtml(row.body_html || row.description || row.landing_page_html || row.landing_page || "");')
replace(pd, '  const contentHtml = product?.body_html || product?.description || "";\n', '')
replace(
    pd,
    '''  const hasLanding = Boolean(
    landingHtml.trim() || product?.has_landing_page || product?.landing_page || product?.landing_page_html,
  );''',
    '''  const hasLanding = Boolean(
    landingHtml.trim() || product?.body_html || product?.description || product?.landing_page_html || product?.landing_page,
  );'''
)
replace(
    pd,
    '''  const saveLandingHtml = async () => {
    if (!product) return;
    try {
      setSavingHtml(true);
      const hasHtml = Boolean(landingHtml.trim());
      const patch = {
        landing_page: landingHtml,
        landing_page_html: landingHtml,
        has_landing_page: hasHtml,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("shopify_products")
        .update(patch as any)
        .eq("id", product.id);
      if (error) throw error;
      setProduct((current) => current ? { ...current, ...patch } as Product : current);
      toast.success(fr ? "HTML de la landing page enregistré" : "Landing page HTML saved");
    } catch (error: any) {
      toast.error(error?.message || (fr ? "Enregistrement HTML impossible" : "Could not save HTML"));
    } finally {
      setSavingHtml(false);
    }
  };''',
    '''  const saveLandingHtml = async () => {
    if (!product) return;
    try {
      setSavingHtml(true);
      const hasHtml = Boolean(landingHtml.trim());
      const patch = {
        body_html: landingHtml,
        description: landingHtml,
        landing_page: landingHtml,
        landing_page_html: landingHtml,
        has_landing_page: hasHtml,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("shopify_products")
        .update(patch as any)
        .eq("id", product.id);
      if (error) throw error;

      if (product.shopify_id) {
        const { data: syncResult, error: syncError } = await supabase.functions.invoke("sync-seo-to-shopify", {
          body: { productId: product.id, force: true, syncBodyHtml: true, bodyHtml: landingHtml },
        });
        if (syncError || syncResult?.error) {
          throw new Error(syncError?.message || syncResult?.error || "Shopify sync failed");
        }
      }

      setProduct((current) => current ? { ...current, ...patch } as Product : current);
      toast.success(fr ? "Page produit enregistrée et synchronisée avec Shopify" : "Product page saved and synced with Shopify");
    } catch (error: any) {
      toast.error(error?.message || (fr ? "Enregistrement / synchronisation impossible" : "Could not save / sync product page"));
    } finally {
      setSavingHtml(false);
    }
  };'''
)
replace(
    pd,
    '''  const handleLandingGenerated = async (html: string) => {
    if (!product) return;
    const generatedAt = new Date().toISOString();
    const patch = {
      landing_page: html,
      landing_page_html: html,
      has_landing_page: true,
      last_landing_generation_at: generatedAt,
      updated_at: generatedAt,
    };

    setLandingHtml(html);
    setLandingMode("preview");
    setProduct((current) => current ? { ...current, ...patch } as Product : current);

    try {
      const { error } = await supabase
        .from("shopify_products")
        .update(patch as any)
        .eq("id", product.id);
      if (error) throw error;
    } catch (error) {
      console.warn("Landing generated but product metadata could not be refreshed:", error);
    }
  };''',
    '''  const handleLandingGenerated = async (html: string) => {
    if (!product) return;
    const generatedAt = new Date().toISOString();
    const patch = {
      body_html: html,
      description: html,
      landing_page: html,
      landing_page_html: html,
      has_landing_page: true,
      last_landing_generation_at: generatedAt,
      updated_at: generatedAt,
    };

    setLandingHtml(html);
    setLandingMode("preview");

    try {
      const { error } = await supabase
        .from("shopify_products")
        .update(patch as any)
        .eq("id", product.id);
      if (error) throw error;

      if (product.shopify_id) {
        const { data: syncResult, error: syncError } = await supabase.functions.invoke("sync-seo-to-shopify", {
          body: { productId: product.id, force: true, syncBodyHtml: true, bodyHtml: html },
        });
        if (syncError || syncResult?.error) {
          throw new Error(syncError?.message || syncResult?.error || "Shopify sync failed");
        }
      }
      setProduct((current) => current ? { ...current, ...patch } as Product : current);
      toast.success(fr ? "La nouvelle page produit remplace l’ancienne et est synchronisée" : "The new product page replaced the old one and is synced");
    } catch (error: any) {
      toast.error(error?.message || (fr ? "La page a été générée mais la sauvegarde / synchro a échoué" : "Page generated but save / sync failed"));
    }
  };'''
)

# Remove the duplicate read-only product-content card and let the official block be the only content surface.
replace(pd, '      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">', '      <div className="grid gap-4">')
regex_replace(
    pd,
    r'''\n        <Card className="rounded-2xl border-slate-200 shadow-none">\n          <CardContent className="p-5">\n            <div className="mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-sky-600" /><div><h2 className="font-semibold text-slate-950">\{fr \? "Contenu produit" : "Product content"\}</h2><p className="text-xs text-slate-500">\{fr \? "Description actuellement enregistrée dans le catalogue\." : "Current catalog description\."\}</p></div></div>\n            \{contentHtml \? <div className="prose prose-sm max-h-\[370px\] max-w-none overflow-auto rounded-xl border border-slate-200 bg-slate-50/50 p-4" dangerouslySetInnerHTML=\{\{ __html: contentHtml \}\} /> : <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">\{fr \? "Aucune description" : "No description"\}</div>\}\n          </CardContent>\n        </Card>''',
    ''
)

replace(pd, '<div><h2 className="font-semibold text-slate-950">Landing Page</h2><p className="mt-0.5 text-xs text-slate-500">{fr ? "Prévisualisez ou modifiez le HTML généré pour ce produit." : "Preview or edit the generated HTML for this product."}</p></div>', '<div><h2 className="font-semibold text-slate-950">{fr ? "Page produit / Description Shopify" : "Product page / Shopify description"}</h2><p className="mt-0.5 text-xs text-slate-500">{fr ? "Contenu HTML officiel de la fiche Shopify. Toute génération remplace ce bloc, sans en créer un second." : "Official Shopify product HTML. New generations replace this block instead of creating another one."}</p></div>')
replace(pd, 'onClick={() => setShowLandingGenerator(true)}', 'onClick={() => setShowLandingConfig(true)}', expected=3)
replace(pd, 'setShowLandingGenerator(true);', 'setShowLandingConfig(true);', expected=1)
replace(pd, '"Générez-la directement depuis ce produit. Le popup démarre la génération automatiquement."', '"Choisissez d’abord les options, puis lancez explicitement la génération."')
replace(pd, '"Generate it directly from this product. The popup starts generation automatically."', '"Choose the options first, then explicitly start generation."')
replace(pd, 'placeholder={fr ? "Le HTML de la landing page apparaîtra ici…" : "Landing page HTML will appear here…"}', 'placeholder={fr ? "Le HTML officiel de la page produit apparaîtra ici…" : "Official product-page HTML will appear here…"}')

# Add the options popup before the actual generator.
replace(
    pd,
    '''      <Dialog open={showLandingGenerator} onOpenChange={setShowLandingGenerator}>''',
    '''      <LandingConfigDialog
        open={showLandingConfig}
        onOpenChange={setShowLandingConfig}
        productTitle={product.title}
        onConfirm={(config) => {
          setLandingConfig(config);
          setShowLandingConfig(false);
          setShowLandingGenerator(true);
        }}
      />

      <Dialog open={showLandingGenerator} onOpenChange={setShowLandingGenerator}>'''
)
replace(pd, '              config={DEFAULT_LANDING_CONFIG}\n              autoGenerate\n', '              config={landingConfig}\n')
replace(pd, '                description: product.description || undefined,', '                description: landingHtml || product.body_html || product.description || undefined,')
replace(pd, 'currentLandingPage={landingHtml || product.landing_page || product.landing_page_html || undefined}', 'currentLandingPage={landingHtml || product.body_html || product.description || product.landing_page_html || product.landing_page || undefined}')


# -----------------------------------------------------------------------------
# Full product-page view: render canonical official HTML
# -----------------------------------------------------------------------------
pl = "src/pages/ProductLanding.tsx"
replace(
    pl,
    '''  const currentVariant = selectedVariant || product;''',
    '''  const officialProductHtml = product.body_html || product.description || product.landing_page_html || product.landing_page || "";
  const currentVariant = selectedVariant || product;'''
)
replace(pl, '{(product.description || product.ai_vision_analysis) && (', '{(officialProductHtml || product.ai_vision_analysis) && (')
replace(pl, '{product.description && (', '{officialProductHtml && (')
replace(pl, 'dangerouslySetInnerHTML={{ __html: product.description }}', 'dangerouslySetInnerHTML={{ __html: officialProductHtml }}')


# -----------------------------------------------------------------------------
# Landing generator: load canonical HTML first; no silent failed-generation replace
# -----------------------------------------------------------------------------
rl = "src/components/seo/RegenerateLanding.tsx"
replace(rl, '  const [titleNeedsSync, setTitleNeedsSync] = useState(false);', '  const [titleNeedsSync, setTitleNeedsSync] = useState(false);\n  const [shopifyLinked, setShopifyLinked] = useState(false);')
replace(
    rl,
    '''          .select("landing_page")''',
    '''          .select("body_html, description, landing_page_html, landing_page, shopify_id")'''
)
replace(
    rl,
    '''        if (data?.landing_page && isMounted) {
          setHtmlContent(data.landing_page);
        }''',
    '''        if (isMounted) {
          setHtmlContent(data?.body_html || data?.description || data?.landing_page_html || data?.landing_page || "");
          setShopifyLinked(Boolean(data?.shopify_id));
        }'''
)
replace(
    rl,
    '''        await supabase
          .from("shopify_products")
          .update({ vendor: resolvedVendor })
          .eq("id", product.id);
        console.log("[Landing] Vendor updated in database:", resolvedVendor);
        toast.success(`Marque "${resolvedVendor}" créée et sauvegardée`);''',
    '''        const { error: vendorSaveError } = await supabase
          .from("shopify_products")
          .update({ vendor: resolvedVendor })
          .eq("id", product.id);
        if (vendorSaveError) throw vendorSaveError;

        if (shopifyLinked) {
          const { data: vendorSyncResult, error: vendorSyncError } = await supabase.functions.invoke("sync-seo-to-shopify", {
            body: { productId: product.id, force: true, vendor: resolvedVendor },
          });
          if (vendorSyncError || vendorSyncResult?.error) {
            throw new Error(vendorSyncError?.message || vendorSyncResult?.error || "Shopify vendor sync failed");
          }
        }
        console.log("[Landing] Vendor updated and synced:", resolvedVendor);
        toast.success(`Marque "${resolvedVendor}" créée et sauvegardée`);'''
)
replace(rl, '      onGenerated?.(fallbackHtml);\n', '')
replace(rl, '<p className="font-medium text-sm">Landing page existante</p>', '<p className="font-medium text-sm">Page produit existante</p>')


# -----------------------------------------------------------------------------
# Shopify sync edge function: canonical HTML + reliable brand/tag failures
# -----------------------------------------------------------------------------
edge = "supabase/functions/sync-seo-to-shopify/index.ts"
replace(
    edge,
    '.select("shopify_id, title, regenerated_title, optimized_title, seo_title, seo_description, tags, category, sub_category, vendor, store_id, seller_id, last_seo_sync_at, last_synced_data, landing_page, landing_page_html")',
    '.select("shopify_id, title, regenerated_title, optimized_title, seo_title, seo_description, tags, category, sub_category, vendor, store_id, seller_id, last_seo_sync_at, last_synced_data, body_html, description, landing_page, landing_page_html")'
)
replace(edge, 'const contentToSync = bodyHtml || product.landing_page_html || product.landing_page;', 'const contentToSync = bodyHtml || product.body_html || product.description || product.landing_page_html || product.landing_page;')
replace(
    edge,
    '''          } catch (bodyError: any) {
            console.error("[SYNC-SEO] ❌ Body HTML update failed:", bodyError.message);
          }''',
    '''          } catch (bodyError: any) {
            console.error("[SYNC-SEO] ❌ Body HTML update failed:", bodyError.message);
            throw new Error(`Failed to update Shopify product description: ${bodyError.message}`);
          }'''
)
replace(
    edge,
    '''        } catch (fieldError: any) {
          console.error("[SYNC-SEO] ❌ Product fields update failed:", fieldError.message);
        }''',
    '''        } catch (fieldError: any) {
          console.error("[SYNC-SEO] ❌ Product fields update failed:", fieldError.message);
          throw new Error(`Failed to update Shopify product fields: ${fieldError.message}`);
        }'''
)
replace(
    edge,
    '''      if (syncTags && product.tags) {
        // Ensure tags is a string (it should already be from the database)
        updateData.product.tags = typeof product.tags === 'string' ? product.tags : '';
      }''',
    '''      if (syncTags) {
        // Empty string is intentional: it clears all Shopify tags when the user removes them.
        updateData.product.tags = typeof product.tags === 'string' ? product.tags : '';
      }'''
)
replace(edge, 'if (updateData.product.tags || updateData.product.product_type || updateData.product.metafields) {', 'if (syncTags || updateData.product.product_type || updateData.product.metafields) {')
replace(
    edge,
    '''        if (syncTags && product.tags) {
          // Convert comma-separated tags to array for GraphQL
          const tagsArray = typeof product.tags === 'string' 
            ? product.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
            : [];
          tagsInput.tags = tagsArray;
        }''',
    '''        if (syncTags) {
          // Convert comma-separated tags to array for GraphQL. [] clears Shopify tags.
          const tagsArray = typeof product.tags === 'string'
            ? product.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
            : [];
          tagsInput.tags = tagsArray;
        }'''
)
replace(
    edge,
    '''        } catch (tagsError: any) {
          console.error("[SYNC-SEO] ⚠️ Failed to update tags via GraphQL:", tagsError.message);
          // Non-blocking - continue with sync
        }''',
    '''        } catch (tagsError: any) {
          console.error("[SYNC-SEO] ❌ Failed to update tags via GraphQL:", tagsError.message);
          if (syncTags) throw new Error(`Failed to update Shopify tags: ${tagsError.message}`);
        }'''
)


# -----------------------------------------------------------------------------
# Bulk landing flows: persist/sync the same canonical Shopify product HTML
# -----------------------------------------------------------------------------
bulk = "src/components/seo/BulkLandingProgressDialog.tsx"
replace(
    bulk,
    '''        // Update status to success
        setPreviews(prev => prev.map(p => ''',
    '''        const generatedAt = new Date().toISOString();
        const { error: persistError } = await supabase
          .from("shopify_products")
          .update({
            body_html: result.html,
            description: result.html,
            landing_page: result.html,
            landing_page_html: result.html,
            has_landing_page: true,
            last_landing_generation_at: generatedAt,
          } as any)
          .eq("id", product.id);
        if (persistError) throw persistError;

        // Update status to success
        setPreviews(prev => prev.map(p => '''
)
replace(
    bulk,
    '''              productId: preview.productId, // ✅ Singular productId, not array
              force: true,''',
    '''              productId: preview.productId, // ✅ Singular productId, not array
              force: true,
              syncBodyHtml: true,
              bodyHtml: preview.landingHtml,'''
)

smart = "src/components/seo/SmartBulkLandingDialog.tsx"
replace(smart, 'if (config.regenerateTitle === false && product.has_landing_page) {', 'if (config.regenerateTitle === false && product.body_html) {')
replace(
    smart,
    '''        .update({
          landing_page_html: data.html,
          has_landing_page: true,
          last_landing_generation_at: new Date().toISOString(),
        })''',
    '''        .update({
          body_html: data.html,
          description: data.html,
          landing_page: data.html,
          landing_page_html: data.html,
          has_landing_page: true,
          last_landing_generation_at: new Date().toISOString(),
        } as any)'''
)
replace(
    smart,
    '''      if (saveError) throw saveError;

      // Update status to success''',
    '''      if (saveError) throw saveError;

      if (product.shopify_id) {
        const { data: syncResult, error: syncError } = await supabase.functions.invoke("sync-seo-to-shopify", {
          body: { productId: product.id, force: true, syncBodyHtml: true, bodyHtml: data.html },
        });
        if (syncError || syncResult?.error) {
          throw new Error(syncError?.message || syncResult?.error || "Shopify body HTML sync failed");
        }
      }

      // Update status to success'''
)

print("Product Shopify/canonical HTML patch applied successfully")
