/**
 * Image Format Enforcer - Post-processing to force exact dimensions
 * Gemini doesn't respect format instructions, so we must crop/resize after generation
 */

export interface FormatDimensions {
  width: number;
  height: number;
  ratio: string;
}

export const FORMAT_DIMENSIONS: Record<string, FormatDimensions> = {
  "square": { width: 1024, height: 1024, ratio: "1:1" },
  "1x1": { width: 1024, height: 1024, ratio: "1:1" },
  "portrait": { width: 768, height: 1024, ratio: "3:4" },
  "3:4": { width: 768, height: 1024, ratio: "3:4" },
  "landscape": { width: 1024, height: 768, ratio: "4:3" },
  "4:3": { width: 1024, height: 768, ratio: "4:3" },
  "16:9": { width: 1024, height: 576, ratio: "16:9" },
  "9:16": { width: 576, height: 1024, ratio: "9:16" },
};

export function getFormatDimensions(format: string): FormatDimensions {
  return FORMAT_DIMENSIONS[format] || FORMAT_DIMENSIONS["square"];
}

/**
 * Calculate FIT dimensions to preserve entire image (no cropping)
 * Image is scaled to fit within target bounds and centered
 */
export function calculateFitDimensions(
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number
): { newWidth: number; newHeight: number; offsetX: number; offsetY: number } {
  const scaleX = targetWidth / srcWidth;
  const scaleY = targetHeight / srcHeight;
  const scale = Math.min(scaleX, scaleY); // Use smaller scale to ensure entire image fits
  
  const newWidth = Math.round(srcWidth * scale);
  const newHeight = Math.round(srcHeight * scale);
  
  const offsetX = Math.round((targetWidth - newWidth) / 2);
  const offsetY = Math.round((targetHeight - newHeight) / 2);
  
  return { newWidth, newHeight, offsetX, offsetY };
}

/**
 * @deprecated Use calculateFitDimensions instead - cropping can cut off product edges
 * Calculate center crop coordinates to achieve target aspect ratio
 */
export function calculateCenterCrop(
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number
): { x: number; y: number; cropWidth: number; cropHeight: number } {
  const srcAspect = srcWidth / srcHeight;
  const targetAspect = targetWidth / targetHeight;

  let cropWidth: number;
  let cropHeight: number;
  let x: number;
  let y: number;

  if (srcAspect > targetAspect) {
    // Source is wider than target - crop sides
    cropHeight = srcHeight;
    cropWidth = Math.round(srcHeight * targetAspect);
    x = Math.round((srcWidth - cropWidth) / 2);
    y = 0;
  } else {
    // Source is taller than target - crop top/bottom
    cropWidth = srcWidth;
    cropHeight = Math.round(srcWidth / targetAspect);
    x = 0;
    y = Math.round((srcHeight - cropHeight) / 2);
  }

  return { x, y, cropWidth, cropHeight };
}

/**
 * Build SERP-based orientation instructions
 * Adjusts product orientation based on competitor data
 */
export function buildOrientationInstructions(serpData?: {
  dominantStyles?: string[];
  dimensions?: string;
  orientation?: string;
  productCategory?: string;
}): string {
  if (!serpData) return "";
  
  let instructions = `
🔄 ORIENTATION & POSITIONING ACCORDING TO MARKET STANDARDS 🔄

`;

  // Add orientation based on dominant styles
  if (serpData.dominantStyles?.length) {
    const styles = serpData.dominantStyles.slice(0, 3).join(", ");
    instructions += `📊 Competitor analysis shows these popular presentation styles: ${styles}
Orient and position the product similarly to match market expectations.

`;
  }

  // Add dimension-based orientation hints
  if (serpData.dimensions) {
    instructions += `📏 Product dimensions from market data: ${serpData.dimensions}
Ensure the product is displayed with CORRECT proportions matching these dimensions.
If the product is a sofa/bed/table → show it from the FRONT or 3/4 ANGLE as competitors do.
If the product is a chair → show it at a SLIGHT ANGLE for depth.

`;
  }

  // Product category specific orientation
  if (serpData.productCategory) {
    const category = serpData.productCategory.toLowerCase();
    if (category.includes("sofa") || category.includes("canapé")) {
      instructions += `🛋️ SOFA ORIENTATION: Face-on or slight 3/4 angle. Show full length. Armrests visible on both sides.
`;
    } else if (category.includes("bed") || category.includes("lit")) {
      instructions += `🛏️ BED ORIENTATION: Slight angle showing headboard and length. Natural bedroom perspective.
`;
    } else if (category.includes("chair") || category.includes("chaise")) {
      instructions += `🪑 CHAIR ORIENTATION: 3/4 angle showing seat, back, and one side. Slight rotation for depth.
`;
    } else if (category.includes("table")) {
      instructions += `🪵 TABLE ORIENTATION: Slight top-down angle showing surface. 3/4 view for depth perception.
`;
    }
  }

  instructions += `
⚠️ CRITICAL: DO NOT ROTATE, FLIP, OR MIRROR THE PRODUCT INCORRECTLY
The product must face the NATURAL viewing direction as shown in competitor images.
If competitors show product facing LEFT → keep it facing LEFT
If competitors show product facing FRONT → keep it facing FRONT

`;

  return instructions;
}

/**
 * Build strict format enforcement prompt header
 */
