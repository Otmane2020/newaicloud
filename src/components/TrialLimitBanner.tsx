import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface TrialLimitBannerProps {
  resourceType: string;
  usage: number;
  limit: number;
  onActivate?: () => void;
}

export function TrialLimitBanner({ resourceType, usage, limit, onActivate }: TrialLimitBannerProps) {
  const navigate = useNavigate();

  const handleActivate = () => {
    if (onActivate) {
      onActivate();
    } else {
      navigate('/subscription');
    }
  };

  return (
    <div className="bg-orange-50 dark:bg-orange-950/20 border-b border-orange-200 dark:border-orange-800 p-4">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-500 flex-shrink-0" />
          <p className="font-medium text-orange-900 dark:text-orange-100">
            🚨 Limite d'essai gratuit atteinte : Vous avez utilisé {usage}/{limit} {resourceType}
          </p>
        </div>
        <Button 
          onClick={handleActivate}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white whitespace-nowrap"
        >
          💳 Activer mon abonnement
        </Button>
      </div>
    </div>
  );
}