import { useEffect } from "react";

const CATALOGOPTIMIZE_DOMAIN = "https://catalogoptimize.com";
const LEGACY_DOMAIN_PATTERN = /https:\/\/newai\.sale/g;

const SEO_PATHS = [
  "/shopify-catalog-optimization",
  "/ai-product-catalog-optimization",
  "/shopify-product-optimization",
  "/google-shopping-feed-optimization",
  "/product-data-enrichment",
  "/bulk-product-description-generator",
  "/shopify-image-optimization",
  "/shopify-variant-management",
];

const buildSeoEntries = () =>
  SEO_PATHS.map(
    (path) => `
  <url>
    <loc>${CATALOGOPTIMIZE_DOMAIN}${path}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  ).join("");

const SitemapXml = () => {
  useEffect(() => {
    const fetchSitemap = async () => {
      try {
        const response = await fetch(
          "https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/generate-sitemap"
        );

        if (!response.ok) {
          throw new Error(`Sitemap function returned ${response.status}`);
        }

        let xmlText = await response.text();

        // Keep legacy-generated entries but make every canonical URL point to CatalogOptimize.
        xmlText = xmlText.replace(LEGACY_DOMAIN_PATTERN, CATALOGOPTIMIZE_DOMAIN);

        // Add the new high-intent catalog optimization pages when the function returns a URL set.
        if (xmlText.includes("</urlset>")) {
          const entries = buildSeoEntries();
          const missingEntries = SEO_PATHS.some((path) => !xmlText.includes(`${CATALOGOPTIMIZE_DOMAIN}${path}`));
          if (missingEntries) {
            xmlText = xmlText.replace("</urlset>", `${entries}\n</urlset>`);
          }
        }

        document.open();
        document.write(xmlText);
        document.close();
      } catch (error) {
        console.error("Error fetching sitemap:", error);
        document.open();
        document.write("<error>Failed to load sitemap</error>");
        document.close();
      }
    };

    fetchSitemap();
  }, []);

  return null;
};

export default SitemapXml;
