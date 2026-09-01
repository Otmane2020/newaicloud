import { type CreativeStyle } from "../templates/creativeStyles";
import {
  CATEGORY_DESCRIPTORS,
  CATEGORY_LABELS,
  getCreativeStyleDisplayName,
} from "./creativeStyleDisplay";

export type CreativeOutputFormat = "square" | "portrait" | "story" | "landscape";

interface CreativeTemplatePreviewProps {
  style: CreativeStyle;
  format: CreativeOutputFormat;
}

const FORMAT_LABELS: Record<CreativeOutputFormat, string> = {
  square: "1:1",
  portrait: "4:5",
  story: "9:16",
  landscape: "16:9",
};

const PREVIEW_IMAGES: Record<string, string> = {
  luxury_showroom: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85",
  luxury_gold_burst: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85",
  luxury_velvet: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=85",
  lifestyle_living: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85",
  lifestyle_bedroom: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=85",
  lifestyle_outdoor: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85",
  minimal_white: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1200&q=85",
  minimal_concrete: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85",
  minimal_paper: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=85",
  neon_cyberpunk: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=85",
  neon_retrowave: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=85",
  neon_gamer: "https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=1200&q=85",
  seasonal_christmas: "https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=1200&q=85",
  seasonal_blackfriday: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=85",
  seasonal_summer: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
  seasonal_valentine: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1200&q=85",
  editorial_magazine: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85",
  editorial_catalog: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85",
  editorial_architect: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=85",
  dynamic_action: "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=1200&q=85",
  dynamic_3d: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=1200&q=85",
  dynamic_split: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85",
};

const PREVIEW_POSITIONS: Record<string, string> = {
  luxury_showroom: "center 60%",
  luxury_velvet: "center 28%",
  lifestyle_living: "center 56%",
  lifestyle_bedroom: "center 55%",
  minimal_white: "center 58%",
  seasonal_blackfriday: "center 60%",
  editorial_magazine: "center 58%",
  editorial_catalog: "center 58%",
  editorial_architect: "center 58%",
};

const LIGHT_COPY_STYLES = new Set([
  "lifestyle_living",
  "lifestyle_bedroom",
  "minimal_white",
  "minimal_concrete",
  "minimal_paper",
  "seasonal_summer",
  "seasonal_valentine",
  "editorial_magazine",
  "editorial_catalog",
  "editorial_architect",
]);

const SPECIAL_COPY: Record<string, { eyebrow?: string; title: string; subtitle?: string }> = {
  luxury_showroom: { eyebrow: "CRAFTED FOR THE FEW", title: "DRIVE\nEXCELLENCE", subtitle: "Premium collection" },
  luxury_gold_burst: { eyebrow: "LUXURY EDITION", title: "GOLDEN\nGLOW", subtitle: "Designed to stand out" },
  luxury_velvet: { eyebrow: "SIGNATURE COLLECTION", title: "ROYAL\nVELVET", subtitle: "Quiet luxury" },
  lifestyle_living: { eyebrow: "BEAUTY. REFINED.", title: "MODERN\nSALON", subtitle: "Effortless lifestyle" },
  minimal_white: { eyebrow: "SIMPLE IS BEAUTIFUL.", title: "PURE FORM.", subtitle: "TIMELESS DESIGN." },
  neon_cyberpunk: { eyebrow: "NEW COLLECTION", title: "FUTURE\nIS NOW", subtitle: "Electric city edition" },
  seasonal_blackfriday: { eyebrow: "LIMITED TIME ONLY", title: "BLACK\nFRIDAY", subtitle: "UP TO 50% OFF" },
  editorial_magazine: { eyebrow: "TRENDS & INSPIRATION", title: "HOME &\nDECOR", subtitle: "2026 EDITION" },
};

export function CreativeTemplatePreview({ style, format }: CreativeTemplatePreviewProps) {
  const displayName = getCreativeStyleDisplayName(style);
  const descriptors = CATEGORY_DESCRIPTORS[style.category];
  const copy = SPECIAL_COPY[style.id] || {
    eyebrow: CATEGORY_LABELS[style.category].toUpperCase(),
    title: displayName.toUpperCase(),
    subtitle: descriptors.join(" · ").toUpperCase(),
  };
  const useDarkCopy = LIGHT_COPY_STYLES.has(style.id);
  const imageUrl = PREVIEW_IMAGES[style.id];

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100"
      style={{ background: style.previewGradient }}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
          style={{ objectPosition: PREVIEW_POSITIONS[style.id] || "center" }}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}

      <div
        className={
          useDarkCopy
            ? "absolute inset-0 bg-gradient-to-r from-white/90 via-white/55 to-transparent"
            : "absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent"
        }
      />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />

      <div className={`absolute left-5 top-5 max-w-[58%] ${useDarkCopy ? "text-slate-950" : "text-white"}`}>
        {copy.eyebrow && (
          <div className={`mb-2 text-[8px] font-bold tracking-[0.16em] ${useDarkCopy ? "text-slate-600" : "text-white/75"}`}>
            {copy.eyebrow}
          </div>
        )}
        <div
          className={`whitespace-pre-line text-[21px] font-black leading-[0.9] tracking-[-0.04em] ${
            style.category === "editorial" || style.category === "lifestyle" ? "font-serif font-semibold" : ""
          }`}
        >
          {copy.title}
        </div>
        {copy.subtitle && (
          <div className={`mt-2 text-[9px] font-semibold ${useDarkCopy ? "text-slate-600" : "text-white/80"}`}>
            {copy.subtitle}
          </div>
        )}
      </div>

      <div
        className={`absolute bottom-4 left-5 rounded-md px-2.5 py-1 text-[8px] font-bold tracking-wide shadow-sm ${
          useDarkCopy ? "bg-slate-950 text-white" : "bg-white text-slate-950"
        }`}
      >
        {style.category === "seasonal" ? "SHOP NOW" : "DISCOVER"}
      </div>

      <div className="absolute right-3 top-3 rounded-lg border border-white/40 bg-white/90 px-2 py-1 text-[9px] font-bold text-slate-700 shadow-sm backdrop-blur">
        {FORMAT_LABELS[format]}
      </div>
    </div>
  );
}
