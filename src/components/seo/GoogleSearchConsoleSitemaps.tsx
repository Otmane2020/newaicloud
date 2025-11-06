import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface GoogleSearchConsoleSitemapsProps {
  selectedDomain: string;
}

export function GoogleSearchConsoleSitemaps({ selectedDomain }: GoogleSearchConsoleSitemapsProps) {
  return (
    <div className="space-y-6">
      <Card className="p-8">
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <FileText className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Sitemaps et Indexation</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Gérez vos sitemaps et suivez l'indexation de vos pages et produits
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
            <Card className="p-6 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-3 text-green-600" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">Pages indexées</p>
              </div>
            </Card>
            
            <Card className="p-6 text-center">
              <RefreshCw className="h-8 w-8 mx-auto mb-3 text-blue-600" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
            </Card>
            
            <Card className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-orange-600" />
              <div className="space-y-1">
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">Erreurs</p>
              </div>
            </Card>
          </div>

          <Card className="p-6 bg-accent/50">
            <h3 className="font-semibold mb-4">Soumettre un sitemap</h3>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="https://example.com/sitemap.xml"
              />
              <Button>Soumettre</Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Soumettez l'URL de votre sitemap à Google Search Console
            </p>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 mt-6">
            <Card className="p-4 bg-accent/50">
              <FileText className="h-6 w-6 mb-2 text-primary" />
              <h4 className="font-semibold mb-1">Sitemap des produits</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Générez automatiquement un sitemap pour tous vos produits
              </p>
              <Button size="sm" variant="outline" disabled>Générer</Button>
            </Card>
            
            <Card className="p-4 bg-accent/50">
              <FileText className="h-6 w-6 mb-2 text-primary" />
              <h4 className="font-semibold mb-1">Sitemap des pages</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Incluez toutes vos pages statiques et collections
              </p>
              <Button size="sm" variant="outline" disabled>Générer</Button>
            </Card>
          </div>

          <div className="pt-6 text-center text-sm text-muted-foreground">
            <p>🚧 Fonctionnalité en développement</p>
            <p>La gestion complète des sitemaps sera bientôt disponible</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
