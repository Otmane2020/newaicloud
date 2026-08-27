import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Store, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/lib/language';

export function NoStoreConnectedPrompt() {
  const navigate = useNavigate();
  const { language } = useTranslation();
  const fr = language === 'fr';

  return (
    <Alert className="mb-6 border-violet-200 bg-violet-50/70">
      <AlertCircle className="h-5 w-5 text-violet-600" />
      <AlertDescription className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="mb-1 font-semibold text-foreground">
            {fr ? 'Aucun catalogue Shopify connecté' : 'No Shopify catalog connected'}
          </p>
          <p className="text-sm text-muted-foreground">
            {fr
              ? 'Connectez une boutique pour importer les produits, variantes, collections et images, puis lancer le premier audit.'
              : 'Connect a store to import products, variants, collections and images, then run your first catalog scan.'}
          </p>
        </div>
        <Button
          onClick={() => navigate('/account?tab=integrations')}
          className="shrink-0 bg-violet-600 hover:bg-violet-700"
          size="sm"
        >
          <Store className="mr-2 h-4 w-4" />
          {fr ? 'Connecter Shopify' : 'Connect Shopify'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
