import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { SeoExecutionBanner } from "@/components/seo/SeoExecutionBanner";
import { useTranslation } from "@/lib/language";

type ExecutionState = {
  title: string;
  message: string;
  imageUrls: string[];
};

const hasSparklesIcon = (button: HTMLButtonElement) =>
  Boolean(button.querySelector('svg.lucide-sparkles, svg[class*="lucide-sparkles"]'));

const uniqueUrls = (urls: string[]) => Array.from(new Set(urls.filter(Boolean))).slice(0, 8);

export function SeoWorkspaceExecutionBridge() {
  const { pathname, search } = useLocation();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [execution, setExecution] = useState<ExecutionState | null>(null);
  const cleanupWatchRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    cleanupWatchRef.current?.();
    cleanupWatchRef.current = null;
    setExecution(null);

    if (pathname !== "/seo") return;

    const workspace = document.querySelector<HTMLElement>(".catalog-workspace");
    if (!workspace) return;

    const stopCurrentWatch = () => {
      cleanupWatchRef.current?.();
      cleanupWatchRef.current = null;
      setExecution(null);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button") as HTMLButtonElement | null;
      if (!button || button.disabled || !workspace.contains(button) || !hasSparklesIcon(button)) return;

      stopCurrentWatch();

      const params = new URLSearchParams(search);
      const tab = params.get("tab") || "collections";
      const tabLabels: Record<string, string> = fr
        ? {
            collections: "Collections",
            pages: "Pages",
            articles: "Articles",
            tags: "Tags",
            alt: "Images ALT",
            homepage: "Page d’accueil",
          }
        : {
            collections: "Collections",
            pages: "Pages",
            articles: "Articles",
            tags: "Tags",
            alt: "Image ALT",
            homepage: "Homepage",
          };

      const row = button.closest("tr");
      const rowTitle = row?.querySelector<HTMLElement>("p.font-medium")?.textContent?.trim() || "";
      const rowImage = row?.querySelector<HTMLImageElement>("img")?.src || "";
      const visibleImages = Array.from(workspace.querySelectorAll<HTMLImageElement>("tbody img"))
        .map((image) => image.src)
        .filter(Boolean);
      const imageUrls = uniqueUrls([rowImage, ...visibleImages]);
      const tabLabel = tabLabels[tab] || "SEO";

      setExecution({
        title: fr ? `Optimisation SEO — ${tabLabel}` : `SEO optimization — ${tabLabel}`,
        message: rowTitle
          ? fr
            ? `Analyse et optimisation de « ${rowTitle} »…`
            : `Analyzing and optimizing “${rowTitle}”…`
          : fr
            ? `Traitement ${tabLabel} en cours…`
            : `${tabLabel} processing in progress…`,
        imageUrls,
      });

      let sawBusyState = false;
      const startedAt = Date.now();

      const getSparklesButtons = () =>
        Array.from(workspace.querySelectorAll<HTMLButtonElement>("button")).filter(hasSparklesIcon);

      const hasButtonLoader = () =>
        Array.from(workspace.querySelectorAll<SVGElement>("button svg.animate-spin")).some(
          (icon) => !icon.closest('[data-seo-execution-banner="true"]'),
        );

      const intervalId = window.setInterval(() => {
        const actionButtons = getSparklesButtons();
        const clickedStillMounted = document.documentElement.contains(button);
        const anyEnabledAction = actionButtons.some((actionButton) => !actionButton.disabled);
        const loaderActive = hasButtonLoader();

        if (button.disabled || loaderActive || (actionButtons.length > 0 && !anyEnabledAction)) {
          sawBusyState = true;
        }

        if (sawBusyState && !loaderActive && anyEnabledAction && Date.now() - startedAt > 350) {
          stopCurrentWatch();
          return;
        }

        if (!clickedStillMounted && Date.now() - startedAt > 500) {
          stopCurrentWatch();
          return;
        }

        if (!sawBusyState && Date.now() - startedAt > 1800) {
          stopCurrentWatch();
        }
      }, 120);

      const timeoutId = window.setTimeout(stopCurrentWatch, 300000);

      cleanupWatchRef.current = () => {
        window.clearInterval(intervalId);
        window.clearTimeout(timeoutId);
      };
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      cleanupWatchRef.current?.();
      cleanupWatchRef.current = null;
    };
  }, [fr, pathname, search]);

  if (pathname !== "/seo" || !execution) return null;

  return (
    <div data-seo-execution-banner="true" className="sticky top-14 z-40 mb-4 sm:top-16">
      <SeoExecutionBanner
        active
        title={execution.title}
        message={execution.message}
        progress={null}
        imageUrls={execution.imageUrls}
        className="shadow-lg"
      />
    </div>
  );
}

export default SeoWorkspaceExecutionBridge;
