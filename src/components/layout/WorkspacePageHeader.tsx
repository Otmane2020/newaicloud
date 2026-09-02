import { type ReactNode, useEffect } from "react";
import { PanelsTopLeft, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import "@/styles/product-title-description-theme.css";

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
  const { pathname } = useLocation();
  const showLandingPagesCta = pathname === "/products";
  const isProductWorkspace = pathname === "/products/title-description";

  useEffect(() => {
    if (!isProductWorkspace) return;
    document.body.classList.add("catalog-product-workspace-theme");
    return () => document.body.classList.remove("catalog-product-workspace-theme");
  }, [isProductWorkspace]);

  if (isProductWorkspace) {
    return (
      <>
        <style>{`
          header[data-catalog-product-workspace="true"],
          header[data-catalog-product-workspace="true"] + nav {
            display: none !important;
          }
        `}</style>
        <header
          data-ui-version="catalog-product-header-removed-v1"
          data-catalog-product-workspace="true"
          aria-hidden="true"
        />
      </>
    );
  }

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

        {(actions || showLandingPagesCta) && (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end [&_button]:h-9 [&_button]:rounded-lg [&_button]:px-3 [&_button]:text-sm">
            {actions}
            {showLandingPagesCta && (
              <Link
                to="/products/title-description?view=landing"
                className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 sm:w-auto"
                aria-label="Generate landing pages"
              >
                <span className="relative grid h-6 w-6 place-items-center rounded-lg bg-white/15 ring-1 ring-white/20">
                  <PanelsTopLeft className="h-3.5 w-3.5" />
                  <Sparkles className="absolute -right-1 -top-1 h-2.5 w-2.5 transition-transform duration-200 group-hover:scale-125" />
                </span>
                <span>Generate landing pages</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
