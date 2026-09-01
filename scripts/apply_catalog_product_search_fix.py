from pathlib import Path
import re

path = Path("src/pages/Products.tsx")
text = path.read_text(encoding="utf-8")

if "debouncedSearchQuery" in text and "filteredCount" in text:
    print("Catalog product search fix already applied")
    raise SystemExit(0)


def replace_once(old: str, new: str, label: str) -> None:
    global text
    if old not in text:
        raise RuntimeError(f"Missing anchor: {label}")
    text = text.replace(old, new, 1)


replace_once(
    '  const [searchQuery, setSearchQuery] = useState("");\n',
    '  const [searchQuery, setSearchQuery] = useState("");\n'
    '  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");\n',
    "search state",
)

replace_once(
    '  const [totalCount, setTotalCount] = useState(0);\n',
    '  const [totalCount, setTotalCount] = useState(0);\n'
    '  const [filteredCount, setFilteredCount] = useState(0);\n',
    "catalog count state",
)

replace_once(
    '  const ITEMS_PER_PAGE = 20;\n\n  // Scroll to top when page changes\n',
    '''  const ITEMS_PER_PAGE = 20;

  // Debounce the query, then restart result pagination from page 1.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
      setCurrentPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // Filters and global sorting are applied by Supabase before pagination.
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sortBy, selectedStore?.id]);

  // Scroll to top when page changes
''',
    "pagination effects",
)

# Keep the real catalog count separate from the filtered-result count.
text = text.replace(
    '      setTotalCount(0);\n',
    '      setTotalCount(0);\n      setFilteredCount(0);\n',
)

start_marker = '      // Count total products first\n'
end_marker = '      if (error) throw error;\n\n      // ✅ VALIDATION GARDE'
start = text.find(start_marker)
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise RuntimeError("Could not locate the product query block")
end += len('      if (error) throw error;\n')

query_block = '''      // Keep the total catalog count for the page header / empty-catalog state.
      const { count: catalogCount, error: catalogCountError } = await supabase
        .from("shopify_products")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", user?.id)
        .eq("store_id", selectedStore.id);

      if (catalogCountError) throw catalogCountError;
      setTotalCount(catalogCount || 0);

      // Search/filter the COMPLETE catalog in Supabase before applying the 20-row page range.
      // Previously the UI searched only the already-loaded page, so products on later pages
      // could never be found.
      const searchKeywords = debouncedSearchQuery
        .normalize("NFKC")
        .replace(/[^\\p{L}\\p{N}\\s_-]/gu, " ")
        .split(/\\s+/)
        .filter(Boolean)
        .slice(0, 8);
      const searchableColumns = ["title", "description", "vendor", "product_type", "sku", "handle"];

      let filteredCountQuery = supabase
        .from("shopify_products")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", user?.id)
        .eq("store_id", selectedStore.id);

      let productsQuery = supabase
        .from("shopify_products")
        .select("*, store_id")
        .eq("seller_id", user?.id)
        .eq("store_id", selectedStore.id);

      if (statusFilter !== "all") {
        filteredCountQuery = filteredCountQuery.eq("status", statusFilter);
        productsQuery = productsQuery.eq("status", statusFilter);
      }

      // Repeated OR groups are ANDed together by PostgREST: every typed keyword must
      // match at least one searchable product field, while each keyword may match a
      // different field (for example title + SKU).
      for (const keyword of searchKeywords) {
        const searchFilter = searchableColumns
          .map((column) => `${column}.ilike.%${keyword}%`)
          .join(",");
        filteredCountQuery = filteredCountQuery.or(searchFilter);
        productsQuery = productsQuery.or(searchFilter);
      }

      const { count: matchingCount, error: matchingCountError } = await filteredCountQuery;
      if (matchingCountError) throw matchingCountError;
      setFilteredCount(matchingCount || 0);

      const sortConfig = (() => {
        switch (sortBy) {
          case "price-asc":
            return { column: "price", ascending: true };
          case "price-desc":
            return { column: "price", ascending: false };
          case "name-asc":
            return { column: "title", ascending: true };
          case "name-desc":
            return { column: "title", ascending: false };
          case "recent":
          default:
            return { column: "created_at", ascending: false };
        }
      })();

      const { data: rawData, error } = await productsQuery
        .order(sortConfig.column, { ascending: sortConfig.ascending })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) throw error;
'''
text = text[:start] + query_block + text[end:]

replace_once(
    '  }, [user, currentPage, selectedStore?.id]);\n',
    '  }, [user, currentPage, selectedStore?.id, debouncedSearchQuery, statusFilter, sortBy]);\n',
    "load effect dependencies",
)

replace_once(
    '  }, [products, searchQuery, statusFilter, sortBy]);\n',
    '  }, [products, statusFilter, sortBy]);\n',
    "client filter dependencies",
)

search_block = re.compile(
    r'\n    // Search filter - Recherche intelligente\n    if \(searchQuery\) \{.*?\n    \}\n\n    // Status filter',
    re.DOTALL,
)
text, substitutions = search_block.subn('\n    // Status filter', text, count=1)
if substitutions != 1:
    raise RuntimeError("Could not remove the old current-page-only search filter")

replace_once(
    'Math.ceil((count || 0) / ITEMS_PER_PAGE)',
    'Math.ceil((matchingCount || 0) / ITEMS_PER_PAGE)',
    "load pagination log",
)

replace_once(
    '        {products.length === 0 ? (\n',
    '        {totalCount === 0 ? (\n',
    "empty catalog condition",
)

replace_once(
    '{filteredProducts.length > 0 && totalCount > ITEMS_PER_PAGE && (',
    '{filteredProducts.length > 0 && filteredCount > ITEMS_PER_PAGE && (',
    "pagination visibility",
)

pagination_total = 'Math.ceil(totalCount / ITEMS_PER_PAGE)'
if text.count(pagination_total) != 2:
    raise RuntimeError(f"Expected 2 pagination total references, found {text.count(pagination_total)}")
text = text.replace(pagination_total, 'Math.ceil(filteredCount / ITEMS_PER_PAGE)')

path.write_text(text, encoding="utf-8")
print("Applied full-catalog product search fix")
