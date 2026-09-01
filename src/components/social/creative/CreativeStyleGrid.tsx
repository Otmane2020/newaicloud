import { useEffect, useState } from "react";
import { Bookmark, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CREATIVE_STYLES,
  getCategories,
  type CreativeStyle,
} from "../templates/creativeStyles";
import {
  CreativeTemplatePreview,
  type CreativeOutputFormat,
} from "./CreativeTemplatePreview";
import {
  CATEGORY_DESCRIPTORS,
  CATEGORY_LABELS,
  getCreativeStyleDisplayName,
} from "./creativeStyleDisplay";

interface CreativeStyleGridProps {
  selectedStyle: CreativeStyle | null;
  onSelectStyle: (style: CreativeStyle) => void;
}

const PAGE_SIZE = 9;

const OUTPUT_FORMATS: Array<{
  id: CreativeOutputFormat;
  label: string;
  ratio: string;
}> = [
  { id: "square", label: "Square", ratio: "1:1" },
  { id: "portrait", label: "Instagram", ratio: "4:5" },
  { id: "story", label: "Story", ratio: "9:16" },
  { id: "landscape", label: "Landscape", ratio: "16:9" },
];

const CATEGORY_TONES: Record<string, string> = {
  luxury: "bg-violet-50 text-violet-700",
  lifestyle: "bg-rose-50 text-rose-700",
  minimal: "bg-sky-50 text-sky-700",
  neon: "bg-fuchsia-50 text-fuchsia-700",
  seasonal: "bg-emerald-50 text-emerald-700",
  editorial: "bg-amber-50 text-amber-700",
  dynamic: "bg-orange-50 text-orange-700",
};

export function CreativeStyleGrid({ selectedStyle, onSelectStyle }: CreativeStyleGridProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [outputFormat, setOutputFormat] = useState<CreativeOutputFormat>(() => {
    const current = selectedStyle?.size as CreativeOutputFormat | undefined;
    return current && OUTPUT_FORMATS.some((format) => format.id === current) ? current : "square";
  });

  const categories = getCategories();
  const filteredStyles = CREATIVE_STYLES.filter(
    (style) => activeCategory === "all" || style.category === activeCategory,
  );
  const totalPages = Math.max(1, Math.ceil(filteredStyles.length / PAGE_SIZE));
  const paginatedStyles = filteredStyles.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const selectStyle = (style: CreativeStyle) => {
    onSelectStyle({
      ...style,
      name: getCreativeStyleDisplayName(style),
      size: outputFormat as CreativeStyle["size"],
    });
  };

  const changeOutputFormat = (nextFormat: CreativeOutputFormat) => {
    setOutputFormat(nextFormat);

    if (selectedStyle) {
      const baseStyle = CREATIVE_STYLES.find((style) => style.id === selectedStyle.id) || selectedStyle;
      onSelectStyle({
        ...baseStyle,
        name: getCreativeStyleDisplayName(baseStyle),
        size: nextFormat as CreativeStyle["size"],
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={cn(
              "h-9 rounded-xl border px-4 text-xs font-semibold transition",
              activeCategory === "all"
                ? "border-violet-600 bg-violet-600 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700",
            )}
          >
            All
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                "h-9 rounded-xl border px-4 text-xs font-semibold transition",
                activeCategory === category.id
                  ? "border-violet-600 bg-violet-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700",
              )}
            >
              {CATEGORY_LABELS[category.id]}
            </button>
          ))}
        </div>

        <div className="flex w-fit items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/70 p-1">
          {OUTPUT_FORMATS.map((format) => (
            <button
              key={format.id}
              type="button"
              onClick={() => changeOutputFormat(format.id)}
              title={`${format.label} ${format.ratio}`}
              className={cn(
                "min-w-[54px] rounded-lg px-3 py-2 text-xs font-semibold transition",
                outputFormat === format.id
                  ? "bg-white text-violet-700 shadow-sm ring-1 ring-violet-200"
                  : "text-slate-500 hover:bg-white hover:text-slate-800",
              )}
            >
              {format.ratio}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Visual templates</p>
          <p className="text-xs text-slate-500">
            Choose a professional style. The selected format applies to any template.
          </p>
        </div>
        <div className="hidden text-xs font-medium text-slate-400 sm:block">
          {filteredStyles.length} templates{totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : ""}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {paginatedStyles.map((style) => {
          const isSelected = selectedStyle?.id === style.id;
          const formatLabel = OUTPUT_FORMATS.find((format) => format.id === outputFormat)?.ratio || "1:1";
          const displayName = getCreativeStyleDisplayName(style);
          const descriptors = CATEGORY_DESCRIPTORS[style.category];

          return (
            <article
              key={style.id}
              className={cn(
                "group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200",
                "hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg",
                isSelected ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200",
              )}
            >
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => selectStyle(style)}
                aria-label={`Use ${displayName}`}
              >
                <div className="relative">
                  <CreativeTemplatePreview style={style} format={outputFormat} />
                  {isSelected && (
                    <div className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-violet-600 text-white shadow-lg">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </button>

              <div className="space-y-3 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{displayName}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={cn("rounded-md px-2 py-1 text-[10px] font-semibold", CATEGORY_TONES[style.category])}>
                        {CATEGORY_LABELS[style.category]}
                      </span>
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500">
                        {descriptors.join(" · ")}
                      </span>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">
                    {formatLabel}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="h-9 flex-1 rounded-xl bg-violet-600 text-xs font-semibold hover:bg-violet-700"
                    onClick={() => selectStyle(style)}
                  >
                    {isSelected ? "Selected" : "Use template"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-xl border-slate-200 text-slate-500"
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Save ${displayName}`}
                  >
                    <Bookmark className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filteredStyles.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-12 text-center text-sm text-slate-500">
          No templates found for this category.
        </div>
      )}

      {filteredStyles.length > 0 && totalPages > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-2 pt-1" aria-label="Template pagination">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200 px-3 text-xs font-semibold text-slate-600"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>

          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              aria-current={page === currentPage ? "page" : undefined}
              className={cn(
                "grid h-9 min-w-9 place-items-center rounded-xl border px-3 text-xs font-bold transition",
                page === currentPage
                  ? "border-violet-600 bg-violet-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700",
              )}
            >
              {page}
            </button>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200 px-3 text-xs font-semibold text-slate-600"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}
