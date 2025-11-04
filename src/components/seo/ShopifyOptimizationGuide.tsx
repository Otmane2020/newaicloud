import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, AlertCircle, ExternalLink, Package, Tag, Image, FileText, DollarSign, Truck } from "lucide-react";

interface ShopifyOptimizationGuideProps {
  open: boolean;
  onClose: () => void;
}

export function ShopifyOptimizationGuide({ open, onClose }: ShopifyOptimizationGuideProps) {
  const sections = [
    {
      id: "gtins",
      icon: Package,
      title: "Codes barres (GTINs/EANs)",
      priority: "Critique",
      description: "Les GTINs sont essentiels pour Google Shopping",
      steps: [
        "Accédez à Shopify Admin → Produits",
        "Pour chaque produit, éditez les variantes",
        "Dans la section 'Inventaire', ajoutez le code-barres EAN-13 ou UPC",
        "Si vous n'avez pas de GTIN, demandez à votre fournisseur ou utilisez NewAI pour générer des GTINs valides",
      ],
      impact: "🚀 Amélioration de 40-60% de la visibilité sur Google Shopping",
      shopifyPath: "Produits → Sélectionner produit → Variantes → Code-barres",
    },
    {
      id: "categories",
      icon: Tag,
      title: "Catégories Google",
      priority: "Élevé",
      description: "Classez correctement vos produits",
      steps: [
        "Utilisez l'application 'Google & YouTube' dans Shopify",
        "Pour chaque produit, sélectionnez la catégorie Google la plus précise",
        "Évitez les catégories génériques comme 'Vêtements et accessoires'",
        "Préférez des catégories spécifiques: 'Vêtements et accessoires > Vêtements > Robes > Robes de soirée'",
      ],
      impact: "📈 Meilleur ciblage = +25% de taux de clic",
      shopifyPath: "Applications → Google & YouTube → Paramètres produits",
    },
    {
      id: "images",
      icon: Image,
      title: "Images de qualité",
      priority: "Élevé",
      description: "Google favorise les images professionnelles",
      steps: [
        "Images principales: minimum 800×800px (idéal: 1200×1200px)",
        "Fond blanc ou neutre pour l'image principale",
        "Ajoutez 3-5 images par produit montrant différents angles",
        "Nommez vos fichiers de manière descriptive: 'robe-bleue-soiree.jpg'",
        "Remplissez les textes alternatifs (Alt text) avec des mots-clés pertinents",
      ],
      impact: "✨ Images optimisées = +30% d'engagement",
      shopifyPath: "Produits → Images → Alt text",
    },
    {
      id: "descriptions",
      icon: FileText,
      title: "Descriptions détaillées",
      priority: "Moyen",
      description: "Plus d'informations = meilleur classement",
      steps: [
        "Titre: 50-150 caractères avec mots-clés principaux",
        "Description: minimum 500 mots avec détails techniques",
        "Incluez: matériaux, dimensions, poids, couleurs disponibles",
        "Mentionnez les avantages produit et cas d'usage",
        "Ajoutez les caractéristiques uniques et points de différenciation",
      ],
      impact: "📝 Descriptions complètes = +20% de conversions",
      shopifyPath: "Produits → Description",
    },
    {
      id: "pricing",
      icon: DollarSign,
      title: "Prix et promotions",
      priority: "Moyen",
      description: "Structurez vos prix correctement",
      steps: [
        "Remplissez le 'Prix' pour le prix actuel",
        "Utilisez 'Comparer au prix' pour afficher les promotions",
        "Google affichera automatiquement le pourcentage de réduction",
        "Assurez-vous que les prix incluent la TVA",
        "Mettez à jour les prix régulièrement pour rester compétitif",
      ],
      impact: "💰 Prix compétitifs affichés = +15% de clics",
      shopifyPath: "Produits → Tarification",
    },
    {
      id: "shipping",
      icon: Truck,
      title: "Informations de livraison",
      priority: "Moyen",
      description: "Clarifiez vos options d'expédition",
      steps: [
        "Configurez vos zones de livraison: Paramètres → Expédition et livraison",
        "Définissez des tarifs clairs par zone géographique",
        "Ajoutez le poids pour chaque variante de produit",
        "Configurez la livraison gratuite si applicable",
        "Dans Google & YouTube app, synchronisez les paramètres de livraison",
      ],
      impact: "🚚 Infos livraison claires = meilleure confiance",
      shopifyPath: "Paramètres → Expédition et livraison",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Guide d'optimisation Shopify pour Google Shopping
          </DialogTitle>
          <DialogDescription>
            Suivez ces étapes pour maximiser votre visibilité et vos ventes sur Google Shopping
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Astuce :</strong> Plus vous remplissez d'informations dans Shopify, plus Google vous donnera de
            visibilité. Les produits avec données complètes ont 3× plus de chances d'apparaître en premier.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{section.title}</span>
                          <Badge
                            variant={
                              section.priority === "Critique"
                                ? "destructive"
                                : section.priority === "Élevé"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {section.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-12 space-y-4">
                      <Card className="border-l-4 border-l-primary">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Étapes dans Shopify</CardTitle>
                          <CardDescription className="flex items-center gap-1 text-xs">
                            <ExternalLink className="w-3 h-3" />
                            {section.shopifyPath}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ol className="space-y-2">
                            {section.steps.map((step, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </CardContent>
                      </Card>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-900 font-medium mb-1">
                          <CheckCircle2 className="w-5 h-5" />
                          Impact attendu
                        </div>
                        <p className="text-green-800 text-sm pl-7">{section.impact}</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-lg">🎯 Checklist rapide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>GTINs ajoutés</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Catégories Google définies</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Images HD (min 800×800)</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Alt text sur images</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Descriptions &gt;500 mots</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Prix et promotions</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Poids produits</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Zones de livraison</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <strong>Besoin d'aide ?</strong> NewAI peut vous aider à générer des GTINs, optimiser vos descriptions et
            améliorer vos images automatiquement. Utilisez les fonctionnalités SEO de l'application.
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
}