import { cn } from "@/lib/utils";

type CatalogOptimizeLogoProps = {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
};

export function CatalogOptimizeLogo({ compact = false, inverse = false, className }: CatalogOptimizeLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)} aria-label="CatalogOptimize AI">
      <svg
        viewBox="0 0 48 48"
        className="h-10 w-10 shrink-0"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="catalog-ai-gradient" x1="7" y1="7" x2="41" y2="41" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7C3AED" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#catalog-ai-gradient)" />
        <path
          d="M31.5 15.5a13 13 0 1 0 0 17"
          fill="none"
          stroke="white"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        <path d="M34 9.5l1.7 4.3 4.3 1.7-4.3 1.7-1.7 4.3-1.7-4.3-4.3-1.7 4.3-1.7L34 9.5Z" fill="#C4B5FD" />
        <circle cx="25" cy="24" r="3.2" fill="white" />
      </svg>

      {!compact && (
        <div className="min-w-0 leading-none">
          <div className="flex items-center gap-2">
            <span className={cn("whitespace-nowrap text-[17px] font-bold tracking-[-0.035em]", inverse ? "text-white" : "text-slate-950")}>
              CatalogOptimize
            </span>
            <span className="rounded-md bg-gradient-to-r from-violet-600 to-blue-600 px-1.5 py-1 text-[10px] font-extrabold tracking-wider text-white">
              AI
            </span>
          </div>
          <p className={cn("mt-1 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.18em]", inverse ? "text-slate-400" : "text-slate-500")}>
            Product Operations
          </p>
        </div>
      )}
    </div>
  );
}
