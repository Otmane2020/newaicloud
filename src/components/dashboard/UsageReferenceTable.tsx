import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, FileText, Image, Package, ShoppingBag } from "lucide-react";

export function UsageReferenceTable() {
  const usageData = [
    {
      feature: "Landing Page",
      icon: Sparkles,
      optimizations: 10,
      description: "Génération complète d'une landing page produit avec IA"
    },
    {
      feature: "Article de Blog",
      icon: FileText,
      optimizations: 10,
      description: "Rédaction et optimisation SEO d'un article complet"
    },
    {
      feature: "Campagne Ads",
      icon: ShoppingBag,
      optimizations: 5,
      description: "Création d'une campagne publicitaire multi-produits"
    },
    {
      feature: "Optimisation SEO Produit",
      icon: Package,
      optimizations: 1,
      description: "Optimisation du titre et de la description d'un produit"
    },
    {
      feature: "Analyse Image (Vision AI)",
      icon: Image,
      optimizations: 1,
      description: "Analyse et génération d'attributs visuels pour une image"
    },
    {
      feature: "Texte Alternatif (Alt Text)",
      icon: Image,
      optimizations: 1,
      description: "Génération de texte alternatif SEO pour une image"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Table de Référence - Consommation d'Optimisations
        </CardTitle>
        <CardDescription>
          Voici combien d'optimisations sont consommées pour chaque action dans l'application
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[60px]"></TableHead>
                <TableHead className="font-semibold">Fonctionnalité</TableHead>
                <TableHead className="hidden md:table-cell font-semibold">Description</TableHead>
                <TableHead className="text-right font-semibold">Coût</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageData.map((item, index) => {
                const Icon = item.icon;
                return (
                  <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.feature}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {item.description}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary min-w-[60px]">
                        {item.optimizations}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 space-y-3">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm">
            <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              💡 <span>Bon à savoir</span>
            </p>
            <p className="text-blue-800">
              Les optimisations sont déduites de votre quota mensuel. Vous pouvez suivre votre consommation
              en temps réel dans l'onglet "Limites" ci-dessus.
            </p>
          </div>
          
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm">
            <p className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
              ⚡ <span>Optimisez votre utilisation</span>
            </p>
            <p className="text-amber-800">
              Privilégiez les optimisations produits (1 crédit) pour maximiser votre quota, et réservez
              les landing pages et articles (10 crédits) pour vos produits les plus importants.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
