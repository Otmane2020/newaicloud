const IMAGE_STUDIO_PATH = "/products/title-description";

let lastForcedRoute: string | null = null;
let scheduled = false;

const isImageStudioRoute = () => {
  if (window.location.pathname !== IMAGE_STUDIO_PATH) return false;
  return new URLSearchParams(window.location.search).get("view") === "images";
};

const normalize = (value: string | null | undefined) => (value || "").replace(/\s+/g, " ").trim().toLowerCase();

const hasAnyText = (element: Element, values: string[]) => {
  const text = normalize(element.textContent);
  return values.some((value) => text.includes(normalize(value)));
};

const findBorderContainer = (element: Element | null, stopAt: Element) => {
  let current = element?.parentElement || null;
  while (current && current !== stopAt) {
    if (typeof current.className === "string" && current.className.includes("border")) return current;
    current = current.parentElement;
  }
  return null;
};

const markStudioBlocks = (page: HTMLElement) => {
  page.setAttribute("data-ai-image-studio-page", "true");

  const buttons = Array.from(page.querySelectorAll("button"));
  const whiteBackgroundButton = buttons.find((button) => hasAnyText(button, ["White background", "Fond blanc"]));
  const toolsSection = whiteBackgroundButton?.closest("section");
  if (toolsSection && toolsSection.querySelectorAll("button").length >= 4) {
    toolsSection.setAttribute("data-studio-tools", "true");
  }

  const optimizedLabel = Array.from(page.querySelectorAll("p, span")).find((element) =>
    hasAnyText(element, ["Optimized", "Optimisé"]) && !hasAnyText(element, ["Not optimized", "Non optimisé"]),
  );
  const kpiGrid = optimizedLabel?.closest(".grid");
  if (kpiGrid) {
    kpiGrid.setAttribute("data-studio-kpis", "true");
    const totalBlock = kpiGrid.previousElementSibling;
    if (totalBlock instanceof HTMLElement) totalBlock.setAttribute("data-studio-total", "true");
  }

  const actionTitle = Array.from(page.querySelectorAll("p, h2, h3")).find((element) =>
    hasAnyText(element, ["Create and improve visuals", "Créer et améliorer les visuels"]),
  );
  const actionBar = findBorderContainer(actionTitle || null, page);
  if (actionBar) actionBar.setAttribute("data-studio-actions", "true");

  const searchInput = Array.from(page.querySelectorAll("input")).find((input) => {
    const placeholder = normalize(input.getAttribute("placeholder"));
    return placeholder.includes("search") || placeholder.includes("recher");
  });
  if (searchInput) {
    let current = searchInput.parentElement;
    while (current && current !== page) {
      if (typeof current.className === "string" && current.className.includes("bg-muted/30")) {
        current.setAttribute("data-studio-filters", "true");
        break;
      }
      current = current.parentElement;
    }
  }

  const table = page.querySelector("table");
  if (table) {
    table.setAttribute("data-studio-product-table", "true");
    const scroller = table.closest("div.max-h\\[600px\\]") || table.parentElement;
    if (scroller instanceof HTMLElement) scroller.setAttribute("data-studio-table-scroll", "true");
  }
};

const forceListAsInitialView = (page: HTMLElement) => {
  const routeKey = `${window.location.pathname}${window.location.search}`;
  if (lastForcedRoute === routeKey) return;

  // If a table is already rendered, the preferred list view is already active.
  if (page.querySelector("table")) {
    lastForcedRoute = routeKey;
    return;
  }

  const listIcon = page.querySelector("svg.lucide-list");
  const listButton = listIcon?.closest("button");
  if (listButton instanceof HTMLButtonElement && !listButton.disabled) {
    lastForcedRoute = routeKey;
    listButton.click();
  }
};

const cleanLeakedMarkupPreviews = (page: HTMLElement) => {
  const french = document.documentElement.lang.toLowerCase().startsWith("fr");
  const replacement = french ? "Contenu produit enrichi" : "Rich product content";

  page.querySelectorAll("table p[data-no-translate], table p.text-sm").forEach((element) => {
    if (element.getAttribute("data-studio-cleaned") === "true") return;
    const text = element.textContent || "";
    const looksLikeCssOrMarkup =
      /\.dh-[a-z0-9_-]*\s*\{/i.test(text) ||
      /--(?:ink|muted|sand|soft|gold)\s*:/i.test(text) ||
      /<(?:style|script|section|article|div)\b/i.test(text) ||
      /\{\s*--[a-z0-9_-]+\s*:/i.test(text);

    if (looksLikeCssOrMarkup) {
      element.textContent = replacement;
      element.setAttribute("data-studio-cleaned", "true");
      element.setAttribute("title", french ? "Le HTML/CSS de la landing page est masqué dans cette liste." : "Landing-page HTML/CSS is hidden in this list.");
    }
  });
};

const applyImageStudioPolish = () => {
  scheduled = false;
  document.body.toggleAttribute("data-ai-image-studio-route", isImageStudioRoute());

  if (!isImageStudioRoute()) {
    lastForcedRoute = null;
    document.querySelectorAll("[data-ai-image-studio-page]").forEach((element) => element.removeAttribute("data-ai-image-studio-page"));
    return;
  }

  const title = Array.from(document.querySelectorAll("h1, h2")).find((element) => normalize(element.textContent) === "ai image studio");
  const page = title?.closest(".mx-auto") as HTMLElement | null;
  if (!page) return;

  markStudioBlocks(page);
  forceListAsInitialView(page);
  cleanLeakedMarkupPreviews(page);
};

const scheduleApply = () => {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(applyImageStudioPolish);
};

export const installImageStudioPolish = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const runtimeWindow = window as Window & { __imageStudioPolishInstalled?: boolean };
  if (runtimeWindow.__imageStudioPolishInstalled) return;
  runtimeWindow.__imageStudioPolishInstalled = true;

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", scheduleApply);
  scheduleApply();
};
