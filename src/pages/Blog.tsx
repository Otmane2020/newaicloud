import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Sparkles } from 'lucide-react';

export default function Blog() {
  return (
    <div className="min-h-screen bg-gradient-subtle pt-24 pb-12">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Blog SEO AI</h1>
            <p className="text-muted-foreground">
              Créez du contenu optimisé automatiquement avec l'IA
            </p>
          </div>
          <Button size="lg">
            <Sparkles className="w-5 h-5 mr-2" />
            Générer Article AI
          </Button>
        </div>

        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Aucun article pour le moment
          </p>
          <Button>
            <Plus className="w-5 h-5 mr-2" />
            Créer votre premier article
          </Button>
        </Card>
      </div>
    </div>
  );
}