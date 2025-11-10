/**
 * Validation utilities for landing page HTML generation
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  successes: string[];
}

export function validateLandingHTML(html: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const successes: string[] = [];

  // 1. Check HTML structure
  if (!html.includes("<!DOCTYPE html>")) {
    errors.push("Missing <!DOCTYPE html> declaration");
  } else {
    successes.push("Proper HTML5 doctype");
  }

  if (!html.includes("<html")) {
    errors.push("Missing <html> tag");
  } else {
    successes.push("HTML tag present");
  }

  if (!html.includes("</body>")) {
    errors.push("Missing closing </body> tag");
  } else {
    successes.push("Proper HTML structure");
  }

  // 2. Check for forbidden CSS
  if (html.includes(":root")) {
    errors.push("Forbidden :root CSS variables found");
  }

  if (html.includes("--primary-color") || html.includes("--secondary-color")) {
    errors.push("Forbidden CSS custom properties (--primary-color, etc.)");
  }

  if (html.match(/\.(text-primary|bg-primary|border-primary)/)) {
    errors.push("Forbidden custom CSS classes (.text-primary, .bg-primary, etc.)");
  }

  // 3. Check colors
  const hexColors = html.match(/#[0-9A-Fa-f]{6}/g);
  if (hexColors && hexColors.length > 0) {
    errors.push(`Found ${hexColors.length} HEX color(s) - should use HSL: ${hexColors.slice(0, 3).join(", ")}`);
  } else {
    successes.push("No HEX colors found");
  }

  if (html.includes("hsl(") && html.includes('style="')) {
    successes.push("Using inline HSL styles correctly");
  } else if (html.includes("hsl(")) {
    warnings.push("HSL found but might not be using inline styles");
  } else {
    errors.push("No HSL colors detected - brand color not applied");
  }

  // 4. Check responsive classes
  if (html.includes("sm:") && html.includes("md:")) {
    successes.push("Responsive Tailwind classes present");
  } else {
    errors.push("Missing responsive Tailwind classes (sm:, md:)");
  }

  // Check for duplicate responsive classes
  const duplicateMatches = html.match(/class="[^"]*?(sm|md|lg|xl):[^\s]+[^"]*\1:/g);
  if (duplicateMatches && duplicateMatches.length > 0) {
    errors.push(`Found ${duplicateMatches.length} duplicate responsive classes`);
  } else {
    successes.push("No duplicate responsive classes");
  }

  // 5. Check for footer
  if (html.toLowerCase().includes("<footer")) {
    warnings.push("Footer found - should be removed per requirements");
  } else {
    successes.push("No footer (as required)");
  }

  // 6. Check viewport meta
  if (html.includes('<meta name="viewport"')) {
    successes.push("Viewport meta tag present");
  } else {
    errors.push("Missing viewport meta tag");
  }

  // 7. Check for proper containers
  if (html.includes("max-w-7xl mx-auto")) {
    successes.push("Using proper container classes");
  } else {
    warnings.push("Missing standard container classes (max-w-7xl mx-auto)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    successes,
  };
}

export function formatValidationReport(result: ValidationResult): string {
  let report = "";

  if (result.errors.length > 0) {
    report += "❌ ERRORS:\n";
    result.errors.forEach(err => {
      report += `  - ${err}\n`;
    });
    report += "\n";
  }

  if (result.warnings.length > 0) {
    report += "⚠️ WARNINGS:\n";
    result.warnings.forEach(warn => {
      report += `  - ${warn}\n`;
    });
    report += "\n";
  }

  if (result.successes.length > 0) {
    report += "✅ SUCCESSES:\n";
    result.successes.forEach(success => {
      report += `  - ${success}\n`;
    });
  }

  return report;
}
