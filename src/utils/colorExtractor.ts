// Color extraction utility for social media templates
// Extracts dominant and complementary colors from product images

export interface ExtractedColors {
  dominant: string;
  complementary: string;
  accent: string;
  isDark: boolean;
  textColor: string;
}

/**
 * Extract dominant colors from an image URL
 * Uses Canvas API to analyze pixel colors
 */
export async function extractColorsFromImage(imageUrl: string): Promise<ExtractedColors> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(getDefaultColors());
          return;
        }
        
        // Scale down for performance
        const scale = Math.min(1, 100 / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const colors = analyzePixels(imageData.data);
        
        resolve(colors);
      } catch (error) {
        console.error('Error extracting colors:', error);
        resolve(getDefaultColors());
      }
    };
    
    img.onerror = () => {
      resolve(getDefaultColors());
    };
    
    // Handle CORS issues by using a proxy or fallback
    img.src = imageUrl;
    
    // Timeout fallback
    setTimeout(() => {
      resolve(getDefaultColors());
    }, 5000);
  });
}

function analyzePixels(data: Uint8ClampedArray): ExtractedColors {
  const colorCounts: Record<string, { count: number; r: number; g: number; b: number }> = {};
  
  // Sample every 4th pixel for performance
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    // Skip transparent pixels
    if (a < 128) continue;
    
    // Quantize colors to reduce variations
    const qr = Math.round(r / 32) * 32;
    const qg = Math.round(g / 32) * 32;
    const qb = Math.round(b / 32) * 32;
    
    const key = `${qr},${qg},${qb}`;
    
    if (!colorCounts[key]) {
      colorCounts[key] = { count: 0, r: qr, g: qg, b: qb };
    }
    colorCounts[key].count++;
  }
  
  // Sort colors by frequency
  const sortedColors = Object.values(colorCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  if (sortedColors.length === 0) {
    return getDefaultColors();
  }
  
  // Get dominant color (most frequent, but not too white or black)
  const dominant = sortedColors.find(c => {
    const brightness = (c.r + c.g + c.b) / 3;
    return brightness > 30 && brightness < 225;
  }) || sortedColors[0];
  
  // Calculate complementary color
  const complementary = {
    r: 255 - dominant.r,
    g: 255 - dominant.g,
    b: 255 - dominant.b
  };
  
  // Create accent color (saturated version of dominant)
  const accent = saturateColor(dominant);
  
  // Determine if dominant is dark
  const brightness = (dominant.r * 299 + dominant.g * 587 + dominant.b * 114) / 1000;
  const isDark = brightness < 128;
  
  return {
    dominant: rgbToHsl(dominant.r, dominant.g, dominant.b),
    complementary: rgbToHsl(complementary.r, complementary.g, complementary.b),
    accent: rgbToHsl(accent.r, accent.g, accent.b),
    isDark,
    textColor: isDark ? 'hsl(0, 0%, 100%)' : 'hsl(0, 0%, 10%)'
  };
}

function saturateColor(color: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
  const max = Math.max(color.r, color.g, color.b);
  const min = Math.min(color.r, color.g, color.b);
  const diff = max - min;
  
  if (diff === 0) {
    // Grayscale, return a warm accent
    return { r: 220, g: 120, b: 80 };
  }
  
  // Increase saturation
  const factor = 1.5;
  return {
    r: Math.min(255, Math.round(128 + (color.r - 128) * factor)),
    g: Math.min(255, Math.round(128 + (color.g - 128) * factor)),
    b: Math.min(255, Math.round(128 + (color.b - 128) * factor))
  };
}

function rgbToHsl(r: number, g: number, b: number): string {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function getDefaultColors(): ExtractedColors {
  return {
    dominant: 'hsl(30, 20%, 85%)',
    complementary: 'hsl(210, 20%, 15%)',
    accent: 'hsl(25, 70%, 50%)',
    isDark: false,
    textColor: 'hsl(0, 0%, 10%)'
  };
}

/**
 * Generate elegant overlay gradient based on extracted colors
 */
export function generateElegantOverlay(colors: ExtractedColors): string {
  const dominantWithAlpha = colors.dominant.replace(')', ', 0.85)').replace('hsl', 'hsla');
  return `linear-gradient(to top, ${dominantWithAlpha} 0%, transparent 60%)`;
}

/**
 * Generate geometric shapes SVG based on colors
 */
export function generateGeometricShapes(colors: ExtractedColors): string {
  const accentWithAlpha = colors.accent.replace(')', ', 0.3)').replace('hsl', 'hsla');
  return `
    <svg width="100%" height="100%" style="position:absolute;top:0;left:0;pointer-events:none">
      <circle cx="85%" cy="15%" r="60" fill="${accentWithAlpha}" />
      <rect x="5%" y="75%" width="40" height="2" fill="${accentWithAlpha}" />
      <circle cx="10%" cy="85%" r="15" fill="${accentWithAlpha}" />
    </svg>
  `;
}
