import { type CreativeStyle } from "../templates/creativeStyles";

export const CREATIVE_STYLE_DISPLAY_NAMES: Record<string, string> = {
  luxury_showroom: "Luxury Showroom",
  luxury_gold_burst: "Golden Glow",
  luxury_velvet: "Royal Velvet",
  lifestyle_living: "Modern Salon",
  lifestyle_bedroom: "Cozy Bedroom",
  lifestyle_outdoor: "Summer Terrace",
  minimal_white: "White Studio",
  minimal_concrete: "Raw Concrete",
  minimal_paper: "Kraft Paper",
  neon_cyberpunk: "Cyberpunk",
  neon_retrowave: "Retro Wave",
  neon_gamer: "Gaming RGB",
  seasonal_christmas: "Holiday Magic",
  seasonal_blackfriday: "Black Friday",
  seasonal_summer: "Summer Sale",
  seasonal_valentine: "Valentine's Day",
  editorial_magazine: "Home & Decor",
  editorial_catalog: "Premium Catalog",
  editorial_architect: "Interior Architecture",
  dynamic_action: "Action Shot",
  dynamic_3d: "Floating 3D",
  dynamic_split: "Before / After",
};

export const CATEGORY_LABELS: Record<CreativeStyle["category"], string> = {
  luxury: "Luxury & Premium",
  lifestyle: "Lifestyle",
  minimal: "Minimalist",
  neon: "Neon & Tech",
  seasonal: "Seasonal",
  editorial: "Editorial",
  dynamic: "Dynamic",
};

export const CATEGORY_DESCRIPTORS: Record<CreativeStyle["category"], [string, string]> = {
  luxury: ["premium", "elegant"],
  lifestyle: ["warm", "modern"],
  minimal: ["clean", "refined"],
  neon: ["futuristic", "electric"],
  seasonal: ["campaign", "timely"],
  editorial: ["editorial", "premium"],
  dynamic: ["bold", "energetic"],
};

export function getCreativeStyleDisplayName(style: CreativeStyle): string {
  return CREATIVE_STYLE_DISPLAY_NAMES[style.id] || style.name;
}
