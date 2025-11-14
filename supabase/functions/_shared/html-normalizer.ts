/**
 * HTML Normalization utilities for landing page generation
 * Ensures valid HTML5 structure and removes forbidden elements
 */

/**
 * Strips markdown code fences from AI-generated HTML
 */
export function stripMarkdownFences(html: string): string {
  let cleaned = html.trim();
  
  // Remove opening markdown fences (```html, ```, etc.)
  if (cleaned.startsWith("```html")) {
    cleaned = cleaned.substring(7).trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3).trim();
  }
  
  // Remove closing markdown fences
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3).trim();
  }
  
  return cleaned;
}

/**
 * Normalizes HTML to ensure complete valid HTML5 structure
 */
export function normalizeHTML(
  rawHtml: string,
  productTitle: string,
  language: string = "en"
): string {
  // First, strip any markdown code fences
  let html = stripMarkdownFences(rawHtml);
  
  // Check if HTML is already complete
  const hasDoctype = html.includes("<!DOCTYPE html>");
  const hasHtmlTag = html.includes("<html");
  const hasClosingBody = html.includes("</body>");
  const hasClosingHtml = html.includes("</html>");

  // If already complete, return as-is
  if (hasDoctype && hasHtmlTag && hasClosingBody && hasClosingHtml) {
    return html;
  }

  console.log("[Normalizer] HTML structure incomplete, wrapping in full HTML5 template");

  // Extract body content if present
  let bodyContent = html;
  if (html.includes("<body>")) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)(?:<\/body>)?$/i);
    if (bodyMatch) {
      bodyContent = bodyMatch[1];
    }
  }

  // Build complete HTML5 document with optimized Tailwind loading
  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${productTitle}</title>
  <link rel="preconnect" href="https://cdn.tailwindcss.com">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* Prevent FOUC (Flash of Unstyled Content) */
    body { visibility: hidden; }
    body.tailwind-loaded { visibility: visible; }
  </style>
  <script>
    // Show content as soon as Tailwind is loaded
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => document.body.classList.add('tailwind-loaded'), 100);
    });
  </script>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

/**
 * Removes footer elements from HTML
 */
export function removeFooters(html: string): string {
  const footerCount = (html.match(/<footer[^>]*>/gi) || []).length;
  if (footerCount > 0) {
    console.log(`[Normalizer] Removing ${footerCount} footer element(s)`);
    return html.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");
  }
  return html;
}

/**
 * Removes forbidden CSS styles and classes
 */
export function cleanForbiddenCSS(html: string): string {
  let cleaned = html;
  let changesCount = 0;

  // Remove <style> tags containing :root
  const rootStylesRemoved = cleaned.match(/<style[^>]*>[\s\S]*?:root[\s\S]*?<\/style>/gi);
  if (rootStylesRemoved && rootStylesRemoved.length > 0) {
    changesCount += rootStylesRemoved.length;
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?:root[\s\S]*?<\/style>/gi, "");
  }

  // Remove forbidden custom classes
  cleaned = cleaned.replace(/class="([^"]*)"/g, (match, classes) => {
    const classList = classes.split(/\s+/);
    const forbiddenClasses = classList.filter((cls: string) =>
      cls.match(/^(text-primary|bg-primary|border-primary|hover:bg-primary-dark)$/)
    );

    if (forbiddenClasses.length > 0) {
      changesCount += forbiddenClasses.length;
    }

    const cleanedClasses = classList
      .filter((cls: string) => !cls.match(/^(text-primary|bg-primary|border-primary|hover:bg-primary-dark)$/))
      .join(" ");

    return cleanedClasses ? `class="${cleanedClasses}"` : "";
  });

  if (changesCount > 0) {
    console.log(`[Normalizer] Cleaned ${changesCount} forbidden CSS element(s)`);
  }

  return cleaned;
}

/**
 * Validates HTML structure and returns issues
 */
export function validateHTML(html: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!html.includes("<!DOCTYPE html>")) issues.push("Missing <!DOCTYPE html>");
  if (!html.includes("<html")) issues.push("Missing <html> tag");
  if (!html.includes("</body>")) issues.push("Missing </body> closing tag");
  if (!html.includes("</html>")) issues.push("Missing </html> closing tag");

  if (html.includes(":root")) issues.push("Forbidden :root CSS found");
  if (html.includes("--primary-color") || html.includes("--secondary-color")) {
    issues.push("Forbidden CSS custom properties found");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Remove duplicate responsive classes from HTML
 * Example: "text-lg md:text-xl md:text-2xl" → "text-lg md:text-2xl"
 */
export function removeDuplicateResponsiveClasses(html: string): string {
  let changesCount = 0;
  
  const cleaned = html.replace(/class="([^"]*)"/g, (match, classes) => {
    const classArray = classes.trim().split(/\s+/);
    const seen = new Map<string, string>();
    
    const deduplicated = classArray.filter((cls: string) => {
      const responsiveMatch = cls.match(/^(sm|md|lg|xl|2xl):(.+)$/);
      if (responsiveMatch) {
        const [, breakpoint, property] = responsiveMatch;
        const baseProperty = property.split('-')[0];
        const key = `${breakpoint}:${baseProperty}`;
        
        if (seen.has(key)) {
          changesCount++;
          return false; // Remove duplicate
        }
        seen.set(key, cls);
      }
      return true;
    });
    
    return `class="${deduplicated.join(' ')}"`;
  });

  if (changesCount > 0) {
    console.log(`[Normalizer] Removed ${changesCount} duplicate responsive class(es)`);
  }

  return cleaned;
}

/**
 * Main sanitization function - applies all normalization steps
 */
export function sanitizeGeneratedHTML(
  rawHtml: string,
  productTitle: string,
  language: string = "en"
): string {
  console.log("[Sanitization] Starting HTML normalization");

  let html = rawHtml;

  // 1. Remove duplicate responsive classes
  html = removeDuplicateResponsiveClasses(html);

  // 2. Clean forbidden CSS
  html = cleanForbiddenCSS(html);

  // 3. Remove footers
  html = removeFooters(html);

  // 4. Normalize HTML structure
  html = normalizeHTML(html, productTitle, language);

  console.log("[Sanitization] HTML normalized and validated");

  return html;
}
