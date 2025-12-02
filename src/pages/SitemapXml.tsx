import { useEffect } from "react";

const SitemapXml = () => {
  useEffect(() => {
    const fetchSitemap = async () => {
      try {
        const response = await fetch(
          "https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/generate-sitemap"
        );
        const xmlText = await response.text();
        
        // Replace the entire document with the XML
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
