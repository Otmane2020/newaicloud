# Smart Pricing

Smart Pricing benchmarks a product against comparable prices already present in the connected catalog. Comparable groups use category first, then product type, then vendor, with a global catalog fallback when the group is too small. `compare_at_price`, when present, is also included as a pricing reference.

The workspace combines benchmark median/range, optional unit cost, current margin, target margin, pricing strategy and inventory impact. Costs and pricing preferences are stored locally per store so the feature works without a schema migration. Applying a recommendation updates the product price in `shopify_products`.

External competitor/Google Shopping price crawling is intentionally not presented as live benchmark data until a dedicated external pricing source is connected.
