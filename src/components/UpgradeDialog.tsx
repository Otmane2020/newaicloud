import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: 'optimizations' | 'articles' | 'chat' | 'shopifySearch';
  usage?: number;
  limit?: number;
}

export function UpgradeDialog({ open, onOpenChange, limitType, usage, limit }: UpgradeDialogProps) {
  const navigate = useNavigate();

  const limitMessages = {
    optimizations: {
      title: 'Optimisations SEO',
      message: `${usage}/${limit} optimisations utilisées`,
      trial: '10 optimisations SEO',
      paid: '1000 optimisations SEO / mois',
    },
    articles: {
      title: 'Articles de blog',
      message: `${usage}/${limit} articles utilisés`,
      trial: '1 article de blog IA',
      paid: '5 articles de blog IA / mois',
    },
    chat: {
      title: 'Réponses chat IA',
      message: `${usage}/${limit} réponses utilisées`,
      trial: '50 réponses chat',
      paid: '200 réponses chat / mois',
    },
    shopifySearch: {
      title: 'Recherches Shopify IA',
      message: `${usage}/${limit} recherches utilisées`,
      trial: '20 requêtes Shopify IA',
      paid: '100 requêtes Shopify IA / mois',
    },
  };

  const currentLimit = limitMessages[limitType];

  const handleActivate = () => {
    onOpenChange(false);
    navigate('/subscription');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">🚀 Activez votre abonnement Starter</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Vous avez atteint votre limite d'essai gratuit :
          </p>
          <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
            <p className="font-medium text-orange-900 dark:text-orange-100">
              {currentLimit.title} : {currentLimit.message}
            </p>
          </div>
          
          <Separator />
          
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold mb-3 text-lg">Plan Starter (9,99€/mois)</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                <span className="text-sm">1000 optimisations SEO avec IA / mois</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                <span className="text-sm">5 articles de blog IA / mois</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                <span className="text-sm">200 réponses chat IA / mois</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                <span className="text-sm">100 requêtes Shopify IA / mois</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-500 mt-0.5">✅</span>
                <span className="text-sm">Toutes les fonctionnalités débloquées</span>
              </li>
            </ul>
          </div>
          
          <Button 
            onClick={handleActivate} 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            size="lg"
          >
            💳 Activer mon abonnement (9,99€/mois)
          </Button>
          
          <Button 
            onClick={() => onOpenChange(false)} 
            variant="ghost" 
            className="w-full"
          >
            Plus tard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}