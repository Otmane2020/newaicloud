import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const productGalleryEnglishGrid = () => ({
  name: "product-gallery-english-grid",
  transform(code: string, id: string) {
    if (!id.includes("/src/components/seo/ProductGalleryDialog.tsx")) return null;

    const replacements: Array<[string, string]> = [
      ["Galerie produit", "Product Gallery"],
      ["Uploader", "Upload"],
      ["Générer une ambiance depuis l’image", "Generate an AI background from image"],
      ["Ex. salon parisien élégant, lumière naturelle, parquet chevrons...", "E.g. elegant Parisian living room, natural light, herringbone flooring..."],
      ["Annuler", "Cancel"],
      ["Générer l’ambiance", "Generate AI background"],
      ["Aucune image", "No images"],
      ["Ajoutez une image pour démarrer la galerie produit.", "Add an image to start the product gallery."],
      ["Uploader une image", "Upload an image"],
      ["Toutes les images", "All images"],
      ["Cliquez sur une image pour l’agrandir. Glissez les cartes pour changer l’ordre.", "Click an image to enlarge it. Drag cards to change the order."],
      ["La première image est l’image principale", "The first image is the main image"],
      ["Principale", "Main"],
      ["Générer un fond blanc", "Generate white background"],
      ["Fond blanc", "White background"],
      ["Générer une ambiance IA", "Generate AI background"],
      ["Ambiance", "AI background"],
      ["Supprimer l’image de Shopify et de la galerie", "Delete image from Shopify and gallery"],
      ["Supprimer", "Delete"],
      ["Images de variantes non présentes dans la galerie", "Variant images not included in the gallery"],
      ["Image ajoutée et synchronisée avec Shopify", "Image added and synced with Shopify"],
      ["Image ajoutée à la galerie", "Image added to the gallery"],
      ["Image ajoutée à la galerie, mais la synchronisation Shopify a échoué", "Image added to the gallery, but Shopify sync failed"],
      ["Génération du fond blanc...", "Generating white background..."],
      ["Aucune image générée", "No image was generated"],
      ["Fond blanc IA", "AI white background"],
      ["Fond blanc généré", "White background generated"],
      ["Impossible de générer le fond blanc", "Could not generate white background"],
      ["Ajoutez une description d’ambiance", "Add an AI background description"],
      ["Création de l’ambiance IA...", "Generating AI background..."],
      ["Ambiance IA", "AI background"],
      ["Ambiance générée", "AI background generated"],
      ["Impossible de générer l’ambiance", "Could not generate AI background"],
      ["Sélectionnez un fichier image", "Select an image file"],
      ["L’image ne doit pas dépasser 12 Mo", "The image must not exceed 12 MB"],
      ["Upload de l’image...", "Uploading image..."],
      ["Image uploadée", "Image uploaded"],
      ["Upload impossible", "Upload failed"],
      ["Suppression dans Shopify...", "Deleting from Shopify..."],
      ["Suppression de l’image...", "Deleting image..."],
      ["Shopify n’a pas confirmé la suppression", "Shopify did not confirm the deletion"],
      ["Image supprimée de Shopify et de la galerie", "Image deleted from Shopify and the gallery"],
      ["Image supprimée de la galerie", "Image deleted from the gallery"],
      ["Suppression annulée : l’image est conservée", "Deletion cancelled: the image was kept"],
      ["Synchronisation de la suppression avec Shopify...", "Syncing deletion with Shopify..."],
      ["Génération de l’ambiance...", "Generating AI background..."],
      ["Upload et synchronisation...", "Uploading and syncing..."],
      ["Synchronisation de la galerie...", "Syncing gallery..."],
      ["grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"],
    ];

    let transformed = code;
    for (const [from, to] of replacements) {
      transformed = transformed.split(from).join(to);
    }

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
    productGalleryEnglishGrid(),
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
