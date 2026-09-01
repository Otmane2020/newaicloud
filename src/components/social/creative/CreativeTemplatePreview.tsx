import { type CreativeStyle } from "../templates/creativeStyles";

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

const SPECIAL_COPY: Record<string, { eyebrow?: string; title: string; subtitle?: string }> = {
  luxury_showroom: { eyebrow: "CRAFTED FOR THE FEW", title: "DRIVE\nEXCELLENCE", subtitle: "Premium collection" },
  lifestyle_living: { eyebrow: "BEAUTY. REFINED.", title: "SALON\nMODERNE", subtitle: "Modern lifestyle" },
  minimal_white: { eyebrow: "SIMPLE IS BEAUTIFUL.", title: "PURE FORM.", subtitle: "TIMELESS DESIGN." },
  neon_cyberpunk: { eyebrow: "NEW COLLECTION", title: "FUTURE\nIS NOW", subtitle: "Electric city edition" },
  seasonal_blackfriday: { eyebrow: "LIMITED TIME ONLY", title: "BLACK\nFRIDAY", subtitle: "UP TO 50% OFF" },
  editorial_magazine: { eyebrow: "TENDANCES & INSPIRATIONS", title: "MAISON\nDÉCO", subtitle: "ÉDITION 2026" },
};

function DefaultScene({ style }: { style: CreativeStyle }) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{ background: style.previewGradient }}
      />
      <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute -bottom-14 -left-8 h-40 w-40 rounded-full bg-black/10 blur-2xl" />
      <div className="absolute inset-x-[20%] bottom-[18%] h-[14%] rounded-[50%] bg-black/20 blur-md" />
      <div
        className="absolute bottom-[20%] left-1/2 h-[34%] w-[42%] -translate-x-1/2 rounded-[28px] border border-white/30 bg-white/15 shadow-2xl backdrop-blur-sm"
        style={{ boxShadow: `0 22px 45px ${style.accentColor}35` }}
      >
        <div className="absolute left-[12%] right-[12%] top-[12%] h-[12%] rounded-full bg-white/35" />
        <div className="absolute bottom-[10%] left-[12%] h-[7%] w-[30%] rounded-full bg-black/25" />
      </div>
    </>
  );
}

function LuxuryScene({ style }: { style: CreativeStyle }) {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(191,145,63,0.25),transparent_28%),linear-gradient(145deg,#08090d_0%,#18191d_52%,#050506_100%)]" />
      <div className="absolute left-[13%] right-[13%] top-[8%] h-[17%] rounded-[50%] border-[5px] border-amber-100/80 shadow-[0_0_28px_rgba(251,191,36,.45)]" />
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[linear-gradient(165deg,rgba(255,255,255,.08),rgba(255,255,255,0)_42%)]" />
      <div className="absolute bottom-[17%] right-[10%] h-[22%] w-[45%] rounded-[48%_55%_28%_28%] bg-gradient-to-b from-zinc-500 to-zinc-950 shadow-[0_20px_45px_rgba(0,0,0,.7)]">
        <div className="absolute -left-[7%] bottom-[-10%] h-[32%] w-[20%] rounded-full border-4 border-zinc-700 bg-zinc-950" />
        <div className="absolute right-[5%] bottom-[-10%] h-[32%] w-[20%] rounded-full border-4 border-zinc-700 bg-zinc-950" />
        <div className="absolute right-[8%] top-[20%] h-[10%] w-[15%] rounded-full bg-amber-100 shadow-[0_0_15px_rgba(253,230,138,.75)]" />
      </div>
      <div className="absolute bottom-[9%] right-[4%] h-px w-[58%] bg-gradient-to-l from-amber-200/70 to-transparent" />
      <div className="absolute bottom-[5%] right-[7%] h-[7%] w-[52%] rounded-full bg-amber-200/10 blur-md" />
      <div className="absolute inset-0 opacity-40" style={{ boxShadow: `inset 0 0 70px ${style.accentColor}15` }} />
    </>
  );
}

