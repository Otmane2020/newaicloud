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
 * PRESERVES theme toggle and CSS variables from original HTML
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
  const hasTailwindCDN = html.includes("cdn.tailwindcss.com");

  // If already complete AND has Tailwind, just ensure single DOCTYPE and clean duplicate tags
  if (hasDoctype && hasHtmlTag && hasClosingBody && hasClosingHtml && hasTailwindCDN) {
    console.log("[Normalizer] HTML appears complete, cleaning duplicate tags");
    
    // Remove duplicate DOCTYPE declarations
    let cleaned = html;
    const doctypeCount = (cleaned.match(/<!DOCTYPE html>/gi) || []).length;
    if (doctypeCount > 1) {
      console.log(`[Normalizer] Found ${doctypeCount} DOCTYPE declarations, keeping only first`);
      // Keep only the first DOCTYPE
      let firstDoctypeFound = false;
      cleaned = cleaned.replace(/<!DOCTYPE html>/gi, (match) => {
        if (!firstDoctypeFound) {
          firstDoctypeFound = true;
          return match;
        }
        return '';
      });
    }
    
    // Remove duplicate <html> opening tags
    const htmlOpenCount = (cleaned.match(/<html[^>]*>/gi) || []).length;
    if (htmlOpenCount > 1) {
      console.log(`[Normalizer] Found ${htmlOpenCount} <html> opening tags, keeping only first`);
      let firstHtmlFound = false;
      cleaned = cleaned.replace(/<html[^>]*>/gi, (match) => {
        if (!firstHtmlFound) {
          firstHtmlFound = true;
          return match;
        }
        return '';
      });
    }
    
    // Remove duplicate <head> tags
    const headOpenCount = (cleaned.match(/<head[^>]*>/gi) || []).length;
    if (headOpenCount > 1) {
      console.log(`[Normalizer] Found ${headOpenCount} <head> opening tags, keeping only first`);
      let firstHeadFound = false;
      cleaned = cleaned.replace(/<head[^>]*>/gi, (match) => {
        if (!firstHeadFound) {
          firstHeadFound = true;
          return match;
        }
        return '';
      });
    }
    
    // Remove duplicate </head> tags
    const headCloseCount = (cleaned.match(/<\/head>/gi) || []).length;
    if (headCloseCount > 1) {
      console.log(`[Normalizer] Found ${headCloseCount} </head> closing tags, keeping only first`);
      let firstHeadCloseFound = false;
      cleaned = cleaned.replace(/<\/head>/gi, (match) => {
        if (!firstHeadCloseFound) {
          firstHeadCloseFound = true;
          return match;
        }
        return '';
      });
    }
    
    // Remove duplicate <body> opening tags
    const bodyOpenCount = (cleaned.match(/<body[^>]*>/gi) || []).length;
    if (bodyOpenCount > 1) {
      console.log(`[Normalizer] Found ${bodyOpenCount} <body> opening tags, keeping only first`);
      let firstBodyFound = false;
      cleaned = cleaned.replace(/<body[^>]*>/gi, (match) => {
        if (!firstBodyFound) {
          firstBodyFound = true;
          return match;
        }
        return '';
      });
    }
    
    // Remove duplicate </body> tags
    const bodyCloseCount = (cleaned.match(/<\/body>/gi) || []).length;
    if (bodyCloseCount > 1) {
      console.log(`[Normalizer] Found ${bodyCloseCount} </body> closing tags, keeping only last`);
      const positions: number[] = [];
      let match;
      const regex = /<\/body>/gi;
      while ((match = regex.exec(cleaned)) !== null) {
        positions.push(match.index);
      }
      // Keep only the last one
      positions.slice(0, -1).reverse().forEach(pos => {
        cleaned = cleaned.substring(0, pos) + cleaned.substring(pos + 7);
      });
    }
    
    // Remove duplicate </html> tags
    const htmlCloseCount = (cleaned.match(/<\/html>/gi) || []).length;
    if (htmlCloseCount > 1) {
      console.log(`[Normalizer] Found ${htmlCloseCount} </html> closing tags, keeping only last`);
      const positions: number[] = [];
      let match;
      const regex = /<\/html>/gi;
      while ((match = regex.exec(cleaned)) !== null) {
        positions.push(match.index);
      }
      // Keep only the last one
      positions.slice(0, -1).reverse().forEach(pos => {
        cleaned = cleaned.substring(0, pos) + cleaned.substring(pos + 7);
      });
    }
    
    return cleaned;
  }

  console.log("[Normalizer] HTML structure incomplete or missing Tailwind, wrapping in full HTML5 template");

  // Extract head and body content if present
  let headContent = '';
  let bodyContent = html;
  
  // Extract existing head content to preserve theme toggle and CSS variables
  if (html.includes("<head>")) {
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    if (headMatch) {
      headContent = headMatch[1];
    }
  }
  
  if (html.includes("<body>")) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)(?:<\/body>)?$/i);
    if (bodyMatch) {
      bodyContent = bodyMatch[1];
    }
  } else if (html.includes("<html")) {
    // Extract everything between html tags if no body tags
    const htmlMatch = html.match(/<html[^>]*>([\s\S]*?)(?:<\/html>)?$/i);
    if (htmlMatch) {
      bodyContent = htmlMatch[1];
      // Remove head from body if present
      bodyContent = bodyContent.replace(/<head[^>]*>[\s\S]*?<\/head>/i, '');
    }
  }

  // Build complete HTML5 document preserving existing head content
  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${productTitle}</title>
  ${headContent ? headContent : `
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
  `}
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
export function cleanForbiddenCSS(
  html: string,
  options: { allowRootCss?: boolean } = {}
): string {
  let cleaned = html;
  let changesCount = 0;
  const { allowRootCss = false } = options;

  // Remove <style> tags containing :root unless explicitly allowed
  if (!allowRootCss) {
    const rootStylesRemoved = cleaned.match(/<style[^>]*>[\s\S]*?:root[\s\S]*?<\/style>/gi);
    if (rootStylesRemoved && rootStylesRemoved.length > 0) {
      changesCount += rootStylesRemoved.length;
      cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?:root[\s\S]*?<\/style>/gi, "");
    }
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
 * Phase 3: Enhanced validation to detect truncation
 */
export function validateHTML(html: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!html.includes("<!DOCTYPE html>")) issues.push("Missing <!DOCTYPE html>");
  if (!html.includes("<html")) issues.push("Missing <html> tag");
  
  // ⚠️ CRITICAL: Check for truncation
  if (!html.includes("</body>")) {
    issues.push("⚠️ CRITICAL: HTML truncated - missing </body>");
  }
  
  if (!html.includes("</html>")) {
    issues.push("⚠️ CRITICAL: HTML truncated - missing </html>");
  }
  
  // Verify minimum viable length (complete HTML should be >2000 chars)
  if (html.length < 2000) {
    issues.push(`⚠️ HTML too short (${html.length} chars < 2000) - likely truncated`);
  }

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
 * Injects CSS color variables into HTML head as a fallback if AI generated var() references
 */
function injectColorVariables(html: string, designTokens: any): string {
  if (!designTokens) return html;
  
  const cssVars = `
  <style>
    :root {
      --color-primary: ${designTokens.primary};
      --color-primary-light: ${designTokens.primaryLight};
      --color-primary-dark: ${designTokens.primaryDark};
      --color-secondary: ${designTokens.secondary};
      --color-secondary-light: ${designTokens.secondaryLight};
      --color-secondary-dark: ${designTokens.secondaryDark};
      --color-accent: ${designTokens.accent};
      --color-accent-light: ${designTokens.accentLight};
      --color-accent-dark: ${designTokens.accentDark};
      --color-background: ${designTokens.background};
      --color-surface: ${designTokens.surface};
      --color-text: ${designTokens.text};
      --color-text-muted: ${designTokens.textMuted};
    }
    .bg-surface { background-color: hsl(var(--color-surface)); }
    .text-muted { color: hsl(var(--color-text-muted)); }
  </style>`;
  
  return html.replace('</head>', cssVars + '\n</head>');
}

/**
 * Replaces any remaining var(--color-xxx) with actual HSL values as post-processing
 */
function replaceColorVariables(html: string, designTokens: any): string {
  if (!designTokens) return html;
  
  const replacements: Record<string, string> = {
    'var(--color-primary)': `hsl(${designTokens.primary})`,
    'var(--color-primary-light)': `hsl(${designTokens.primaryLight})`,
    'var(--color-primary-dark)': `hsl(${designTokens.primaryDark})`,
    'var(--color-secondary)': `hsl(${designTokens.secondary})`,
    'var(--color-secondary-light)': `hsl(${designTokens.secondaryLight})`,
    'var(--color-secondary-dark)': `hsl(${designTokens.secondaryDark})`,
    'var(--color-accent)': `hsl(${designTokens.accent})`,
    'var(--color-accent-light)': `hsl(${designTokens.accentLight})`,
    'var(--color-accent-dark)': `hsl(${designTokens.accentDark})`,
    'var(--color-background)': `hsl(${designTokens.background})`,
    'var(--color-surface)': `hsl(${designTokens.surface})`,
    'var(--color-text)': `hsl(${designTokens.text})`,
    'var(--color-text-muted)': `hsl(${designTokens.textMuted})`,
  };
  
  let result = html;
  for (const [varName, hslValue] of Object.entries(replacements)) {
    result = result.replace(new RegExp(varName.replace(/[()]/g, '\\$&'), 'g'), hslValue);
  }
  
  return result;
}

/**
 * Main sanitization function - applies all normalization steps
 */
export function sanitizeGeneratedHTML(
  rawHtml: string,
  productTitle: string,
  language: string = "en",
  options: { allowRootCss?: boolean; designTokens?: any } = {}
): string {
  console.log("[Sanitization] Starting HTML normalization");

  let html = rawHtml;

  // 1. Verify theme toggle is present
  if (!html.includes('id="theme-toggle"')) {
    console.warn("[Sanitization] ⚠️ Dark/Light theme toggle missing from generated HTML");
  }

  // 2. Check for placeholder images
  if (html.includes('via.placeholder.com')) {
    console.warn("[Sanitization] ⚠️ Placeholder images detected - these should be replaced with real product images");
  }

  // 3. Check for "Non communiqué" in visible content
  if (html.includes('Non communiqué') || html.includes('Not specified')) {
    console.warn("[Sanitization] ⚠️ 'Non communiqué' found in HTML - these should be hidden in table rows");
  }

  // 4. Remove duplicate responsive classes
  html = removeDuplicateResponsiveClasses(html);

  // 5. Clean forbidden CSS
  html = cleanForbiddenCSS(html, options);

  // 6. Remove footers
  html = removeFooters(html);

  // 7. Normalize HTML structure
  html = normalizeHTML(html, productTitle, language);

  // 8. Replace any var(--color-xxx) with actual HSL values (post-processing)
  if (options.designTokens) {
    console.log("🎨 [sanitizeGeneratedHTML] Replacing CSS variables with HSL values");
    html = replaceColorVariables(html, options.designTokens);
  }

  // 9. Inject CSS color variables as fallback (only if var() is still present)
  if (options.designTokens && html.includes('var(--color-')) {
    console.log("🎨 [sanitizeGeneratedHTML] Injecting CSS color variables as fallback");
    html = injectColorVariables(html, options.designTokens);
  }

  // 10. Verify HTML completeness
  if (!html.endsWith('</html>')) {
    console.warn("[Sanitization] ⚠️ HTML appears truncated - missing closing </html> tag");
    if (!html.includes('</body>')) {
      console.log("[Sanitization] Adding missing </body> tag");
      html += '\n</body>';
    }
    if (!html.includes('</html>')) {
      console.log("[Sanitization] Adding missing </html> tag");
      html += '\n</html>';
    }
  }

  console.log("[Sanitization] HTML normalized and validated");

  return html;
}
