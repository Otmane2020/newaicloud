import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CatalogActionCard } from '@/components/CatalogActionCard';
import { Store } from 'lucide-react';
import { useTranslation } from '@/lib/language';

export function NoStoreConnectedPrompt() {
  const navigate = useNavigate();
  const { language } = useTranslation();
  const fr = language === 'fr';

  return (
    <CatalogActionCard
      icon={Store}
      title={fr ? 'Aucun catalogue Shopify connecté' : 'No Shopify catalog connected'}
      description={
        fr
          ? 'Connectez une boutique pour importer les produits, variantes, collections et images, puis lancer le premier audit.'
          : 'Connect a store to import products, variants, collections and images, then run your first catalog scan.'
      }
      action={
        <Button
          onClick={() => navigate('/account?tab=integrations')}
          className="rounded-lg bg-violet-600 px-5 font-semibold text-white shadow-none hover:bg-violet-700"
          size="sm"
        >
          <Store className="mr-2 h-4 w-4" />
          {fr ? 'Connecter Shopify' : 'Connect Shopify'}
        </Button>
      }
    />
  );
}
