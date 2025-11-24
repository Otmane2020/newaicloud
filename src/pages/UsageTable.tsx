import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, FileText, Image } from "lucide-react";

export default function UsageTable() {
  const usageData = [
    {
      feature: "Landing Page",
      icon: Sparkles,
      optimizations: 10,
      description: "Génération complète d'une landing page produit"
    },
    {
      feature: "Article de Blog",
      icon: FileText,
      optimizations: 10,
      description: "Rédaction et optimisation d'un article de blog"
    },
    {
      feature: "Image (Vision AI)",
      icon: Image,
      optimizations: 1,
      description: "Analyse et optimisation d'une image produit"
    },
    {
      feature: "Optimisation SEO Titre",
      icon: FileText,
      optimizations: 1,
      description: "Optimisation du titre d'un produit"
    },
    {
      feature: "Optimisation SEO Description",
      icon: FileText,
      optimizations: 1,
      description: "Optimisation de la description d'un produit"
    }
  ];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Table de Consommation</h1>
        <p className="text-muted-foreground">
          Comprendre le coût en optimisations de chaque fonctionnalité
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coûts par Fonctionnalité</CardTitle>
          <CardDescription>
            Chaque action consomme un certain nombre d'optimisations de votre quota mensuel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Fonctionnalité</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Optimisations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageData.map((item) => {
                const Icon = item.icon;
                return (
                  <TableRow key={item.feature}>
                    <TableCell>
                      <Icon className="h-5 w-5 text-primary" />
                    </TableCell>
                    <TableCell className="font-medium">{item.feature}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.description}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                        {item.optimizations}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations Importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold mb-2">💡 Conseil</p>
            <p>
              Les optimisations sont déduites de votre quota mensuel. Consultez votre tableau de bord
              pour suivre votre consommation en temps réel.
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold mb-2">⚠️ Attention</p>
            <p>
              Une fois votre quota épuisé, vous devrez attendre le prochain cycle ou passer à un plan
              supérieur pour continuer à utiliser les fonctionnalités IA.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
