import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, FileText, Image, Package, ShoppingBag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const iconMap: Record<string, any> = {
  Sparkles,
  FileText,
  Image,
  Package,
  ShoppingBag
};

export function UsageReferenceTable() {
  const { data: usageData, isLoading } = useQuery({
    queryKey: ['usage-reference-costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usage_reference_costs')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

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
              {usageData?.map((item) => {
                const Icon = iconMap[item.icon_name || 'Package'];
                return (
                  <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.feature_name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {item.description}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary min-w-[60px]">
                        {item.base_cost}
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
              en temps réel dans votre tableau de bord.
            </p>
          </div>
          
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm">
            <p className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
              ⚡ <span>Optimisez votre utilisation</span>
            </p>
            <p className="text-amber-800">
              <strong>Campagnes :</strong> Le coût varie selon la fréquence (journalière: 1, hebdomadaire: 3, mensuelle: 5).
              Privilégiez les optimisations produits (1 crédit) pour maximiser votre quota.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