export function buildFormatEnforcementPrompt(format: string, serpData?: {
  dominantStyles?: string[];
  dimensions?: string;
  orientation?: string;
  productCategory?: string;
}): string {
  const dims = getFormatDimensions(format);
  
  const isSquare = dims.width === dims.height;
  const isPortrait = dims.height > dims.width;
  const isLandscape = dims.width > dims.height;

  const orientationInstructions = buildOrientationInstructions(serpData);

  return `
🚨🚨🚨 CRITICAL FORMAT REQUIREMENT - ABSOLUTE PRIORITY 🚨🚨🚨

📐 OUTPUT MUST BE EXACTLY ${dims.width}x${dims.height} pixels (${dims.ratio} ratio)
📐 CREATE a ${dims.width}x${dims.height} canvas FIRST, then place content

${isSquare ? `🟦 PERFECT SQUARE: Width = Height = ${dims.width} pixels. This is a SQUARE, not a rectangle.` : ""}
${isPortrait ? `📱 VERTICAL PORTRAIT: Height (${dims.height}) > Width (${dims.width}). TALLER than wide.` : ""}
${isLandscape ? `🖼️ HORIZONTAL LANDSCAPE: Width (${dims.width}) > Height (${dims.height}). WIDER than tall.` : ""}

⚠️ PRODUCT MUST FILL 85-95% OF CANVAS - NO WHITE PADDING ⚠️
Scale the product UP to TOUCH or NEARLY TOUCH the edges of the frame.
NO excessive empty space or padding around the product.

${orientationInstructions}
`.trim();
}

/**
 * Visual enhancement instructions for professional e-commerce quality
 */
export const VISUAL_ENHANCEMENT_INSTRUCTIONS = `
🎨 VISUAL QUALITY ENHANCEMENT - PROFESSIONAL E-COMMERCE PHOTOGRAPHY

FABRIC & TEXTURE OPTIMIZATION:
- Enhance fabric textures to appear rich, luxurious, and tactile
- Show natural fabric drape, folds, and depth
- Highlight weave patterns, stitching quality, and material authenticity
- Make velvet appear velvety, leather appear supple, linen appear crisp

LIGHTING FOR SALES APPEAL:
- Use professional studio lighting with main key light + fill light
- Add subtle rim lighting to separate product from background
- Create soft, flattering shadows that add depth without harsh contrast
- Ensure colors appear vibrant, accurate, and true to material

EYE-CATCHING COMMERCIAL QUALITY:
- Create "hero shot" quality - the image should make viewers WANT to buy
- Professional color grading that enhances product appeal
- Sharp focus on product details, slightly soft background if lifestyle
- Clean, premium look suitable for high-end e-commerce
- Think: IKEA catalog, West Elm, Roche Bobois photography quality

TEXTURE DETAIL ENHANCEMENT:
- Zoom-worthy detail on material textures
- Visible grain on wood, weave on fabric, sheen on leather
- Natural material variations that prove authenticity
- No plasticky or artificial-looking surfaces
`;

/**
 * Build enriched product context from SERP and Vision data
 */
export function buildEnrichedContext(
  productTitle: string,
  options: {
    seoTitle?: string;
    seoDescription?: string;
    productDescription?: string;
    serpData?: {
      dimensions?: string;
      materials?: string[];
      dominantStyles?: string[];
    };
    visionAiData?: {
      description?: string;
    };
  }
): string {
  let context = productTitle || "product";

  const { seoTitle, seoDescription, productDescription, serpData, visionAiData } = options;

  if (seoTitle && seoTitle !== productTitle) {
    context += `. ${seoTitle}`;
  }

  if (productDescription) {
    context += `. ${productDescription.slice(0, 150)}`;
  } else if (seoDescription) {
    context += `. ${seoDescription.slice(0, 150)}`;
  }

  // Add SERP data
  if (serpData) {
    if (serpData.dimensions) {
      context += `. Dimensions: ${serpData.dimensions}`;
    }
    if (serpData.materials?.length) {
      context += `. Materials: ${serpData.materials.slice(0, 3).join(", ")}`;
    }
    if (serpData.dominantStyles?.length) {
      context += `. Styles: ${serpData.dominantStyles.slice(0, 2).join(", ")}`;
    }
  }

  // Add Vision AI data
  if (visionAiData?.description) {
    context += `. Visual: ${visionAiData.description.slice(0, 100)}`;
  }

  return context;
}

/**
 * Image editing framing to preserve product identity
 */
export const IMAGE_EDITING_HEADER = `
⚠️⚠️⚠️ THIS IS AN IMAGE EDITING TASK, NOT IMAGE GENERATION ⚠️⚠️⚠️

CRITICAL INSTRUCTION:
1. EXTRACT the EXACT product from the input image (pixel-by-pixel preservation)
2. PLACE this SAME extracted product in the new environment/background
3. NEVER generate a new product or similar product
4. The product in output MUST be IDENTICAL to input

FATAL ERROR EXAMPLES:
- Input: bed frame (sommier) → Output: full bed with mattress = ❌ TOTAL FAILURE
- Input: chair → Output: different chair style = ❌ TOTAL FAILURE
- Input: sofa → Output: sofa with different fabric = ❌ TOTAL FAILURE

The product's form, color, texture, and details MUST remain UNCHANGED.
Only the BACKGROUND should change.
`;
