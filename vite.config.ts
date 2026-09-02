import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const productOptimizerDefaults = () => ({
  name: "product-optimizer-defaults",
  transform(code: string, id: string) {
    if (!id.includes("/src/pages/ProductTitleDescription.tsx")) return null;

    const transformed = code
      .replace("const ITEMS_PER_PAGE = 50;", "const ITEMS_PER_PAGE = 12;")
      .replace("useState<2 | 3 | 4>(2)", "useState<2 | 3 | 4>(3)");

    return transformed === code ? null : { code: transformed, map: null };
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    productOptimizerDefaults(),
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
