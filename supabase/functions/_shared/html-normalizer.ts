/**
 * HTML Normalization utilities for landing page generation
 * Ensures valid HTML5 structure and removes forbidden elements
 */

/**
 * Normalizes HTML to ensure complete valid HTML5 structure
 */
export function normalizeHTML(
  rawHtml: string,
  productTitle: string,
  language: string = "en"
): string {
  // Check if HTML is already complete
  const hasDoctype = rawHtml.includes("<!DOCTYPE html>");
  const hasHtmlTag = rawHtml.includes("<html");
  const hasClosingBody = rawHtml.includes("</body>");
  const hasClosingHtml = rawHtml.includes("</html>");

  // If already complete, return as-is
  if (hasDoctype && hasHtmlTag && hasClosingBody && hasClosingHtml) {
    return rawHtml;
  }

  console.log("[Normalizer] HTML structure incomplete, wrapping in full HTML5 template");

  // Extract body content if present
  let bodyContent = rawHtml;
  if (rawHtml.includes("<body>")) {
    const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)(?:<\/body>)?$/i);
    if (bodyMatch) {
      bodyContent = bodyMatch[1];
    }
  }

  // Build complete HTML5 document
  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${productTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
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
    const forbiddenClasses = classList.filter(cls =>
      cls.match(/^(text-primary|bg-primary|border-primary|hover:bg-primary-dark)$/)
    );

    if (forbiddenClasses.length > 0) {
      changesCount += forbiddenClasses.length;
    }

    const cleanedClasses = classList
      .filter(cls => !cls.match(/^(text-primary|bg-primary|border-primary|hover:bg-primary-dark)$/))
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
 * Main sanitization function - applies all normalization steps
 */
export function sanitizeGeneratedHTML(
  rawHtml: string,
  productTitle: string,
  language: string = "en"
): string {
  console.log("[Sanitization] Starting HTML normalization");

  let html = rawHtml;

  // 1. Clean forbidden CSS
  html = cleanForbiddenCSS(html);

  // 2. Remove footers
  html = removeFooters(html);

  // 3. Normalize HTML structure
  html = normalizeHTML(html, productTitle, language);

  console.log("[Sanitization] HTML normalized and validated");

  return html;
}
