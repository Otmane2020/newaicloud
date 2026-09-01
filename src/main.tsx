import { createRoot } from "react-dom/client";
import App from "./App.tsx";
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

createRoot(document.getElementById("root")!).render(
  <App />
);