function LifestyleScene() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0e6d8] via-[#d9c7b2] to-[#bba38c]" />
      <div className="absolute right-0 top-0 h-full w-[48%] bg-gradient-to-b from-[#7b4e38] via-[#b77857] to-[#e7c5aa]" />
      <div className="absolute right-[8%] top-[7%] h-[48%] w-[28%] rounded-[48%_48%_46%_46%] bg-gradient-to-b from-[#3b231a] via-[#6d3c28] to-[#d19a7b] shadow-xl" />
      <div className="absolute bottom-[10%] left-[5%] h-[27%] w-[58%] rounded-[32px_32px_10px_10px] bg-[#e6ddcf] shadow-[0_15px_32px_rgba(72,52,38,.18)]" />
      <div className="absolute bottom-[27%] left-[10%] h-[22%] w-[22%] rounded-[24px] bg-[#efe8de]" />
      <div className="absolute bottom-[28%] left-[33%] h-[21%] w-[21%] rounded-[24px] bg-[#d4c5b4]" />
      <div className="absolute -bottom-4 left-[2%] h-[34%] w-[16%] rounded-full bg-emerald-900/35 blur-[1px]" />
    </>
  );
}

function MinimalScene() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-[#fff] via-[#f7f3ed] to-[#ddd5ca]" />
      <div className="absolute right-[14%] top-[9%] h-[70%] w-[2px] rotate-[34deg] bg-white shadow-[0_0_42px_18px_rgba(255,255,255,.9)]" />
      <div className="absolute bottom-[13%] right-[16%] h-[42%] w-[22%] rounded-[46%_46%_38%_38%] bg-gradient-to-r from-[#c8bcae] to-[#f1ebe2] shadow-[0_18px_25px_rgba(99,83,67,.18)]" />
      <div className="absolute bottom-[52%] right-[20%] h-[19%] w-[14%] rounded-t-full border-l border-[#7d7852]" />
      <div className="absolute bottom-[20%] right-[42%] h-[10%] w-[27%] rounded-[50%] bg-[#dfd6ca] shadow-[0_8px_12px_rgba(99,83,67,.15)]" />
    </>
  );
}

function NeonScene() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_32%,rgba(236,72,153,.32),transparent_25%),linear-gradient(180deg,#09051f_0%,#171049_55%,#060713_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[45%] bg-[linear-gradient(rgba(34,211,238,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(217,70,239,.22)_1px,transparent_1px)] bg-[size:24px_18px] [transform:perspective(180px)_rotateX(55deg)] [transform-origin:bottom]" />
      <div className="absolute left-[8%] top-[10%] h-[55%] w-[15%] bg-fuchsia-950/60 shadow-[0_0_20px_rgba(217,70,239,.45)]" />
      <div className="absolute left-[25%] top-[18%] h-[47%] w-[10%] bg-cyan-950/70 shadow-[0_0_20px_rgba(34,211,238,.35)]" />
      <div className="absolute bottom-[12%] right-[8%] h-[19%] w-[42%] rounded-[45%_55%_25%_25%] bg-zinc-950 shadow-[0_0_22px_rgba(236,72,153,.5)]">
        <div className="absolute bottom-[5%] left-[10%] h-[4px] w-[20%] rounded-full bg-fuchsia-500 shadow-[0_0_12px_3px_rgba(236,72,153,.8)]" />
        <div className="absolute bottom-[5%] right-[10%] h-[4px] w-[20%] rounded-full bg-cyan-400 shadow-[0_0_12px_3px_rgba(34,211,238,.8)]" />
      </div>
    </>
  );
}

