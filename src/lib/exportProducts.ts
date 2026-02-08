import * as XLSX from 'xlsx';

interface ExportableProduct {
  title?: string | null;
  seo_title?: string | null;
  optimized_title?: string | null;
  regenerated_title?: string | null;
  seo_description?: string | null;
  vendor?: string | null;
  product_type?: string | null;
  handle?: string | null;
  status?: string | null;
  tags?: string | null;
  price?: number | null;
  category?: string | null;
  sub_category?: string | null;
  ai_color?: string | null;
  ai_material?: string | null;
  has_landing_page?: boolean | null;
  seo_synced_to_shopify?: boolean | null;
  shopify_id?: number | null;
  image_url?: string | null;
  variants?: Array<{ price?: number | null }>;
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
  vendor: "Vendeur",
  product_type: "Type produit",
  handle: "Handle",
  status: "Statut",
  tags: "Tags",
  price: "Prix",
  category: "Catégorie",
  sub_category: "Sous-catégorie",
  ai_color: "Couleur IA",
  ai_material: "Matériau IA",
  has_landing_page: "Contenu Premium",
  seo_synced_to_shopify: "Synchro Shopify",
  shopify_id: "Shopify ID",
  image_url: "URL image",
};

const COLUMN_HEADERS_EN = {
  title: "Original Title",
  seo_title: "SEO Title",
  optimized_title: "Optimized Title",
  regenerated_title: "Regenerated Title",
  seo_description: "SEO Description",
  vendor: "Vendor",
  product_type: "Product Type",
  handle: "Handle",
  status: "Status",
  tags: "Tags",
  price: "Price",
  category: "Category",
  sub_category: "Sub-category",
  ai_color: "AI Color",
  ai_material: "AI Material",
  has_landing_page: "Premium Content",
  seo_synced_to_shopify: "Shopify Sync",
  shopify_id: "Shopify ID",
  image_url: "Image URL",
};

function getHeaders(lang: string) {
  return lang === "fr" ? COLUMN_HEADERS_FR : COLUMN_HEADERS_EN;
}

function getBoolLabel(value: boolean | null | undefined, lang: string): string {
  if (value === true) return lang === "fr" ? "Oui" : "Yes";
  if (value === false) return lang === "fr" ? "Non" : "No";
  return "";
}

export function mapProductsToExportRows(products: ExportableProduct[], lang: string = "fr"): ExportRow[] {
  const headers = getHeaders(lang);

  return products.map((p) => {
    const price = p.variants?.[0]?.price ?? p.price ?? null;

    return {
      [headers.title]: p.title || "",
      [headers.seo_title]: p.seo_title || "",
      [headers.optimized_title]: (p as any).optimized_title || "",
      [headers.regenerated_title]: (p as any).regenerated_title || "",
      [headers.seo_description]: p.seo_description || "",
      [headers.vendor]: p.vendor || "",
      [headers.product_type]: (p as any).product_type || "",
      [headers.handle]: p.handle || "",
      [headers.status]: p.status || "",
      [headers.tags]: (p as any).tags || "",
      [headers.price]: price,
      [headers.category]: (p as any).category || "",
      [headers.sub_category]: (p as any).sub_category || "",
      [headers.ai_color]: (p as any).ai_color || "",
      [headers.ai_material]: (p as any).ai_material || "",
      [headers.has_landing_page]: getBoolLabel(p.has_landing_page, lang),
      [headers.seo_synced_to_shopify]: getBoolLabel(p.seo_synced_to_shopify, lang),
      [headers.shopify_id]: p.shopify_id || "",
      [headers.image_url]: p.image_url || "",
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
