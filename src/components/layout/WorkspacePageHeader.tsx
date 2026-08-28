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
    <header data-ui-version="simple-headers-v2" className="space-y-5 py-1 sm:py-2">
      <div className="inline-flex items-center overflow-hidden rounded-lg bg-slate-100 text-sm font-medium text-slate-700">
        <span className="px-3 py-2">{section} <span className="px-1 text-slate-400">·</span> {page}</span>
        {count !== undefined && <span className="bg-violet-50 px-3 py-2 text-violet-700">{count}</span>}
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
          {description && <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
