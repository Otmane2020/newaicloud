import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CatalogActionCardProps {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function CatalogActionCard({
  icon: Icon,
  title,
  description,
  meta,
  action,
  className,
  compact = false,
}: CatalogActionCardProps) {
  return (
    <div
      className={cn(
        "w-full rounded-[22px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]",
        compact ? "px-5 py-6 sm:px-7" : "px-6 py-8 sm:px-8 sm:py-10",
        className,
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <div
          className={cn(
            "flex items-center justify-center rounded-2xl bg-violet-50 text-violet-600",
            compact ? "mb-4 h-10 w-10" : "mb-5 h-12 w-12",
          )}
        >
          <Icon className={compact ? "h-5 w-5" : "h-7 w-7"} />
        </div>

        <div className={cn("font-bold tracking-tight text-slate-900", compact ? "text-lg" : "text-xl sm:text-2xl")}>
          {title}
        </div>

        {description && (
          <div className={cn("mt-2 max-w-xl leading-6 text-slate-500", compact ? "text-sm" : "text-sm sm:text-base")}>
            {description}
          </div>
        )}

        {meta && <div className="mt-4 text-xs leading-5 text-slate-500 sm:text-sm">{meta}</div>}
        {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