function BlackFridayScene() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-black via-[#151515] to-[#060606]" />
      <div className="absolute right-[4%] top-[7%] h-[55%] w-[28%] rotate-6 bg-gradient-to-b from-zinc-700 to-black shadow-2xl" />
      <div className="absolute bottom-[9%] right-[8%] h-[24%] w-[28%] bg-gradient-to-br from-[#d52222] to-[#4f0707] shadow-xl" />
      <div className="absolute bottom-[9%] right-[19%] h-[24%] w-[5%] bg-red-100/75" />
      <div className="absolute bottom-[18%] right-[8%] h-[5%] w-[28%] bg-red-100/75" />
      <div className="absolute -right-12 top-[40%] h-[2px] w-[58%] -rotate-12 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,.7)]" />
    </>
  );
}

function EditorialScene() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-[#f2e4cf] via-[#d8c1a3] to-[#b58f69]" />
      <div className="absolute right-[6%] top-0 h-full w-[35%] bg-white/28" />
      <div className="absolute bottom-[14%] right-[7%] h-[31%] w-[53%] rounded-[28px_28px_10px_10px] bg-[#ded0bc] shadow-[0_20px_40px_rgba(91,65,42,.25)]" />
      <div className="absolute bottom-[33%] right-[13%] h-[19%] w-[18%] rounded-[18px] bg-[#efe6d8]" />
      <div className="absolute bottom-[34%] right-[33%] h-[18%] w-[18%] rounded-[18px] bg-[#c5ad91]" />
      <div className="absolute bottom-[16%] right-[64%] h-[30%] w-[5%] rounded-full bg-[#4d5c3f]" />
      <div className="absolute bottom-[35%] right-[61%] h-[22%] w-[12%] rounded-full bg-[#657952]" />
    </>
  );
}

export function CreativeTemplatePreview({ style, format }: CreativeTemplatePreviewProps) {
  const copy = SPECIAL_COPY[style.id] || {
    eyebrow: style.moodKeywords.slice(0, 2).join(" · ").toUpperCase(),
    title: style.name.toUpperCase(),
    subtitle: style.moodKeywords[2] || style.category,
  };

  const renderScene = () => {
    if (style.id === "seasonal_blackfriday") return <BlackFridayScene />;
    if (style.id === "editorial_magazine") return <EditorialScene />;
    if (style.id === "luxury_showroom" || style.category === "luxury") return <LuxuryScene style={style} />;
    if (style.id === "lifestyle_living" || style.category === "lifestyle") return <LifestyleScene />;
    if (style.id === "minimal_white" || style.category === "minimal") return <MinimalScene />;
    if (style.id === "neon_cyberpunk" || style.category === "neon") return <NeonScene />;
    return <DefaultScene style={style} />;
  };

  const darkText = style.category === "minimal" || style.category === "lifestyle" || style.category === "editorial";

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
      {renderScene()}

      <div className={`absolute left-5 top-5 max-w-[55%] ${darkText ? "text-slate-900" : "text-white"}`}>
        {copy.eyebrow && (
          <div className={`mb-2 text-[8px] font-semibold tracking-[0.16em] ${darkText ? "text-slate-600" : "text-white/65"}`}>
            {copy.eyebrow}
          </div>
        )}
        <div className={`whitespace-pre-line text-[21px] font-black leading-[0.9] tracking-[-0.04em] ${style.category === "editorial" || style.category === "lifestyle" ? "font-serif font-semibold" : ""}`}>
          {copy.title}
        </div>
        {copy.subtitle && (
          <div className={`mt-2 text-[9px] font-medium ${darkText ? "text-slate-600" : "text-white/75"}`}>
            {copy.subtitle}
          </div>
        )}
      </div>

      <div className={`absolute bottom-4 left-5 rounded-md px-2.5 py-1 text-[8px] font-bold tracking-wide shadow-sm ${darkText ? "bg-slate-900 text-white" : "bg-white text-slate-950"}`}>
        {style.category === "seasonal" ? "SHOP NOW" : "DISCOVER"}
      </div>

      <div className="absolute right-3 top-3 rounded-lg border border-white/30 bg-white/85 px-2 py-1 text-[9px] font-bold text-slate-700 shadow-sm backdrop-blur">
        {FORMAT_LABELS[format]}
      </div>
    </div>
  );
}
