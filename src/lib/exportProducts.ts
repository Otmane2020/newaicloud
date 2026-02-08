import * as XLSX from 'xlsx';

interface ExportableProduct {
  title?: string | null;
  seo_title?: string | null;
  optimized_title?: string | null;
  regenerated_title?: string | null;
  seo_description?: string | null;
  description?: string | null;
  body_html?: string | null;
  optimized_description?: string | null;
  vendor?: string | null;
  product_type?: string | null;
  handle?: string | null;
  status?: string | null;
  tags?: string | null;
  price?: number | null;
  compare_at_price?: number | null;
  cost_price?: number | null;
  currency?: string | null;
  inventory_quantity?: number | null;
  category?: string | null;
  sub_category?: string | null;
  ai_color?: string | null;
  ai_material?: string | null;
  ai_pattern?: string | null;
  ai_shape?: string | null;
  ai_texture?: string | null;
  ai_finish?: string | null;
  style?: string | null;
  room?: string | null;
  height?: number | null;
  height_unit?: string | null;
  width?: number | null;
  width_unit?: string | null;
  length?: number | null;
  length_unit?: string | null;
  ai_weight?: number | null;
  ai_weight_unit?: string | null;
  has_landing_page?: boolean | null;
  landing_page?: string | null;
  seo_synced_to_shopify?: boolean | null;
  shopify_id?: number | null;
  image_url?: string | null;
  variants?: Array<{
    price?: number | null;
    sku?: string | null;
    compare_at_price?: number | null;
    cost_price?: number | null;
    option1?: string | null;
    option2?: string | null;
    option3?: string | null;
    image_url?: string | null;
  }>;
}

interface ExportRow {
  [key: string]: string | number | null;
}

const COLUMN_HEADERS_FR = {
  title: "Titre original",
  seo_title: "Titre SEO",
  optimized_title: "Titre optimisé",
  regenerated_title: "Titre régénéré",
  seo_description: "Description SEO",
  description: "Description Shopify",
  optimized_description: "Description optimisée",
  vendor: "Vendeur",
  product_type: "Type produit",
  handle: "Handle",
  status: "Statut",
  tags: "Tags",
  sku: "SKU",
  price: "Prix",
  compare_at_price: "Prix barré",
  cost_price: "Coût",
  currency: "Devise",
  inventory_quantity: "Stock",
  category: "Catégorie",
  sub_category: "Sous-catégorie",
  style: "Style",
  room: "Pièce",
  ai_color: "Couleur IA",
  ai_material: "Matériau IA",
  ai_pattern: "Motif IA",
  ai_shape: "Forme IA",
  ai_texture: "Texture IA",
  ai_finish: "Finition IA",
  dimensions: "Dimensions (L×l×H)",
  weight: "Poids",
  variant_options: "Options variante",
  has_landing_page: "Contenu Premium",
  seo_synced_to_shopify: "Synchro Shopify",
  shopify_id: "Shopify ID",
  image_url: "URL image",
  variant_images: "Images variantes",
};

const COLUMN_HEADERS_EN = {
  title: "Original Title",
  seo_title: "SEO Title",
  optimized_title: "Optimized Title",
  regenerated_title: "Regenerated Title",
  seo_description: "SEO Description",
  description: "Shopify Description",
  optimized_description: "Optimized Description",
  vendor: "Vendor",
  product_type: "Product Type",
  handle: "Handle",
  status: "Status",
  tags: "Tags",
  sku: "SKU",
  price: "Price",
  compare_at_price: "Compare At Price",
  cost_price: "Cost Price",
  currency: "Currency",
  inventory_quantity: "Inventory",
  category: "Category",
  sub_category: "Sub-category",
  style: "Style",
  room: "Room",
  ai_color: "AI Color",
  ai_material: "AI Material",
  ai_pattern: "AI Pattern",
  ai_shape: "AI Shape",
  ai_texture: "AI Texture",
  ai_finish: "AI Finish",
  dimensions: "Dimensions (L×W×H)",
  weight: "Weight",
  variant_options: "Variant Options",
  has_landing_page: "Premium Content",
  seo_synced_to_shopify: "Shopify Sync",
  shopify_id: "Shopify ID",
  image_url: "Image URL",
  variant_images: "Variant Images",
};

function getHeaders(lang: string) {
  return lang === "fr" ? COLUMN_HEADERS_FR : COLUMN_HEADERS_EN;
}

function getBoolLabel(value: boolean | null | undefined, lang: string): string {
  if (value === true) return lang === "fr" ? "Oui" : "Yes";
  if (value === false) return lang === "fr" ? "Non" : "No";
  return "";
}

