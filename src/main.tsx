import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import PublicGeoBlog from "./pages/PublicGeoBlog";
import "./index.css";
import "./styles/workspace-stat-colors.css";
import "./styles/ai-image-studio.css";
import "./styles/auth-social-hide.css";
import { installImageStudioPolish } from "./lib/imageStudioPolish";

installImageStudioPolish();

// This is an authenticated back-office, not an offline-first PWA. Remove legacy
// service workers and caches so Lovable previews always load the latest bundle.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}
if ("caches" in window) {
  caches.keys().then((keys) => {
    keys.filter((key) => /workbox|vite|supabase-cache|google-fonts-cache/i.test(key)).forEach((key) => caches.delete(key));
  });
}

// /blog is the public, crawlable editorial hub. Keep the authenticated product
// routes such as /blog/management inside the normal application router.
const normalizedPath = window.location.pathname.replace(/\/+$/, "") || "/";
const isPublicBlog =
  normalizedPath === "/blog" ||
  (normalizedPath.startsWith("/blog/") && normalizedPath !== "/blog/management");

createRoot(document.getElementById("root")!).render(
  isPublicBlog ? <PublicGeoBlog /> : <App />
);
