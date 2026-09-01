from pathlib import Path

products_path = Path('src/pages/Products.tsx')
text = products_path.read_text()

text = text.replace(
    'import { Input } from "@/components/ui/input";\n',
    'import { Input } from "@/components/ui/input";\nimport { Switch } from "@/components/ui/switch";\n',
    1,
)

text = text.replace(
    '  inventory_quantity: number;\n  created_at: string;\n',
    '  inventory_quantity: number;\n  inventory_managed?: boolean;\n  handle?: string | null;\n  sku?: string | null;\n  created_at: string;\n',
    1,
)

anchor = '''  const loadProducts = async () => {\n'''
helper = '''  const updateProductInline = async (productId: string, patch: Partial<Product>) => {\n    try {\n      const { error } = await supabase\n        .from("shopify_products")\n        .update({ ...patch, updated_at: new Date().toISOString() } as any)\n        .eq("id", productId);\n\n      if (error) throw error;\n\n      setProducts((current) => current.map((item) => item.id === productId ? { ...item, ...patch } : item));\n    } catch (error: any) {\n      console.error("Error updating product inline:", error);\n      toast.error(error?.message || (language === "fr" ? "Mise à jour impossible" : "Could not update product"));\n    }\n  };\n\n'''
if helper not in text:
    text = text.replace(anchor, helper + anchor, 1)

# use translation language directly from existing hook result
text = text.replace('  const { t, tf } = useTranslation();\n', '  const { t, tf, language } = useTranslation();\n', 1)

old_header = 'grid-cols-[56px_minmax(0,1fr)_110px_120px_110px_32px]'
new_header = 'grid-cols-[56px_minmax(0,1fr)_135px_155px_210px_32px]'
text = text.replace(old_header, new_header)

text = text.replace(
    'onClick={() => navigate(`/product-landing/${product.id}`)}',
    'onClick={() => navigate(`/products/${product.id}`)}',
)

old_block = '''                        <Badge variant="outline" className={product.status === "active" ? "hidden w-fit border-emerald-200 bg-emerald-50 text-emerald-700 md:inline-flex" : "hidden w-fit md:inline-flex"}>{product.status === "active" ? t.common.active : t.common.draft}</Badge>\n                        <div className="hidden text-sm font-medium text-slate-900 md:block">\n                          {product.price?.toFixed(2) || "0.00"} {product.currency}\n                          {product.compare_at_price && product.compare_at_price > (product.price || 0) && <span className="ml-1 block text-xs font-normal text-slate-400 line-through">{product.compare_at_price.toFixed(2)} {product.currency}</span>}\n                        </div>\n                        <span className={`hidden text-sm md:block ${product.inventory_quantity > 0 ? "text-slate-700" : "text-red-700"}`}>{formatNumber(product.inventory_quantity)}</span>\n                        <span className="hidden text-slate-400 md:block">›</span>'''

new_block = '''                        <div className="hidden md:block" onClick={(event) => event.stopPropagation()}>\n                          <div className="flex items-center gap-2">\n                            <Switch\n                              checked={product.status === "active"}\n                              onCheckedChange={(checked) => void updateProductInline(product.id, { status: checked ? "active" : "draft" })}\n                              aria-label={language === "fr" ? "Statut produit" : "Product status"}\n                            />\n                            <span className={`text-xs font-medium ${product.status === "active" ? "text-emerald-700" : "text-slate-500"}`}>\n                              {product.status === "active" ? (language === "fr" ? "Actif" : "Active") : (language === "fr" ? "Inactif" : "Inactive")}\n                            </span>\n                          </div>\n                        </div>\n                        <div className="hidden md:block" onClick={(event) => event.stopPropagation()}>\n                          <div className="flex items-center gap-2">\n                            <Input\n                              key={`${product.id}-price-${product.price}`}\n                              type="number"\n                              min="0"\n                              step="0.01"\n                              defaultValue={product.price ?? 0}\n                              className="h-8 w-24 rounded-lg px-2 text-sm font-medium"\n                              onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}\n                              onBlur={(event) => {\n                                const next = Number(event.currentTarget.value);\n                                if (Number.isFinite(next) && next >= 0 && next !== Number(product.price ?? 0)) {\n                                  void updateProductInline(product.id, { price: next });\n                                }\n                              }}\n                            />\n                            <span className="text-xs font-medium text-slate-500">{product.currency}</span>\n                          </div>\n                          {product.compare_at_price && product.compare_at_price > (product.price || 0) && <span className="mt-1 block text-xs font-normal text-slate-400 line-through">{product.compare_at_price.toFixed(2)} {product.currency}</span>}\n                        </div>\n                        <div className="hidden md:block" onClick={(event) => event.stopPropagation()}>\n                          <div className="flex items-center gap-2">\n                            <Switch\n                              checked={product.inventory_managed !== false}\n                              onCheckedChange={(checked) => void updateProductInline(product.id, { inventory_managed: checked })}\n                              aria-label={language === "fr" ? "Gestion du stock" : "Inventory tracking"}\n                            />\n                            <span className="w-16 text-[11px] text-slate-500">{product.inventory_managed !== false ? (language === "fr" ? "Géré" : "Managed") : (language === "fr" ? "Non géré" : "Unmanaged")}</span>\n                            <Input\n                              key={`${product.id}-stock-${product.inventory_quantity}`}\n                              type="number"\n                              step="1"\n                              defaultValue={product.inventory_quantity ?? 0}\n                              disabled={product.inventory_managed === false}\n                              className="h-8 w-20 rounded-lg px-2 text-sm disabled:bg-slate-50"\n                              onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}\n                              onBlur={(event) => {\n                                const next = Number.parseInt(event.currentTarget.value || "0", 10);\n                                if (Number.isFinite(next) && next !== Number(product.inventory_quantity ?? 0)) {\n                                  void updateProductInline(product.id, { inventory_quantity: next });\n                                }\n                              }}\n                            />\n                          </div>\n                        </div>\n                        <span className="hidden text-slate-400 md:block">›</span>'''

if old_block not in text:
    raise SystemExit('Products editable block not found')
text = text.replace(old_block, new_block, 1)
products_path.write_text(text)

app_path = Path('src/App.tsx')
app = app_path.read_text()
route_anchor = '''            <Route\n              path="/content"\n'''
new_route = '''            <Route\n              path="/products/:id"\n              element={\n                <ProtectedLayout>\n                  <ProductDetail />\n                </ProtectedLayout>\n              }\n            />\n'''
if new_route not in app:
    app = app.replace(route_anchor, new_route + route_anchor, 1)
app_path.write_text(app)

print('Patched Products.tsx and App.tsx')
