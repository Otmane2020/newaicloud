import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Package, Tag, Image, FileText, DollarSign, Truck } from "lucide-react";
import { useTranslation } from "@/lib/language";

interface ShopifyOptimizationGuideProps {
  open: boolean;
  onClose: () => void;
}

export function ShopifyOptimizationGuide({ open, onClose }: ShopifyOptimizationGuideProps) {
  const { language } = useTranslation();
  const fr = language === "fr";

  const sections = [
    {
      id: "gtins",
      icon: Package,
      title: fr ? "Codes-barres (GTIN / EAN)" : "Barcodes (GTIN / EAN)",
      priority: fr ? "Critique" : "Critical",
      tone: "bg-rose-50 text-rose-700",
      description: fr ? "Ajoutez l’identifiant officiel fourni par la marque ou le fabricant." : "Add the official identifier supplied by the brand or manufacturer.",
      steps: fr
        ? ["Ouvrez Shopify Admin → Produits.", "Éditez les variantes du produit.", "Ajoutez l’EAN ou l’UPC dans le champ Code-barres.", "Si aucun GTIN officiel n’existe, renseignez la marque et le MPN au lieu d’en inventer un."]
        : ["Open Shopify Admin → Products.", "Edit the product variants.", "Add the EAN or UPC in the Barcode field.", "If no official GTIN exists, provide the brand and MPN instead of inventing one."],
    },
    {
      id: "categories",
      icon: Tag,
      title: fr ? "Catégories Google" : "Google categories",
      priority: fr ? "Élevé" : "High",
      tone: "bg-amber-50 text-amber-700",
      description: fr ? "Choisissez la catégorie Google la plus précise pour chaque produit." : "Choose the most specific Google category for each product.",
      steps: fr
        ? ["Ouvrez l’application Google & YouTube dans Shopify.", "Sélectionnez une catégorie précise.", "Évitez les catégories génériques lorsqu’une sous-catégorie correspond au produit."]
        : ["Open the Google & YouTube app in Shopify.", "Select a precise category.", "Avoid broad categories when a matching subcategory is available."],
    },
    {
      id: "images",
      icon: Image,
      title: fr ? "Images de qualité" : "Quality images",
      priority: fr ? "Élevé" : "High",
      tone: "bg-amber-50 text-amber-700",
      description: fr ? "Utilisez une image principale nette, fidèle et sans éléments promotionnels." : "Use a clear, accurate main image without promotional overlays.",
      steps: fr
        ? ["Utilisez au minimum 800 × 800 px.", "Privilégiez un fond blanc ou neutre pour l’image principale.", "Ajoutez plusieurs angles utiles.", "Renseignez un texte alternatif descriptif."]
        : ["Use at least 800 × 800 px.", "Prefer a white or neutral background for the main image.", "Add several useful angles.", "Write descriptive ALT text."],
    },
    {
      id: "descriptions",
      icon: FileText,
      title: fr ? "Données produit" : "Product content",
      priority: fr ? "Moyen" : "Medium",
      tone: "bg-slate-100 text-slate-700",
      description: fr ? "Décrivez clairement le produit avec des informations utiles et vérifiables." : "Describe the product clearly with useful, verifiable information.",
      steps: fr
        ? ["Rédigez un titre clair et spécifique.", "Ajoutez matériaux, dimensions, variantes et usages.", "Évitez les mots-clés répétés et les promesses non vérifiables."]
        : ["Write a clear, specific title.", "Add materials, dimensions, variants, and uses.", "Avoid repeated keywords and unverifiable claims."],
    },
    {
      id: "pricing",
      icon: DollarSign,
      title: fr ? "Prix et promotions" : "Prices and promotions",
      priority: fr ? "Moyen" : "Medium",
      tone: "bg-slate-100 text-slate-700",
      description: fr ? "Gardez les prix et disponibilités identiques entre Shopify et le flux." : "Keep prices and availability consistent between Shopify and the feed.",
      steps: fr
        ? ["Renseignez le prix actuel.", "Utilisez le prix de comparaison uniquement pour une promotion réelle.", "Vérifiez la devise, la TVA et la disponibilité."]
        : ["Enter the current price.", "Use the compare-at price only for a genuine promotion.", "Check currency, taxes, and availability."],
    },
    {
      id: "shipping",
      icon: Truck,
      title: fr ? "Livraison" : "Shipping",
      priority: fr ? "Moyen" : "Medium",
      tone: "bg-slate-100 text-slate-700",
      description: fr ? "Fournissez des coûts et délais de livraison cohérents." : "Provide consistent shipping costs and delivery times.",
      steps: fr
        ? ["Configurez les zones et tarifs de livraison.", "Ajoutez le poids des variantes lorsque nécessaire.", "Synchronisez les paramètres avec Google Merchant Center."]
        : ["Configure shipping zones and rates.", "Add variant weights where required.", "Synchronize the settings with Google Merchant Center."],
    },
  ];

  const checklist = fr
    ? ["GTIN officiel ou marque + MPN", "Catégorie Google", "Image principale HD", "Texte alternatif", "Données produit complètes", "Prix et disponibilité", "Poids du produit", "Paramètres de livraison"]
    : ["Official GTIN or brand + MPN", "Google category", "HD main image", "ALT text", "Complete product data", "Price and availability", "Product weight", "Shipping settings"];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-slate-200 p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5 text-violet-600" />
            {fr ? "Guide Shopify pour Google Shopping" : "Shopify guide for Google Shopping"}
          </DialogTitle>
          <DialogDescription>
            {fr ? "Complétez les données essentielles avant de synchroniser votre catalogue." : "Complete the essential product data before synchronizing your catalog."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 text-sm text-violet-950">
            <strong>{fr ? "À retenir :" : "Good to know:"}</strong>{" "}
            {fr
              ? "des données Shopify exactes et cohérentes aident Google à comprendre, valider et diffuser vos produits."
              : "accurate, consistent Shopify data helps Google understand, validate, and surface your products."}
          </div>

          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <details key={section.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-950">{section.title}</span>
                        <Badge className={`${section.tone} border-0 text-[10px] hover:${section.tone}`}>{section.priority}</Badge>
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{section.description}</span>
                    </span>
                    <span className="text-slate-400 transition group-open:rotate-45">+</span>
                  </summary>
                  <ol className="space-y-2 px-4 pb-4 pl-16">
                    {section.steps.map((step) => (
                      <li key={step} className="flex gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              );
            })}
          </div>

          <section>
            <h3 className="text-sm font-semibold text-slate-950">{fr ? "Checklist rapide" : "Quick checklist"}</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {checklist.map((item) => (
                <label key={item} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-violet-600" />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </section>

          <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
            <strong className="text-slate-950">{fr ? "Besoin d’aide ?" : "Need help?"}</strong>{" "}
            {fr
              ? "CatalogueOptimize AI peut compléter les catégories, optimiser le contenu et préparer les images avant votre validation."
              : "CatalogueOptimize AI can complete categories, optimize content, and prepare images before your approval."}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
