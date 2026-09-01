import { useId } from "react";
import { cn } from "@/lib/utils";

type CatalogOptimizeLogoProps = {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeStyles = {
  sm: {
    icon: "h-8 w-8",
    wordmark: "text-[15px]",
    badge: "px-1.5 py-0.5 text-[9px]",
    subtitle: "text-[9px]",
    gap: "gap-2",
  },
  md: {
    icon: "h-10 w-10",
    wordmark: "text-[17px] sm:text-[18px]",
    badge: "px-1.5 py-0.5 text-[10px]",
    subtitle: "text-[10px]",
    gap: "gap-2.5",
  },
  lg: {
    icon: "h-14 w-14",
    wordmark: "text-[21px] sm:text-[23px]",
    badge: "px-2 py-1 text-[10px]",
    subtitle: "text-[11px]",
    gap: "gap-3",
  },
} as const;

export function CatalogOptimizeLogo({
  compact = false,
  inverse = false,
  className,
  size = "md",
}: CatalogOptimizeLogoProps) {
  const gradientId = `catalogue-ai-gradient-${useId().replace(/:/g, "")}`;
  const styles = sizeStyles[size];

  return (
    <div
      className={cn("flex min-w-0 items-center", styles.gap, className)}
      aria-label="CatalogueOptimize AI"
    >
      <svg
        viewBox="0 0 48 48"
        className={cn("shrink-0", styles.icon)}
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="7" y1="7" x2="41" y2="41" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7C3AED" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${gradientId})`} />
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
        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span
              className={cn(
                "font-semibold tracking-[-0.025em]",
                styles.wordmark,
                inverse ? "text-white" : "text-slate-950",
              )}
            >
              CatalogueOptimize
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-md bg-gradient-to-r from-violet-600 to-blue-600 font-bold leading-none tracking-[0.08em] text-white",
                styles.badge,
              )}
            >
              AI
            </span>
          </div>
          <p
            className={cn(
              "mt-0.5 whitespace-nowrap font-medium tracking-[0.025em]",
              styles.subtitle,
              inverse ? "text-slate-400" : "text-slate-500",
            )}
          >
            Product operations
          </p>
        </div>
      )}
    </div>
  );
}
