import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Store, AlertCircle } from 'lucide-react';

export function NoStoreConnectedPrompt() {
  const navigate = useNavigate();

  return (
    <Alert className="mb-6 border-warning bg-warning/10">
      <AlertCircle className="h-5 w-5 text-warning" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-foreground mb-1">
            Aucune boutique Shopify connectée
          </p>
          <p className="text-sm text-muted-foreground">
            Connectez votre boutique Shopify pour commencer à optimiser vos produits et améliorer votre SEO.
          </p>
        </div>
        <Button
          onClick={() => navigate('/integration?tab=connections')}
          className="shrink-0"
          size="sm"
        >
          <Store className="w-4 h-4 mr-2" />
          Connecter une boutique
        </Button>
      </AlertDescription>
    </Alert>
  );
}
