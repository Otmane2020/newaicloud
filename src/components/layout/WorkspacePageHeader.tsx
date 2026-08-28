import type { ReactNode } from "react";

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
    <header data-ui-version="catalog-compact-header-v1" className="py-1">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
            <span>{section}</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700">{page}</span>
            {count !== undefined && (
              <span className="ml-1 rounded-md bg-slate-100 px-2 py-0.5 tabular-nums text-slate-600">
                {count}
              </span>
            )}
          </div>

          <h1 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end [&_button]:h-9 [&_button]:rounded-lg [&_button]:px-3 [&_button]:text-sm">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
