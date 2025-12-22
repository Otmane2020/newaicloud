import { Helmet } from "react-helmet-async";

interface AeoreplySEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
}

export function AeoreplySEO({ 
  title = "Aeoreply - Answer Engine Optimization | Get Cited by AI",
  description = "Aeoreply optimizes your content to be cited by AI assistants like ChatGPT, Gemini, Claude and Perplexity. Generate citable answers and AEO articles to boost your visibility.",
  canonical = "https://aeoreply.com",
  noindex = false
}: AeoreplySEOProps) {
  const fullTitle = title.includes("Aeoreply") ? title : `${title} | Aeoreply`;
  
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta charSet="utf-8" />
      
      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonical} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content="Aeoreply" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:locale:alternate" content="fr_FR" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      
      {/* Additional SEO */}
      <meta name="author" content="Aeoreply" />
      <meta name="publisher" content="Aeoreply" />
      <meta name="application-name" content="Aeoreply" />
      
      {/* Keywords for AEO */}
      <meta name="keywords" content="AEO, Answer Engine Optimization, ChatGPT, Gemini, Claude, Perplexity, AI citations, AI visibility, content optimization, SEO for AI, AI search optimization" />
      
      {/* Structured Data - Organization */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Aeoreply",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "description": description,
          "url": "https://aeoreply.com",
          "author": {
            "@type": "Organization",
            "name": "Aeoreply"
          }
        })}
      </script>
      
      {/* Structured Data - WebSite */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Aeoreply",
          "url": "https://aeoreply.com",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://aeoreply.com/search?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        })}
      </script>
    </Helmet>
  );
}