function formatDimensions(p: ExportableProduct): string {
  const parts: string[] = [];
  if (p.length != null) parts.push(`${p.length}${p.length_unit || "cm"}`);
  if (p.width != null) parts.push(`${p.width}${p.width_unit || "cm"}`);
  if (p.height != null) parts.push(`${p.height}${p.height_unit || "cm"}`);
  return parts.join(" × ") || "";
}

function formatWeight(p: ExportableProduct): string {
  if (p.ai_weight != null) return `${p.ai_weight} ${p.ai_weight_unit || "kg"}`;
  return "";
}

function getSkus(p: ExportableProduct): string {
  if (!p.variants || p.variants.length === 0) return "";
  const skus = p.variants.map(v => v.sku).filter(Boolean);
  return skus.join(", ");
}

function getVariantOptions(p: ExportableProduct): string {
  if (!p.variants || p.variants.length === 0) return "";
  return p.variants.map(v => {
    const opts = [v.option1, v.option2, v.option3].filter(Boolean);
    return opts.join(" / ");
  }).filter(Boolean).join(" | ");
}

function getVariantImages(p: ExportableProduct): string {
  if (!p.variants || p.variants.length === 0) return "";
  const urls = p.variants.map(v => v.image_url).filter(Boolean);
  return [...new Set(urls)].join(", ");
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function mapProductsToExportRows(products: ExportableProduct[], lang: string = "fr"): ExportRow[] {
  const headers = getHeaders(lang);

  return products.map((p) => {
    const price = p.variants?.[0]?.price ?? p.price ?? null;
    const compareAtPrice = p.variants?.[0]?.compare_at_price ?? p.compare_at_price ?? null;
    const costPrice = p.variants?.[0]?.cost_price ?? p.cost_price ?? null;

    return {
      [headers.title]: p.title || "",
      [headers.seo_title]: p.seo_title || "",
      [headers.optimized_title]: p.optimized_title || "",
      [headers.regenerated_title]: p.regenerated_title || "",
      [headers.seo_description]: p.seo_description || "",
      [headers.description]: stripHtml(p.description),
      [headers.optimized_description]: stripHtml(p.optimized_description),
      [headers.vendor]: p.vendor || "",
      [headers.product_type]: p.product_type || "",
      [headers.handle]: p.handle || "",
      [headers.status]: p.status || "",
      [headers.tags]: p.tags || "",
      [headers.sku]: getSkus(p),
      [headers.price]: price,
      [headers.compare_at_price]: compareAtPrice,
      [headers.cost_price]: costPrice,
      [headers.currency]: p.currency || "",
      [headers.inventory_quantity]: p.inventory_quantity ?? "",
      [headers.category]: p.category || "",
      [headers.sub_category]: p.sub_category || "",
      [headers.style]: p.style || "",
      [headers.room]: p.room || "",
      [headers.ai_color]: p.ai_color || "",
      [headers.ai_material]: p.ai_material || "",
      [headers.ai_pattern]: p.ai_pattern || "",
      [headers.ai_shape]: p.ai_shape || "",
      [headers.ai_texture]: p.ai_texture || "",
      [headers.ai_finish]: p.ai_finish || "",
      [headers.dimensions]: formatDimensions(p),
      [headers.weight]: formatWeight(p),
      [headers.variant_options]: getVariantOptions(p),
      [headers.has_landing_page]: getBoolLabel(p.has_landing_page, lang),
      [headers.seo_synced_to_shopify]: getBoolLabel(p.seo_synced_to_shopify, lang),
      [headers.shopify_id]: p.shopify_id || "",
      [headers.image_url]: p.image_url || "",
      [headers.variant_images]: getVariantImages(p),
    };
  });
}

function generateFilename(extension: string): string {
  const date = new Date().toISOString().split("T")[0];
  return `products-export-${date}.${extension}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportProductsToCSV(products: ExportableProduct[], lang: string = "fr", filename?: string) {
  const rows = mapProductsToExportRows(products, lang);
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '""';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");

  // BOM UTF-8 for Excel compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename || generateFilename("csv"));
}

export function exportProductsToExcel(products: ExportableProduct[], lang: string = "fr", filename?: string) {
  const rows = mapProductsToExportRows(products, lang);
  if (rows.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const headers = Object.keys(rows[0]);
  worksheet["!cols"] = headers.map((h) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => String(r[h] || "").length)
    );
    return { wch: Math.min(maxLen + 2, 60) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, filename || generateFilename("xlsx"));
}
