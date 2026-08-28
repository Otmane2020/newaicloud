import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface WorkspacePageHeaderProps {
  section: string;
  page: string;
  count?: number | string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function WorkspacePageHeader({
  section,
  page,
  count,
  title,
  description,
  actions,
}: WorkspacePageHeaderProps) {
  return (
    <header
      data-ui-version="catalog-light-banner-v3"
      className="relative overflow-hidden rounded-[24px] border border-violet-100 bg-gradient-to-br from-white via-violet-50/70 to-blue-50/70 px-5 py-5 shadow-[0_14px_40px_-30px_rgba(76,29,149,0.45)] sm:px-6 sm:py-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-20 h-44 w-44 rounded-full bg-violet-200/35 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/3 h-44 w-44 rounded-full bg-blue-200/25 blur-3xl"
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-violet-100 bg-white text-violet-600 shadow-sm">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <div className="inline-flex flex-wrap items-center overflow-hidden rounded-xl border border-violet-100/80 bg-white/80 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-sm sm:text-sm">
              <span className="px-3 py-2">{section}</span>
              <span className="text-slate-300">·</span>
              <span className="px-3 py-2 text-slate-800">{page}</span>
              {count !== undefined && (
                <span className="border-l border-violet-100 bg-violet-100/70 px-3 py-2 text-violet-700">
                  {count}
                </span>
              )}
            </div>
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
